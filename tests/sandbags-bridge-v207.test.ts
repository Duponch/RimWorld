import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder,type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { applyCommand,stepWorld,validateWorld } from '../src/sim/index.ts';
import { damageBarrier } from '../src/sim/barriers.ts';
import type { Structure,World } from '../src/sim/types.ts';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction.ts';

function camp():World {
  const w=deconstructionCamp();
  // Prepared installed cloth identity; subsequent damage/removal uses ordinary transitions.
  const s:Structure=fixtureBuilding(w,'sandbags',17,16);s.material='cloth';
  expect(validateWorld(w)).toEqual([]);return w;
}
// Mirror postMessage cloning: encode intentionally lends its dynamic state until transport.
const packet=(encoder:SnapshotEncoder,w:World,checkpoint=false):SnapshotMessage=>structuredClone(encoder.encode(w,0,6,checkpoint));

test('same-tick sandbag damage and destruction deltas retain old Worlds and refuse a corrupt late ledger atomically',()=>{
  const w=camp(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(packet(encoder,w));if(first.status!=='applied')throw Error('prepared sandbag checkpoint');
  const frozen=structuredClone(first.world),tick=w.tick,s=w.structures[0]!;
  expect(damageBarrier(w,s,13)).toBe(true);expect(w.tick).toBe(tick);expect(validateWorld(w)).toEqual([]);
  const damaged=decoder.adopt(packet(encoder,w));expect(damaged.status).toBe('applied');
  if(damaged.status!=='applied')throw Error('same-tick damage delta');
  expect(damaged.world).toEqual(w);expect(first.world).toEqual(frozen);
  const damagedFrozen=structuredClone(damaged.world);
  expect(damageBarrier(w,s,300)).toBe(true);expect(w.tick).toBe(tick);expect(validateWorld(w)).toEqual([]);
  const removed=packet(encoder,w);expect(removed.kind).toBe('delta');
  if(removed.kind!=='delta')throw Error('destruction delta');
  expect(removed.piles?.upserted.length).toBeGreaterThan(0);
  const bad=structuredClone(removed);bad.world.deconstructed.lostTextiles={cloth:0};
  expect(decoder.adopt(bad).status).toBe('resync');
  expect(first.world).toEqual(frozen);expect(damaged.world).toEqual(damagedFrozen);
  const final=decoder.adopt(removed);expect(final.status).toBe('applied');
  if(final.status==='applied'){
    expect(final.world).toEqual(w);expect(final.world.structures).toEqual([]);
    expect(final.world.destroyed?.lost.cloth!+final.world.piles.reduce((sum,p)=>sum+(p.item==='cloth'?p.quantity:0),0)).toBe(5);
    expect(final.world.deconstructed.lostTextiles).toBeUndefined();
  }
  expect(damaged.world).toEqual(damagedFrozen);expect(first.world).toEqual(frozen);
});

test('physical sandbag deconstruction publishes its prospective textile ledger and ground restitution without altering earlier frames',()=>{
  const w=camp(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(packet(encoder,w));if(first.status!=='applied')throw Error('installed checkpoint');
  const frozen=structuredClone(first.world);
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:17,z:16}).ok).toBe(true);
  const intent=decoder.adopt(packet(encoder,w));expect(intent.status).toBe('applied');
  if(intent.status!=='applied')throw Error('deconstruction intent');
  const intentFrozen=structuredClone(intent.world);
  for(let i=0;i<1500&&w.structures.length;i++)stepWorld(w);
  expect(w.structures).toEqual([]);expect(validateWorld(w)).toEqual([]);
  const next=decoder.adopt(packet(encoder,w));expect(next.status).toBe('applied');
  if(next.status==='applied'){
    expect(next.world).toEqual(w);expect(next.world.deconstructed.count).toBe(1);
    const returned=next.world.piles.reduce((sum,p)=>sum+(p.item==='cloth'?p.quantity:0),0);
    expect([2,3]).toContain(returned);expect(returned+next.world.deconstructed.lostTextiles!.cloth!).toBe(5);
  }
  expect(first.world).toEqual(frozen);expect(intent.world).toEqual(intentFrozen);
  expect(first.world.deconstructed.lostTextiles).toBeUndefined();
});

