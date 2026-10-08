import { expect,test } from 'vitest';
import { validPrisonerPawnShape,validPrisonBreakBindings,validatePrisoners } from '../src/sim/prisoner-save.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { meleeRecoveryCore } from '../src/sim/melee-statistics.ts';
import { recruitmentUiFixture } from './scenarios/prison-camp.ts';
import type { Pawn,World } from '../src/sim/types.ts';

function fixture(active=true){
  const {world:w,actorId,patientId}=recruitmentUiFixture();
  const actor=w.pawns.find(p=>p.id===actorId)!,patient=w.pawns.find(p=>p.id===patientId)!;
  patient.prisoner!.breakout={rng:123,...active?{lastAt:w.tick,active:{startedAt:w.tick,initiatorId:patient.id}}:{}};
  patient.need=null;patient.path=[];patient.motion=null;patient.moveCooldown=0;
  return {w,actor,patient};
}
const shape=(p:Pawn,w:World,version=204)=>validPrisonerPawnShape(p as unknown as Record<string,unknown>,version,w);
const prisonErrors=(w:World)=>validatePrisoners(w,w.schemaVersion,new Set(w.pawns.map(p=>p.id)));

test('breakout is prospective schema 204 and old saves migrate without adopting a history',()=>{
  const {w,patient}=fixture(false);expect(shape(patient,w)).toBe(true);expect(shape(patient,w,203)).toBe(false);
  const future=structuredClone(w);future.schemaVersion=203 as World['schemaVersion'];
  expect(()=>deserializeWorld(JSON.stringify(future))).toThrow();
  delete patient.prisoner!.breakout;w.schemaVersion=203 as World['schemaVersion'];
  const before=structuredClone(w),restored=deserializeWorld(JSON.stringify(w));
  expect(restored).toEqual({...before,schemaVersion:204});
  expect(restored.pawns.find(p=>p.id===patient.id)!.prisoner!.breakout).toBeUndefined();
});

test('active and completed histories round trip without changing pawn, possessions or RNG',()=>{
  for(const active of [false,true]){
    const {w,patient}=fixture(active);if(!active)patient.prisoner!.breakout!.lastAt=w.tick;
    expect(validateWorld(w)).toEqual([]);
    const before=structuredClone(w);expect(deserializeWorld(serializeWorld(w))).toEqual(before);expect(w).toEqual(before);
    const result=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,6)));
    expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(before);
  }
});

test('history fields and exact active references reject malformed, future and extra values',()=>{
  const {w,patient}=fixture(),state=patient.prisoner!.breakout!;
  const bad:unknown[]=[null,[],{rng:0},{rng:0x100000000},{rng:1.5},{rng:1,lastAt:-1},{rng:1,lastAt:w.tick+1},{...state,extra:true},
    {rng:1,active:state.active},{...state,lastAt:w.tick+1},{...state,active:{...state.active,startedAt:w.tick+1}},
    {...state,active:{startedAt:w.tick}},{...state,active:{...state.active,initiatorId:0}},
    {...state,active:{...state.active,initiatorId:w.nextId}},{...state,active:{...state.active,extra:true}}];
  for(const value of bad){
    const copy=structuredClone(patient);Object.assign(copy.prisoner!,{breakout:value});
    expect(shape(copy,w),JSON.stringify(value)).toBe(false);
  }
  const historical=structuredClone(patient);historical.prisoner!.breakout!.active!.initiatorId=w.nextId-1;
  expect(shape(historical,w)).toBe(true); // Historical reference need not remain a live pawn.
});

test('active timestamps are bounded by capture and match lastAt exactly',()=>{
  const {w,patient}=fixture();w.tick=10;patient.prisoner!.capturedAt=4;
  const b=patient.prisoner!.breakout!;b.lastAt=5;b.active!.startedAt=5;expect(shape(patient,w)).toBe(true);
  b.lastAt=3;b.active!.startedAt=3;expect(shape(patient,w)).toBe(false);
  b.lastAt=5;b.active!.startedAt=6;expect(shape(patient,w)).toBe(false);
  b.lastAt=11;b.active!.startedAt=11;expect(shape(patient,w)).toBe(false);
});

