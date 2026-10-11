import { test,expect } from 'vitest';
import { huntingCamp } from './scenarios/hunting.ts';
import { stepWorld } from '../src/sim/index.ts';
import { animalNavigation,moveAnimal } from '../src/sim/wildlife-navigation.ts';
import { animalNutritionMax } from '../src/sim/animal-life.ts';
import { createMedicalRecord,addResolvedInjury } from '../src/sim/injury-state.ts';
import { processAnimalRest,reconcileAnimalRest,releaseAnimalSpotBindings,animalRestingSpot,animalSpotAvailable } from '../src/sim/animal-rest.ts';
import { animalSpotClaimed } from '../src/sim/animal-rest-state.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { validateWorld,serializeWorld,deserializeWorld } from '../src/sim/serialization.ts';
import type { World,Structure } from '../src/sim/types.ts';
import type { WildAnimal } from '../src/sim/wildlife-state.ts';

function camp(){
  const world=huntingCamp(),pawn=world.pawns[0]!,animal=world.wildlife!.animals[0]!;
  world.pawns=[pawn];world.piles=[];world.structures=[];world.resources=[];world.stockpiles=[];world.growingZones=[];
  for(const key of Object.keys(pawn.priorities) as (keyof typeof pawn.priorities)[])pawn.priorities[key]=0;
  Object.assign(pawn,{x:4,z:4});Object.assign(animal,{x:12,z:8,path:[],nextDecision:world.tick,food:animalNutritionMax(animal)*.99,rest:.2,state:'idle'});
  delete animal.motion;animal.domestic={since:world.tick,care:'herbal',tameness:5,nextDecay:world.tick+45000,lastTraining:world.tick};
  const spot:Structure={id:world.nextId++,kind:'animal-sleeping-spot',x:14,z:8,orientation:0,footprint:'standard'};world.structures.push(spot);
  refreshStock(world);expect(validateWorld(world)).toEqual([]);return {world,pawn,animal,spot};
}
function until(w:World,predicate:()=>boolean,max=100){for(let i=0;i<max&&!predicate();i++)stepWorld(w,1);expect(predicate()).toBe(true);}
function restDecision(w:World,a:WildAnimal,medicalRest=false){
  const nav=animalNavigation(w);let searches=0;
  const result=processAnimalRest(w,a,{free:nav.free,step:nav.step,medicalRest,night:false,nutrition:animalNutritionMax(a),
    route:(goals,rank)=>{searches++;return nav.route(a,goals,rank);},move:()=>{moveAnimal(w,a,nav.step);}});
  return {result,searches};
}

test('ordinary wildlife travels to and owns a normal place, then sleeps and restores rest',()=>{
  const {world,animal,spot}=camp();
  until(world,()=>animal.animalRest?.phase==='travel');expect(animal.domestic!.bedId).toBe(spot.id);
  expect(animalSpotClaimed(world,spot.id)).toBe(true);expect(animal.motion!.end).toBeGreaterThan(world.tick);
  expect(validateWorld(world)).toEqual([]);expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  until(world,()=>animal.animalRest?.phase==='sleep');const before=animal.rest;stepWorld(world,3);
  expect(animalRestingSpot(world,animal)).toBe(spot);expect(animal.rest).toBeGreaterThan(before);
  expect(animal.state).toBe('sleeping');expect(validateWorld(world)).toEqual([]);
});

test('navigation without rank keeps historical closest-route choice; ranking prefers medical then owned in the same flood',()=>{
  const {world,animal,spot}=camp();const medical:Structure={...spot,id:world.nextId++,x:18,medical:true};world.structures.push(medical);
  const nav=animalNavigation(world);expect(nav.route(animal,[medical,spot])!.at(-1)).toEqual({x:spot.x,z:spot.z});
  animal.health={...createMedicalRecord(world.tick),body:'hare'};addResolvedInjury(animal.health,'left-front-leg','bruise',500,()=>.999999);
  animal.domestic!.bedId=spot.id;
  expect(restDecision(world,animal,true)).toEqual({result:true,searches:1});expect(animal.animalRest!.spotId).toBe(medical.id);
  expect(animal.domestic!.bedId).toBe(spot.id);
});

