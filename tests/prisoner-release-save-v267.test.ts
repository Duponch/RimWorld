import { expect,test } from 'vitest';
import { validPrisonerPawnShape,validatePrisoners } from '../src/sim/prisoner-save.ts';
import { validRescueShape,validateRescues } from '../src/sim/rescue-save.ts';
import { exitPrisoner } from '../src/sim/prisoner-exit.ts';
import { newApparelState } from '../src/sim/apparel-rules.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots.ts';
import { recruitmentUiFixture } from './scenarios/prison-camp.ts';
import type { Pawn,World } from '../src/sim/types.ts';

function fixture(){
  const {world:w,actorId,patientId}=recruitmentUiFixture();
  w.schemaVersion=202 as World['schemaVersion'];
  const actor=w.pawns.find(p=>p.id===actorId)!,patient=w.pawns.find(p=>p.id===patientId)!;
  patient.prisoner!.mode='release';actor.priorities.basic=1;actor.priorities.warden=0;
  return {w,actor,patient};
}
const pawnShape=(p:Pawn,w:World,version=202)=>validPrisonerPawnShape(p as unknown as Record<string,unknown>,version,w);
function transport(phase:'approach'|'carry'='approach'){
  const f=fixture(),{w,actor,patient}=f;
  actor.rescue={patientId:patient.id,bedId:0,phase,release:{drop:{x:17,z:10},exit:{x:0,z:10}}};
  actor.state='moving';actor.path=[];actor.orders.active=null;
  if(phase==='carry'){
    patient.x=actor.x;patient.z=actor.z;patient.need=null;patient.path=[];patient.motion=null;patient.moveCooldown=actor.moveCooldown=0;
  }
  return f;
}
function released(){
  const f=fixture(),{w,patient}=f;
  patient.prisoner!.releasedAt=w.tick;patient.prisoner!.escape={x:0,z:10};
  patient.bedId=null;patient.need=null;patient.path=[];patient.motion=null;patient.moveCooldown=0;
  return f;
}
function errors(w:World){return validatePrisoners(w,202,new Set(w.pawns.map(p=>p.id)));}

test('release and deposit provenance are future fields before schema 202',()=>{
  const {w,patient}=fixture();
  expect(pawnShape(patient,w)).toBe(true);expect(pawnShape(patient,w,201)).toBe(false);
  patient.prisoner!.mode='maintain';expect(pawnShape(patient,w,201)).toBe(true);
  patient.prisoner!.releasedAt=w.tick;expect(pawnShape(patient,w)).toBe(false);
  patient.prisoner!.mode='release';expect(pawnShape(patient,w)).toBe(true);expect(pawnShape(patient,w,201)).toBe(false);
});

test('releasedAt is bounded by capture and current tick and closes future chat',()=>{
  const {w,patient}=released(),at=w.tick;
  for(const value of [at-1,at+1,.5,NaN,Infinity]){
    patient.prisoner!.releasedAt=value;expect(pawnShape(patient,w),String(value)).toBe(false);
  }
  patient.prisoner!.releasedAt=at;w.tick++;
  patient.prisoner!.lastChatTick=w.tick;expect(pawnShape(patient,w)).toBe(false);
  patient.prisoner!.lastChatTick=at;expect(pawnShape(patient,w)).toBe(true);
});

test('release transport shape has two exact cells, no bed and no capture',()=>{
  const {actor}=transport(),task=actor.rescue!;
  expect(validRescueShape(task,202)).toBe(true);expect(validRescueShape(task,201)).toBe(false);
  const bad:unknown[]=[{...task,bedId:1},{...task,capture:true},{...task,capture:undefined},
    {...task,release:{drop:task.release!.drop}},{...task,release:{...task.release,extra:1}},
    {...task,release:{...task.release,exit:{x:-1,z:0}}},{...task,release:{...task.release,drop:{x:1,z:1,extra:0}}}];
  for(const value of bad)expect(validRescueShape(value,202),JSON.stringify(value)).toBe(false);
});

test('basic or warden grants release authority, neither cannot and a direct order is not a bypass',()=>{
  const {w,actor}=transport();expect(validateRescues(w)).toEqual([]);
  actor.priorities.basic=0;actor.priorities.warden=1;expect(validateRescues(w)).toEqual([]);
  actor.priorities.warden=0;expect(validateRescues(w)).toContain('Invalid prisoner release authority.');
  actor.priorities.basic=1;actor.orders.active='rescue';expect(validateRescues(w)).toContain('Invalid prisoner release authority.');
  actor.orders.active=null;actor.draft={lastActiveTick:w.tick,target:null,queue:[]};expect(validateRescues(w)).toContain('Invalid prisoner release authority.');
});

test('release destination is an outdoor-connected space with a real map-edge exit',()=>{
  const {w,actor}=transport(),task=actor.rescue!;
  expect(validateRescues(w)).toEqual([]);
  task.release!.exit={x:17,z:10};expect(validateRescues(w)).toContain('Invalid prisoner release destination.');
  task.release!.exit={x:0,z:10};task.release!.drop={x:10,z:10};
  expect(validateRescues(w)).toContain('Invalid prisoner release destination.');
  task.release!.drop={x:w.width,z:10};expect(validateRescues(w)).toContain('Invalid prisoner release destination.');
});

