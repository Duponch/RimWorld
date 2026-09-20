import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync,writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { isColonist } from '../src/sim/affiliation.ts';
import { ITEM_DEFINITIONS,type ItemId } from '../src/sim/items.ts';
import { foodAccount } from '../tests/scenarios/colony-player.ts';
import { metalAccount } from '../tests/scenarios/energy-player.ts';
import type { EnvironmentPlayerState } from '../tests/scenarios/environment-player.ts';
import { newHygienePlayer,hygieneDecisions,observeHygiene,hygieneJourneyComplete,hygienePlayerSummary,type HygienePlayerState } from '../tests/scenarios/hygiene-player.ts';
import type { Command,World } from '../src/sim/types.ts';

// This is the project's published V88 colony, never a private RimWorld save.
// Its people, casualties, stocks, illnesses and events are not edited on load.
const sourceBytes=gunzipSync(readFileSync('tests/fixtures/colony-v88.json.gz'));
const fixtureHash=createHash('sha256').update(sourceBytes).digest('hex');
assert.equal(fixtureHash,'7b5e5911bf86cccdbc7ba4b32ed067ebc1a165ff9ee319521814b9b0f6d57da2');
const source=JSON.parse(sourceBytes.toString('utf8')) as World;assert.equal(source.schemaVersion,88);
const historicalDeaths=source.pawns.filter(p=>p.state==='dead').map(p=>({id:p.id,death:p.health?.death}));assert.equal(historicalDeaths.length,36);
interface Ledger {consumed:number;harvested:number;cooked:number;componentsMined:number;importedFood:number;importedComponents:number;importedSilver:number}
interface Checkpoint {protocol:'hygiene-v89';fixtureHash:string;world:string;player:HygienePlayerState;ledger:Ledger;initial:{food:number;component:number;silver:number};journal:{tick:number;reason:string;command:Command}[];observations:ReturnType<typeof hygienePlayerSummary>[]}
const archived=(w:World,item?:ItemId,food=false)=>(w.visitors?.departed??[]).reduce((n,d)=>n+d.items.filter(p=>food?p.kind==='food':p.item===item).reduce((n,p)=>n+p.quantity,0),0);
const fireFood=(w:World)=>Object.entries(w.fires?.ledger.items??{}).reduce((n,[item,quantity])=>n+(ITEM_DEFINITIONS[item as ItemId].kind==='food'?quantity:0),0);
const foodTotal=(w:World)=>foodAccount(w)+fireFood(w)+archived(w,undefined,true)+(w.wildlife?.eatenItems??0);
const componentTotal=(w:World)=>metalAccount(w,'component')+(w.fires?.ledger.items.component??0)+archived(w,'component');
const silverTotal=(w:World)=>w.piles.filter(p=>p.item==='silver').reduce((n,p)=>n+p.quantity,0)+archived(w,'silver')+(w.fires?.ledger.items.silver??0);
const floorAccount=(w:World)=>({woodInFloors:w.tiles.filter(t=>t.floor==='wood-planks').length*3,woodLoose:w.piles.filter(p=>p.item==='wood'&&p.owner.type==='ground').reduce((n,p)=>n+p.quantity,0),woodInJobs:w.piles.filter(p=>p.item==='wood'&&p.owner.type==='job').reduce((n,p)=>n+p.quantity,0),floors:w.tiles.filter(t=>t.floor).length});
const resumed=process.env.HYGIENE_RESUME?JSON.parse(readFileSync(process.env.HYGIENE_RESUME,'utf8')) as Checkpoint:undefined;
if(resumed){assert.equal(resumed.protocol,'hygiene-v89');assert.equal(resumed.fixtureHash,fixtureHash);}
const world=resumed?deserializeWorld(resumed.world):deserializeWorld(sourceBytes.toString('utf8'));
const reportV88=JSON.parse(readFileSync('artifacts/trade-colony-v88.json','utf8')) as {player:{environment:EnvironmentPlayerState}};
const player=resumed?.player??newHygienePlayer(world,reportV88.player.environment);
const ledger:Ledger=resumed?.ledger??{consumed:0,harvested:0,cooked:0,componentsMined:0,importedFood:0,importedComponents:0,importedSilver:0};
const initial=resumed?.initial??{food:foodTotal(world),component:componentTotal(world),silver:silverTotal(world)};
const journal=resumed?.journal??[],observations=resumed?.observations??[];
const fromTick=world.tick,started=performance.now(),maxDays=Number(process.env.HYGIENE_MAX_DAYS??7),diagnosticUntil=process.env.HYGIENE_UNTIL_TICK===undefined?undefined:Number(process.env.HYGIENE_UNTIL_TICK);
assert.ok(Number.isInteger(maxDays)&&maxDays>=1&&maxDays<=7,'The hygiene horizon is bounded to seven days and stops when physical criteria are reached.');
if(diagnosticUntil!==undefined)assert.ok(Number.isSafeInteger(diagnosticUntil)&&diagnosticUntil>world.tick&&diagnosticUntil<=world.tick+6000,'A diagnostic preflight is bounded to one day and is not a completed journey.');
const limit=Math.min(player.startTick+maxDays*6000,diagnosticUntil??Infinity);
const checkpoint=():Checkpoint=>({protocol:'hygiene-v89',fixtureHash,world:serializeWorld(world),player,ledger,initial,journal,observations});
const save=(path:string)=>writeFileSync(path,JSON.stringify(checkpoint()));
function verify():void {
  assert.deepEqual(validateWorld(world),[]);
  assert.equal(foodTotal(world)+ledger.consumed+9*ledger.cooked,initial.food+ledger.harvested+ledger.importedFood,'Food, spoilage, fire, exports, wildlife ingestion and recipe transforms must conserve the actual production.');
  assert.equal(componentTotal(world),initial.component+ledger.componentsMined+ledger.importedComponents,'Physical, installed, lost and exported components must balance.');
  assert.equal(silverTotal(world),initial.silver+ledger.importedSilver,'Silver moves without creation or deletion.');
  assert.ok(player.initialPeople.every(id=>world.pawns.some(p=>p.id===id&&isColonist(p)&&p.state!=='dead')),'All four real colonists must survive this continuation.');
  for(const old of historicalDeaths){const p=world.pawns.find(p=>p.id===old.id);assert.ok(p&&p.state==='dead','A historical deceased person must remain identifiable.');assert.deepEqual(p.health?.death,old.death,'Burial cannot rewrite the historical death.');}
}
function continuation():void {
  const actual=structuredClone(world),restored=deserializeWorld(serializeWorld(world));stepWorld(actual,30);stepWorld(restored,30);
  assert.equal(serializeWorld(actual),serializeWorld(restored),'Body ownership, filth clocks, contamination and tasks must resume exactly.');
}
const observe=()=>{observeHygiene(world,player);observations.push(hygienePlayerSummary(world,player));verify();};
function command(d:{reason:string;command:Command}):void {
  const result=applyCommand(world,d.command);journal.push({tick:world.tick,...d});assert.ok(result.ok,JSON.stringify({tick:world.tick,...d,result}));
}
try {
  verify();continuation();
  while(world.tick<limit&&!hygieneJourneyComplete(player)){
    // Capture before decisions: a genuine command may add a phase milestone.
    const milestones=Object.keys(player.milestones).join(',');
    if(world.tick===fromTick||world.tick%100===0||world.raids?.active&&world.tick%20===0)for(const d of hygieneDecisions(world,player))command(d);
    const existing=new Set(world.pawns.map(p=>p.id)),mines=world.jobs.filter(j=>j.kind==='mine'&&world.tiles[j.z*world.width+j.x]!.ore==='machinery').map(j=>j.z*world.width+j.x);
    const kitchenCooks=world.pawns.filter(p=>p.cooking?.stationId===player.stationId).map(p=>p.name);
    stepWorld(world);
    const arrived=new Set(world.pawns.filter(p=>p.visitor&&!existing.has(p.id)).map(p=>p.id));
    if(arrived.size)for(const pile of world.piles)if('pawnId' in pile.owner&&arrived.has(pile.owner.pawnId)){
      if(pile.kind==='food')ledger.importedFood+=pile.quantity;if(pile.item==='component')ledger.importedComponents+=pile.quantity;if(pile.item==='silver')ledger.importedSilver+=pile.quantity;
    }
    for(const index of mines)if(world.tiles[index]!.terrain!=='rock')ledger.componentsMined+=2;
    const events=world.events.filter(e=>e.tick===world.tick);
    for(const event of events){const meal=event.message.match(/a mangé une portion \((\d+) ×/);if(meal)ledger.consumed+=Number(meal[1]);
      const harvest=event.message.match(/a récolté (\d+) (baies|riz|pommes de terre|maïs)/);if(harvest)ledger.harvested+=Number(harvest[1]);if(event.message.includes('a cuisiné 1 repas simple'))ledger.cooked++;
    }
    observeHygiene(world,player,events,kitchenCooks);
    // Preserve the actual first fatal tick, not a later daily/milestone state.
    // The same survival/conservation assertions remain authoritative.
    if(player.minimumLiving<player.initialPeople.length)observe();
    if(Object.keys(player.milestones).join(',')!==milestones){observe();continuation();save('tmp/hygiene-phase-v89.json');save(`tmp/hygiene-phase-${world.tick}-v89.json`);console.info(`Hygiène J${(world.tick/6000).toFixed(3)} : ${Object.keys(player.milestones).join(', ')}.`);}
    if(world.tick%6000===0){observe();continuation();save('tmp/hygiene-latest-v89.json');save(`tmp/hygiene-day${world.tick/6000}-v89.json`);console.info(`Hygiène J${world.tick/6000} : ${player.buried.length} inhumations, ${player.cleaned} traces nettoyées, ${ledger.cooked} repas produits.`);}
  }
  observe();continuation();
  const report={protocol:'hygiene-v89',fixtureHash,resumed:!!resumed,fromTick,runtimeMs:performance.now()-started,diagnostic:diagnosticUntil!==undefined,completed:hygieneJourneyComplete(player),maxDays,initial,ledger,player,journal,observations,floors:floorAccount(world),final:hygienePlayerSummary(world,player)};
  if(diagnosticUntil!==undefined){writeFileSync('artifacts/hygiene-diagnostic-v89.json',JSON.stringify(report));save('tmp/hygiene-diagnostic-v89.json');}
  else {
    writeFileSync('artifacts/hygiene-colony-v89.json',JSON.stringify(report));save('tmp/hygiene-final-checkpoint-v89.json');writeFileSync('tmp/hygiene-final-v89.json',serializeWorld(world));
    assert.ok(report.completed,JSON.stringify({message:'Horizon reached without actual burial/kitchen/cleaning/meals. Inspect checkpoints, never fabricate death, disease or filth.',final:report.final}));
    assert.equal(player.minimumLiving,4);assert.equal(player.targetBodies.length,3);assert.ok(player.cleaned>=3&&player.mealsAfterKitchen>=3);
  }
  console.info(JSON.stringify({completed:report.completed,diagnostic:report.diagnostic,fromTick,toTick:world.tick,runtimeMs:report.runtimeMs,final:report.final}));
} catch(error){
  let validation:unknown;try{validation=validateWorld(world);}catch(failure){validation=String(failure);}
  writeFileSync('tmp/hygiene-failed-v89.json',JSON.stringify({protocol:'hygiene-v89',fixtureHash,world:JSON.stringify(world),player,ledger,initial,journal,observations,failure:String(error),validation}));throw error;
}
