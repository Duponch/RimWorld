import {expect,test} from 'vitest';
import {recruitmentUiFixture} from './scenarios/prison-camp.ts';
import {validRescueShape,validateRescues,validArrestRescueTransport} from '../src/sim/rescue-save.ts';
import {validPrisonerPawnShape,validatePrisoners} from '../src/sim/prisoner-save.ts';
import {createPrisonerState} from '../src/sim/prisoner-state.ts';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION,type Pawn,type World} from '../src/sim/types.ts';

function arrest(phase:'approach'|'carry'='approach'){
  const {world:w,actorId,patientId,bedId}=recruitmentUiFixture();
  const actor=w.pawns.find(p=>p.id===actorId)!,patient=w.pawns.find(p=>p.id===patientId)!;
  patient.faction='colony';delete patient.prisoner;delete patient.hostilityResponse;patient.bedId=null;
  patient.x=20;patient.z=10;patient.path=[];patient.motion=null;patient.moveCooldown=0;
  patient.mental={below:[0,0,0],cooldown:0,catharsis:[],crisis:{kind:'sad-wander',age:0,target:null,waitUntil:w.tick}};
  actor.rescue={patientId,bedId,phase,arrest:true};actor.orders.active='rescue';actor.path=[];actor.state='moving';
  if(phase==='carry'){
    patient.prisoner=createPrisonerState(w,patient);delete patient.mental.crisis;
    patient.x=actor.x;patient.z=actor.z;patient.need=null;patient.state='idle';
  }
  return {w,actor,patient,bed:w.structures.find(s=>s.id===bedId)!};
}
function detained(){const v=arrest('carry');delete v.actor.rescue;v.actor.orders.active=null;v.actor.state='idle';v.patient.x=v.bed.x;v.patient.z=v.bed.z;v.patient.bedId=v.bed.id;return v;}
function release(phase:'approach'|'carry'='approach'){
  const v=detained(),{actor,patient}=v;patient.prisoner!.mode='release';actor.priorities.basic=1;
  actor.rescue={patientId:patient.id,bedId:0,phase,release:{drop:{x:17,z:10},exit:{x:17,z:10}}};actor.state='moving';
  if(phase==='carry'){patient.x=actor.x;patient.z=actor.z;patient.need=null;patient.path=[];}
  return v;
}
const shape=(p:Pawn,w:World,version:number=w.schemaVersion)=>validPrisonerPawnShape(p as unknown as Record<string,unknown>,version,w);
const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));

test('arrest marker is schema213, exactly true and exclusive of capture and release',()=>{
  const t=arrest().actor.rescue!;expect(validRescueShape(t,213)).toBe(true);expect(validRescueShape(t,212)).toBe(false);
  for(const bad of [{...t,arrest:false},{...t,arrest:undefined},{...t,capture:true},{...t,capture:undefined},
    {...t,release:undefined},{...t,release:{drop:{x:17,z:10},exit:{x:17,z:10}}},{...t,bedId:0},{...t,extra:true}])expect(validRescueShape(bad,213)).toBe(false);
});

test.each(['approach','carry'] as const)('%s arrest checkpoints retain the same colon and exact acquired state',phase=>{
  const {w,actor,patient}=arrest(phase),before=structuredClone(w);
  expect(validateWorld(w)).toEqual([]);expect(validateRescues(w)).toEqual([]);expect(validArrestRescueTransport(w)).toBe(true);
  expect(deserializeWorld(serializeWorld(w))).toEqual(before);expect(w).toEqual(before);
  const result=checkpoint(w);expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Missing snapshot');
  expect(result.world.pawns.find(p=>p.id===patient.id)!.faction).toBe('colony');expect(result.world.pawns.find(p=>p.id===actor.id)!.rescue).toEqual(actor.rescue);
  expect(result.world.rng).toBe(before.rng);expect(result.world.prisonDepartures).toEqual(before.prisonDepartures);
});

