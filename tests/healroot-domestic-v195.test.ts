import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { cropProduct,isCropKindInVersion } from '../src/sim/crops.ts';
import { jobDuration,scheduleGrowing,sowingJobAllowed } from '../src/sim/farming.ts';
import { gatherResource,clearingDuration } from '../src/sim/gathering.ts';
import { addMaterial,refreshStock } from '../src/sim/materials.ts';
import { orderReadiness,queryOrderOptions } from '../src/sim/player-orders.ts';
import { plantSkill } from '../src/sim/plant-skills.ts';
import { berryYield,harvestable,harvestRoll,plantGrowth,PLANT_DEFINITIONS } from '../src/sim/plants.ts';
import { advancePlantLife,applyPlantFrost,createPlantLife,plantLeafless } from '../src/sim/plant-life.ts';
import { resourceMaxHp } from '../src/sim/thing-damage-rules.ts';
import { plantNutrition } from '../src/sim/biome-flora.ts';
import { animalFoods,animalMealTarget,finishAnimalMeal } from '../src/sim/wildlife-food.ts';
import { enableWildlife } from '../src/sim/wildlife.ts';
import { planWork,type SearchBudget } from '../src/sim/work-planner.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import { conduitKeepsPlant } from '../src/sim/power-construction.ts';
import { controlledInjury } from './scenarios/health.ts';
import { HP_UNIT } from '../src/sim/injury-rules.ts';
import { climaticHealrootCamp,cultivatedHealroot,healrootCamp } from './helpers/healroot-domestic-v195.ts';
import type { Job,World } from '../src/sim/types.ts';
import type { WildAnimal } from '../src/sim/wildlife-state.ts';

function field(world:World,x=5,z=4,plant:World['growingZones'][number]['plant']='healroot'):Job {
  expect(applyCommand(world,{type:'area',action:'growing',from:{x,z},to:{x,z}}).ok).toBe(true);
  const zone=world.growingZones.at(-1)!;
  expect(applyCommand(world,{type:'growing-policy',zoneId:zone.id,plant,allowSow:true,allowCut:true}).ok).toBe(true);
  scheduleGrowing(world);
  const job=world.jobs.find(j=>j.growingZoneId===zone.id&&j.kind==='sow');
  if(!job)throw new Error('Prepared neutral field must create a real sowing intention.');
  return job;
}
function until(world:World,condition:()=>boolean,limit=240):void {
  for(let n=0;n<limit&&!condition();n++)stepWorld(world);
  expect(condition()).toBe(true);
}

test('the cultivated definition is medical, versioned, and has separate work budgets',()=>{
  const world=healrootCamp(),job=field(world),plant=cultivatedHealroot(world);
  expect(isCropKindInVersion('healroot',181)).toBe(false);
  expect(isCropKindInVersion('healroot',182)).toBe(true);
  expect(cropProduct('healroot')).toBe('herbal-medicine');
  expect(PLANT_DEFINITIONS.healroot).toMatchObject({growDays:7,minFertility:.7,sensitivity:1,yield:1,afterHarvest:0});
  expect(resourceMaxHp(plant)).toBe(60);
  expect(jobDuration(world,job)).toBe(80);
  expect(jobDuration(world,{...job,kind:'harvest'},plant)).toBe(40);
  expect(clearingDuration(plant)).toBe(20);
  expect(conduitKeepsPlant('power-conduit','healroot')).toBe(false);
  expect(conduitKeepsPlant('power-conduit','rice')).toBe(true);
  expect(plantNutrition(plant,1)).toBe(.2);
});

