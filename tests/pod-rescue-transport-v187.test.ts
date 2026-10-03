import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { PresentationChanges } from '../src/bridge/presentation-changes.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { resolveSelectedPodRescue } from '../src/sim/pod-rescue.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import type { World } from '../src/sim/types.ts';
import { SCHEMA_VERSION } from '../src/sim/types.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';

function valid(w:World):void {expect(validateWorld(w),JSON.stringify({tick:w.tick,errors:validateWorld(w)})).toEqual([]);}
function until(w:World,done:()=>boolean,max=800):void {
  for(let n=0;n<max&&!done();n++)stepWorld(w);
  valid(w);expect(done()).toBe(true);
}
function replay(w:World,n=3):void {
  valid(w);const resumed=deserializeWorld(serializeWorld(w));stepWorld(resumed,n);stepWorld(w,n);expect(resumed).toEqual(w);valid(w);
}
function staged() {
  const w=medicalCamp(),d=w.pawns[0]!;expect(resolveSelectedPodRescue(w,187)).toBe(true);
  const cell=w.podRescues!.pending!.cell;
  d.x=cell.x-4;d.z=cell.z;d.priorities.doctor=1;
  const bed=fixtureBuilding(w,'bed',cell.x+7,cell.z);Object.assign(bed,{medical:true});valid(w);return {w,d,bed};
}
function opened() {const prepared=staged();stepWorld(prepared.w,10);const p=prepared.w.pawns.find(p=>p.podRescue)!;expect(p).toBeDefined();valid(prepared.w);return {...prepared,p};}
/** Explicit recovered checkpoint; injury recovery/admission are exercised by
 * pod-rescue-care. Here the ordinary planner must still walk and export. */
function departure() {
  const {w,p}=opened();p.health=createMedicalRecord(w.tick);p.state='idle';p.podRescue!.admittedAt=w.tick;
  expect(applyCommand(w,{type:'food-policy-assign',pawnId:p.id,policyId:2}).ok).toBe(true);
  valid(w);
  const pawnId=p.id,itemIds=w.piles.filter(q=>'pawnId' in q.owner&&q.owner.pawnId===p.id).map(q=>q.id),nextId=w.nextId;
  until(w,()=>w.podRescues!.departed.length===1);
  expect(w.pawns.some(q=>q.id===pawnId)).toBe(false);expect(w.nextId).toBe(nextId);
  expect(w.podRescues!.departed[0]!.items.map(q=>q.id)).toEqual(itemIds);
  return {w,pawnId};
}

test('schema 174 is validated before a neutral migration; pod world and pawn fields cannot be smuggled into it',()=>{
  const old=medicalCamp();old.schemaVersion=174 as World['schemaVersion'];const before=structuredClone(old);
  const migrated=deserializeWorld(JSON.stringify(old));
  expect(migrated).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(old).toEqual(before);
  expect(migrated.podRescues).toBeUndefined();expect(migrated.pawns.every(p=>p.podRescue===undefined)).toBe(true);
  const pending=staged().w.podRescues!;
  for(const change of [
    (w:World)=>{w.podRescues=structuredClone(pending);},
    (w:World)=>{w.pawns[0]!.podRescue={incidentId:1};},
    (w:World)=>{w.pawns[0]!.priorities.doctor=8;},
  ]){const corrupt=structuredClone(old);change(corrupt);expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow();}
});

test('save continuation preserves capsule staging, forced approach, shared carried edge and actual admission',()=>{
  const {w,d,bed}=staged();replay(w,3);expect(w.podRescues!.pending).toBeDefined();
  replay(w,4);expect(w.podRescues!.pending).toBeDefined();expect(w.pawns.some(p=>p.podRescue)).toBe(false);
  replay(w,3);const p=w.pawns.find(p=>p.podRescue)!;expect(p).toBeDefined();expect(w.podRescues!.pending).toBeUndefined();
  expect(applyCommand(w,{type:'order-rescue',pawnId:d.id,patientId:p.id,queue:false}).ok).toBe(true);
  expect(d.rescue?.phase).toBe('approach');replay(w);
  until(w,()=>d.rescue?.phase==='carry'&&d.moveCooldown>0);expect(p.podRescue!.admittedAt).toBeUndefined();
  expect(p.motion).toEqual(d.motion);replay(w);
  until(w,()=>p.podRescue!.admittedAt!==undefined);expect(p.need).toMatchObject({kind:'sleep',bedId:bed.id,phase:'sleep'});
  replay(w,8);expect(w.podRescues!.incidents).toHaveLength(1);
});

