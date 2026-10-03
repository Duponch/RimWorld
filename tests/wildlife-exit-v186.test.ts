import { expect,test,vi } from 'vitest';
import { createWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { advanceWildlife,enableWildlife,reconcileWildlife } from '../src/sim/wildlife';
import { addGroundMaterial,refreshStock } from '../src/sim/materials';
import { WeightedSearch } from '../src/sim/weighted-search';
import { animalNavigation } from '../src/sim/wildlife-navigation';
import { scareAnimal } from '../src/sim/wildlife-health';
import { finishAnimalExits,stopExitTargeting } from '../src/sim/wildlife-exit';
import { meleeRecoveryCore } from '../src/sim/melee-statistics';
import type { World } from '../src/sim/types';

function fixture(){
  const w=createWorld(186,16,16);w.tiles=w.tiles.map(()=>({terrain:'grass'}));
  w.structures=[];w.jobs=[];w.piles=[];w.packed=[];refreshStock(w);
  w.resources=[{id:w.nextId++,kind:'berries',x:4,z:4,amount:10,growth:1,growthTick:0}];
  enableWildlife(w,1);w.resources=[];
  const a=w.wildlife!.animals[0]!;a.x=4;a.z=4;a.food=0;a.rest=1;a.nextDecision=0;
  return {w,a};
}
function advance(w:World,n=1){for(let i=0;i<n;i++){w.tick++;advanceWildlife(w);refreshStock(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}}
function until(w:World,predicate:()=>boolean,n=600){for(let i=0;i<n&&!predicate();i++)advance(w);expect(predicate()).toBe(true);}
const wall=(w:World,x:number,z:number)=>w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard'});

test('accessible food takes priority even far away; no remote nutrition and real ingestion',()=>{
  const {w,a}=fixture();w.resources=[{id:w.nextId++,kind:'berries',x:13,z:12,amount:10,growth:1,growthTick:0}];
  advance(w);expect(a.exiting).toBeUndefined();expect(a.meal?.kind).toBe('plant');expect(a.food).toBe(0);
  until(w,()=>a.state==='eating');expect(a.food).toBe(0);
  until(w,()=>w.wildlife!.eatenNutrition>0);expect(a.food).toBeGreaterThan(0);
  expect(w.wildlife!.exitedAnimals).toBeUndefined();
});

test('one failed food flood also supplies an exit; walls retain a starving animal',()=>{
  const {w,a}=fixture();w.pawns=[];
  w.resources=[{id:w.nextId++,kind:'berries',x:10,z:10,amount:10,growth:1,growthTick:0}];
  for(let z=8;z<=12;z++)for(let x=8;x<=12;x++)if(x===8||x===12||z===8||z===12)wall(w,x,z);
  const spy=vi.spyOn(WeightedSearch.prototype,'finish');
  try{const route=animalNavigation(w,false,true).foodOrExitRoute(a,[{x:10,z:10}]);expect(route?.kind).toBe('exit');expect(spy).toHaveBeenCalledTimes(1);}finally{spy.mockRestore();}
  for(let z=2;z<=6;z++)for(let x=2;x<=6;x++)if(x===2||x===6||z===2||z===6)wall(w,x,z);
  advance(w,220);expect(w.wildlife!.animals).toContain(a);expect(a.exiting).toBeUndefined();
  expect(a.food).toBe(0);expect(w.wildlife!.exitedAnimals).toBeUndefined();
});

test('arrival waits for its physical edge; continuation preserves identity and counts departure once',()=>{
  const {w,a}=fixture(),nextId=w.nextId;
  advance(w);expect(a.exiting).toBeDefined();expect(w.wildlife!.animals).toContain(a);
  until(w,()=>!a.path.length&&(a.x===0||a.z===0||a.x===15||a.z===15));
  expect(a.motion!.end).toBeGreaterThan(w.tick);
  const resumed=deserializeWorld(serializeWorld(w));
  while(w.tick<a.motion!.end){advance(w);advance(resumed);expect(resumed).toEqual(w);}
  until(w,()=>!w.wildlife!.animals.some(x=>x.id===a.id));
  while(resumed.tick<w.tick)advance(resumed);
  expect(resumed).toEqual(w);expect(w.wildlife!.exitedAnimals).toBe(1);
  expect(w.nextId).toBe(nextId);expect(w.piles).toEqual([]);
  advance(w,20);expect(w.wildlife!.exitedAnimals).toBe(1);
  expect(w.events.filter(e=>e.message.includes('a quitté la carte'))).toHaveLength(1);
});

test('new food cancels exit at a check; an added obstacle cannot teleport the animal',()=>{
  const {w,a}=fixture();advance(w);
  const blocked=a.path[0]!;wall(w,blocked.x,blocked.z);advance(w);
  expect(a.path).toEqual([]);expect(w.wildlife!.animals).toContain(a);
  addGroundMaterial(w,'food',10,{x:14,z:14},'rice');refreshStock(w);const pile=w.piles[0]!;
  until(w,()=>a.meal?.id===pile.id);
  expect(a.exiting).toBeUndefined();expect(a.food).toBe(0);expect(w.wildlife!.exitedAnimals).toBeUndefined();
});

test('sleep, ownership and danger suppress exit without discarding captured motion',()=>{
  const {w,a}=fixture();a.state='sleeping';a.rest=.2;advance(w,25);
  expect(a.state).toBe('sleeping');expect(a.exiting).toBeUndefined();
  a.state='idle';a.rest=1;a.nextDecision=w.tick;advance(w);expect(a.exiting).toBeDefined();
  advance(w);const segment=structuredClone(a.motion);
  scareAnimal(w,a,{x:5,z:5},w.tick*10);expect(a.exiting).toBeUndefined();expect(a.motion).toEqual(segment);
  delete a.flee;delete a.sleepUntilCore;a.state='idle';a.path=[];delete a.motion;
  a.domestic={since:w.tick,care:'none',tameness:5,nextDecay:w.tick+6000};a.nextDecision=w.tick;
  reconcileWildlife(w);advance(w,150);expect(a.exiting).toBeUndefined();expect(w.wildlife!.animals).toContain(a);
});

test('target cancellation preserves melee recovery; saturation refuses an identity loss',()=>{
  const {w,a}=fixture(),p=w.pawns[0]!;
  p.melee={order:null,strike:{targetId:a.id,atCore:0,untilCore:meleeRecoveryCore('left-fist'),tool:'left-fist',outcome:'miss'}};
  const recovery=structuredClone(p.melee.strike);
  expect(stopExitTargeting(w,a.id)).toBe(true);expect(p.melee.strike).toEqual(recovery);
  delete p.melee;a.x=0;a.z=4;a.path=[];a.exiting={destination:{x:0,z:4},nextFoodCheck:0};
  w.wildlife!.exitedAnimals=Number.MAX_SAFE_INTEGER;
  finishAnimalExits(w,new Set([a.id]));expect(w.wildlife!.animals).toContain(a);
  expect(w.wildlife!.exitedAnimals).toBe(Number.MAX_SAFE_INTEGER);expect(w.piles).toEqual([]);
});