test('212 migration preserves foreign detention and does not invent arrest, colony detention or random draws',()=>{
  const {world:w}=recruitmentUiFixture();w.schemaVersion=212 as World['schemaVersion'];const before=structuredClone(w);
  expect(deserializeWorld(JSON.stringify(w))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(w).toEqual(before);
  for(const phase of ['approach','carry'] as const){const bad=arrest(phase).w;bad.schemaVersion=212 as World['schemaVersion'];expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();expect(checkpoint(bad).status).toBe('resync');}
});

test('approach requires the still-admissible crisis and a live distinct colon with a prison bed',()=>{
  for(const mutate of [(v:ReturnType<typeof arrest>)=>{delete v.patient.mental!.crisis;},
    (v:ReturnType<typeof arrest>)=>{v.patient.faction='outlaws';},
    (v:ReturnType<typeof arrest>)=>{v.patient.prisoner=createPrisonerState(v.w,v.patient);},
    (v:ReturnType<typeof arrest>)=>{v.actor.rescue!.patientId=v.actor.id;},
    (v:ReturnType<typeof arrest>)=>{delete v.bed.prisoner;},
    (v:ReturnType<typeof arrest>)=>{v.actor.orders.active=null;}]){
    const v=arrest();mutate(v);expect(validArrestRescueTransport(v.w)).toBe(false);expect(checkpoint(v.w).status).toBe('resync');
  }
});

test('carry requires committed same-faction detention, the same edge and no patient service',()=>{
  for(const mutate of [(v:ReturnType<typeof arrest>)=>{delete v.patient.prisoner;},
    (v:ReturnType<typeof arrest>)=>{v.patient.faction='outlaws';},
    (v:ReturnType<typeof arrest>)=>{v.patient.x++;},
    (v:ReturnType<typeof arrest>)=>{v.patient.moveCooldown=1;},
    (v:ReturnType<typeof arrest>)=>{v.patient.path=[{x:18,z:10}];},
    (v:ReturnType<typeof arrest>)=>{v.actor.path=[{x:17,z:10}];},
    (v:ReturnType<typeof arrest>)=>{v.patient.need={kind:'sleep',phase:'sleep',bedId:v.bed.id,target:{x:v.bed.x,z:v.bed.z}};}]){
    const v=arrest('carry');mutate(v);expect(validArrestRescueTransport(v.w)).toBe(false);expect(validateRescues(v.w).length).toBeGreaterThan(0);expect(checkpoint(v.w).status).toBe('resync');
  }
});

test('new colony detention has no recruitment mode, edge exit, released stamp or breakout authority',()=>{
  const {w,patient}=detained();expect(shape(patient,w)).toBe(true);expect(shape(patient,w,212)).toBe(false);
  for(const mode of ['maintain','release'] as const){patient.prisoner!.mode=mode;expect(shape(patient,w)).toBe(true);}
  for(const mutate of [(p:Pawn)=>{p.prisoner!.mode='reduce';},(p:Pawn)=>{p.prisoner!.mode='recruit';},
    (p:Pawn)=>{p.prisoner!.escape={x:0,z:10};},(p:Pawn)=>{p.prisoner!.releasedAt=w.tick;},
    (p:Pawn)=>{p.prisoner!.breakout={rng:123};},(p:Pawn)=>{Object.assign(p.prisoner!,{breakout:undefined});},
    (p:Pawn)=>{p.orders.active='rescue';},(p:Pawn)=>{p.hostilityResponse='ignore';}]){
    const bad=structuredClone(w),target=bad.pawns.find(p=>p.id===patient.id)!;mutate(target);
    expect(shape(target,bad)).toBe(false);expect(validatePrisoners(bad,213,new Set(bad.pawns.map(p=>p.id))).length).toBeGreaterThan(0);expect(checkpoint(bad).status).toBe('resync');
  }
});

test('earlier recruitment provenance survives detention and cannot be forged after its capture',()=>{
  const {w,patient}=detained();patient.recruitment={capturedAt:w.tick-20,recruitedAt:w.tick-10,fromFaction:'outlaws'};
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(checkpoint(w).status).toBe('applied');
  patient.prisoner!.capturedAt=w.tick-15;expect(shape(patient,w)).toBe(false);expect(checkpoint(w).status).toBe('resync');
});

test.each(['approach','carry'] as const)('local release %s uses one deposit outside the cell and no border goal',phase=>{
  const {w,patient}=release(phase);expect(validateWorld(w)).toEqual([]);expect(validateRescues(w)).toEqual([]);expect(checkpoint(w).status).toBe('applied');
  const restored=deserializeWorld(serializeWorld(w));expect(restored).toEqual(w);expect(restored.pawns.find(p=>p.id===patient.id)!.prisoner!.releasedAt).toBeUndefined();
});

test('local release rejects an interior prison deposit, different exit, future version and false claim',()=>{
  for(const mutate of [(v:ReturnType<typeof release>)=>{v.actor.rescue!.release={drop:{x:10,z:10},exit:{x:10,z:10}};},
    (v:ReturnType<typeof release>)=>{v.actor.rescue!.release!.exit={x:0,z:10};},
    (v:ReturnType<typeof release>)=>{v.w.schemaVersion=212 as World['schemaVersion'];},
    (v:ReturnType<typeof release>)=>{v.w.pawns.find(p=>p!==v.actor&&p!==v.patient)!.rescue=structuredClone(v.actor.rescue!);}]){
    const v=release();mutate(v);expect(validArrestRescueTransport(v.w)).toBe(false);expect(checkpoint(v.w).status).toBe('resync');
  }
});

test('failed carry delta is atomic and repaired checkpoint does not mutate the retained view',()=>{
  const {w,patient}=arrest('carry'),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const initial=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(initial.status).toBe('applied');if(initial.status!=='applied')throw Error('Missing snapshot');
  const retained=structuredClone(initial.world);patient.x++;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,1))).status).toBe('resync');expect(initial.world).toEqual(retained);
  patient.x--;expect(decoder.adopt(structuredClone(encoder.encode(w,0,1,true))).status).toBe('applied');expect(initial.world).toEqual(retained);
});
