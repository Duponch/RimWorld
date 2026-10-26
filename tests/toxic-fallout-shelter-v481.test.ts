import {describe,expect,it} from 'vitest';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {processAnimalFalloutShelter294,type AnimalFalloutShelterContext294} from '../src/sim/animal-fallout-shelter-294.ts';
import {animalPenAt,invalidateAnimalPens} from '../src/sim/animal-pens.ts';
import {isRoofed,roofIndex} from '../src/sim/roof-rules.ts';
import {constructFreshInitialWildAnimal256} from '../src/sim/initial-animal-constructor-256.ts';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {enableWildlife,advanceWildlife} from '../src/sim/wildlife.ts';
import {animalNutritionMax} from '../src/sim/animal-life.ts';
import type {Cell,Structure} from '../src/sim/types.ts';

/** Controlled original deer/enclosure, not a played taming or generated pen.
 * Initial full needs isolate the low-priority wander node from hunger/rest;
 * no needs are refilled once the local route starts. */
function scene(){
 const w=deconstructionCamp();w.tick=100;
 const made=constructFreshInitialWildAnimal256({fact:INITIAL_ANIMAL_FACTS_256.Deer,id:w.nextId,cell:{x:10,z:12},tick:w.tick,random:new WorldGenerationRandom(w.seed)});
 if(made.status!=='ready')throw Error('Declared original deer unavailable: '+made.reason);
 const a=made.animal;w.nextId++;enableWildlife(w,0);w.wildlife!.animals.push(a);
 for(let x=8;x<=16;x++){fixtureBuilding(w,'fence',x,8);fixtureBuilding(w,'fence',x,16);}
 for(let z=9;z<16;z++){fixtureBuilding(w,'fence',8,z);fixtureBuilding(w,'fence',16,z);}
 const marker=fixtureBuilding(w,'pen-marker',10,10) as Structure;marker.pen={accepted:['deer']};
 a.domestic={since:w.tick,care:'none',tameness:5,nextDecay:w.tick+6000,penMarkerId:marker.id};
 a.food=animalNutritionMax(a);a.rest=1;a.nextDecision=w.tick;a.path=[];a.state='idle';
 w.roofing={constructed:[12*w.width+14,13*w.width+14],build:[],remove:[],cursor:0};
 w.miscIncidents={profile:'cassandra-misc-v1',adoptedAt:0,rng:1,nextCheck:1200,introDone:true,checks:0,opportunities:1,heatwaves:0,
  toxicFallout:{adoptedAt:0,count:1,lastStart:0,active:{startCore:0,endCore:1_000_000,rng:77,cursor:0}}};
 return {w,a,marker};
}
function services(route:Cell[]|undefined,quota=true){
 const counts={searches:0,routes:0,starts:0,moves:0},targets:Cell[][]=[];
 const c:AnimalFalloutShelterContext294={nav:{free:()=>true,step:()=>true,route(_a,goals){counts.routes++;targets.push(goals);return route;}},
  takeSearch(){if(!quota)return false;counts.searches++;return true;},startJob(){counts.starts++;},move(){counts.moves++;}};
 return {c,counts,targets};
}

