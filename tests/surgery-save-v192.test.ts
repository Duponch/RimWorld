import { expect,test } from 'vitest';
import { withoutMiningSkill } from './scenarios/legacy-skills.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { HUMAN_YEAR_TICKS } from '../src/sim/human-age.ts';
import { administerAnesthetic } from '../src/sim/anesthetic.ts';
import { reconcilePawnHealth } from '../src/sim/health.ts';
import { applyCommand } from '../src/sim/engine.ts';
import { validateWorld,serializeWorld,deserializeWorld } from '../src/sim/serialization.ts';
import { validSurgeryRequestShape,validSurgeryTaskShape,validateSurgeries } from '../src/sim/surgery-save.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';

/** Prepared operation snapshots. End-to-end routes/admin belong to root's chain. */
function snapshot(phase:'pickup'|'approach'|'work'='pickup'):World {
  const w=medicalCamp(2),d=w.pawns[0]!,p=w.pawns[1]!;d.health=createMedicalRecord(w.tick);
  p.age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:30*HUMAN_YEAR_TICKS};p.health=createMedicalRecord(w.tick);
  p.health.infections={nextId:2,immunity:0,cases:[{id:1,part:'left-arm',bornAt:w.tick,severity:200000000,luck:1000000}]};
  const bed=fixtureBuilding(w,'bed',8,10);Object.assign(bed,{medical:true});
  Object.assign(d,{x:8,z:9,state:'moving'});d.priorities.doctor=1;
  Object.assign(p,{x:8,z:10,state:'resting'});p.medicalCare='best';p.priorities.patient=1;p.priorities.bedrest=3;
  p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:bed.x,z:bed.z},medical:'patient'};
  p.surgeryRequest={part:'left-arm',requestedAt:w.tick};
  const id=w.nextId++;w.piles.push({id,item:'medicine',kind:'medicine',quantity:1,owner:{type:'ground',x:9,z:9}});
  d.surgery={patientId:p.id,part:'left-arm',bedId:bed.id,spot:{x:8,z:9},phase:'pickup',progress:0,workCore:0,medicine:{item:'medicine',quantity:1,sourcePileId:id,carryPileId:null}};
  if(phase==='approach'){w.piles[0]!.owner={type:'pawn',pawnId:d.id};d.surgery.phase='approach';d.surgery.medicine!.carryPileId=id;}
  if(phase==='work'){
    expect(administerAnesthetic(p.health,()=>.5)).toBe(true);reconcilePawnHealth(w,p);
    w.piles=[];delete d.surgery.medicine;d.surgery.consumedMedicine='medicine';d.surgery.phase='work';d.surgery.progress=8.8;d.surgery.workCore=10;d.state='working';
  }
  return w;
}
test('strict request/task shapes reject future fields, extra keys and premature or duplicate dose receipts',()=>{
  const w=snapshot(),d=w.pawns[0]!,p=w.pawns[1]!;
  expect(validSurgeryRequestShape(p.surgeryRequest,179,w.tick)).toBe(true);expect(validSurgeryRequestShape(p.surgeryRequest,178,w.tick)).toBe(false);
  expect(validSurgeryTaskShape(d.surgery,179,w)).toBe(true);expect(validSurgeryTaskShape(d.surgery,178,w)).toBe(false);
  expect(validSurgeryRequestShape({...p.surgeryRequest,requestedAt:w.tick+1},179,w.tick)).toBe(false);
  expect(validSurgeryRequestShape({...p.surgeryRequest,phase:'work'},179,w.tick)).toBe(false);
  expect(validSurgeryTaskShape({...d.surgery,consumedMedicine:'medicine'},179,w)).toBe(false);
  expect(validSurgeryTaskShape({...d.surgery,medicine:{...d.surgery!.medicine,quantity:2}},179,w)).toBe(false);
  expect(validSurgeryTaskShape({...d.surgery,progress:.1},179,w)).toBe(false);
  const worked=snapshot('work').pawns[0]!.surgery!;
  expect(validSurgeryTaskShape({...worked,workCore:9},179,w)).toBe(false);
  expect(validSurgeryTaskShape({...worked,progress:2000},179,w)).toBe(false);
  expect(validSurgeryTaskShape({...worked,medicine:d.surgery!.medicine},179,w)).toBe(false);
});
test('prepared pickup/approach/work each preserve exact save state and medicine owner',()=>{
  for(const phase of ['pickup','approach','work'] as const){
    const w=snapshot(phase),before=structuredClone(w);
    expect(validateSurgeries(w,179)).toEqual([]);expect(validateWorld(w)).toEqual([]);
    expect(deserializeWorld(serializeWorld(w))).toEqual(before);expect(w).toEqual(before);
  }
});
test('a real queued construction order and its priority intent preserve an administered operation and its exact save',()=>{
  const w=snapshot('work'),doctor=w.pawns[0]!,patient=w.pawns[1]!;
  expect(applyCommand(w,{type:'priority',pawnId:doctor.id,work:'build',value:1})).toEqual({ok:true});
  // A grave is a genuine frame with no material delivery prerequisite.
  expect(applyCommand(w,{type:'designate',kind:'grave',x:14,z:14})).toEqual({ok:true});
  const job=w.jobs.at(-1)!,task=structuredClone(doctor.surgery),request=structuredClone(patient.surgeryRequest),health=structuredClone(patient.health);
  expect(applyCommand(w,{type:'order-job',pawnId:doctor.id,jobId:job.id,queue:true})).toEqual({ok:true});
  expect(doctor.orders).toEqual({active:null,queue:[job.id]});
  expect(doctor.priorityWork).toEqual({cell:{x:14,z:14},work:'build',startedAt:w.tick});
  expect(doctor.surgery).toEqual(task);expect(patient.surgeryRequest).toEqual(request);expect(patient.health).toEqual(health);
  expect(doctor.jobId).toBeNull();expect(job.reservedBy).toBe(doctor.id);
  expect(validateSurgeries(w,179)).toEqual([]);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
test('full bindings refuse patient/bed/contact/cargo conflicts and work without the real condition',()=>{
  for(const mutate of [
    (w:World)=>{w.pawns[1]!.surgeryRequest!.part='right-arm';},
    (w:World)=>{w.pawns[0]!.surgery!.patientId=w.pawns[0]!.id;},
    (w:World)=>{w.pawns[1]!.x++;},
    (w:World)=>{w.pawns[0]!.surgery!.spot={x:8,z:8};},
    (w:World)=>{w.structures=[];},
    (w:World)=>{w.pawns[1]!.need=null;},
    (w:World)=>{w.pawns[0]!.priorities.doctor=0;},
    (w:World)=>{w.pawns[0]!.need={kind:'sleep',phase:'travel',bedId:null,target:{x:8,z:9}};},
    (w:World)=>{w.piles[0]!.owner={type:'inventory',pawnId:w.pawns[0]!.id};},
  ]){
    const w=snapshot('approach');mutate(w);expect(validateSurgeries(w,179).length).toBeGreaterThan(0);expect(validateWorld(w).length).toBeGreaterThan(0);
  }
  const work=snapshot('work');delete work.pawns[1]!.health!.anesthetic;expect(validateSurgeries(work,179).length).toBeGreaterThan(0);
  const impossibleClock=snapshot('work');impossibleClock.pawns[0]!.surgery!.workCore=20;impossibleClock.pawns[0]!.surgery!.progress=17.6;
  expect(validateSurgeries(impossibleClock,179).length).toBeGreaterThan(0);
  const noPermission=snapshot('work');noPermission.pawns[1]!.medicalCare='dry';expect(validateSurgeries(noPermission,179).length).toBeGreaterThan(0);
  const alone=snapshot('work');delete alone.pawns[0]!.surgery;alone.pawns[0]!.state='idle';
  expect(validateSurgeries(alone,179)).toContain('Invalid surgical patient request.');
  delete alone.pawns[1]!.surgeryRequest;expect(validateSurgeries(alone,179)).toEqual([]); // Anesthetic persists independently.
});
test('exclusive service and quantitative source reservations include surgery without duplicating a dose',()=>{
  const w=snapshot(),d=w.pawns[0]!,patient=w.pawns[1]!,other=structuredClone(d);other.id=w.nextId++;other.x=7;other.z=9;
  other.surgery={...structuredClone(d.surgery!),spot:{x:7,z:10}};w.pawns.push(other);
  expect(validateSurgeries(w,179)).toContain('Duplicate surgical patient reservation.');
  expect(validateSurgeries(w,179)).toContain('Invalid surgical dose ownership or shared reservation.');
  delete other.surgery;other.tend={patientId:patient.id,spot:{x:7,z:10},phase:'approach',progress:0};
  expect(validateSurgeries(w,179)).toContain('Surgery conflicts with a patient or bedside reservation.');
});
test('178 is validated before a version-only migration and every future surgery field is refused',()=>{
  const base=medicalCamp(2);for(const p of base.pawns)p.health=createMedicalRecord(base.tick);
  const old=withoutMiningSkill(structuredClone(base));(old as {schemaVersion:number}).schemaVersion=178;
  const loaded=deserializeWorld(JSON.stringify(old));expect(loaded).toEqual({...old,schemaVersion:SCHEMA_VERSION});
  for(const field of ['surgeryRequest','surgery','anesthetic'] as const){
    const bad=structuredClone(old),valid=snapshot('work');
    if(field==='anesthetic')bad.pawns[0]!.health!.anesthetic=valid.pawns[1]!.health!.anesthetic;
    else if(field==='surgeryRequest')bad.pawns[0]!.surgeryRequest=valid.pawns[1]!.surgeryRequest;
    else bad.pawns[0]!.surgery=valid.pawns[0]!.surgery;
    expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/Invalid version 178 save/);
  }
  const bad=structuredClone(old);bad.pawns[0]!.hunger=-1;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/Invalid version 178 save/);
});
