import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {advancePodRescues,resolveSelectedPodRescue} from '../src/sim/pod-rescue.ts';
import {validPodRescueShape} from '../src/sim/pod-rescue-save.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {decodeStoredSave} from '../src/ui/save-storage-codec.ts';
import {medicalCamp} from './scenarios/health.ts';

function staged():World {
  const w=medicalCamp();expect(resolveSelectedPodRescue(w,264)).toBe(true);return w;
}
function opened():World {
  const w=staged();w.tick=w.podRescues!.pending!.openAt;advancePodRescues(w);
  expect(validateWorld(w)).toEqual([]);return w;
}

test('schema198 is checked before neutral migration, including pending and already opened capsules',()=>{
  for(const source of [staged(),opened()]){
    if(source.podRescues!.pending)delete source.podRescues!.pending.origin;
    for(const incident of source.podRescues!.incidents)delete incident.origin;
    source.schemaVersion=198 as World['schemaVersion'];const before=structuredClone(source);
    const migrated=deserializeWorld(JSON.stringify(source));
    expect(migrated).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(source).toEqual(before);
    expect(migrated.podRescues!.pending?.origin).toBeUndefined();
    expect(migrated.podRescues!.incidents.every(i=>i.origin===undefined)).toBe(true);
  }
  for(const source of [staged(),opened()]){
    source.schemaVersion=198 as World['schemaVersion'];
    expect(()=>deserializeWorld(JSON.stringify(source))).toThrow('Invalid version 198 save');
  }
});

test('origin and decision shape is strict, versioned and clock bounded',()=>{
  const w=opened(),i=w.podRescues!.incidents[0]!,p=w.pawns.find(p=>p.id===i.pawnId)!;
  i.origin='independent';p.podRescue!.admittedAt=w.tick;
  i.decision={at:w.tick,outcome:'left',admittedAt:w.tick};
  expect(validPodRescueShape(w.podRescues,SCHEMA_VERSION,w)).toBe(true);
  const corruptions:Array<(c:World)=>void>=[
    c=>{Object.assign(c.podRescues!.incidents[0]!,{origin:{toString:()=> 'independent'}});},
    c=>{c.podRescues!.incidents[0]!.origin='outlander';},
    c=>{c.podRescues!.incidents[0]!.decision!.admittedAt=w.tick+1;},
    c=>{c.podRescues!.incidents[0]!.decision!.at=w.tick+1;},
    c=>{Object.assign(c.podRescues!.incidents[0]!.decision!,{outcome:{toString:()=> 'left'}});},
    c=>{Object.assign(c.podRescues!.incidents[0]!.decision!,{extra:true});},
    c=>{c.podRescues!.incidents[0]!.result='joined';c.podRescues!.incidents[0]!.resolvedAt=w.tick;},
    c=>{c.pawns.find(p=>p.podRescue)!.podRescue!.admittedAt=w.tick-1;},
  ];
  for(const corrupt of corruptions){const c=structuredClone(w);corrupt(c);expect(validateWorld(c).length).toBeGreaterThan(0);}
  const pending=staged();Object.assign(pending.podRescues!.pending!,{origin:17});expect(validateWorld(pending).length).toBeGreaterThan(0);
});

test('decoder refuses invalid joining metadata atomically and preserves the previous view',()=>{
  const w=opened(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(first.status).toBe('applied');
  if(first.status!=='applied')throw Error('checkpoint');const before=structuredClone(first.world);
  w.tick++;const i=w.podRescues!.incidents[0]!;i.origin='independent';
  i.decision={at:w.tick,outcome:'joined',admittedAt:i.openedAt};i.result='joined';i.resolvedAt=w.tick;
  // A joined record cannot retain the active guest marker.
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,6))).status).toBe('resync');
  expect(first.world).toEqual(before);
  const p=w.pawns.find(p=>p.id===i.pawnId)!;delete p.podRescue;p.faction='colony';
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,6,true))).status).toBe('applied');
  expect(first.world).toEqual(before);
});

test('every immutable public save remains loadable and valid after schema199 migration',async()=>{
  const manifest=JSON.parse(readFileSync('public/test-saves/manifest.json','utf8')) as {saves:Array<{release:string;filename:string}>};
  for(const entry of manifest.saves){
    const path=`public/test-saves/${entry.release}/${entry.filename}`;
    const w=deserializeWorld(await decodeStoredSave(readFileSync(path,'utf8')));
    expect(w.schemaVersion,path).toBe(SCHEMA_VERSION);expect(validateWorld(w),path).toEqual([]);
  }
},120_000);
