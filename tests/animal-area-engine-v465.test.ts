import {expect,test} from 'vitest';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {initialWorldRegistry} from '../src/sim/world-map-context.ts';
import {applyCommand} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {readAnimalAreaChoice287} from '../src/sim/animal-area-state-287.ts';
import {fixturePower} from './scenarios/power.ts';
import {triggerBreakdown} from '../src/sim/breakdowns.ts';
import {addMaterial} from '../src/sim/materials.ts';
import type {Command} from '../src/sim/types.ts';

/** Declared original Labrador/legacy32² preparation, not played taming,
 * construction, training or ingestion. These cases test authority boundaries. */
function camp(){const f=animalHaulingCamp459();initialWorldRegistry(f.world);return f;}
function area(f:ReturnType<typeof camp>){
 const w=f.world;expect(applyCommand(w,{type:'allowed-area-create',label:'Cour animale'}).ok).toBe(true);
 const a=w.allowedAreas!.at(-1)!;
 expect(applyCommand(w,{type:'allowed-area-paint',areaId:a.id,enabled:true,from:{x:7,z:11},to:{x:15,z:16}}).ok).toBe(true);
 return a;
}

test('actual engine assigns the original local animal and repeats the same choice as a literal whole-world noop',()=>{
 const f=camp(),a=area(f),choice={kind:'allowed' as const,areaId:a.id};
 expect(applyCommand(f.world,{type:'animal-area-assign',animalId:f.animalId,choice})).toMatchObject({ok:true,affected:1});
 expect(f.world.wildlife!.animals.find(a=>a.id===f.animalId)).toBe(f.animal);
 expect(readAnimalAreaChoice287(f.animal,0)).toEqual(choice);
 const before=JSON.stringify(f.world);
 expect(applyCommand(f.world,{type:'animal-area-assign',animalId:f.animalId,choice})).toMatchObject({ok:true,affected:0});
 expect(JSON.stringify(f.world)).toBe(before);expect(validateWorld(f.world)).toEqual([]);
 const raw=serializeWorld(f.world);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
});

test('malformed tagged choices and accessor fields refuse atomically without evaluating a getter',()=>{
 const f=camp(),a=area(f);let reads=0;
 const inputs:unknown[]=[
  {type:'animal-area-assign',animalId:f.animalId,choice:{kind:'allowed',areaId:a.id,extra:1}},
  {type:'animal-area-assign',animalId:f.animalId,choice:{kind:'home',areaId:a.id}},
  {type:'animal-area-assign',animalId:f.animalId,choice:undefined},
  {type:'animal-area-assign',animalId:f.animalId,choice:{kind:'allowed',areaId:Number.POSITIVE_INFINITY}},
  {type:'animal-area-assign',get animalId(){reads++;return f.animalId;},choice:null},
  {type:'animal-area-assign',animalId:f.animalId,choice:{get kind(){reads++;return 'home';}}},
 ];
 for(const command of inputs){const before=JSON.stringify(f.world);expect(applyCommand(f.world,command as Command).ok).toBe(false);expect(JSON.stringify(f.world)).toBe(before);}
 expect(reads).toBe(0);
});

test('painting elsewhere preserves the same still-admitted meal, progression and future path',()=>{
 const f=camp(),a=area(f);
 expect(applyCommand(f.world,{type:'animal-area-assign',animalId:f.animalId,choice:{kind:'allowed',areaId:a.id}}).ok).toBe(true);
 f.animal.meal={kind:'pile',id:f.kibbleId,quantity:1,progress:0};f.animal.path=[{x:11,z:12},{x:10,z:12},{x:9,z:12}];f.animal.state='moving';
 const meal=f.animal.meal,path=f.animal.path,rng=f.world.rng,nextId=f.world.nextId;
 expect(applyCommand(f.world,{type:'allowed-area-paint',areaId:a.id,enabled:false,from:{x:15,z:16},to:{x:15,z:16}}).ok).toBe(true);
 expect(f.animal.meal).toBe(meal);expect(f.animal.path).toBe(path);expect(f.world.rng).toBe(rng);expect(f.world.nextId).toBe(nextId);
});

test('the first Home cell restricts a dormant choice and retires only the now-exterior meal after preserving its engaged edge',()=>{
 const f=camp();delete f.world.home;f.animal.nextDecision=f.world.tick+99;
 expect(applyCommand(f.world,{type:'animal-area-assign',animalId:f.animalId,choice:{kind:'home'}}).ok).toBe(true);
 expect(f.animal.nextDecision).toBe(f.world.tick+99);
 f.animal.meal={kind:'pile',id:f.kibbleId,quantity:1,progress:0};f.animal.path=[{x:11,z:12},{x:10,z:12},{x:9,z:12}];f.animal.state='moving';
 f.animal.motion={from:{x:13,z:12},to:{x:12,z:12},start:f.world.tick,end:f.world.tick+3};
 const edge=structuredClone(f.animal.motion),position={x:f.animal.x,z:f.animal.z},rng=f.world.rng,nextId=f.world.nextId;
 expect(applyCommand(f.world,{type:'area',action:'home',from:{x:20,z:20},to:{x:20,z:20}}).ok).toBe(true);
 expect(f.animal.meal).toBeUndefined();expect(f.animal.motion).toEqual(edge);expect({x:f.animal.x,z:f.animal.z}).toEqual(position);
 expect(readAnimalAreaChoice287(f.animal,0)).toEqual({kind:'home'});expect(f.world.rng).toBe(rng);expect(f.world.nextId).toBe(nextId);
});

test('removing Home returns the same delivered repair component before retiring the actual breakdown job',()=>{
 const f=camp(),w=f.world,generator=fixturePower(w,'wood-generator',24,24);
 expect(applyCommand(w,{type:'area',action:'home',from:generator,to:generator}).ok).toBe(true);
 expect(triggerBreakdown(w,generator.id)).toBe(true);
 const job=w.jobs.find(j=>j.fixBreakdown?.structureId===generator.id)!;expect(job).toBeDefined();
 const id=w.nextId;addMaterial(w,'component',1,{type:'job',jobId:job.id},'component');
 const component=w.piles.find(p=>p.id===id)!,rng=w.rng,nextId=w.nextId;
 expect(applyCommand(w,{type:'area',action:'remove-home',from:generator,to:generator}).ok).toBe(true);
 expect(w.jobs.some(j=>j.id===job.id)).toBe(false);expect(w.piles.find(p=>p.id===id)).toBe(component);
 expect(component.owner.type).toBe('ground');expect(component.quantity).toBe(1);expect(generator.breakdown).toBeDefined();
 expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(validateWorld(w)).toEqual([]);
});
