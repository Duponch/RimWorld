import {expect,test} from 'vitest';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {validAnimalTrainingHistoricalTransport282} from '../src/sim/animal-training-historical-282.ts';
import {validAnimalTrainingWorld282} from '../src/sim/animal-training-world-282.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';

function publication(w:World){
 const encoder=new SnapshotEncoder(),strict=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const packet=structuredClone(encoder.encode(w,0,0)),a=strict.adopt(structuredClone(packet)),b=resident.adopt(structuredClone(packet));
 expect(a.status,a.status==='resync'?a.reason:'strict').toBe('applied');expect(b.status,b.status==='resync'?b.reason:'resident').toBe('applied');
 if(a.status!=='applied'||b.status!=='applied')throw Error('Actual training checkpoint refused');
 expect(a.world).toEqual(b.world);return {encoder,strict,resident,packet,a,b};
}
function working(){
 const f=animalHaulingCamp459();expect(applyCommand(f.world,{type:'animal-training',animalId:f.animal.id,skill:'haul',wanted:true}).ok).toBe(true);
 for(let i=0;i<600&&!(f.handler.animalHandling?.phase==='interact'&&f.handler.animalHandling.progress>0);i++)stepWorld(f.world);
 expect(f.handler.animalHandling).toMatchObject({kind:'train',phase:'interact'});expect(f.handler.animalHandling!.progress).toBeGreaterThan(0);
 expect(validateWorld(f.world)).toEqual([]);return f;
}

test('strict281 migration changes only the number, without offering a tracker, intent, food or training',()=>{
 const f=animalHaulingCamp459(),old=structuredClone(f.world);Object.assign(old,{schemaVersion:281});
 const raw=JSON.stringify(old),loaded=deserializeWorld(raw);expect(SCHEMA_VERSION).toBe(282);
 expect(JSON.parse(serializeWorld(loaded))).toEqual({...old,schemaVersion:282});expect(loaded.wildlife!.animals[0]!.training).toBeUndefined();
 expect(loaded.rng).toBe(old.rng);expect(loaded.nextId).toBe(old.nextId);expect(JSON.stringify(old)).toBe(raw);publication(old);publication(loaded);
});

test('a real changed request is rejected in281 before migration, while old human hauling and ordinary labels remain old content',()=>{
 const f=animalHaulingCamp459();expect(applyCommand(f.world,{type:'animal-training',animalId:f.animal.id,skill:'haul',wanted:true}).ok).toBe(true);
 const old=structuredClone(f.world);Object.assign(old,{schemaVersion:281});
 expect(validAnimalTrainingHistoricalTransport282(old,281)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(old))).toThrow();
 const packet=new SnapshotEncoder().encode(old,0,0);
 expect(new SnapshotDecoder().adopt(structuredClone(packet)).status).toBe('resync');expect(new ResidentPresentationAssembler().adopt(structuredClone(packet)).status).toBe('resync');
 const animal=structuredClone(f.animal);
 const lanes=[{wildlife:{animals:[animal]}},{worldMaps:{sites:[{map:{wildlife:{animals:[animal]}}}]}},{group:{animalOwners:{members:[animal]}}},
  {structures:[{shipCryptosleep277:{occupant:{kind:'animal',animal}}}]},{worldGroups:{abandonedContents:[{animals:[{animal}]}]}}];
 for(const lane of lanes){expect(validAnimalTrainingHistoricalTransport282(lane,281)).toBe(false);expect(validAnimalTrainingHistoricalTransport282(lane,282)).toBe(true);}
 expect(validAnimalTrainingHistoricalTransport282({pawns:[{id:1,haul:{phase:'pickup'}}],events:[{text:'training haul'}]},281)).toBe(true);
});

test('real initial conversation and exact human food holder survive full reload and both public readers',()=>{
 const f=working(),w=f.world,raw=serializeWorld(w),copy=deserializeWorld(raw);expect(serializeWorld(copy)).toBe(raw);publication(w);
 expect(copy.pawns.find(p=>p.id===f.handlerId)?.animalHandling).toEqual(f.handler.animalHandling);
 stepWorld(w,20);stepWorld(copy,20);expect(serializeWorld(copy)).toBe(serializeWorld(w));
});

test('invalid skill, consumed-food counter, captured phase and missing animal relation reject atomically in RAW and both readers',()=>{
 const f=working(),w=f.world,q=publication(w),oldA=structuredClone(q.a.world),oldB=structuredClone(q.b.world);
 stepWorld(w);const packet=structuredClone(q.encoder.encode(w,0,0));expect(packet.kind).toBe('delta');
 const mutants:((v:World)=>void)[]=[
  v=>{v.wildlife!.animals[0]!.training!.haul!.steps=8;},
  v=>{v.wildlife!.animals[0]!.training!.haul!.learned=true;},
  v=>{v.wildlife!.animals[0]!.training!.lastLocalCore=v.tick*10+10;},
  v=>{v.pawns[0]!.animalHandling!.quantity++;},
  v=>{v.pawns[0]!.animalHandling!.feedDuration=27;},
  v=>{delete v.wildlife!.animals[0]!.training;},
 ];
 for(const mutate of mutants){
  const bad=structuredClone(w);mutate(bad);expect(validAnimalTrainingWorld282(bad)).toBe(false);expect(validateWorld(bad).length).toBeGreaterThan(0);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  const full=structuredClone(new SnapshotEncoder().encode(bad,0,0));expect(new SnapshotDecoder().adopt(structuredClone(full)).status).toBe('resync');expect(new ResidentPresentationAssembler().adopt(full).status).toBe('resync');
  const delta=structuredClone(packet);mutate(delta.world as World);expect(q.strict.adopt(structuredClone(delta)).status).toBe('resync');expect(q.resident.adopt(delta).status).toBe('resync');
  expect(q.a.world).toEqual(oldA);expect(q.b.world).toEqual(oldB);
 }
 expect(q.strict.adopt(structuredClone(packet)).status).toBe('applied');expect(q.resident.adopt(packet).status).toBe('applied');
});

test('future283 cannot enter a RAW world or either fresh public reader',()=>{
 const w=animalHaulingCamp459().world;Object.assign(w,{schemaVersion:283});expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();
 expect(validAnimalTrainingHistoricalTransport282(w,283)).toBe(false);
 const packet=new SnapshotEncoder().encode(w,0,0);expect(new SnapshotDecoder().adopt(structuredClone(packet)).status).toBe('resync');expect(new ResidentPresentationAssembler().adopt(packet).status).toBe('resync');
});