test('approach may retain the last followed cell while carry targets its fixed deposit',()=>{
  for(const phase of ['approach','carry'] as const){
    const {w,actor,patient}=transport(phase);
    const target=phase==='carry'?actor.rescue!.release!.drop:patient;
    actor.path=[{x:target.x,z:target.z}];expect(validateRescues(w)).toEqual([]);
    actor.path=[{x:16,z:10}];expect(validateRescues(w)).toEqual(phase==='carry'?['Invalid prisoner release route.']:[]);
  }
});

test('carry keeps mirrored position and edge and rejects patient service or a duplicate claim',()=>{
  const {w,actor,patient}=transport('carry');expect(validateRescues(w)).toEqual([]);
  patient.moveCooldown=1;expect(validateRescues(w)).toContain('Carried patient does not share carrier edge.');
  patient.moveCooldown=0;patient.path=[{x:18,z:10}];expect(validateRescues(w)).toContain('Carried patient still uses a service.');
  patient.path=[];w.pawns[1]!.rescue=structuredClone(actor.rescue!);
  expect(validateRescues(w)).toContain('Invalid or duplicate prisoner release patient.');
});

test('release transport refuses a dead, downed or previously deposited prisoner',()=>{
  const {w,patient}=transport();
  for(const state of ['dead','downed'] as const){patient.state=state;expect(validateRescues(w)).toContain('Invalid or duplicate prisoner release patient.');}
  patient.state='idle';patient.prisoner!.releasedAt=w.tick;expect(validateRescues(w)).toContain('Invalid or duplicate prisoner release patient.');
});

test('release mode cannot retain a future warden conversation',()=>{
  const {w,actor,patient}=fixture();actor.priorities.warden=1;actor.state='moving';
  actor.ward={kind:'chat',patientId:patient.id,spot:{x:actor.x,z:actor.z},phase:'approach',progress:0,rapports:0};
  expect(errors(w)).toContain('Invalid or duplicate warden patient.');
});

test('a later collapse may keep the actual release while receiving ordinary bed care',()=>{
  const {w,patient}=released(),bed=w.structures.find(s=>s.kind==='bed')!;
  patient.x=bed.x;patient.z=bed.z;patient.state='downed';
  patient.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:bed.x,z:bed.z}};
  expect(errors(w)).toEqual([]);expect(pawnShape(patient,w)).toBe(true);
  patient.need={kind:'eat',phase:'ingest',sourcePileId:900,carryPileId:900,quantity:1,progress:0,dining:{target:{x:patient.x,z:patient.z},seatId:null,tableId:null}};
  expect(errors(w)).toEqual([]);
  patient.state='dead';patient.need=null;delete patient.prisoner!.escape;
  expect(pawnShape(patient,w)).toBe(true);expect(errors(w)).toEqual([]);
});

test('a release exports the same worn item only once at the real edge and survives save and Decoder',()=>{
  const {w,patient}=released();patient.x=0;patient.z=10;
  const item={id:w.nextId++,kind:'apparel' as const,item:'cloth-shirt' as const,quantity:1,
    owner:{type:'apparel' as const,pawnId:patient.id},apparel:newApparelState('cloth-shirt')};
  w.piles.push(item);refreshStock(w);
  expect(exitPrisoner(w,patient)).toBe(true);expect(exitPrisoner(w,patient)).toBe(false);
  expect(w.prisonDepartures).toHaveLength(1);
  expect(w.prisonDepartures![0]).toMatchObject({pawnId:patient.id,reason:'released',releasedAt:w.tick,items:[{id:item.id}]});
  expect(w.piles).not.toContain(item);expect(w.events.at(-1)!.message).toContain('libéré');
  expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),result=decoder.adopt(structuredClone(encoder.encode(w,0,6)));
  expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(w);
});

test('release departures require deposit provenance and reject duplicates or future values',()=>{
  const {w,patient}=released();patient.x=0;patient.z=10;expect(exitPrisoner(w,patient)).toBe(true);
  const d=w.prisonDepartures![0];expect(errors(w)).toEqual([]);
  delete d!.releasedAt;expect(errors(w)).toContain('Invalid prisoner departure.');
  d!.releasedAt=w.tick+1;expect(errors(w)).toContain('Invalid prisoner departure.');
  d!.releasedAt=w.tick;delete d!.reason;expect(errors(w)).toContain('Invalid prisoner departure.');
  d!.reason='released';w.prisonDepartures!.push(structuredClone(d!));expect(errors(w)).toContain('Invalid prisoner departure.');
  expect(validatePrisoners(w,201,new Set(w.pawns.map(p=>p.id)))).toContain('Invalid prisoner departure.');
});

test('carried or cargo-bearing prisoners cannot disappear at the edge',()=>{
  const {w,actor,patient}=released();patient.x=0;patient.z=10;
  actor.rescue={patientId:patient.id,bedId:0,phase:'carry',release:{drop:{x:0,z:10},exit:{x:0,z:10}}};
  expect(exitPrisoner(w,patient)).toBe(false);delete actor.rescue;
  patient.interruptedCargo=true;expect(exitPrisoner(w,patient)).toBe(false);
});