test('both planner paths and forced admission require Plants8 only for sowing',()=>{
  for(const full of [false,true]){
    const world=healrootCamp(),pawn=world.pawns[0]!,job=field(world);
    if(full){pawn.priorities.grow=2;pawn.priorities.haul=1;}
    pawn.skills.plants!.level=7;
    const before=JSON.stringify(world);
    expect(sowingJobAllowed(world,pawn,job)).toBe(false);
    expect(queryOrderOptions(world,pawn.id,job).find(o=>o.jobId===job.id)).toMatchObject({enabled:false,reason:expect.stringContaining('Plantes 8')});
    expect(applyCommand(world,{type:'order-job',pawnId:pawn.id,jobId:job.id,queue:false}).ok).toBe(false);
    expect(JSON.stringify(world)).toBe(before);
    planWork(world,pawn,()=>blockedCells(world),new Set(),{remaining:3,pairs:100});
    expect(pawn.jobId).toBeNull();expect(job.reservedBy).toBeNull();
    pawn.skills.plants!.level=8;pawn.planCooldown=0;
    const budget:SearchBudget={remaining:3,pairs:100,stats:{searches:[]}};
    planWork(world,pawn,()=>blockedCells(world),new Set(),budget);
    expect(pawn.jobId).toBe(job.id);expect(job.reservedBy).toBe(pawn.id);
    expect(budget.stats!.searches[0]!.mode).toBe(full?'all':'nearest');
  }
  const world=healrootCamp(),pawn=world.pawns[0]!,job=field(world);
  delete pawn.skills.plants;
  expect(sowingJobAllowed(world,pawn,job)).toBe(true);
  expect(pawn.skills.plants).toBeUndefined();
});

test('a low-skilled grower can clear the physical obstruction without accepting its sowing job',()=>{
  const world=healrootCamp(),pawn=world.pawns[0]!,job=field(world);
  pawn.skills.plants!.level=7;
  addMaterial(world,'wood',10,{type:'ground',x:job.x,z:job.z});refreshStock(world);
  const sourceId=world.piles[0]!.id;
  planWork(world,pawn,()=>blockedCells(world),new Set(),{remaining:3,pairs:100});
  expect(pawn.haul?.destination.type).toBe('aside');expect(pawn.jobId).toBeNull();
  until(world,()=>pawn.haul?.phase==='deliver');
  const carryId=pawn.haul!.carryPileId!;
  expect(world.piles.find(p=>p.id===carryId)).toMatchObject({item:'wood',quantity:10,owner:{type:'pawn',pawnId:pawn.id}});
  expect(world.piles.some(p=>p.id===sourceId)).toBe(false);
  until(world,()=>!pawn.haul);
  const deposited=world.piles.find(p=>p.id===carryId)!;
  expect(deposited).toMatchObject({item:'wood',quantity:10,owner:{type:'ground'}});
  if(deposited.owner.type!=='ground')throw new Error('Actual carried wood must have been deposited.');
  expect(deposited.owner.x!==job.x||deposited.owner.z!==job.z).toBe(true);
  expect(Math.abs(pawn.x-deposited.owner.x)+Math.abs(pawn.z-deposited.owner.z)).toBeLessThanOrEqual(1);
  expect(world.piles.reduce((sum,p)=>sum+(p.item==='wood'?p.quantity:0),0)).toBe(10);
  stepWorld(world,30);
  expect(world.resources.some(r=>r.kind==='healroot')).toBe(false);
  expect(job.reservedBy).toBeNull();
});

