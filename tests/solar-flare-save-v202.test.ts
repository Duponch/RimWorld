import { readFileSync } from 'node:fs';
import { expect,test } from 'vitest';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { adoptWorldIncidents } from '../src/sim/cassandra-world.ts';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots.ts';
import { PresentationChanges } from '../src/bridge/presentation-changes.ts';
import type { World } from '../src/sim/types.ts';

const legacy=()=>JSON.parse(readFileSync('public/test-saves/v201/animal-en-rage.json','utf8')) as World;
test('183 is strictly validated then neutrally migrated without World history, energy or rolls',()=>{
  const old=legacy(),before=structuredClone(old);expect(old.schemaVersion).toBe(183);
  const migrated=deserializeWorld(JSON.stringify(old));expect(migrated).toEqual({...before,schemaVersion:184});
  expect(old).toEqual(before);stepWorld(migrated,0);expect(migrated.worldIncidents).toBeUndefined();
  for(const future of [{},undefined]){
    const bad=legacy();Object.assign(bad,{worldIncidents:future});
    if(future!==undefined)expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/183/);
    // Decoder accepts structured packets too: JSON absence is intentionally different.
    const encoder=new SnapshotEncoder(),packet=encoder.encode(bad,0,1,true);
    expect(new SnapshotDecoder().adopt(packet).status).toBe('resync');
  }
  stepWorld(migrated);expect(migrated.worldIncidents!.adoptedAt).toBe(before.tick);
  expect(migrated.worldIncidents!).toMatchObject({checks:0,opportunities:0,flares:0});expect(validateWorld(migrated)).toEqual([]);
});

test('same-tick calendar adoption, changes and removal publish immutably; corrupt metadata refuses atomically',()=>{
  const w=deserializeWorld(JSON.stringify(legacy())),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),phases=new PresentationChanges();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,1,true)));
  if(first.status!=='applied')throw Error('initial checkpoint');
  const prior=structuredClone(first.world);adoptWorldIncidents(w);
  const delta=structuredClone(encoder.encode(w,0,1));expect(delta.kind).toBe('delta');
  const applied=decoder.adopt(delta);expect(applied.status).toBe('applied');
  if(applied.status!=='applied')throw Error('adoption');expect(applied.world).toEqual(w);expect(first.world).toEqual(prior);
  const before=structuredClone(applied.world);w.worldIncidents!.rng=123456;
  const next=structuredClone(encoder.encode(w,0,1)),bad=structuredClone(next);bad.world.worldIncidents!.checks=999;
  expect(decoder.adopt(bad).status).toBe('resync');expect(applied.world).toEqual(before);
  expect(decoder.adopt(next).status).toBe('applied');
  phases.capture(w);w.worldIncidents!.active={start:w.tick,endCore:w.tick*10+9000};expect(phases.capture(w)).toBe(true);
  delete w.worldIncidents!.active;expect(phases.capture(w)).toBe(true); // Discrete signature independently observes both transitions.
  delete w.worldIncidents;const removed=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  expect(removed.status).toBe('applied');if(removed.status==='applied')expect(removed.world.worldIncidents).toBeUndefined();
});

test('save continuation from a prospectively adopted calendar preserves all deterministic streams',()=>{
  const w=deserializeWorld(JSON.stringify(legacy()));stepWorld(w);const resumed=deserializeWorld(serializeWorld(w));
  for(let n=0;n<35;n++){stepWorld(w);stepWorld(resumed);}
  expect(resumed).toEqual(w);expect(validateWorld(w)).toEqual([]);
  const bad=structuredClone(w);bad.worldIncidents!.rng=0;const raw=JSON.stringify(bad);
  expect(()=>deserializeWorld(raw)).toThrow(/World/);expect(JSON.stringify(bad)).toBe(raw);
});
