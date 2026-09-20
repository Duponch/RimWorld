import { createHash } from 'node:crypto';
import { readFileSync,writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect,onTestFailed,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { isColonist } from '../src/sim/affiliation.ts';
import { foodAccount,woodAccount } from './scenarios/colony-player.ts';
import { energyDecisions,energySummary,newEnergyPlayer,observeEnergy,metalAccount,type EnergyPlayerState } from './scenarios/energy-player.ts';
import type { Command,World } from '../src/sim/types.ts';

const fixtureBytes=gunzipSync(readFileSync('tests/fixtures/colony-v84.json.gz')),fixtureHash=createHash('sha256').update(fixtureBytes).digest('hex');
const loadFixture=()=>deserializeWorld(fixtureBytes.toString('utf8'));
interface Ledger {consumed:number;harvested:number;cooked:number;steelMined:number;componentsMined:number;meals:Record<number,number>}
interface Checkpoint {protocol:'energy-v85';fixtureHash:string;world:string;player:EnergyPlayerState;ledger:Ledger;initial:{wood:number;food:number;animalEaten:number};journal:{tick:number;reason:string;command:Command}[];observations:ReturnType<typeof energySummary>[]}

test('Énergie : préflight des commandes de continuation, fichier V84 et rechargement sans injection',()=>{
  const w=loadFixture(),s=newEnergyPlayer(w),before=serializeWorld(w),decisions=energyDecisions(w,s);
  expect(w.tick).toBe(144000);expect(w.pawns.filter(isColonist)).toHaveLength(3);expect(serializeWorld(w)).toBe(before);
  expect(decisions.some(d=>d.command.type==='research-project'&&d.command.project==='batteries')).toBe(true);
  for(const d of decisions){const result=applyCommand(w,d.command);expect(result,JSON.stringify({...d,result})).toMatchObject({ok:true});}
  expect(w.jobs.some(j=>j.kind==='research-bench')).toBe(true);expect(w.jobs.some(j=>j.kind==='mine')).toBe(true);
  expect(validateWorld(w)).toEqual([]);stepWorld(w,250);
  // The first cold-store rectangle is partial because of a real interior tree.
  // Reconsider the reached state instead of resending a now-empty rectangle.
  for(const d of energyDecisions(w,s)){const result=applyCommand(w,d.command);expect(result,JSON.stringify({...d,result})).toMatchObject({ok:true});}
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,120);stepWorld(copy,120);
  expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(validateWorld(w)).toEqual([]);
});

