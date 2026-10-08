import { expect,test } from 'vitest';
import { medicineCamp } from './scenarios/medicine.ts';
import { medicalCamp } from './scenarios/health.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { advanceMedical } from '../src/sim/injury-evolution.ts';
import { acquireFlu } from '../src/sim/flu-state.ts';
import { acquireImmuneDisease,immuneDiseaseTendable,tendImmuneDisease } from '../src/sim/immune-diseases-state.ts';
import { medicalRestNeeded,treatmentTarget,treatmentTargets } from '../src/sim/care-rules.ts';
import { resolveHumanTendBatch } from '../src/sim/care-resolution.ts';
import { advanceGroupCare,groupDoctorTendDue } from '../src/sim/group-care.ts';
import { emptyGroupLedger } from '../src/sim/group-loading.ts';
import type { AwayGroup } from '../src/sim/group-capture.ts';
import { processPawnVomiting } from '../src/sim/food-hygiene.ts';
import { validatePawnHealth } from '../src/sim/health-save.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';

for(const kind of ['malaria','plague'] as const)test(`${kind}: an actual doctor carries one dose and resumes the saved treatment`,()=>{
  const w=medicineCamp(),doctor=w.pawns[0]!,patient=w.pawns[1]!;
  patient.health!.injuries=[];expect(acquireImmuneDisease(patient.health!,kind,1_000_000)).toBe(true);
  const doses=()=>w.piles.reduce((n,p)=>n+(p.kind==='medicine'?p.quantity:0),0),before=doses();
  for(let i=0;i<800&&doctor.tend?.phase!=='tend';i++)stepWorld(w);
  expect(doctor.tend?.phase).toBe('tend');expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));
  for(let i=0;i<800&&!patient.health!.immuneDiseases![kind]!.tend;i++)stepWorld(w);
  stepWorld(resumed,w.tick-resumed.tick);
  expect(resumed).toEqual(w);expect(doses()).toBe(before-1);
  expect(patient.health!.immuneDiseases![kind]!.tend?.quality).toBeGreaterThanOrEqual(0);
  expect(doctor.skills.medicine.xp).toBeGreaterThan(0);expect(validateWorld(w)).toEqual([]);
});

test('coexisting flu, malaria and plague keep distinct targets and medical permission',()=>{
  const w=medicalCamp(2),doctor=w.pawns[0]!,patient=w.pawns[1]!;
  patient.health=createMedicalRecord(w.tick);patient.medicalCare='best';
  acquireFlu(patient.health,1_000_000);acquireImmuneDisease(patient.health,'malaria',1_000_000);acquireImmuneDisease(patient.health,'plague',1_000_000);
  patient.health.immuneDiseases!.plague!.severity=900_000_000;
  expect(treatmentTarget(patient)).toEqual({disease:'plague'});expect(medicalRestNeeded(patient)).toBe(true);
  patient.medicalCare='none';expect(treatmentTargets(patient)).toEqual([]);patient.medicalCare='best';
  const batch=treatmentTargets(patient);expect(batch).toHaveLength(3);
  resolveHumanTendBatch(patient,doctor,batch,{random:()=>.5,awardJobXp:false,medicine:'medicine',bedOffset:0,infectionRoomFactor:()=>{throw Error('Systemic disease queried a wound room');}});
  expect(patient.health.flu!.tend).toBeDefined();expect(patient.health.immuneDiseases!.malaria!.tend).toBeDefined();expect(patient.health.immuneDiseases!.plague!.tend).toBeDefined();
  expect(()=>resolveHumanTendBatch(patient,doctor,batch,{random:()=>{throw Error('Stale batch drew quality');},awardJobXp:true,bedOffset:0,infectionRoomFactor:()=>1000})).toThrow('Stale treatment batch');
  patient.medicalCare='none';expect(treatmentTargets(patient)).toEqual([]);
  expect(medicalRestNeeded(patient)).toBe(true); // Permission does not cure the illness.
});

test('medicine ceilings and strict renewal apply separately to both diseases',()=>{
  const w=medicalCamp(2),doctor=w.pawns[0]!,patient=w.pawns[1]!;
  doctor.skills.medicine.level=20;patient.health=createMedicalRecord(w.tick);patient.medicalCare='best';
  for(const kind of ['malaria','plague'] as const){
    acquireImmuneDisease(patient.health,kind,1_000_000);
    const target=treatmentTargets(patient).find(t=>t.disease===kind)!;
    resolveHumanTendBatch(patient,doctor,[target],{random:()=>1,awardJobXp:false,medicine:'herbal-medicine',bedOffset:0,infectionRoomFactor:()=>1000});
    const state=patient.health.immuneDiseases![kind]!,expiry=state.tend!.expiresAtCore;
    expect(state.tend!.quality).toBe(700);
    patient.health.tick=(expiry-7500)/10;expect(immuneDiseaseTendable(patient.health,kind)).toBe(false);
    expect(tendImmuneDisease(patient.health,kind,1300)).toBe(false);
    patient.health.tick++;expect(tendImmuneDisease(patient.health,kind,1300)).toBe(true);
    expect(state.tend).toEqual({quality:1300,expiresAtCore:expiry+37500});
    state.immunity=1_000_000_000;expect(immuneDiseaseTendable(patient.health,kind)).toBe(false);
  }
  expect(medicalRestNeeded(patient)).toBe(false);
});