test('unreachable medical place falls back to assigned normal without a second search',()=>{
  const {world,animal,spot}=camp();animal.health={...createMedicalRecord(world.tick),body:'hare'};
  addResolvedInjury(animal.health,'left-front-leg','bruise',500,()=>.999999);animal.domestic!.bedId=spot.id;
  world.structures.push({...spot,id:world.nextId++,x:13}); // A closer free normal place must not displace the owned one.
  const medical:Structure={...spot,id:world.nextId++,x:22,z:22,medical:true};world.structures.push(medical);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])world.structures.push({id:world.nextId++,kind:'wall',x:22+dx!,z:22+dz!,orientation:0,footprint:'standard'});
  expect(restDecision(world,animal,true)).toEqual({result:true,searches:1});expect(animal.animalRest!.spotId).toBe(spot.id);
});

test('missing, occupied or unreachable places keep the existing ground-sleep fallback',()=>{
  for(const reason of ['absent','occupied','unreachable'] as const){
    const {world,animal,spot}=camp();
    if(reason==='absent')world.structures=[];
    if(reason==='occupied'){
      const other=structuredClone(animal);other.id=world.nextId++;other.x=spot.x;other.z=spot.z;other.state='sleeping';other.domestic!.bedId=spot.id;other.animalRest={spotId:spot.id,phase:'sleep'};world.wildlife!.animals.push(other);
    }
    if(reason==='unreachable')for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])world.structures.push({id:world.nextId++,kind:'wall',x:spot.x+dx!,z:spot.z+dz!,orientation:0,footprint:'standard'});
    until(world,()=>animal.state==='sleeping');expect(animal.animalRest).toBeUndefined();expect(animal.x).toBe(12);expect(animal.z).toBe(8);
  }
});

test('a second animal cannot own or reserve the same place while a medical occupant shares care access',()=>{
  const {world,pawn,animal,spot}=camp();
  const other=structuredClone(animal);other.id=world.nextId++;other.x=18;world.wildlife!.animals.push(other);
  expect(restDecision(world,animal)).toEqual({result:true,searches:1});expect(animalSpotAvailable(world,spot,other)).toBe(false);
  releaseAnimalSpotBindings(world,spot.id);spot.medical=true;animal.x=spot.x;animal.z=spot.z;delete animal.motion;animal.path=[];
  animal.health={...createMedicalRecord(world.tick),body:'hare'};addResolvedInjury(animal.health,'left-front-leg','bruise',500,()=>.999999);
  animal.state='sleeping';animal.animalRest={spotId:spot.id,phase:'sleep'};
  pawn.animalCare={animalId:animal.id,spot:{x:spot.x+1,z:spot.z},phase:'approach',progress:0};
  reconcileAnimalRest(world);expect(animalRestingSpot(world,animal)).toBe(spot);expect(animalSpotAvailable(world,spot,other)).toBe(false);
});

test('hunger, danger and removal release rest routes or occupants without teleportation or changing health',()=>{
  for(const reason of ['food','danger','remove'] as const){
    const {world,animal,spot}=camp();restDecision(world,animal);const pos={x:animal.x,z:animal.z},edge=structuredClone(animal.motion),rng=world.rng;
    if(reason==='food'){animal.food=animalNutritionMax(animal)*.2;expect(restDecision(world,animal).result).toBe(false);}
    if(reason==='danger'){animal.flee={danger:{x:1,z:1},until:world.tick+100};reconcileAnimalRest(world);}
    if(reason==='remove')releaseAnimalSpotBindings(world,spot.id);
    expect(animal.animalRest).toBeUndefined();expect(animal.motion).toEqual(edge);expect({x:animal.x,z:animal.z}).toEqual(pos);expect(world.rng).toBe(rng);
    if(reason==='remove')expect(animal.domestic!.bedId).toBeUndefined();
  }
});

test('a corpse retained on its captured edge has no living normal-place assignment',()=>{
  const {world,animal,spot}=camp();restDecision(world,animal);animal.state='dead';
  animal.health={...createMedicalRecord(world.tick),body:'hare',death:{tick:world.tick,cause:'blood-loss'},bloodLoss:300_000_000};
  reconcileAnimalRest(world);expect(animal.animalRest).toBeUndefined();expect(animal.domestic!.bedId).toBeUndefined();
  expect(animal.motion).toBeDefined();expect(animalSpotClaimed(world,spot.id)).toBe(false);
});
