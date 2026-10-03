import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder,type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { advanceRainElectrical } from '../src/sim/rain-electric.ts';
import { structureMaxHp } from '../src/sim/thing-damage-rules.ts';
import { advanceRainClock,rainElectricBuilding,rainElectricCamp } from './helpers/rain-electric-v194.ts';
import type { World } from '../src/sim/types.ts';

/** Prepared actual activity isolates transport from the separately exercised
 * power grid. The historical contact is created by the real Flame resolver. */
function destroyedContact():World {
  const w=rainElectricCamp(),heater=rainElectricBuilding(w,'heater');
  heater.damage=structureMaxHp(heater)-1;
  // Prospective stream fixture: its first two draws admit this one candidate.
  w.rainElectrical!.rng=1;
  const boundary=(Math.floor(w.tick*10/97)+1)*97;
  while(w.tick*10<boundary){advanceRainClock(w);advanceRainElectrical(w);}
  expect(w.rainElectrical!.discharges).toBe(1);
  expect(w.rainElectrical!.lastDischarge!.structureId).toBe(heater.id);
  expect(w.structures.some(s=>s.id===heater.id)).toBe(false);
  return w;
}

function clonePacket(encoder:SnapshotEncoder,w:World,checkpoint=false):SnapshotMessage {
  // postMessage owns the copy in production; never keep a mutable World as
  // an oracle for either an earlier frame or the encoder's cached values.
  return structuredClone(encoder.encode(w,0,1,checkpoint));
}

