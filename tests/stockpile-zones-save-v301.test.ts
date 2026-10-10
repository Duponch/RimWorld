import { expect,test } from 'vitest';
import { applyCommand } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots.ts';
import { stockpileZoneId } from '../src/sim/stockpile-zones.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';
import type { World } from '../src/sim/types.ts';

function camp():World {const w=deconstructionCamp(1);w.tick=2000;w.stockpiles=[];w.growingZones=[];return w;}
function prepared():World {const w=camp();expect(applyCommand(w,{type:'area',action:'stockpile',from:{x:4,z:4},to:{x:6,z:4}}).ok).toBe(true);return w;}

test('218 migration adds only identities, grouping cardinal equal-policy cells and preserving heterogeneous neighbours',()=>{
  const w=prepared();for(const cell of w.stockpiles)delete cell.zoneId;w.stockpiles[2]!.priority=4;
  const legacy={...w,schemaVersion:218},before=structuredClone(legacy),resumed=deserializeWorld(JSON.stringify(legacy));
  expect(resumed.schemaVersion).toBe(219);expect(resumed.stockpiles[0]!.zoneId).toBe(resumed.stockpiles[1]!.zoneId);expect(resumed.stockpiles[2]!.zoneId).not.toBe(resumed.stockpiles[0]!.zoneId);
  expect({...resumed,schemaVersion:218,stockpiles:resumed.stockpiles.map(({zoneId:_id,...cell})=>cell)}).toEqual(before);
  expect(validateWorld(resumed)).toEqual([]);expect(deserializeWorld(serializeWorld(resumed))).toEqual(resumed);
});

test('historical saves reject future zone/freshness/priority fields before migration',()=>{
  const w=prepared();for(const cell of w.stockpiles)delete cell.zoneId;
  for(const changed of [{zoneId:w.stockpiles[0]!.id},{allowFresh:false},{allowRotten:false},{priority:5}]){
    const legacy={...structuredClone(w),schemaVersion:218};Object.assign(legacy.stockpiles[0]!,changed);
    expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow(/version 218/);
  }
});

test('219 saves reject divergent policies within one identity and malformed/unsafe identity or conditions',()=>{
  const w=prepared();expect(validateWorld(w)).toEqual([]);
  for(const changed of [{zoneId:0},{zoneId:w.nextId},{zoneId:1.5},{priority:6},{allowFresh:'yes'},{allowRotten:null},{items:{rice:true}}]){
    const bad=structuredClone(w);Object.assign(bad.stockpiles[1]!,changed);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  const reordered=structuredClone(w);reordered.stockpiles[1]!.filters={food:true,wood:true};expect(validateWorld(reordered)).toEqual([]);
});

test('implicit anchor identity is checked with explicit members in both saves and snapshots',()=>{
  const w=prepared();delete w.stockpiles[0]!.zoneId;
  expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const bad=structuredClone(w);bad.stockpiles[0]!.priority=4;
  expect(validateWorld(bad).length).toBeGreaterThan(0);
  expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const good=encoder.encode(w,0,0),refused=structuredClone(good);
  refused.world.stockpiles[0]!.priority=4;
  expect(decoder.adopt(refused).status).toBe('resync');
  const applied=decoder.adopt(structuredClone(good));
  expect(applied.status).toBe('applied');if(applied.status!=='applied')throw Error('valid implicit identity');
  expect(applied.world).toEqual(w);
});

test('snapshot policy, expansion and deletion preserve old views; refused divergent/future packets recover through the genuine valid delta',()=>{
  const w=prepared(),encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
  const packet=()=>structuredClone(encoder.encode(w,0,0));
  const initial=decoder.adopt(packet());expect(initial.status).toBe('applied');if(initial.status!=='applied')throw Error('initial');const held=structuredClone(initial.world);
  expect(applyCommand(w,{type:'stockpile-policy',stockpileId:w.stockpiles[1]!.id,settings:{priority:5,allowFresh:false,allowRotten:true}}).ok).toBe(true);
  const good=packet(),bad=structuredClone(good);bad.world.stockpiles[1]!.allowFresh=true;
  expect(decoder.adopt(bad).status).toBe('resync');expect(initial.world).toEqual(held);
  const applied=decoder.adopt(good);expect(applied.status).toBe('applied');if(applied.status!=='applied')throw Error('policy');expect(applied.world).toEqual(w);
  const policyHeld=structuredClone(applied.world),zoneId=stockpileZoneId(w.stockpiles[0]!);
  expect(applyCommand(w,{type:'area',action:'stockpile',targetZoneId:zoneId,from:{x:6,z:4},to:{x:8,z:4}}).ok).toBe(true);
  const expanded=decoder.adopt(packet());expect(expanded.status).toBe('applied');expect(applied.world).toEqual(policyHeld);
  expect(applyCommand(w,{type:'delete-zone',kind:'stockpile',zoneId}).ok).toBe(true);expect(decoder.adopt(packet()).status).toBe('applied');expect(initial.world).toEqual(held);
  const old={...structuredClone(w),stockpiles:structuredClone(good.world.stockpiles),schemaVersion:218} as unknown as World;
  const checkpoint=structuredClone(new SnapshotEncoder().encode(old,1,0,true));
  expect(new SnapshotDecoder().adopt(checkpoint).status).toBe('resync');
});