test('real contact sowing keeps accepted work after a level loss and resumes without free plant or XP',()=>{
  const world=healrootCamp(),pawn=world.pawns[0]!,job=field(world);
  Object.assign(pawn,{x:2,z:4});
  expect(applyCommand(world,{type:'order-job',pawnId:pawn.id,jobId:job.id,queue:false}).ok).toBe(true);
  const xp=plantSkill(pawn).xp;
  stepWorld(world);
  expect(job.progress).toBe(0);expect(plantSkill(pawn).xp).toBe(xp);
  until(world,()=>job.progress>0);
  expect(Math.abs(pawn.x-job.x)+Math.abs(pawn.z-job.z)).toBe(1);
  expect(world.resources).toEqual([]);
  expect(plantSkill(pawn).xp).toBeGreaterThan(xp);
  pawn.skills.plants!.level=7;
  expect(orderReadiness(world,pawn,job,true)).toBeUndefined();
  expect(sowingJobAllowed(world,pawn,job)).toBe(false);
  const resumed=deserializeWorld(serializeWorld(world));
  for(let n=0;n<120&&world.jobs.some(j=>j.id===job.id);n++){stepWorld(world);stepWorld(resumed);}
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));
  expect(world.resources).toHaveLength(1);
  expect(world.resources[0]).toMatchObject({kind:'healroot',amount:1,growth:.0001,growthTick:world.tick});
  expect(world.piles).toEqual([]);expect(validateWorld(world)).toEqual([]);
});

test('exclusive queued sowing is accepted once, and changing its zone still cancels conservatively',()=>{
  const world=healrootCamp(),pawn=world.pawns[0]!,first=field(world,5,4,'rice'),second=field(world,5,6);
  expect(applyCommand(world,{type:'order-job',pawnId:pawn.id,jobId:first.id,queue:false}).ok).toBe(true);
  expect(applyCommand(world,{type:'order-job',pawnId:pawn.id,jobId:second.id,queue:true}).ok).toBe(true);
  pawn.skills.plants!.level=7;
  expect(second.reservedBy).toBe(pawn.id);
  expect(orderReadiness(world,pawn,second,true)).toBeUndefined();
  until(world,()=>pawn.jobId===second.id);
  expect(world.resources.some(r=>r.kind==='rice')).toBe(true);
  const zone=world.growingZones.find(z=>z.id===second.growingZoneId)!;
  const rng=world.rng;
  expect(applyCommand(world,{type:'growing-policy',zoneId:zone.id,plant:'corn',allowSow:false,allowCut:true}).ok).toBe(true);
  expect(pawn.jobId).toBeNull();expect(pawn.orders.queue).toEqual([]);
  expect(world.jobs.some(j=>j.id===second.id)).toBe(false);
  expect(world.resources.some(r=>r.kind==='healroot')).toBe(false);expect(world.rng).toBe(rng);
});

test('harvesting below Plants8 uses growth and60PV, with real zero results and sterile clearing',()=>{
  const world=healrootCamp(),pawn=world.pawns[0]!,plant=cultivatedHealroot(world);
  plant.growth=.65;expect(harvestable(world,plant)).toBe(false);
  plant.growth=.6501;expect(harvestable(world,plant)).toBe(true);
  expect(berryYield(world,plant)).toBeCloseTo(.5001428571428571,10);
  plant.growth=1;plant.damage=30;expect(berryYield(world,plant)).toBe(.75);
  const rice={...plant,kind:'rice' as const,amount:6};expect(berryYield(world,rice)).toBe(6);
  pawn.skills.plants!.level=0;world.rng=12345;
  // Independent xorshift oracle: this first draw exceeds the healthy level0
  // success chance .60, so failure uses exactly one draw and destroys the root.
  let expectedRng=12345;expectedRng^=expectedRng<<13;expectedRng^=expectedRng>>>17;expectedRng^=expectedRng<<5;expectedRng>>>=0;
  expect(expectedRng/0x100000000).toBeGreaterThan(.60);
  const failed=harvestRoll(world,plant,pawn);
  expect(failed).toEqual({quantity:0,rng:expectedRng});
  expect(gatherResource(world,plant,'harvest',undefined,pawn)).toBe(0);
  expect(world.rng).toBe(failed.rng);expect(world.resources).toEqual([]);expect(world.piles).toEqual([]);
  const clearing=cultivatedHealroot(world),rng=world.rng;
  expect(gatherResource(world,clearing,'cut',undefined,pawn)).toBe(0);
  expect(world.rng).toBe(rng);expect(world.resources).toEqual([]);expect(world.piles).toEqual([]);
});