test('travelling clinical care spends the actual carrier dose without local job XP',()=>{
  const w=medicalCamp(3),members=w.pawns.splice(0),doctor=members[0]!,patient=members[1]!,carrier=members[2]!;
  for(const p of members){delete p.health;delete p.background;delete p.traits;p.state='idle';p.skills.medicine.level=0;}
  doctor.skills.medicine.level=8;patient.medicalCare='industrial';
  w.tick=Array.from({length:125},(_,i)=>3000+i).find(t=>groupDoctorTendDue(doctor,t))!;
  patient.health=createMedicalRecord(w.tick);acquireImmuneDisease(patient.health,'plague',1_000_000);
  const group:AwayGroup={id:1,phase:'at-site',members,items:[{id:w.nextId++,item:'medicine',kind:'medicine',quantity:2,owner:{type:'inventory',pawnId:carrier.id}}],
    startedAt:w.tick,departedAt:w.tick,lastPersonalTick:w.tick,destination:1,tile:1,route:[1],segment:null,paused:false,stop:{kind:'at-site'},entry:{x:0,z:0},ledger:emptyGroupLedger(),
    baseline:{food:0,silver:0,cargo:{cloth:0,'muffalo-wool':0},medicine:2,component:0}};
  const skill=structuredClone(doctor.skills.medicine);
  expect(advanceGroupCare(group,{tick:w.tick,random:()=>.5})).toEqual({massRemovedGrams:500,removed:[{pawnId:carrier.id,grams:500}]});
  expect(group.items[0]!.quantity).toBe(1);expect(group.ledger.medicineUsed).toBe(1);expect(doctor.skills.medicine).toEqual(skill);
  expect(patient.health!.immuneDiseases!.plague!.tend).toBeDefined();
  acquireImmuneDisease(patient.health!,'malaria',1_000_000);patient.medicalCare='none';const before=structuredClone(group);
  advanceGroupCare(group,{tick:w.tick,random:()=>{throw Error('NoCare drew quality');}});expect(group).toEqual(before);
});

test('malaria keeps its physical vomit owner, hunger loss and filth; plague alone never vomits',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;p.health=createMedicalRecord(w.tick);acquireImmuneDisease(p.health,'malaria',1_000_000);
  const state=p.health.immuneDiseases!.malaria!;state.severity=780_000_000;state.vomit={remainingCore:20,cell:{x:p.x,z:p.z}};
  w.tick=3000+p.id%60+15;p.health.tick=w.tick;p.hunger=80;const rng=w.rng;
  expect(processPawnVomiting(w,p)).toBe(true);expect(state.vomit?.remainingCore).toBe(10);expect(p.hunger).toBe(76);expect(w.rng).toBe(rng);
  expect(w.filth?.items.some(f=>f.kind==='vomit')).toBe(true);
  w.tick++;p.health.tick=w.tick;expect(processPawnVomiting(w,p)).toBe(true);expect(state.vomit).toBeUndefined();
  // The final residual malaria pulse owns this probe even when flu could start.
  state.severity=0;state.vomit={remainingCore:10,cell:{x:p.x,z:p.z}};acquireFlu(p.health,1_000_000);p.health.flu!.severity=666_000_000;
  w.tick=3060+p.id%60;p.health.tick=w.tick;
  expect(processPawnVomiting(w,p)).toBe(true);expect(state.vomit).toBeUndefined();expect(p.health.flu!.vomit).toBeUndefined();expect(w.rng).toBe(rng);
  delete p.health.flu;
  acquireImmuneDisease(p.health,'plague',1_000_000);p.health.immuneDiseases!.plague!.severity=900_000_000;
  expect(processPawnVomiting(w,p)).toBe(false);expect(w.rng).toBe(rng);
});

test('the final physical episode removes exhausted malaria before the same-tick snapshot',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;p.health=createMedicalRecord(w.tick);acquireImmuneDisease(p.health,'malaria',1_000_000);
  const state=p.health.immuneDiseases!.malaria!;state.severity=0;state.immunity=1;state.vomit={remainingCore:10,cell:{x:p.x,z:p.z}};
  advanceMedical(p.health,1,{phase:p.id%60,posture:'standing',starving:false,hunger:p.hunger,rest:p.rest},()=>{throw Error('Residual immunity drew RNG');});
  w.tick++;expect(state.immunity).toBe(0);expect(state.vomit).toBeDefined();
  expect(processPawnVomiting(w,p)).toBe(true);expect(p.health.immuneDiseases).toBeUndefined();
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('clinical save guards reject an off-map malaria target or two physical episode owners',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;p.health=createMedicalRecord(w.tick);
  acquireImmuneDisease(p.health,'malaria',1_000_000);
  p.health.immuneDiseases!.malaria!.vomit={remainingCore:10,cell:{x:w.width,z:0}};
  expect(validatePawnHealth(w)).toContain('Malaria vomiting target is outside the map.');
  p.health.immuneDiseases!.malaria!.vomit!.cell={x:p.x,z:p.z};acquireFlu(p.health,1_000_000);
  p.health.flu!.vomit={remainingCore:10,cell:{x:p.x,z:p.z}};
  expect(validatePawnHealth(w)).toContain('Malaria vomiting conflicts with another episode owner.');
});
