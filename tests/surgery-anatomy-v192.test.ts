import { expect,test } from 'vitest';
import { SURGICAL_LIMBS,amputateSurgicalLimb,isSurgicalLimb,type SurgicalLimb } from '../src/sim/surgery-anatomy.ts';
import { administerAnesthetic } from '../src/sim/anesthetic.ts';
import { createMedicalRecord,partMissing,medicalBleed,medicalPain,assessMedical,medicalStatus,reconcileMedicalDeath,tendMissingPart } from '../src/sim/injury-state.ts';
import { advanceMedical } from '../src/sim/injury-evolution.ts';
import { validateMedicalRecord } from '../src/sim/injury-validation.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import type { MedicalRecord,MedicalContext } from '../src/sim/injury-types.ts';
import type { BodyPartId } from '../src/sim/body-definition.ts';

const valid=(record:MedicalRecord,version=179)=>validateMedicalRecord(record,true,true,true,true,false,false,true,true,true,true,true,version,true);
const noDraw=()=>{throw Error('Successful surgical anatomy and clinical evolution must not draw');};
const context:MedicalContext={phase:0,posture:'bed',starving:true,hunger:100,rest:100,restingBonus:true};
/** Prepared localized disease, never described as natural acquisition. */
function infected(part:SurgicalLimb,tick=1000):MedicalRecord {
  const record=createMedicalRecord(tick);
  record.infections={nextId:2,immunity:1_000_000_000,cases:[{id:1,part,bornAt:0,severity:100_000_000,luck:1_000_000}]};
  return record;
}
/** Independent explicit membership avoids the production ancestor predicate. */
function subtree(part:SurgicalLimb):BodyPartId[] {
  const side=part.startsWith('left')?'left':'right';
  const children=part.endsWith('arm')?['arm','humerus','radius','hand','pinky','ring-finger','middle-finger','index-finger','thumb']:
    ['leg','femur','tibia','foot','little-toe','fourth-toe','middle-toe','second-toe','big-toe'];
  return children.map(child=>`${side}-${child}` as BodyPartId);
}
test('all four therapeutic limbs remove exactly one subtree and keep blood, outside risks, conditions, immunity and identity counters',()=>{
  for(const part of SURGICAL_LIMBS) {
    const record=infected(part),members=subtree(part),child=members[3]!,tip=members.at(-1)!;
    const opposite=part.startsWith('left')?'right-arm':'left-arm',outsideTip=part.startsWith('left')?'right-thumb':'left-thumb';
    record.nextInjuryId=9;record.bloodLoss=30_000_000;record.malnutrition=50_000_000;
    record.injuries=[
      {id:1,part,kind:'cut',severity:1000,bornAt:990,infection:{dueCore:24900,roomFactor:1000}},
      {id:2,part:child,kind:'cut',severity:1000,bornAt:995,infection:{dueCore:24950,roomFactor:1000}},
      {id:3,part:'head',kind:'cut',severity:1000,bornAt:990,infection:{dueCore:24900,roomFactor:1000}},
      {id:4,part:opposite,kind:'bruise',severity:1000,bornAt:990},
    ];
    record.missing=[{part:tip,bornAt:900},{part:outsideTip,bornAt:800,tended:true}];
    record.infections!.nextId=7;record.infections!.cases.push({id:2,part:child,bornAt:400,severity:100_000_000,luck:900_000},
      {id:3,part:opposite,bornAt:500,severity:100_000_000,luck:1_100_000});
    administerAnesthetic(record,()=>.5);expect(valid(record)).toBeNull();
    const expected=structuredClone(record);
    expected.injuries=expected.injuries.filter(injury=>!members.includes(injury.part));
    expected.missing=expected.missing.filter(missing=>!members.includes(missing.part));expected.missing.push({part,bornAt:1000});
    expected.infections!.cases=expected.infections!.cases.filter(condition=>!members.includes(condition.part));
    expect(amputateSurgicalLimb(record,part)).toBe(true);expect(record).toEqual(expected);expect(valid(record)).toBeNull();
    for(const id of members)expect(partMissing(record,id),id).toBe(true);
    expect(partMissing(record,opposite)).toBe(false);expect(record.nextInjuryId).toBe(9);expect(record.infections!.nextId).toBe(7);
    expect(record.missing.find(missing=>missing.part===part)).toEqual({part,bornAt:1000});
    expect(record.death).toBeUndefined();expect(medicalStatus(record)).toBe('downed'); // The anesthetic remains, not a healed patient.
  }
});