describe('actual penned-roamer fallout shelter294',()=>{
 it('uses one granted frontier toward a real roof in its current closed connected pen',()=>{
  const {w,a}=scene(),pen=animalPenAt(w,a.x,a.z)!;
  expect(pen.closed).toBe(true);const path=[{x:11,z:12},{x:12,z:12},{x:13,z:12},{x:14,z:12}],s=services(path),rng=w.rng;
  expect(processAnimalFalloutShelter294(w,a,s.c)).toBe(1);
  expect(s.counts).toEqual({searches:1,routes:1,starts:1,moves:1});expect(a.path).toBe(path);
  expect(a.wander?.job).toEqual({kind:'goto',destination:{x:14,z:12}});
  expect(s.targets.flat().every(c=>pen.cells.has(roofIndex(w,c))&&isRoofed(w,roofIndex(w,c)))).toBe(true);expect(w.rng).toBe(rng);
 });

 it('waits for the shared search quota without inventing a path or changing the mind',()=>{
  const {w,a}=scene(),before=structuredClone(a),s=services([{x:14,z:12}],false);
  expect(processAnimalFalloutShelter294(w,a,s.c)).toBe(1);expect(a).toEqual(before);
  expect(s.counts).toEqual({searches:0,routes:0,starts:0,moves:0});
  s.c.startNew=false;expect(processAnimalFalloutShelter294(w,a,s.c)).toBe(0);expect(a).toEqual(before);
 });

 it('does not construct roof candidates after another real job has consumed the shared phase budget',()=>{
  const {w,a}=scene(),s=services(undefined);
  s.c.canSearch=()=>false;s.c.nav.free=()=>{throw Error('No candidate work is permitted after the phase budget');};
  const before=structuredClone(a);expect(processAnimalFalloutShelter294(w,a,s.c)).toBe(1);expect(a).toEqual(before);
  expect(s.counts).toEqual({searches:0,routes:0,starts:0,moves:0});
 });

 it('does not turn an open enclosure, missing roof, wild animal or non-roamer into a shelter',()=>{
  for(const mode of ['open','no-roof','wild'] as const){
   const {w,a}=scene();
   if(mode==='open'){w.structures=w.structures.filter(s=>!(s.kind==='fence'&&s.x===8&&s.z===12));invalidateAnimalPens(w);expect(animalPenAt(w,a.x,a.z)?.closed).toBe(false);}
   if(mode==='no-roof')w.roofing!.constructed=[];
   if(mode==='wild')delete a.domestic;
   const before=structuredClone(a),s=services([{x:14,z:12}]);expect(processAnimalFalloutShelter294(w,a,s.c)).toBe(0);expect(a).toEqual(before);expect(s.counts.searches).toBe(0);
  }
  const {world:w,animal:a}=animalHaulingCamp459(),s=services([{x:14,z:12}]);
  w.miscIncidents={profile:'cassandra-misc-v1',adoptedAt:0,rng:1,nextCheck:1200,introDone:true,checks:0,opportunities:1,heatwaves:0,toxicFallout:{adoptedAt:0,count:1,lastStart:0,active:{startCore:0,endCore:1_000_000,rng:77,cursor:0}}};
  expect(processAnimalFalloutShelter294(w,a,s.c)).toBe(0);expect(s.counts.searches).toBe(0);
 });

 it('rejects a route leaving the actual pen and cannot use a covered disconnected cell',()=>{
  const {w,a}=scene(),before=structuredClone(a),s=services([{x:7,z:12},{x:14,z:12}]);
  expect(processAnimalFalloutShelter294(w,a,s.c)).toBe(0);expect(a).toEqual(before);expect(s.counts.starts).toBe(0);
  w.roofing!.constructed=[20*w.width+20];const unavailable=services([{x:20,z:20}]);
  expect(processAnimalFalloutShelter294(w,a,unavailable.c)).toBe(0);expect(unavailable.counts.searches).toBe(0);
 });

 it('only revokes future uncovered wander steps under an active roof and does not force travel at the end',()=>{
  const {w,a}=scene();a.x=14;a.z=12;a.path=[{x:13,z:12}];a.state='moving';
  if(a.wander)a.wander.job={kind:'goto',destination:{x:13,z:12}};
  const s=services(undefined);s.c.startNew=false;
  expect(processAnimalFalloutShelter294(w,a,s.c)).toBe(2);expect(a.path).toEqual([]);expect(a.state).toBe('idle');expect(s.counts.searches).toBe(0);
  a.path=[{x:13,z:12}];if(a.wander)a.wander.job={kind:'goto',destination:{x:13,z:12}};
  delete w.miscIncidents!.toxicFallout!.active;const before=structuredClone(a);
  expect(processAnimalFalloutShelter294(w,a,s.c)).toBe(0);expect(a).toEqual(before);expect(s.counts.moves).toBe(0);
 });

 it('leaves existing danger, meal, transport suspension and medical incapacity owners untouched',()=>{
  for(const mode of ['danger','meal','held','downed','sleeping'] as const){
   const {w,a}=scene();
   if(mode==='danger')a.flee={danger:{x:11,z:12},until:w.tick+200};
   if(mode==='meal')a.meal={kind:'pile',id:123,quantity:1,progress:0};
   if(mode==='held')a.shipCryptosleepHeldAt277=w.tick;
   if(mode==='downed')a.state='downed';if(mode==='sleeping')a.state='sleeping';
   const before=structuredClone(a),s=services([{x:14,z:12}]);expect(processAnimalFalloutShelter294(w,a,s.c)).toBe(0);expect(a).toEqual(before);expect(s.counts.searches).toBe(0);
  }
 });

 it('the actual wildlife scheduler walks a complete local route then keeps physical wandering under the roof',()=>{
  const {w,a}=scene(),origin={x:a.x,z:a.z};let reached=false,travelled=false;
  advanceWildlife(w);expect(a.motion?.from).toEqual(origin);expect(a.motion?.to).not.toEqual({x:14,z:12});
  for(let n=0;n<100;n++){
   const physical=a.motion&&a.motion.end>w.tick?a.motion.from:a;
   if(isRoofed(w,roofIndex(w,physical)))reached=true;
   if(reached){expect(isRoofed(w,roofIndex(w,physical))).toBe(true);if(a.motion&&a.motion.end>w.tick)expect(isRoofed(w,roofIndex(w,a.motion.to))).toBe(true);}
   if(a.motion){travelled=true;expect(Math.max(Math.abs(a.motion.to.x-a.motion.from.x),Math.abs(a.motion.to.z-a.motion.from.z))).toBeLessThanOrEqual(1);}
   w.tick++;advanceWildlife(w);
  }
  expect(travelled).toBe(true);expect(reached).toBe(true);expect(animalPenAt(w,a.x,a.z)?.closed).toBe(true);
 });
});