test('saturated positive output refuses atomically, then a low-skilled real harvest creates a medicine pile',()=>{
  const saturated=healrootCamp(),plant=cultivatedHealroot(saturated);
  for(let z=0;z<saturated.height;z++)for(let x=0;x<saturated.width;x++)addMaterial(saturated,'wood',75,{type:'ground',x,z});
  refreshStock(saturated);saturated.rng=42;
  expect(harvestRoll(saturated,plant,saturated.pawns[0]).quantity).toBe(1);
  const before=JSON.stringify(saturated);
  expect(gatherResource(saturated,plant,'harvest',undefined,saturated.pawns[0])).toBeNull();
  expect(JSON.stringify(saturated)).toBe(before);
  const world=healrootCamp(),pawn=world.pawns[0]!,root=cultivatedHealroot(world);
  pawn.skills.plants!.level=7;world.rng=42;
  expect(applyCommand(world,{type:'designate',kind:'harvest',x:root.x,z:root.z}).ok).toBe(true);
  const harvest=world.jobs[0]!;
  expect(applyCommand(world,{type:'order-job',pawnId:pawn.id,jobId:harvest.id,queue:false}).ok).toBe(true);
  until(world,()=>!world.resources.some(r=>r.id===root.id));
  expect(world.piles).toHaveLength(1);
  expect(world.piles[0]).toMatchObject({kind:'medicine',item:'herbal-medicine',quantity:1,owner:{type:'ground'}});
  expect(world.stock.food).toBe(0);expect(validateWorld(world)).toEqual([]);
});

test('the cultivated root loses leaves in frost, keeps growth/yield access, and ages at56biologicaldays',()=>{
  const world=climaticHealrootCamp(),plant=cultivatedHealroot(world,.8);
  const rice={...plant,id:world.nextId++,kind:'rice' as const,x:7,plantLife:createPlantLife(world,{id:world.nextId-1},true)};
  world.resources=[...world.resources,rice];
  expect(applyPlantFrost(world,plant,true,-25)).toBe(false);
  expect(world.resources.includes(plant)).toBe(true);expect(plantLeafless(world,plant)).toBe(true);
  expect(harvestable(world,plant)).toBe(true);
  expect(applyPlantFrost(world,rice,true,-25)).toBe(true);
  expect(world.resources.includes(rice)).toBe(false);
  world.tick+=1000;expect(plantGrowth(world,plant)).toBeGreaterThan(.8);
  expect(plantLeafless(world,plant)).toBe(true);
  world.tick=plant.plantLife!.leaflessAt!+6000;
  applyPlantFrost(world,plant,true,21);expect(plantLeafless(world,plant)).toBe(false);
  const aged=climaticHealrootCamp(),old=cultivatedHealroot(aged),life=old.plantLife!;
  const layout={rooms:[],doors:[],indices:new Int32Array(aged.width*aged.height).fill(-1)};
  const first=life.nextCheck;
  aged.tick=first+56*6000-200;life.nextCheck=aged.tick;life.age=aged.tick-200-life.since;
  advancePlantLife(aged,layout);expect(old.damage).toBeUndefined();
  aged.tick+=200;advancePlantLife(aged,layout);
  expect(old.damage).toBe(10);expect(life.age).toBeGreaterThan(56*6000);
});