test('invalid, already absent, child-only infected, animal, dead and unreconciled lethal patients refuse atomically',()=>{
  for(const part of ['left-hand','head','torso','heart','left-front-leg',null,{},'unknown']) {
    const record=infected('left-arm'),before=structuredClone(record);
    expect(isSurgicalLimb(part)).toBe(false);expect(amputateSurgicalLimb(record,part)).toBe(false);expect(record).toEqual(before);
  }
  const childOnly=infected('left-arm');childOnly.infections!.cases[0]!.part='left-hand';
  const absent=infected('left-arm');absent.missing=[{part:'left-shoulder',bornAt:0}];absent.infections!.cases=[];
  const animal={...createMedicalRecord(1000),body:'hare' as const};
  const dead=infected('left-arm');dead.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(dead);
  const late=infected('left-arm');late.infections!.cases[0]!.severity=1_000_000_000;
  for(const record of [childOnly,absent,animal,dead,late,createMedicalRecord(1000)]) {
    const before=structuredClone(record);expect(amputateSurgicalLimb(record,'left-arm')).toBe(false);expect(record).toEqual(before);
  }
  const successful=infected('left-arm');expect(amputateSurgicalLimb(successful,'left-arm')).toBe(true);
  const before=structuredClone(successful);expect(amputateSurgicalLimb(successful,'left-arm')).toBe(false);expect(successful).toEqual(before);
});

test('a successful root remains painful and bleeds until real clinical tending; blood already lost is not refunded',()=>{
  const record=infected('left-arm',100);expect(amputateSurgicalLimb(record,'left-arm')).toBe(true);
  expect(medicalPain(record)).toBe(.375);expect(medicalBleed(record)).toBe(3.6);
  expect(assessMedical(record).capacities.manipulation).toBeLessThan(.5);expect(record.infections!.cases).toEqual([]);
  expect(record.infections!.immunity).toBe(1_000_000_000);expect(record.infections!.nextId).toBe(2);
  advanceMedical(record,6,context,noDraw);expect(record.bloodLoss).toBe(1_080_000);expect(medicalBleed(record)).toBe(3.6);
  expect(tendMissingPart(record,'left-hand')).toBe(false);expect(tendMissingPart(record,'left-arm')).toBe(true);
  expect(record.bloodLoss).toBe(1_080_000);expect(medicalBleed(record)).toBe(0);expect(medicalPain(record)).toBe(0);
  expect(assessMedical(record).capacities.manipulation).toBe(.5);expect(record.missing).toEqual([{part:'left-arm',bornAt:100,tended:true}]);
  const resumed=JSON.parse(JSON.stringify(record)) as MedicalRecord;advanceMedical(record,60,context,noDraw);advanceMedical(resumed,60,context,noDraw);
  expect(resumed).toEqual(record);expect(record.bloodLoss).toBeLessThan(1_080_000);expect(valid(record)).toBeNull();
  // Prepared age boundary, not an untreated 9000-tick survival claim: an
  // untreated major stump would normally kill before its freshness expires.
  const boundary=infected('left-leg');amputateSurgicalLimb(boundary,'left-leg');
  boundary.tick=9999;expect(medicalBleed(boundary)).toBe(3.6);boundary.tick=10000;expect(medicalBleed(boundary)).toBe(0);
  expect(partMissing(boundary,'left-leg')).toBe(true);expect(medicalPain(boundary)).toBe(0);
});

test('immune but still present infections remain operable, and permanent capacity loss survives release of fresh pain',()=>{
  const record=createMedicalRecord(100);record.infections={nextId:5,immunity:1_000_000_000,cases:SURGICAL_LIMBS.map((part,i)=>({id:i+1,part,bornAt:0,severity:1_000_000,luck:1_000_000}))};
  for(const part of SURGICAL_LIMBS) {expect(amputateSurgicalLimb(record,part)).toBe(true);expect(tendMissingPart(record,part)).toBe(true);}
  expect(record.infections).toEqual({nextId:5,immunity:1_000_000_000,cases:[]});expect(record.bloodLoss).toBe(0);
  expect(assessMedical(record).capacities).toMatchObject({consciousness:1,moving:0,manipulation:0});
  expect(medicalStatus(record)).toBe('downed');expect(record.death).toBeUndefined();expect(valid(record)).toBeNull();
  const restored=JSON.parse(JSON.stringify(record)) as MedicalRecord;expect(assessMedical(restored)).toEqual(assessMedical(record));
});

test('the historical sparse missing-part form stays canonical with no surgical origin, injury or descendant placeholders',()=>{
  const record=infected('right-leg');amputateSurgicalLimb(record,'right-leg');expect(valid(record,178)).toBeNull();expect(valid(record,179)).toBeNull();
  for(const mutate of [
    (r:MedicalRecord)=>r.missing.push({part:'right-foot',bornAt:1000}),
    (r:MedicalRecord)=>r.injuries.push({id:r.nextInjuryId++,part:'right-foot',kind:'cut',severity:1000,bornAt:1000}),
    (r:MedicalRecord)=>r.missing[0]!.bornAt=1001,
    (r:MedicalRecord)=>(r.missing[0] as unknown as {origin?:string}).origin='SurgicalCut',
  ]) {const bad=structuredClone(record);mutate(bad);expect(valid(bad)).not.toBeNull();}
});
