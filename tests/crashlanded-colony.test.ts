import { isColonist } from '../src/sim/affiliation';
import { crashlandedDecisions, crashlandedSummary } from './scenarios/crashlanded-player';
import { readFileSync, writeFileSync } from 'node:fs';
import { expect, onTestFailed, test } from 'vitest';
import { applyCommand, deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { foodAccount, woodAccount } from './scenarios/colony-player.ts';
import { survivorPlan } from './scenarios/survivor-player.ts';
import type { Command, Job, Resource, World } from '../src/sim/types.ts';

type Summary=ReturnType<typeof crashlandedSummary>;
interface Ledger {
  consumed:number;harvested:number;cooked:number;riceHarvested:number;riceCooked:number;riceMeals:number;
  potatoHarvested:number;cornHarvested:number;potatoCooked:number;cornCooked:number;
  riceHarvestsByCell:Record<number,number>;mealsByStation:Record<string,number>;
  consumedByItem:Record<string,number>;lastSurvivalMealTick:number;nonRationIngestionsLastWeek:Record<number,number>;
  meals:Record<number,number>;sleep:Record<number,number>;
}
interface Checkpoint {
  protocol:'food-chain-v84';instrumentation:2;seed:number;world:string;initial:{wood:number;food:number;steel:number;component:number};ledger:Ledger;
  milestones:Record<string,number>;journal:{tick:number;reason:string;command:Command}[];observations:Summary[];
}
const woodConserved=(w:World)=>woodAccount(w)+(w.fires?.ledger.items.wood??0)+(w.fires?.ledger.woodPotentialLost??0)+((w.fires?.ledger.fuelTicksLost??0)+(w.fires?.ledger.fuelTicksBurned??0))/600;
const checkpointFile=process.env.CRASHLANDED_CHECKPOINT;
const resumed:Checkpoint|undefined=checkpointFile?JSON.parse(readFileSync(checkpointFile,'utf8')):undefined;
if(resumed&&resumed.protocol!=='food-chain-v84')throw Error('Use a V84 food-chain checkpoint; a V83 20-cell camp has a different player protocol.');
if(resumed&&resumed.instrumentation!==2)throw Error('Use a V84 instrumentation-2 checkpoint: older rice-cell counts cannot be reconstructed safely.');

/** Completion retains the removed job object and its final reserver. Read that
 * object after the tick so a newly assigned, partially completed harvest is
 * attributed to its actual worker. Resource arrays are replaced on removal;
 * keeping the old array requires no full-map copy on every simulated tick. */
function completedRiceCell(w:World,message:string,events:World['events'],jobsBefore:readonly Job[],resourcesBefore:readonly Resource[],context:string):number|undefined {
  const people=w.pawns.filter(p=>message.startsWith(`${p.name} `));
  const diagnostic=(reason:string,candidates:unknown=[]):never=>{throw Error(`${reason}: ${JSON.stringify({context,tick:w.tick,message,people:people.map(p=>({id:p.id,name:p.name,x:p.x,z:p.z})),candidates,jobs:jobsBefore.map(j=>({id:j.id,x:j.x,z:j.z,reservedBy:j.reservedBy,progress:j.progress,retained:w.jobs.some(current=>current.id===j.id)})),riceBefore:resourcesBefore.filter(r=>r.kind==='rice').map(r=>({id:r.id,x:r.x,z:r.z,retained:w.resources.some(current=>current.id===r.id)})),events})}`);};
  if(people.length!==1)return diagnostic('Rice event has no unique actor');
  const pawn=people[0]!;
  const completed=events.some(e=>e.message===`${pawn.name} a terminé le travail : récolte.`);
  if(!completed){
    // Clearing/cutting can recover a crop, but does not prove a harvest cycle.
    if(message.startsWith(`${pawn.name} a dégagé le chantier et a récolté`)
      ||events.some(e=>e.message===`${pawn.name} a terminé le travail : coupe de plante.`))return;
    return diagnostic('Rice production has no correlated harvest or clearing completion');
  }
  const candidates=jobsBefore.filter(j=>j.kind==='harvest'&&j.reservedBy===pawn.id&&!w.jobs.some(current=>current.id===j.id))
    .flatMap(job=>{
      const plant=resourcesBefore.find(r=>r.kind==='rice'&&r.x===job.x&&r.z===job.z);
      return plant&&!w.resources.some(r=>r.id===plant.id)?[{jobId:job.id,resourceId:plant.id,cell:job.z*w.width+job.x}]:[];
    });
  if(candidates.length!==1)return diagnostic('Rice harvest has no unique completed job and removed plant',candidates);
  return candidates[0]!.cell;
}

test.each(resumed?[resumed.seed]:[42])('Atterrissage : 24 jours, deux récoltes de riz, cuisine construite et diversification naturelle, graine %i',seed=>{
  const version=process.env.VALIDATION_VERSION??'v84',started=performance.now();
  let w:World=resumed?deserializeWorld(resumed.world):createScenarioWorld(seed,250,'crashlanded');
  const initial=resumed?.initial??{wood:woodAccount(w),food:foodAccount(w),steel:450,component:30};
  const ledger:Ledger=resumed?.ledger??{consumed:0,harvested:0,cooked:0,riceHarvested:0,riceCooked:0,riceMeals:0,potatoHarvested:0,cornHarvested:0,potatoCooked:0,cornCooked:0,riceHarvestsByCell:{},mealsByStation:{},consumedByItem:{},lastSurvivalMealTick:0,nonRationIngestionsLastWeek:Object.fromEntries(w.pawns.map(p=>[p.id,0])),meals:Object.fromEntries(w.pawns.map(p=>[p.id,0])),sleep:Object.fromEntries(w.pawns.map(p=>[p.id,0]))};
  const milestones:Record<string,number>=resumed?.milestones??{},journal:Checkpoint['journal']=resumed?.journal??[],observations:Summary[]=resumed?.observations??[];
  const primary=survivorPlan(w,true).field,initialRiceCells=new Set<number>();
  for(let z=primary.from.z;z<=primary.to.z;z++)for(let x=primary.from.x;x<=primary.to.x;x++)initialRiceCells.add(z*w.width+x);
  const checkpoint=():Checkpoint=>({protocol:'food-chain-v84',instrumentation:2,seed,world:serializeWorld(w),initial,ledger,milestones,journal,observations});
  const failureFile=`tmp/crashlanded-failed-${version}-${seed}.json`;
  onTestFailed(()=>writeFileSync(failureFile,JSON.stringify(checkpoint())));
  const record=(name:string,yes:boolean)=>{if(yes&&milestones[name]===undefined)milestones[name]=w.tick;};
  const observe=()=>{
    const s=crashlandedSummary(w);observations.push(s);
    const context=`seed ${seed}, tick ${w.tick}; checkpoint ${failureFile}`;
    expect(validateWorld(w),context).toEqual([]);
    expect(woodConserved(w),context).toBeCloseTo(initial.wood,7);
    expect(s.materials,context).toEqual({steel:initial.steel,component:initial.component});
    expect(foodAccount(w)+ledger.consumed+9*ledger.cooked+(w.wildlife?.eatenItems??0),context).toBe(initial.food+ledger.harvested);
    // Food poisoning can drive hunger to zero between the physical pickup and
    // ingestion. A colonist actively eating is already resolving that state;
    // death, exhaustion or starvation without an engaged meal remain hard
    // failures. A temporary combat downing is observed and must be resolved by
    // the final recovery assertion rather than making every raid harmless.
    expect(w.pawns.filter(isColonist).every(p=>p.state!=='dead'&&p.rest>0&&(p.hunger>0||p.state==='eating'||p.state==='downed')),context).toBe(true);
    record('threeBeds',s.beds===3);record('shelter',s.shelteredBeds===3&&s.walls===15&&s.doors===1);
    record('stockMoved',s.stored.steel>0&&s.stored.component>0);
    record('medicineStored',s.stored.medicine===30);record('riceGrowing',s.crops.length>=40&&s.crops.some(c=>c.growth>0));
    record('everyoneAte',Object.values(ledger.meals).every(n=>n>0));record('everyoneSleptInBed',Object.values(ledger.sleep).every(n=>n>0));
    record('firstCookedMeal',ledger.cooked>0);record('firstRaid',!!w.raids?.active);record('raidOver',!!w.raids?.last);
    record('coveredStock',s.foodChain.coveredStockCells>=24);
    record('fueledStove',s.foodChain.stations.some(s=>s.kind==='fueled-stove'));
    record('butcherTable',s.foodChain.stations.some(s=>s.kind==='butcher-table'));
    record('firstButchery',(w.butchery?.completed??0)>0);
    record('secondRiceCycle',Object.values(ledger.riceHarvestsByCell).filter(n=>n>=2).length>=40);
    record('potatoGrowing',s.foodChain.plants.some(p=>p.kind==='potato'&&p.count>0&&p.meanGrowth>0));
    record('cornGrowing',s.foodChain.plants.some(p=>p.kind==='corn'&&p.count>0&&p.meanGrowth>0));
    record('initialRationsGone',s.food.survival===0);
    return s;
  };
  while(w.tick<144000) {
    if(w.tick%250===0 || w.raids?.active && w.tick%20===0) {
      for(const d of crashlandedDecisions(w)){expect(applyCommand(w,d.command),JSON.stringify({seed,tick:w.tick,decision:d})).toMatchObject({ok:true});journal.push({tick:w.tick,...d});}
      observe();
    }
    // Include unowned partial jobs: assignment and completion may share a tick.
    // Match positive rice output to both actual job completion and plant loss;
    // grazing, cutting or a failed harvest never increment the cycle counter.
    const harvestJobs=w.jobs.filter(j=>j.kind==='harvest'),resourcesBefore=w.resources;
    const stations=new Map(w.pawns.flatMap(p=>{const station=w.structures.find(s=>s.id===p.cooking?.stationId);return station?[[p.name,station.kind] as const]:[];}));
    const eating=new Map(w.pawns.flatMap(p=>{const need=p.need,pile=need?.kind==='eat'?w.piles.find(q=>q.id===need.carryPileId):undefined;return pile?[[p.name,pile.item] as const]:[];}));
    // Assisted feeding reports ingestion under the patient's name, while its
    // physical food is carried by the doctor until the actual completion.
    for(const doctor of w.pawns)if(doctor.feed){
      const patient=w.pawns.find(p=>p.id===doctor.feed!.patientId),pile=w.piles.find(p=>p.id===doctor.feed!.carryPileId);
      if(patient&&pile)eating.set(patient.name,pile.item);
    }
    stepWorld(w);
    const currentEvents=w.events.filter(e=>e.tick===w.tick);
    for(const e of currentEvents) {
      const eaten=e.message.match(/a mangé une portion \((\d+) ×/);
      if(eaten){
        const quantity=Number(eaten[1]);
        const pawn=w.pawns.find(p=>e.message.startsWith(`${p.name} a mangé`)),item=pawn?eating.get(pawn.name):undefined;
        expect(item,`Consumed physical item missing at tick ${w.tick}: ${e.message}`).toBeDefined();
        if(!pawn||!isColonist(pawn))continue;
        ledger.consumed+=quantity;
        ledger.consumedByItem[item!]=(ledger.consumedByItem[item!]??0)+quantity;
        if(item==='survival-meal')ledger.lastSurvivalMealTick=w.tick;
        if(pawn){ledger.meals[pawn.id]=(ledger.meals[pawn.id]??0)+1;if(w.tick>17*6000&&item!=='survival-meal')ledger.nonRationIngestionsLastWeek[pawn.id]=(ledger.nonRationIngestionsLastWeek[pawn.id]??0)+1;}
      }
      const harvest=e.message.match(/a récolté (\d+) (baies|riz|pommes de terre|maïs)/);
      if(harvest){
        const quantity=Number(harvest[1]);ledger.harvested+=quantity;
        if(harvest[2]==='riz'){
          ledger.riceHarvested+=quantity;record('riceHarvested',true);
          const cell=completedRiceCell(w,e.message,currentEvents,harvestJobs,resourcesBefore,`seed ${seed}; checkpoint ${failureFile}`);
          if(cell!==undefined&&initialRiceCells.has(cell))ledger.riceHarvestsByCell[cell]=(ledger.riceHarvestsByCell[cell]??0)+1;
        }
        if(harvest[2]==='pommes de terre'){ledger.potatoHarvested+=quantity;record('potatoHarvested',true);}
        if(harvest[2]==='maïs'){ledger.cornHarvested+=quantity;record('cornHarvested',true);}
      }
      if(e.message.includes('a cuisiné 1 repas simple')){
        ledger.cooked++;
        const rice=Number(e.message.match(/, (\d+) riz/)?.[1]??0),potato=Number(e.message.match(/, (\d+) pommes de terre/)?.[1]??0),corn=Number(e.message.match(/, (\d+) maïs/)?.[1]??0);
        if(rice>0){ledger.riceCooked+=rice;ledger.riceMeals++;record('firstCropMeal',true);}
        ledger.potatoCooked+=potato;ledger.cornCooked+=corn;
        const station=[...stations].find(([name])=>e.message.startsWith(`${name} a cuisiné`))?.[1]??'unmatched';ledger.mealsByStation[station]=(ledger.mealsByStation[station]??0)+1;
      }
    }
    for(const p of w.pawns)if(p.state==='sleeping'&&p.need?.kind==='sleep'&&p.need.bedId!==null)ledger.sleep[p.id]=(ledger.sleep[p.id]??0)+1;
    if(w.tick%6000===0) {
      const saved=serializeWorld(w),copy=deserializeWorld(saved);stepWorld(w,100);stepWorld(copy,100);
      expect(serializeWorld(copy)).toBe(serializeWorld(w));w=deserializeWorld(saved);
      writeFileSync(`tmp/crashlanded-day-${version}-${seed}.json`,JSON.stringify(checkpoint()));
      // Keep milestone days independently so diagnosis does not require a fresh
      // 24-day run. These are real reached states, never a prepared fixture.
      if([1,6,12,18,24].includes(w.tick/6000))writeFileSync(`tmp/crashlanded-day${w.tick/6000}-${version}-${seed}.json`,JSON.stringify(checkpoint()));
      console.info(`Atterrissage ${seed}: J${w.tick/6000}, ${ledger.riceHarvested} riz récoltés, ${ledger.riceMeals} repas au riz, ${Object.values(ledger.riceHarvestsByCell).filter(n=>n>=2).length}/80 cases récoltées deux fois, ${w.jobs.length} travaux`);
    }
  }
  const final=observe(),runtimeMs=performance.now()-started,report={protocol:'food-chain-v84',instrumentation:2,seed,resumed:!!resumed,runtimeMs,initial,ledger,milestones,journal,observations,final};
  writeFileSync(`tmp/crashlanded-final-${version}-${seed}.json`,serializeWorld(w));writeFileSync(`artifacts/crashlanded-colony-${version}-${seed}.json`,JSON.stringify(report));
  const context=JSON.stringify({seed,milestones,ledger,final});
  const survivors=w.pawns.filter(isColonist);expect(survivors,context).toHaveLength(3);
  expect(survivors.every(p=>p.state!=='dead'&&p.state!=='downed'&&p.hunger>0&&p.rest>0),context).toBe(true);
  expect(final.beds,context).toBe(3);expect(final.shelteredBeds,context).toBe(3);
  expect(final.walls,context).toBe(15);expect(final.doors,context).toBe(1);
  expect(final.foodChain.zones,context).toEqual(expect.arrayContaining([expect.objectContaining({plant:'rice',cells:80}),expect.objectContaining({plant:'potato',cells:24}),expect.objectContaining({plant:'corn',cells:24})]));
  expect(final.foodChain.coveredStockCells,context).toBeGreaterThanOrEqual(24);
  expect(final.foodChain.stations,context).toEqual(expect.arrayContaining([expect.objectContaining({kind:'fueled-stove',roofed:true}),expect.objectContaining({kind:'butcher-table',roofed:true})]));
  expect(ledger.mealsByStation['fueled-stove'],context).toBeGreaterThan(0);
  expect(milestones.firstButchery,context).toBeGreaterThan(milestones.butcherTable!);
  expect(Object.values(ledger.meals).every(n=>n>=12),context).toBe(true);expect(Object.values(ledger.sleep).every(n=>n>1000),context).toBe(true);
  expect(final.stored.component,context).toBe(30);expect(final.stored.steel,context).toBe(370);
  expect(final.food.nutrition,context).toBeGreaterThan(0);expect(milestones.stockMoved,context).toBeGreaterThan(0);
  expect(milestones.shelter,context).toBeGreaterThan(0);
  expect(ledger.lastSurvivalMealTick,context).toBeLessThanOrEqual(17*6000);
  // Includes raw berries/crops as well as cooked meals. Crop cooking and rice
  // cycles have their own assertions; this only proves ingestion without rations.
  expect(Object.values(ledger.nonRationIngestionsLastWeek).every(n=>n>=6),context).toBe(true);
  expect(ledger.riceHarvested,context).toBeGreaterThan(0);expect(ledger.riceMeals,context).toBeGreaterThan(0);
  expect(ledger.riceCooked,context).toBeGreaterThan(0);expect(ledger.riceCooked,context).toBeLessThanOrEqual(ledger.riceHarvested);
  expect(milestones.firstCropMeal,context).toBeGreaterThan(milestones.riceHarvested!);
  expect(milestones.secondRiceCycle,context).toBeGreaterThan(milestones.riceHarvested!);
  expect(milestones.potatoGrowing,context).toBeGreaterThan(0);expect(milestones.cornGrowing,context).toBeGreaterThan(0);
  expect(milestones.firstRaid,context).toBe(32400);expect(milestones.raidOver,context).toBeGreaterThan(32400);
  expect(w.raids?.active,context).toBeUndefined();expect(w.raids?.last?.reason,context).not.toBe('colony-down');
  expect(w.pawns.filter(isColonist).every(p=>!p.draft),context).toBe(true);
  // Corn sown after the first rice harvest can legitimately remain immature at
  // J24. Presence, maturity, harvest and cooking are reported separately. No
  // Reserve rations may remain stored: the last seven days must be supplied
  // without eating them, not by confiscating the emergency stock. No
  // growth/need/deadline is changed to make all food appear in this one run.
  // Watchdog includes doubled simulated duration and a larger real farm. This
  // is a hang limit, not a simulation performance acceptance threshold.
},1200000);
