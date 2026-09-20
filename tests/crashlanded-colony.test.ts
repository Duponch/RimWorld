import { isColonist } from '../src/sim/affiliation';
import { crashlandedDecisions } from './scenarios/crashlanded-player';
import { readFileSync, writeFileSync } from 'node:fs';
import { expect, onTestFailed, test } from 'vitest';
import { applyCommand, deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { foodAccount, woodAccount } from './scenarios/colony-player.ts';
import { survivorDecisions, survivorInitialAreas, survivorPlan, survivorSummary } from './scenarios/survivor-player.ts';
import type { Command, World } from '../src/sim/types.ts';

type Summary=ReturnType<typeof survivorSummary>;
interface Ledger {consumed:number;harvested:number;cooked:number;meals:Record<number,number>;sleep:Record<number,number>}
interface Checkpoint {
  seed:number;world:string;initial:{wood:number;food:number;steel:number;component:number};ledger:Ledger;
  milestones:Record<string,number>;journal:{tick:number;reason:string;command:Command}[];observations:Summary[];
}
const checkpointFile=process.env.CRASHLANDED_CHECKPOINT;
const resumed:Checkpoint|undefined=checkpointFile?JSON.parse(readFileSync(checkpointFile,'utf8')):undefined;

test.each(resumed?[resumed.seed]:[42])('Atterrissage : huit jours naturels, nourriture et défense puis reprise, graine %i',seed=>{
  const version=process.env.VALIDATION_VERSION??'v82';
  let w:World=resumed?deserializeWorld(resumed.world):createScenarioWorld(seed,250,'crashlanded');
  const initial=resumed?.initial??{wood:woodAccount(w),food:foodAccount(w),steel:450,component:30};
  const ledger:Ledger=resumed?.ledger??{consumed:0,harvested:0,cooked:0,meals:Object.fromEntries(w.pawns.map(p=>[p.id,0])),sleep:Object.fromEntries(w.pawns.map(p=>[p.id,0]))};
  const milestones:Record<string,number>=resumed?.milestones??{},journal:Checkpoint['journal']=resumed?.journal??[],observations:Summary[]=resumed?.observations??[];
  const checkpoint=():Checkpoint=>({seed,world:serializeWorld(w),initial,ledger,milestones,journal,observations});
  const failureFile=`tmp/crashlanded-failed-${version}-${seed}.json`;
  onTestFailed(()=>writeFileSync(failureFile,JSON.stringify(checkpoint())));
  const record=(name:string,yes:boolean)=>{if(yes&&milestones[name]===undefined)milestones[name]=w.tick;};
  const observe=()=>{
    const s=survivorSummary(w);observations.push(s);
    const context=`seed ${seed}, tick ${w.tick}; checkpoint ${failureFile}`;
    expect(validateWorld(w),context).toEqual([]);
    expect(woodAccount(w)+(w.destroyed?.lost.wood??0),context).toBeCloseTo(initial.wood,7);
    expect(s.materials,context).toEqual({steel:initial.steel,component:initial.component});
    expect(foodAccount(w)+ledger.consumed+9*ledger.cooked+(w.wildlife?.eatenItems??0),context).toBe(initial.food+ledger.harvested);
    expect(w.pawns.filter(isColonist).every(p=>p.state!=='dead'&&p.state!=='downed'&&p.hunger>0&&p.rest>0),context).toBe(true);
    record('threeBeds',s.beds===3);record('shelter',s.shelteredBeds===3&&s.walls===15&&s.doors===1);
    record('stockMoved',s.stored.steel>0&&s.stored.component>0);record('materialsStored',s.stored.steel===450&&s.stored.component===30);
    record('medicineStored',s.stored.medicine===30);record('riceGrowing',s.crops.length>=15&&s.crops.some(c=>c.growth>0));
    record('everyoneAte',Object.values(ledger.meals).every(n=>n>0));record('everyoneSleptInBed',Object.values(ledger.sleep).every(n=>n>0));record('firstCookedMeal',ledger.cooked>0);record('firstRaid',!!w.raids?.active);record('raidOver',!!w.raids?.last);record('riceHarvested',w.resources.some(r=>r.kind==='rice'&&r.growth===0&&r.growthTick!>18000));
    return s;
  };
  while(w.tick<48000) {
    if(w.tick%250===0 || w.raids?.active && w.tick%20===0) {
      for(const d of crashlandedDecisions(w)){expect(applyCommand(w,d.command),JSON.stringify({seed,tick:w.tick,decision:d})).toMatchObject({ok:true});journal.push({tick:w.tick,...d});}
      observe();
    }
    stepWorld(w);
    for(const e of w.events)if(e.tick===w.tick) {
      const eaten=e.message.match(/a mangé une portion \((\d+) ×/);
      if(eaten){ledger.consumed+=Number(eaten[1]);const pawn=w.pawns.find(p=>e.message.startsWith(`${p.name} a mangé`));if(pawn)ledger.meals[pawn.id]=(ledger.meals[pawn.id]??0)+1;}
      const harvest=e.message.match(/a récolté (\d+) (?:baies|riz)/);if(harvest)ledger.harvested+=Number(harvest[1]);
      if(e.message.includes('a cuisiné 1 repas simple'))ledger.cooked++;
    }
    for(const p of w.pawns)if(p.state==='sleeping'&&p.need?.kind==='sleep'&&p.need.bedId!==null)ledger.sleep[p.id]=(ledger.sleep[p.id]??0)+1;
    if(w.tick%6000===0) {
      const saved=serializeWorld(w),copy=deserializeWorld(saved);stepWorld(w,100);stepWorld(copy,100);
      expect(serializeWorld(copy)).toBe(serializeWorld(w));w=deserializeWorld(saved);
      writeFileSync(`tmp/crashlanded-day-${version}-${seed}.json`,JSON.stringify(checkpoint()));
      console.info(`Survivants ${seed}: day ${w.tick/6000}, ${w.structures.length} structures, ${w.jobs.length} jobs`);
    }
  }
  const final=observe(),report={seed,initial,ledger,milestones,journal,observations,final};
  writeFileSync(`tmp/crashlanded-final-${version}-${seed}.json`,serializeWorld(w));writeFileSync(`artifacts/crashlanded-colony-${version}-${seed}.json`,JSON.stringify(report,null,2));
  const context=JSON.stringify({seed,milestones,ledger,final});
  expect(w.pawns.filter(isColonist),context).toHaveLength(3);expect(final.beds,context).toBe(3);expect(final.shelteredBeds,context).toBe(3);
  expect(final.walls,context).toBe(15);expect(final.doors,context).toBe(1);
  expect(final.growingCells,context).toBe(20);expect(final.crops.length,context).toBeGreaterThanOrEqual(15);
  expect(Object.values(ledger.meals).every(n=>n>=3),context).toBe(true);expect(Object.values(ledger.sleep).every(n=>n>250),context).toBe(true);
  expect(final.stored,context).toMatchObject({steel:450,component:30,medicine:30});
  expect(final.food.nutrition,context).toBeGreaterThan(0);expect(milestones.stockMoved,context).toBeGreaterThan(0);
  expect(milestones.riceGrowing,context).toBeGreaterThan(0);expect(milestones.shelter,context).toBeGreaterThan(0);
  expect(milestones.firstCookedMeal,context).toBeGreaterThan(0);
  expect(milestones.firstRaid,context).toBe(32400);expect(milestones.raidOver,context).toBeGreaterThan(32400);
  expect(w.raids?.active,context).toBeUndefined();expect(w.raids?.last?.reason,context).not.toBe('colony-down');
  expect(w.pawns.filter(isColonist).every(p=>!p.draft),context).toBe(true);
  // Crops and raids use their actual calendar, not a J7 deadline. Initial meals are not
  // confiscated to manufacture scarcity; the report distinguishes stored,
  // harvested and cooked food instead of claiming a closed economy already.
},240000);