test('Énergie : recherches et réseau construits depuis J24, froid, nuit, coupure physique et raccord',()=>{
  const checkpointFile=process.env.ENERGY_CHECKPOINT,resumed:Checkpoint|undefined=checkpointFile?JSON.parse(readFileSync(checkpointFile,'utf8')):undefined;
  if(resumed&&(resumed.protocol!=='energy-v85'||resumed.fixtureHash!==fixtureHash))throw Error('The energy checkpoint must descend from the committed V84 colony fixture.');
  let w:World=resumed?deserializeWorld(resumed.world):loadFixture();const player=resumed?.player??newEnergyPlayer(w),started=performance.now(),diagnostic=process.env.ENERGY_DIAGNOSTIC==='1';
  const ledger:Ledger=resumed?.ledger??{consumed:0,harvested:0,cooked:0,steelMined:0,componentsMined:0,meals:Object.fromEntries(w.pawns.filter(isColonist).map(p=>[p.id,0]))};
  const initial=resumed?.initial??{wood:woodAccount(w),food:foodAccount(w),animalEaten:w.wildlife?.eatenItems??0},journal:Checkpoint['journal']=resumed?.journal??[],observations:Checkpoint['observations']=resumed?.observations??[];
  const checkpoint=():Checkpoint=>({protocol:'energy-v85',fixtureHash,world:serializeWorld(w),player,ledger,initial,journal,observations});
  onTestFailed(()=>writeFileSync('tmp/energy-failed-v85.json',JSON.stringify(checkpoint())));
  const context=()=>JSON.stringify({tick:w.tick,player,ledger,latest:observations.at(-1),checkpoint:'tmp/energy-failed-v85.json'});
  const observe=()=>{
    const summary=energySummary(w,player);observations.push(summary);const c=context();
    expect(validateWorld(w),c).toEqual([]);expect(woodAccount(w),c).toBeCloseTo(initial.wood,7);
    expect(metalAccount(w,'steel'),c).toBe(player.initialSteel+ledger.steelMined);expect(metalAccount(w,'component'),c).toBe(player.initialComponents+ledger.componentsMined);
    expect(foodAccount(w)+ledger.consumed+9*ledger.cooked+(w.wildlife?.eatenItems??0)-initial.animalEaten,c).toBe(initial.food+ledger.harvested);
    expect(w.pawns.filter(isColonist).every(p=>p.state!=='dead'&&p.state!=='downed'&&p.hunger>0&&p.rest>0),c).toBe(true);
  };
  // A horizon is a diagnostic bound, not a promised research/event date. Stop
  // once the observed loop holds for 600 ticks after the rebuilt cable.
  while(w.tick<player.startTick+24*6000){
    if(diagnostic&&w.tick%250===0){writeFileSync('tmp/energy-diagnostic-latest-v85.json',JSON.stringify(checkpoint()));console.info(`Energy diagnostic tick ${w.tick}, ${(performance.now()-started).toFixed(0)}ms, ${w.jobs.length} jobs, ${w.structures.length} structures.`);}
    if(w.tick%250===0||w.raids?.active&&w.tick%20===0){for(const d of energyDecisions(w,player)){const result=applyCommand(w,d.command);expect(result,JSON.stringify({tick:w.tick,...d,result})).toMatchObject({ok:true});journal.push({tick:w.tick,...d});}observe();}
    const stations=new Map(w.pawns.flatMap(p=>{const station=w.structures.find(s=>s.id===p.cooking?.stationId);return station?[[p.name,station.kind] as const]:[];}));
    const mines=w.jobs.filter(j=>j.kind==='mine').flatMap(j=>{const t=w.tiles[j.z*w.width+j.x]!;return t.ore?[{cell:j.z*w.width+j.x,ore:t.ore}]:[];});
    const stepStarted=diagnostic?performance.now():0;stepWorld(w);
    if(diagnostic&&performance.now()-stepStarted>1000)console.info(`Energy slow step ${w.tick}: ${(performance.now()-stepStarted).toFixed(0)}ms.`);
    for(const target of mines)if(w.tiles[target.cell]!.terrain!=='rock'){if(target.ore==='steel')ledger.steelMined+=40;else ledger.componentsMined+=2;}
    for(const e of w.events.filter(e=>e.tick===w.tick)){
      const eaten=e.message.match(/a mangé une portion \((\d+) ×/);if(eaten){ledger.consumed+=Number(eaten[1]);const pawn=w.pawns.find(p=>e.message.startsWith(`${p.name} a mangé`));if(pawn&&isColonist(pawn))ledger.meals[pawn.id]=(ledger.meals[pawn.id]??0)+1;}
      const harvested=e.message.match(/a récolté (\d+) (baies|riz|pommes de terre|maïs)/);if(harvested)ledger.harvested+=Number(harvested[1]);
      if(e.message.includes('a cuisiné 1 repas simple')){ledger.cooked++;const kind=[...stations].find(([name])=>e.message.startsWith(`${name} a cuisiné`))?.[1];expect(kind,`Cooking event without physical station: ${e.message}`).toBeDefined();if(kind==='electric-stove')player.electricMeals++;}
    }
    const oldStage=player.stage;observeEnergy(w,player);
    if(player.stage!==oldStage){
      observe();const saved=serializeWorld(w),copy=deserializeWorld(saved);stepWorld(w,120);stepWorld(copy,120);expect(serializeWorld(copy)).toBe(serializeWorld(w));w=deserializeWorld(saved);
      writeFileSync(`tmp/energy-phase-${player.stage}-v85.json`,JSON.stringify(checkpoint()));
    }
    if(w.tick%6000===0){
      observe();const saved=serializeWorld(w),copy=deserializeWorld(saved);stepWorld(w,120);stepWorld(copy,120);expect(serializeWorld(copy)).toBe(serializeWorld(w));w=deserializeWorld(saved);
      const data=JSON.stringify(checkpoint());writeFileSync('tmp/energy-latest-v85.json',data);writeFileSync(`tmp/energy-day${w.tick/6000}-v85.json`,data);
      console.info(`Énergie J${w.tick/6000}: ${player.stage}, ${player.electricMeals} repas électriques, ${player.nightDrainTicks} ticks nocturnes alimentés, ${ledger.steelMined} acier et ${ledger.componentsMined} composants extraits.`);
    }
    if(player.stage==='done'&&w.tick-player.stageTick>=600&&player.milestones.frozenFood&&ledger.steelMined>0&&ledger.componentsMined>0)break;
  }
  observe();const final=energySummary(w,player),report={protocol:'energy-v85',fixtureHash,resumed:!!resumed,runtimeMs:performance.now()-started,initial,ledger,player,journal,observations,final};
  writeFileSync('artifacts/energy-colony-v85.json',JSON.stringify(report));writeFileSync('tmp/energy-final-v85.json',serializeWorld(w));
  expect(player.stage,context()).toBe('done');expect(player.electricMeals,context()).toBeGreaterThan(0);expect(player.nightDrainTicks,context()).toBeGreaterThanOrEqual(120);
  for(const key of ['batteriesResearch','solarResearch','charged500Wd','nightSupply','frozenFood','switchCut','switchRestored','cableCut','cableRestored'])expect(player.milestones[key],context()).toBeGreaterThan(player.startTick);
  expect(ledger.steelMined,context()).toBeGreaterThan(0);expect(ledger.componentsMined,context()).toBeGreaterThan(0);expect(Object.values(ledger.meals).every(n=>n>0),context()).toBe(true);
  expect(final.stovePowered&&final.coolerPowered,context()).toBe(true);expect(final.coldFood.some(p=>p.rot?.rate===0),context()).toBe(true);
},1_200_000);
