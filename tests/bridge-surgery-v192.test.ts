import { expect,test } from 'vitest';
import { withoutMiningSkill, withoutTelevisionRecreation,withMigratedTelevisionRecreation } from './scenarios/legacy-skills.ts';
import { SnapshotDecoder,SnapshotEncoder,type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { surgeryCamp } from './helpers/surgery-v192.ts';
import { administerAnesthetic,advanceAnesthetic } from '../src/sim/anesthetic.ts';
import { reconcilePawnHealth } from '../src/sim/health.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';

/** Prepared transport states; physical acquisition and administration are
 * exercised by surgery-orchestration-v192, not claimed by this shape fixture. */
function frame(phase:'pickup'|'approach'|'work'='pickup') {
  const c=surgeryCamp(),w=c.world,d=w.pawns[0]!,p=w.pawns[1]!;
  d.priorities.doctor=1;Object.assign(d,{x:10,z:9,state:'moving'});
  Object.assign(p,{x:10,z:10,state:'resting'});
  p.need={kind:'sleep',phase:'sleep',bedId:c.bedId,target:{x:10,z:10},medical:'patient'};
  p.surgeryRequest={part:'left-arm',requestedAt:w.tick};
  d.surgery={patientId:p.id,part:'left-arm',bedId:c.bedId,spot:{x:10,z:9},phase:'pickup',progress:0,workCore:0,
    medicine:{item:'medicine',sourcePileId:c.sourceId,carryPileId:null,quantity:1}};
  if(phase==='approach') {
    w.piles[0]!.quantity=1;w.piles[0]!.owner={type:'pawn',pawnId:d.id};d.surgery.phase=phase;d.surgery.medicine!.carryPileId=c.sourceId;
  }else if(phase==='work') {
    administerAnesthetic(p.health!,()=>.5);reconcilePawnHealth(w,p);w.piles=[];
    delete d.surgery.medicine;Object.assign(d.surgery,{phase,consumedMedicine:'medicine',progress:8.8,workCore:10});d.state='working';
  }
  refreshStock(w);expect(validateWorld(w)).toEqual([]);return w;
}

test('valid prepared pickup, carried approach and administered work preserve exact frames at the same tick',()=>{
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  for(const phase of ['pickup','approach','work'] as const) {
    const w=frame(phase),packet=structuredClone(encoder.encode(w,0,1));
    const adopted=decoder.adopt(packet);expect(adopted.status).toBe('applied');
    if(adopted.status!=='applied')throw Error('adoption');expect(adopted.world).toEqual(w);
    const previous=structuredClone(adopted.world),delta=structuredClone(encoder.encode(w,0,1));
    expect(delta.kind).toBe('delta');expect(decoder.adopt(delta).status).toBe('applied');expect(adopted.world).toEqual(previous);
  }
});

test('invalid surgery and anesthetic shapes reject a checkpoint and a same-tick delta atomically',()=>{
  const w=frame('work'),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const checkpoint=structuredClone(encoder.encode(w,0,1)),first=decoder.adopt(checkpoint);
  if(first.status!=='applied')throw Error('initial adoption');const prior=structuredClone(first.world);
  const delta=structuredClone(encoder.encode(w,0,1));
  const mutations:Array<(w:World)=>void>=[
    v=>{v.pawns[1]!.surgeryRequest!.part='head' as never;},
    v=>{v.pawns[1]!.surgeryRequest!.requestedAt=v.tick+1;},
    v=>{(v.pawns[0]!.surgery as unknown as Record<string,unknown>).extra=1;},
    v=>{v.pawns[0]!.surgery!.phase='finish' as never;},
    v=>{v.pawns[0]!.surgery!.workCore=0;v.pawns[0]!.surgery!.progress=0;},
    v=>{v.pawns[0]!.surgery!.consumedMedicine='rice' as never;},
    v=>{v.pawns[0]!.surgery!.medicine={item:'medicine',quantity:1,sourcePileId:w.nextId-1,carryPileId:null};},
    v=>{v.pawns[1]!.health!.anesthetic!.bornAt=v.tick+1;},
    v=>{v.pawns[1]!.health!.anesthetic!.expiresAtCore=v.tick*10;},
    v=>{v.pawns[1]!.health!.anesthetic!.remainder=3;},
    v=>{v.pawns[1]!.health!.anesthetic!.severity--;},
    v=>{(v.pawns[1]!.health!.anesthetic as unknown as Record<string,unknown>).extra=true;},
    v=>{v.pawns[1]!.health!.tick++;},
    v=>{v.pawns[1]!.health!.body='hare';},
  ];
  for(const mutate of mutations) {
    const badDelta=structuredClone(delta);mutate(badDelta.world as World);
    expect(decoder.adopt(badDelta).status).toBe('resync');expect(first.world).toEqual(prior);
    const badCheckpoint=structuredClone(checkpoint);mutate(badCheckpoint.world as World);
    expect(new SnapshotDecoder().adopt(badCheckpoint).status).toBe('resync');
  }
  // Every rejection preserved the revision, so the original packet still applies.
  const next=decoder.adopt(delta);expect(next.status).toBe('applied');expect(first.world).toEqual(prior);
  if(next.status==='applied')expect(next.world).toEqual(w);
});

test('178 transport refuses all future surgical fields while its neutral historical frame remains acceptable',()=>{
  const w=withoutTelevisionRecreation(withoutMiningSkill(surgeryCamp().world));delete w.pawns[1]!.health!.infections;
  (w as {schemaVersion:number}).schemaVersion=(withoutTelevisionRecreation(w),178);expect(validateWorld(withMigratedTelevisionRecreation({...w,schemaVersion:SCHEMA_VERSION}))).toEqual([]);
  const good=structuredClone(new SnapshotEncoder().encode(w,0,1)),future=frame('work');
  expect(new SnapshotDecoder().adopt(good).status).toBe('applied');
  for(const field of ['surgeryRequest','surgery','anesthetic'] as const) {
    const bad=structuredClone(good);
    if(field==='anesthetic')bad.world.pawns[1]!.health!.anesthetic=structuredClone(future.pawns[1]!.health!.anesthetic!);
    else if(field==='surgery')bad.world.pawns[0]!.surgery=structuredClone(future.pawns[0]!.surgery!);
    else bad.world.pawns[1]!.surgeryRequest=structuredClone(future.pawns[1]!.surgeryRequest!);
    expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');
  }
});

test('the anesthetic cadence is checked against its medical clock, and death freezes that clock across later frames',()=>{
  const c=surgeryCamp(),w=c.world,p=w.pawns[1]!;p.health=createMedicalRecord(w.tick);
  administerAnesthetic(p.health,()=>0);const birth=w.tick;
  for(let i=0;i<21;i++){p.health.tick++;advanceAnesthetic(p.health,p.id%60);}
  w.tick=p.health.tick;reconcilePawnHealth(w,p);
  // A prepared frozen death: transport verifies clocks/condition only; the
  // full save validator still owns clinical consistency of this cause.
  p.health.death={tick:p.health.tick,cause:'blood-loss'};p.health.bloodLoss=300_000_000;reconcilePawnHealth(w,p);
  expect(validateWorld(w)).toEqual([]);const frozen=structuredClone(p.health);
  w.tick=birth+20_000;
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),packet=structuredClone(encoder.encode(w,0,1));
  expect(decoder.adopt(packet).status).toBe('applied');expect(p.health).toEqual(frozen);
  const delta=structuredClone(encoder.encode(w,0,1));
  const bad=structuredClone(delta);bad.world.pawns[1]!.health!.tick=w.tick;bad.world.pawns[1]!.health!.death!.tick=w.tick;
  expect(decoder.adopt(bad as SnapshotMessage).status).toBe('resync');
  expect(decoder.adopt(delta).status).toBe('applied');
});

test('an individually plausible severity and remainder from another owner phase cannot replace the confirmed frame',()=>{
  const c=surgeryCamp(),w=c.world,p=w.pawns[1]!;p.health=createMedicalRecord(w.tick);
  administerAnesthetic(p.health,()=>.5);p.health.tick++;advanceAnesthetic(p.health,p.id%20);w.tick=p.health.tick;
  reconcilePawnHealth(w,p);expect(validateWorld(w)).toEqual([]);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  if(first.status!=='applied')throw Error('initial cadence adoption');const prior=structuredClone(first.world);
  const delta=structuredClone(encoder.encode(w,0,1)),bad=structuredClone(delta);
  const state=bad.world.pawns[1]!.health!.anesthetic!;
  if(state.severity===1_000_000_000){state.severity=997_333_334;state.remainder=2;}
  else {state.severity=1_000_000_000;state.remainder=0;}
  // Both encode 0 or 1 whole cadences during a one-tick interval. Only the
  // captured owner's actual phase is allowed to determine which occurred.
  expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(prior);
  expect(decoder.adopt(delta).status).toBe('applied');
});