test('frozen departures use common human/item validation and the departure clock, retaining deleted historical food policies',()=>{
  const {w}=departure(),archive=structuredClone(w.podRescues!.departed[0]!);
  const tick=w.tick;stepWorld(w,60);expect(w.tick).toBe(tick+60);expect(w.podRescues!.departed[0]).toEqual(archive);
  expect(applyCommand(w,{type:'food-policy-delete',policyId:2}).ok).toBe(true);
  expect(w.foodPolicies.some(p=>p.id===2)).toBe(false);expect(w.podRescues!.departed[0]!.pawn.foodPolicyId).toBe(2);replay(w,10);
  const corruptions:Array<(w:World)=>void>=[
    c=>{c.podRescues!.departed[0]!.pawn.skills.medicine.level=99;},
    c=>{c.podRescues!.departed[0]!.pawn.age!.biologicalTicks=NaN;},
    c=>{c.podRescues!.departed[0]!.pawn.health!.tick=c.podRescues!.departed[0]!.tick+1;},
    c=>{c.podRescues!.departed[0]!.pawn.foodPolicyId=c.nextFoodPolicyId;},
    c=>{c.podRescues!.departed[0]!.items[0]!.quantity=2;},
    c=>{c.podRescues!.departed[0]!.items[0]!.item='wood';},
    c=>{const d=c.podRescues!.departed[0]!;d.items[0]!.rot={progress:0,atTick:d.tick+1};},
    c=>{c.podRescues!.departed[0]!.items[0]!.owner={type:'apparel',pawnId:c.pawns[0]!.id};},
    c=>{c.podRescues!.departed[0]!.pawn.id=c.pawns[0]!.id;c.podRescues!.incidents[0]!.pawnId=c.pawns[0]!.id;},
    c=>{c.podRescues!.departed[0]!.items.push(structuredClone(c.podRescues!.departed[0]!.items[0]!));},
    c=>{c.podRescues!.departed[0]!.items[0]!.id=c.pawns[0]!.id;},
  ];
  for(const change of corruptions){const bad=structuredClone(w);change(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();expect(w.podRescues!.departed[0]).toEqual(archive);}
});

test('cheap snapshot decoding rejects incoherent pod deltas atomically and retains the previous adopted state and revision',()=>{
  const {w}=opened(),enc=new SnapshotEncoder(),dec=new SnapshotDecoder();
  const initial=dec.adopt(structuredClone(enc.encode(w,0,6)));expect(initial.status).toBe('applied');
  if(initial.status!=='applied')throw Error('checkpoint rejected');const frozen=structuredClone(initial.world);
  stepWorld(w);const delta=structuredClone(enc.encode(w,0,6));expect(delta.kind).toBe('delta');
  const mutations:Array<(w:World)=>void>=[
    c=>{c.podRescues!.incidents[0]!.pawnId=c.pawns[0]!.id;},
    c=>{c.pawns.find(p=>p.podRescue)!.podRescue!.admittedAt=c.tick+1;},
    c=>{c.podRescues!.incidents[0]!.openedAt=c.podRescues!.incidents[0]!.start;},
    c=>{c.podRescues!.incidents.push(structuredClone(c.podRescues!.incidents[0]!));},
    c=>{c.pawns.find(p=>p.podRescue)!.draft={lastActiveTick:c.tick,target:null,queue:[]};},
  ];
  for(const mutate of mutations){const invalid=structuredClone(delta);mutate(invalid.world as World);expect(dec.adopt(invalid).status).toBe('resync');expect(initial.world).toEqual(frozen);}
  const adopted=dec.adopt(delta);expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(w);
  expect(initial.world).toEqual(frozen);
  const archived=departure().w,archiveEnc=new SnapshotEncoder(),archiveDec=new SnapshotDecoder();
  expect(archiveDec.adopt(structuredClone(archiveEnc.encode(archived,0,6))).status).toBe('applied');
  stepWorld(archived);const archivedDelta=structuredClone(archiveEnc.encode(archived,0,6));
  const invalid=structuredClone(archivedDelta);invalid.world.podRescues!.departed[0]!.pawn.health!.tick=archived.tick;
  expect(archiveDec.adopt(invalid).status).toBe('resync');expect(archiveDec.adopt(archivedDelta).status).toBe('applied');
});

test('same-tick presentation observation compares copied pod pending, admission and treatment values',()=>{
  const w=medicalCamp(),changes=new PresentationChanges();expect(changes.capture(w)).toBe(true);expect(changes.capture(w)).toBe(false);
  const tick=w.tick;expect(resolveSelectedPodRescue(w,187)).toBe(true);w.events=[];
  expect(w.tick).toBe(tick);expect(changes.capture(w)).toBe(true);expect(changes.capture(w)).toBe(false);
  w.podRescues!.pending!.cell.x++;expect(changes.capture(w)).toBe(true);expect(changes.capture(w)).toBe(false);
  // The pure observer is also tested without unrelated event/state changes;
  // the physical admission transition is exercised by the care suite.
  stepWorld(w,10);const p=w.pawns.find(p=>p.podRescue)!;changes.capture(w);const admissionTick=w.tick;
  p.podRescue!.admittedAt=admissionTick;expect(changes.capture(w)).toBe(true);expect(changes.capture(w)).toBe(false);
  w.podRescues!.incidents[0]!.tendedAt=admissionTick;expect(changes.capture(w)).toBe(true);expect(changes.capture(w)).toBe(false);
  expect(w.tick).toBe(admissionTick);const value=structuredClone(w);expect(changes.capture(w)).toBe(false);expect(w).toEqual(value);
});