test('active breakouts reject released, incapacitated and competing local mandates',()=>{
  const {w,patient}=fixture();
  const mutations:((p:Pawn)=>void)[]=[p=>{p.prisoner!.mode='release';p.prisoner!.releasedAt=w.tick;},
    p=>{p.state='dead';},p=>{p.state='downed';},p=>{p.need={kind:'sleep',phase:'sleep',bedId:p.bedId,target:{x:p.x,z:p.z}};},
    p=>{p.medicalSleep=true;},p=>{p.interruptedCargo=true;},p=>{p.orders.active='rescue';},p=>{p.jobId=1;},
    p=>{p.draft={lastActiveTick:w.tick,target:null,queue:[]};},p=>{p.melee={order:{targetId:1,startedDowned:false,auto:'response'},strike:null};}];
  for(const mutate of mutations){const copy=structuredClone(patient);mutate(copy);expect(shape(copy,w),mutate.toString()).toBe(false);}
});

test('only active prison-break melee may coexist with prisoner ownership; recovery order null remains valid',()=>{
  const {w,actor,patient}=fixture();
  patient.melee={order:{targetId:actor.id,startedDowned:false,auto:'prison-break'},strike:null};
  expect(shape(patient,w)).toBe(true);expect(prisonErrors(w)).toEqual([]);
  delete patient.prisoner!.breakout!.active;expect(shape(patient,w)).toBe(false);
  expect(prisonErrors(w)).toContain('Prisoner retains a colony or combat mandate.');
  patient.prisoner!.breakout!.active={startedAt:w.tick,initiatorId:patient.id};
  patient.melee={order:null,strike:{targetId:actor.id,atCore:w.tick*10,untilCore:w.tick*10+meleeRecoveryCore('left-fist'),tool:'left-fist',outcome:'miss'}};
  expect(shape(patient,w)).toBe(true);expect(prisonErrors(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('an active melee route may target the opponent while the separate edge exit remains saved',()=>{
  const {w,actor,patient}=fixture();patient.prisoner!.escape={x:0,z:10};patient.path=[{x:actor.x,z:actor.z}];
  patient.melee={order:{targetId:actor.id,startedDowned:false,auto:'prison-break'},strike:null};
  expect(prisonErrors(w)).toEqual([]);
  delete patient.melee;expect(prisonErrors(w)).toContain('Invalid prisoner escape intent or route.');
  delete patient.prisoner!.breakout!.active;expect(prisonErrors(w)).toContain('Invalid prisoner escape intent or route.');
});

test('active prisoners cannot be the target of a conversation, feeding, treatment, surgery or rescue claim',()=>{
  const {w,actor,patient}=fixture();expect(validPrisonBreakBindings(w,204)).toBe(true);
  for(const key of ['ward','feed','tend','surgery','rescue']){
    const bad=structuredClone(w),owner=bad.pawns.find(p=>p.id===actor.id)!;
    Object.assign(owner,{[key]:{patientId:patient.id}});
    expect(validPrisonBreakBindings(bad,204),key).toBe(false);
  }
});

test('a malformed active delta resyncs atomically and does not consume the valid revision',()=>{
  const {w,patient}=fixture(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('checkpoint rejected');
  const retained=structuredClone(first.world);patient.prisoner!.breakout!.rng=456;
  const good=structuredClone(encoder.encode(w,0,6)),bad=structuredClone(good);
  bad.world.pawns.find(p=>p.id===patient.id)!.prisoner!.breakout!.active!.initiatorId=w.nextId;
  expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(retained);
  const result=decoder.adopt(good);expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(w);
});

test('snapshot ownership refuses a forged active need and a care claim before publication',()=>{
  const {w,actor,patient}=fixture();
  const need=structuredClone(w),p=need.pawns.find(p=>p.id===patient.id)!;
  p.need={kind:'sleep',phase:'sleep',bedId:p.bedId,target:{x:p.x,z:p.z}};
  expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(need,0,6))).status).toBe('resync');
  const care=structuredClone(w),warden=care.pawns.find(p=>p.id===actor.id)!;warden.state='moving';
  warden.ward={kind:'chat',patientId:patient.id,spot:{x:warden.x,z:warden.z},phase:'approach',progress:0,rapports:0};
  expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(care,0,6))).status).toBe('resync');
});
