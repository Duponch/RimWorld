import {expect,test} from 'vitest';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {initialWorldRegistry,registeredMapId} from '../src/sim/world-map-context.ts';
import {animalNutritionMax} from '../src/sim/animal-life.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {animalBodyModel} from '../src/sim/body-model.ts';
import {addResolvedInjury} from '../src/sim/injury-state.ts';
import {animalBody,reconcileAnimalHealth} from '../src/sim/wildlife-health.ts';
import {validateWorld,serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';

// Existing full32² fixture and its actual original Labrador; positions, mask
// and initial needs are declared setup. A small already-resolved torso bruise
// uses the real species anatomy/clinical kernel, not a mocked medicalRest flag.
function camp(){
 const f=animalHaulingCamp459(),{world:w,animal:a}=f;initialWorldRegistry(w);
 for(const key of Object.keys(f.handler.priorities) as (keyof typeof f.handler.priorities)[])f.handler.priorities[key]=0;
 Object.assign(a,{x:10,z:10,state:'idle',path:[],nextDecision:w.tick,food:animalNutritionMax(a)*.95,rest:.95});
 const id=w.nextId++;w.allowedAreas=[{id,label:'Repos autorisé',color:0x102030,cells:[]}];
 a.animalMapAreas287={revision:1,assignments:[{mapId:registeredMapId(w)!,choice:{kind:'allowed',areaId:id}}]};
 return {...f,area:w.allowedAreas[0]!,spot:w.structures.find(s=>s.id===f.spotId)!};
}
function bruise(f:ReturnType<typeof camp>){
 const {world:w,animal:a}=f;a.health=createAnimalMedicalRecord256(w,a);
 const root=animalBodyModel(a.species,a.ageTicks,a.growthTracker?.value).parts.find(p=>p.parent===null)!;
 expect(addResolvedInjury(a.health,root.id,'bruise',100,()=>.999999)).not.toBeNull();reconcileAnimalHealth(w,a);
 expect(a.state).not.toBe('downed');expect(a.state).not.toBe('dead');expect(animalBody(a).capacities.moving).toBeGreaterThan(0);
}

test('an unreachable allowed medical bed yields its exhausted frontier to a reachable area cell instead of consuming every next tick',()=>{
 const f=camp(),{world:w,animal:a,area,spot}=f;Object.assign(spot,{x:15,z:10});
 area.cells=[10*w.width+12,10*w.width+15];for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]])fixtureBuilding(w,'wall',spot.x+dx!,spot.z+dz!);
 bruise(f);expect(validateWorld(w)).toEqual([]);stepWorld(w,1);
 // Only the existing one-search quota is available. The failed bed search
 // must still leave an actual Goto/motion into the other reachable island.
 expect(a.animalRest).toBeUndefined();expect(a.animalAreaReturn287).toEqual({mapId:registeredMapId(w),target:{x:12,z:10}});
 expect(a.motion?.end).toBeGreaterThan(w.tick);expect(a.path.at(-1)??a).toMatchObject({x:12,z:10});
 expect(deserializeWorld(serializeWorld(w))).toEqual(w);
 for(let i=0;i<30&&(a.animalAreaReturn287||(a.motion?.end??0)>w.tick);i++)stepWorld(w,1);
 expect(a.x).toBe(12);expect(a.z).toBe(10);expect(a.animalAreaReturn287).toBeUndefined();expect(a.animalRest).toBeUndefined();
 expect(a.domestic!.bedId).toBe(spot.id);expect(a.state).toBe('sleeping');expect(validateWorld(w)).toEqual([]);
});

test('a real mobile injury during an area return gives medical rest sole ownership after the active edge, including the arrival edge',()=>{
 for(const phase of ['intermediate','arrival'] as const){
  const f=camp(),{world:w,animal:a,area,spot}=f;Object.assign(spot,{x:14,z:10});area.cells=[12,13,14].map(x=>10*w.width+x);
  expect(validateWorld(w)).toEqual([]);stepWorld(w,1);expect(a.animalAreaReturn287).toBeDefined();
  if(phase==='arrival')for(let i=0;i<20&&a.path.length;i++)stepWorld(w,1);
  const edge=a.motion!;expect(edge.end).toBeGreaterThan(w.tick);if(phase==='arrival')expect(a.path).toEqual([]);
  bruise(f);const record=a.health;
  while(w.tick+1<edge.end){stepWorld(w,1);expect(a.motion).toBe(edge);expect(a.animalRest).toBeUndefined();}
  for(let i=0;i<20&&!a.animalRest;i++)stepWorld(w,1);
  expect(a.animalRest).toMatchObject({spotId:spot.id});expect(a.animalAreaReturn287).toBeUndefined();expect(a.health).toBe(record);
  expect(a.path.at(-1)??a).toMatchObject({x:spot.x,z:spot.z});expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
 }
});
