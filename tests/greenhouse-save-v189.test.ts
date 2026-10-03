import { expect,test } from 'vitest';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { SCHEMA_VERSION,type Resource,type World } from '../src/sim/types.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';
import { withoutPredatorFoodPolicies,withoutPredatorApparelPolicies } from './scenarios/legacy-save.ts';

function camp():World {
  const w=deconstructionCamp(1);w.tick=2000;
  w.resources=[{id:w.nextId++,kind:'rice',x:5,z:5,amount:6,growth:.2,growthTick:1900}];
  return w;
}
test('V176 is validated strictly before neutral V177 migration, without lighting or resources retroactively added',()=>{
  const old=withoutPredatorApparelPolicies(withoutPredatorFoodPolicies(camp()));old.schemaVersion=176 as World['schemaVersion'];const before=structuredClone(old);
  expect(deserializeWorld(JSON.stringify(old))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(old).toEqual(before);
  for(const mode of ['dark','artificial-full','natural',true]){
    const bad=structuredClone(old);Object.assign(bad.resources[0]!,{growthLight:mode});
    expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/176/);
  }
  const future=structuredClone(old);
  future.structures.push({id:future.nextId++,kind:'sun-lamp',material:'steel',orientation:0,footprint:'standard',x:8,z:8,power:{on:false,parentId:null}});
  expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/176/);
  future.packed=[{building:future.structures.pop()!,owner:{type:'ground',x:8,z:8}}];
  expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/176/);
});

test('V177 validates captured light intervals rather than inventing a requirement for a currently powered lamp',()=>{
  for(const mode of ['dark','artificial-full'] as const){
    const w=camp();w.resources[0]!.growthLight=mode;
    expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  }
  for(const mutation of [
    (p:Resource)=>Object.assign(p,{growthLight:'natural'}),
    (p:Resource)=>Object.assign(p,{growthLight:true}),
    (p:Resource)=>{delete p.growthTick;},
    (p:Resource)=>{p.growthTick=2001;},
    (p:Resource)=>{p.kind='rock';},
  ]){
    const w=camp();w.resources[0]!.growthLight='dark';mutation(w.resources[0]!);
    expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();
  }
});

test('light regime edits at the same tick are encoded, preserve prior snapshots, and reject corrupt deltas atomically',()=>{
  const w=camp(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=structuredClone(encoder.encode(w,0,6,true)),initial=decoder.adopt(first);expect(initial.status).toBe('applied');
  if(initial.status!=='applied')throw Error('initial snapshot refused');const old=initial.world,oldCopy=structuredClone(old);
  w.resources[0]!.growthLight='artificial-full';
  const delta=structuredClone(encoder.encode(w,0,6));expect(delta.kind).toBe('delta');
  const adopted=decoder.adopt(delta);expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('delta refused');expect(adopted.world).toEqual(w);expect(old).toEqual(oldCopy);
  delete w.resources[0]!.growthLight;
  const cleared=structuredClone(encoder.encode(w,0,6)),removed=decoder.adopt(cleared);expect(removed.status).toBe('applied');if(removed.status!=='applied')throw Error('clear refused');expect(removed.world).toEqual(w);
  const retained=structuredClone(removed.world),bad=structuredClone(cleared);
  if(bad.kind!=='delta')throw Error('expected delta');bad.baseRevision=3;bad.revision=4;
  bad.resources={removed:[],upserted:[{...w.resources[0]!,growthLight:'invented' as Resource['growthLight']}]};
  expect(decoder.adopt(bad).status).toBe('resync');expect(removed.world).toEqual(retained);
  const valid=structuredClone(bad);valid.resources={removed:[],upserted:[{...w.resources[0]!,growthLight:'dark'}]};
  expect(decoder.adopt(valid).status).toBe('applied');
});