test('grazing is65%/.2 nutrition, excludes claimed or leafless plants, and never eats herbalmedicine',()=>{
  const world=climaticHealrootCamp(),plant=cultivatedHealroot(world,.64);
  enableWildlife(world,0);
  const animal:WildAnimal={id:world.nextId++,species:'hare',sex:'female',ageTicks:100000,x:4,z:4,food:0,rest:80,state:'idle',path:[],nextDecision:world.tick};
  world.wildlife!.animals=[animal];
  addMaterial(world,'medicine',1,{type:'ground',x:6,z:4},'herbal-medicine');
  expect(animalFoods(world,animal)).toEqual([]);
  plant.growth=.65;
  expect(animalFoods(world,animal).map(f=>f.id)).toEqual([plant.id]);
  animal.meal={kind:'plant',id:plant.id,quantity:1,progress:20};
  const before=world.wildlife!.eatenNutrition;
  finishAnimalMeal(world,animal);
  expect(world.wildlife!.eatenNutrition-before).toBeCloseTo(.13,12);
  expect(world.resources.some(r=>r.id===plant.id)).toBe(false);
  expect(world.piles[0]).toMatchObject({kind:'medicine',quantity:1});
  const root=cultivatedHealroot(world,1);animal.meal={kind:'plant',id:root.id,quantity:1,progress:0};
  root.plantLife!.leaflessAt=world.tick;
  expect(animalMealTarget(world,animal)).toBeUndefined();
  delete root.plantLife!.leaflessAt;
  world.jobs=[{id:world.nextId++,kind:'harvest',x:root.x,z:root.z,orientation:0,footprint:'standard',progress:0,status:'active',reservedBy:world.pawns[0]!.id,escrow:{food:0,wood:0}}];
  expect(animalMealTarget(world,animal)).toBeUndefined();
});

test('a physically harvested and stored herbal dose is collected and consumed only by a completed real soin',()=>{
  const world=healrootCamp(),pawn=world.pawns[0]!,plant=cultivatedHealroot(world);
  expect(applyCommand(world,{type:'designate',kind:'harvest',x:plant.x,z:plant.z}).ok).toBe(true);
  until(world,()=>world.piles.some(p=>p.item==='herbal-medicine'));
  const sourceDoseId=world.piles.find(p=>p.item==='herbal-medicine')!.id;
  expect(applyCommand(world,{type:'stockpile',x:7,z:4,enabled:true,filters:{wood:false,food:false,medicine:true}}).ok).toBe(true);
  pawn.priorities.haul=1;
  until(world,()=>pawn.haul?.phase==='deliver');
  const storedDoseId=pawn.haul!.carryPileId!;
  expect(world.piles.find(p=>p.id===storedDoseId)).toMatchObject({item:'herbal-medicine',quantity:1,owner:{type:'pawn',pawnId:pawn.id}});
  expect(world.piles.some(p=>p.id===sourceDoseId)).toBe(false);
  until(world,()=>!pawn.haul&&world.piles.some(p=>p.id===storedDoseId&&p.owner.type==='ground'&&p.owner.x===7&&p.owner.z===4));
  expect(world.piles.find(p=>p.id===storedDoseId)?.quantity).toBe(1);
  expect(Math.abs(pawn.x-7)+Math.abs(pawn.z-4)).toBeLessThanOrEqual(1);
  pawn.priorities.haul=0;pawn.priorities.doctor=1;pawn.selfTend=true;pawn.medicalCare='herbal';
  controlledInjury(world,pawn,'left-arm',2*HP_UNIT);
  expect(applyCommand(world,{type:'order-tend',pawnId:pawn.id,patientId:pawn.id,queue:false}).ok).toBe(true);
  expect(world.piles.some(p=>p.item==='herbal-medicine'&&p.quantity===1)).toBe(true);
  until(world,()=>pawn.tend?.phase==='tend');
  expect(pawn.tend?.medicine?.carryPileId).toBe(storedDoseId);
  expect(Math.abs(pawn.x-7)+Math.abs(pawn.z-4)).toBeLessThanOrEqual(1);
  expect(world.piles.some(p=>p.item==='herbal-medicine'&&p.quantity===1)).toBe(true);
  until(world,()=>pawn.health!.injuries.some(injury=>injury.tended!==undefined));
  expect(world.piles.some(p=>p.item==='herbal-medicine')).toBe(false);
  expect(validateWorld(world)).toEqual([]);
});