test('corrupt sandbag checkpoint/delta structure, blueprint, removal, package and future 188 fields leave decoder revision intact',()=>{
  const w=camp();
  expect(applyCommand(w,{type:'designate',kind:'sandbags',x:22,z:20}).ok).toBe(true);
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:17,z:16}).ok).toBe(true);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),checkpoint=packet(encoder,w),first=decoder.adopt(checkpoint);
  if(first.status!=='applied')throw Error('prepared shape checkpoint');
  const frozen=structuredClone(first.world),delta=packet(encoder,w);
  const s=(m:SnapshotMessage)=>m.world.structures[0]!;
  const plan=(m:SnapshotMessage)=>m.world.jobs.find(j=>j.kind==='sandbags')!;
  const removal=(m:SnapshotMessage)=>m.world.jobs.find(j=>j.kind==='deconstruct')!;
  const changes:Array<{label:string;change:(m:SnapshotMessage)=>void}>=[
    {label:'future 188 structure/plan/removal',change:m=>m.world.schemaVersion=188 as typeof m.world.schemaVersion},
    {label:'structure missing cloth',change:m=>delete s(m).material},
    {label:'structure leather',change:m=>s(m).material='light-leather'},
    {label:'structure orientation',change:m=>s(m).orientation=1},
    {label:'structure footprint',change:m=>s(m).footprint='legacy-single'},
    {label:'structure quality',change:m=>s(m).quality='normal'},
    ...[0,-1,.5,300].map(damage=>({label:`structure damage ${damage}`,change:(m:SnapshotMessage)=>{s(m).damage=damage;}})),
    {label:'plan orientation',change:m=>plan(m).orientation=1},
    {label:'plan leather',change:m=>plan(m).material='light-leather'},
    {label:'plan missing cloth',change:m=>delete plan(m).material},
    {label:'removal orientation',change:m=>removal(m).orientation=1},
    {label:'removal leather',change:m=>removal(m).deconstruction!.material='light-leather'},
    {label:'package',change:m=>m.world.packed.push({building:structuredClone(s(m)),owner:{type:'ground',x:24,z:20}})},
    {label:'transfer payload',change:m=>removal(m).furniture={structureId:s(m).id,kind:'sandbags'}},
    ...[{},{cloth:0},{cloth:-1},{cloth:.5},{cloth:Number.MAX_SAFE_INTEGER+1},{wood:1}].map(lostTextiles=>({
      label:`textile ledger ${JSON.stringify(lostTextiles)}`,change:(m:SnapshotMessage)=>{m.world.deconstructed.lostTextiles=lostTextiles as never;},
    })),
  ];
  for(const original of [checkpoint,delta])for(const {label,change} of changes){
    const bad=structuredClone(original);bad.revision=delta.revision;change(bad);
    expect(decoder.adopt(bad).status,`${original.kind} ${label}`).toBe('resync');
    expect(first.world).toEqual(frozen);
    if(bad.kind==='checkpoint')expect(new SnapshotDecoder().adopt(bad).status,`fresh ${label}`).toBe('resync');
  }
  const next=decoder.adopt(delta);expect(next.status).toBe('applied');
  if(next.status==='applied')expect(next.world).toEqual(w);
  expect(first.world).toEqual(frozen);
});

test('prepared known textile counters are cloned by transport and same-tick ledger mutation preserves old adopted frames',()=>{
  const w=camp();
  // Prepared transport oracle: known prospective counters, never stock or dotation.
  w.deconstructed={count:2,lostWood:0,fuelTicks:0,lostTextiles:{cloth:3,'light-leather':7}};
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),checkpoint=packet(encoder,w),first=decoder.adopt(checkpoint);
  if(first.status!=='applied')throw Error('known textile checkpoint');
  const frozen=structuredClone(first.world),tick=w.tick;
  expect(first.world.deconstructed.lostTextiles).not.toBe(w.deconstructed.lostTextiles);
  w.deconstructed.lostTextiles!.cloth=6;w.deconstructed.count=3;
  const delta=packet(encoder,w);expect(delta.kind).toBe('delta');expect(w.tick).toBe(tick);
  const bad=structuredClone(checkpoint);bad.revision=delta.revision;bad.world.schemaVersion=188 as typeof bad.world.schemaVersion;
  // Isolate the future ledger rejection from the new structure kind.
  bad.world.structures=[];
  expect(decoder.adopt(bad).status).toBe('resync');
  expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');
  const next=decoder.adopt(delta);expect(next.status).toBe('applied');
  if(next.status==='applied')expect(next.world.deconstructed.lostTextiles).toEqual({cloth:6,'light-leather':7});
  expect(first.world).toEqual(frozen);expect(first.world.deconstructed.lostTextiles).toEqual({cloth:3,'light-leather':7});
  expect(w.piles).toEqual([]);
});