test('a confirmed historical contact survives checkpoint and same-tick delta after its device is destroyed',()=>{
  const w=destroyedContact(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const expected=structuredClone(w),checkpoint=clonePacket(encoder,w),first=decoder.adopt(checkpoint);
  expect(first.status).toBe('applied');
  if(first.status!=='applied')throw Error('Initial rain checkpoint');
  expect(first.world).toEqual(expected);
  const delta=clonePacket(encoder,w);
  expect(delta.kind).toBe('delta');expect(decoder.adopt(delta).status).toBe('applied');
  expect(first.world).toEqual(expected);
});

test('malformed rain states reject checkpoints and deltas atomically without advancing the decoder revision',()=>{
  const w=destroyedContact(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const checkpoint=clonePacket(encoder,w),first=decoder.adopt(checkpoint);
  if(first.status!=='applied')throw Error('Initial rain checkpoint');
  const prior=structuredClone(first.world),delta=clonePacket(encoder,w);
  const changes:Array<(w:World)=>void>=[
    v=>{v.rainElectrical=null as never;},
    v=>{v.rainElectrical=[] as never;},
    v=>{(v.rainElectrical as unknown as Record<string,unknown>).extra=true;},
    v=>{v.rainElectrical!.revision=2 as never;},
    v=>{v.rainElectrical!.adoptedAt=v.tick+1;},
    v=>{v.rainElectrical!.adoptedAt=v.weather!.originTick-1;},
    v=>{v.rainElectrical!.lastCoreTick--;},
    v=>{v.rainElectrical!.rng=0;},
    v=>{v.rainElectrical!.rng=2**32;},
    v=>{v.rainElectrical!.discharges=.5;},
    v=>{v.rainElectrical!.discharges=0;},
    v=>{v.rainElectrical!.discharges=2;},
    v=>{delete v.rainElectrical!.lastDischarge;},
    v=>{v.rainElectrical!.lastDischarge!.coreTick++;},
    v=>{v.rainElectrical!.lastDischarge!.coreTick=0;},
    v=>{v.rainElectrical!.lastDischarge!.structureId=v.nextId;},
    v=>{v.rainElectrical!.lastDischarge!.structureId=0;},
    v=>{v.rainElectrical!.lastDischarge!.kind='standing-lamp' as never;},
    v=>{v.rainElectrical!.lastDischarge!.x=v.width;},
    v=>{v.rainElectrical!.lastDischarge!.z=-1;},
    v=>{(v.rainElectrical!.lastDischarge as unknown as Record<string,unknown>).owner={type:'ground',x:0,z:0};},
  ];
  for(const change of changes){
    const badDelta=structuredClone(delta);change(badDelta.world as World);
    expect(decoder.adopt(badDelta).status).toBe('resync');expect(first.world).toEqual(prior);
    const badCheckpoint=structuredClone(checkpoint);badCheckpoint.revision++;
    change(badCheckpoint.world as World);
    expect(decoder.adopt(badCheckpoint).status).toBe('resync');expect(first.world).toEqual(prior);
    expect(new SnapshotDecoder().adopt(badCheckpoint).status).toBe('resync');
  }
  // All rejected packets have the next revision; the unmodified one remains usable.
  const next=decoder.adopt(delta);expect(next.status).toBe('applied');
  if(next.status==='applied')expect(next.world).toEqual(w);
  expect(first.world).toEqual(prior);
});

test('weather and clock dependencies reject before either adoption path can replace the current frame',()=>{
  const w=destroyedContact(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const checkpoint=clonePacket(encoder,w),first=decoder.adopt(checkpoint);
  if(first.status!=='applied')throw Error('Initial rain dependency checkpoint');
  const prior=structuredClone(first.world),delta=clonePacket(encoder,w);
  const changes:Array<(w:World)=>void>=[
    v=>{delete v.weather;},
    v=>{v.weather=[] as never;},
    v=>{v.weather!.revision=2 as never;},
    v=>{v.weather!.originTick=v.tick+1;},
    v=>{v.weather!.lastCoreTick--;},
    v=>{v.weather!.rng=0;},
    v=>{v.tick++;},
    v=>{v.tick=Number.MAX_SAFE_INTEGER;},
  ];
  for(const change of changes){
    for(const original of [checkpoint,delta]){
      const bad=structuredClone(original);bad.revision=delta.revision;
      change(bad.world as World);
      expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(prior);
    }
  }
  expect(decoder.adopt(delta).status).toBe('applied');
});

test('neutral schema180 transport accepts absence and rejects ownership of any future rain field',()=>{
  const w=rainElectricCamp();delete w.rainElectrical;
  (w as {schemaVersion:number}).schemaVersion=180;
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),checkpoint=clonePacket(encoder,w);
  const first=decoder.adopt(checkpoint);expect(first.status).toBe('applied');
  if(first.status!=='applied')throw Error('Historical neutral checkpoint');
  const prior=structuredClone(first.world),delta=clonePacket(encoder,w),future=rainElectricCamp().rainElectrical!;
  for(const value of [future,null,undefined]){
    for(const original of [checkpoint,delta]){
      const bad=structuredClone(original);bad.revision=delta.revision;
      (bad.world as World).rainElectrical=structuredClone(value) as World['rainElectrical'];
      expect(Object.hasOwn(bad.world,'rainElectrical')).toBe(true);
      expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(prior);
    }
  }
  expect(decoder.adopt(delta).status).toBe('applied');
});

test('same-tick in-place adoption and removal are transported exactly while prior copies remain immutable',()=>{
  const w=rainElectricCamp();delete w.rainElectrical;
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),checkpoint=clonePacket(encoder,w);
  const first=decoder.adopt(checkpoint);if(first.status!=='applied')throw Error('Neutral current checkpoint');
  const old=structuredClone(first.world),state=rainElectricCamp().rainElectrical!;
  w.rainElectrical=structuredClone(state);
  const delta=clonePacket(encoder,w),expected=structuredClone(w);
  // A later source edit cannot change the already posted packet.
  w.rainElectrical.rng^=17;
  const adopted=decoder.adopt(delta);expect(adopted.status).toBe('applied');
  if(adopted.status==='applied')expect(adopted.world).toEqual(expected);
  expect(first.world).toEqual(old);expect(checkpoint.world).toEqual(old);
  delete w.rainElectrical;
  const removal=clonePacket(encoder,w),removed=decoder.adopt(removal);
  expect(removed.status).toBe('applied');
  if(removed.status==='applied')expect(Object.hasOwn(removed.world,'rainElectrical')).toBe(false);
  if(adopted.status==='applied')expect(adopted.world).toEqual(expected);
});
