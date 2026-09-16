import { expect,test } from 'vitest';
import { BODY_PARTS,HUMAN_BODY,type BodyPartId } from '../src/sim/body-definition';
import { BLOOD_UNIT,HP_UNIT,PART_INJURY_RULES,coagulationAge,scarChance } from '../src/sim/injury-rules';
import { createMedicalRecord,addResolvedInjury,assessMedical,medicalBleed,medicalPain,medicalStatus,partMissing,remainingPartHealth,reconcileMedicalDeath,tendInjury,tendMissingPart } from '../src/sim/injury-state';
import { advanceMedical } from '../src/sim/injury-evolution';
import { validateMedicalRecord } from '../src/sim/injury-validation';
import type { MedicalRecord,MedicalContext } from '../src/sim/injury-types';

const noScar=()=>.999999;
const standing:MedicalContext={phase:0,posture:'standing',starving:false};
const total=(r:MedicalRecord)=>r.injuries.reduce((n,i)=>n+i.severity,0)/HP_UNIT;
const valid=(r:MedicalRecord)=>expect(validateMedicalRecord(r)).toBeNull();
const rng=(state:{value:number})=>()=>{let n=state.value;n^=n<<13;n^=n>>>17;n^=n<<5;state.value=n>>>0;return state.value/0x100000000;};

test('localized wounds: skin/solid metadata, independent cuts, merging crushes, missing ancestors and protected bone floor',()=>{
  expect(PART_INJURY_RULES.head).toMatchObject({skin:true,solid:false,bleed:2});
  expect(PART_INJURY_RULES.neck.bleed).toBe(4);expect(PART_INJURY_RULES.heart.bleed).toBe(5);
  expect(PART_INJURY_RULES.nose).toMatchObject({skin:true,solid:true,bleed:0});
  for(const p of HUMAN_BODY)if(p.id.startsWith('left-'))expect(PART_INJURY_RULES[p.id]).toEqual(PART_INJURY_RULES[p.id.replace('left-','right-') as BodyPartId]);
  const r=createMedicalRecord();
  addResolvedInjury(r,'left-arm','cut',1000,noScar);addResolvedInjury(r,'left-arm','cut',1000,noScar);
  expect(r.injuries).toHaveLength(2);
  addResolvedInjury(r,'right-arm','crush',2000,noScar);r.tick=10;addResolvedInjury(r,'right-arm','crush',3000,noScar);
  expect(r.injuries).toHaveLength(3);expect(r.injuries[2]).toMatchObject({id:3,severity:5000,bornAt:10});
  tendInjury(r,3,0);addResolvedInjury(r,'right-arm','crush',1000,noScar);expect(r.injuries).toHaveLength(4);
  const bone=createMedicalRecord();addResolvedInjury(bone,'skull','crack',40000,noScar);
  expect(remainingPartHealth(bone,'skull')).toBe(1000);expect(total(bone)).toBe(40);expect(bone.missing).toEqual([]);expect(medicalBleed(bone)).toBe(0);valid(bone);
  // Half-HP boundary follows rounded anatomical HP, not a float epsilon.
  const finger=createMedicalRecord();addResolvedInjury(finger,'left-thumb','cut',7499,noScar);expect(partMissing(finger,'left-thumb')).toBe(false);
  addResolvedInjury(finger,'left-thumb','cut',1,noScar);expect(partMissing(finger,'left-thumb')).toBe(true);valid(finger);
  valid(r);
});

test('amputation: one root owns the fresh wound, descendants disappear together and organs differ from external stumps',()=>{
  const r=createMedicalRecord();addResolvedInjury(r,'left-hand','cut',2000,noScar);addResolvedInjury(r,'left-thumb','cut',8000,noScar);
  addResolvedInjury(r,'left-arm','cut',30000,noScar);
  expect(r.injuries).toEqual([]);expect(r.missing.map(m=>m.part)).toEqual(['left-arm']);
  expect(partMissing(r,'left-thumb')).toBe(true);expect(medicalBleed(r)).toBeCloseTo(3.6);expect(medicalPain(r)).toBe(.375);
  expect(assessMedical(r).capacities.manipulation).toBeLessThan(.5);expect(assessMedical(r).capacities.moving).toBeGreaterThan(.8);
  expect(tendMissingPart(r,'left-thumb')).toBe(false);expect(tendMissingPart(r,'left-arm')).toBe(true);expect(medicalBleed(r)).toBe(0);expect(medicalPain(r)).toBe(0);expect(assessMedical(r).capacities.manipulation).toBe(.5);
  const kidney=createMedicalRecord();addResolvedInjury(kidney,'left-kidney','crush',15000,noScar);expect(medicalBleed(kidney)).toBe(0);expect(medicalPain(kidney)).toBe(0);expect(medicalStatus(kidney)).toBe('mobile');
  addResolvedInjury(kidney,'right-kidney','crush',15000,noScar);expect(kidney.death?.cause).toBe('vital-failure');valid(kidney);valid(r);
  const fresh=createMedicalRecord();addResolvedInjury(fresh,'left-big-toe','cut',8000,noScar);
  fresh.tick=8999;expect(medicalBleed(fresh)).toBeGreaterThan(0);fresh.tick=9000;expect(medicalBleed(fresh)).toBe(0);expect(partMissing(fresh,'left-big-toe')).toBe(true);valid(fresh);
  for(const part of ['torso','head','neck','heart'] as const) {
    const fatal=createMedicalRecord();addResolvedInjury(fatal,part,'crush',BODY_PARTS[part].hp*HP_UNIT,noScar);
    expect(fatal.death?.cause).toBe('vital-failure');valid(fatal);
  }
  const trauma=createMedicalRecord();addResolvedInjury(trauma,'skull','crack',150000,noScar);expect(trauma.death?.cause).toBe('trauma');expect(trauma.missing).toEqual([]);valid(trauma);
});

test('blood loss: stage boundaries, downstream capacities, extreme offset plus cap and irreversible death',()=>{
  for(const [loss,expected] of [[.149999,1],[.15,.9],[.299999,.9],[.3,.8],[.449999,.8],[.45,.6],[.599999,.6],[.6,.1],[.99,.1]] as const) {
    const r=createMedicalRecord();r.bloodLoss=Math.round(loss*BLOOD_UNIT);
    expect(assessMedical(r).capacities.consciousness,`${loss}`).toBe(expected);
    expect(medicalStatus(r)).toBe(loss>=.6?'downed':'mobile');valid(r);
  }
  const r=createMedicalRecord();addResolvedInjury(r,'left-lung','crush',7500,noScar);r.bloodLoss=.3*BLOOD_UNIT;
  // Physiology (0.95) then blood offset (-0.2), not offset multiplied by breathing.
  expect(assessMedical(r).capacities.consciousness).toBe(.75);
  const lethal=createMedicalRecord();addResolvedInjury(lethal,'brain','crush',6000,()=>0);lethal.bloodLoss=.6*BLOOD_UNIT;reconcileMedicalDeath(lethal);
  expect(lethal.death?.cause).toBe('vital-failure');valid(lethal); // extreme must not rescue a zero-consciousness pawn
  const b=createMedicalRecord();b.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(b);expect(b.death?.cause).toBe('blood-loss');
  const before=structuredClone(b);advanceMedical(b,6000,standing,()=>{throw Error('dead RNG');});addResolvedInjury(b,'head','cut',2000,()=>{throw Error('dead RNG');});expect(b).toEqual(before);valid(b);
  const progressive=createMedicalRecord();addResolvedInjury(progressive,'brain','crush',6000,()=>0);addResolvedInjury(progressive,'left-arm','cut',10000,noScar);
  expect(medicalStatus(progressive)).toBe('mobile');
  advanceMedical(progressive,1499,{...standing,starving:true},noScar);expect(medicalStatus(progressive)).toBe('mobile');
  advanceMedical(progressive,1,{...standing,starving:true},noScar);expect(medicalStatus(progressive)).toBe('downed');expect(progressive.bloodLoss).toBe(.15*BLOOD_UNIT);
  advanceMedical(progressive,6000,{...standing,starving:true},noScar);expect(progressive.death).toEqual({tick:4500,cause:'vital-failure'});expect(progressive.tick).toBe(4500);valid(progressive);
  const shock=createMedicalRecord();for(const [part,hp] of [['left-arm',20],['right-arm',20],['left-leg',24]] as const)addResolvedInjury(shock,part,'bruise',hp*HP_UNIT,noScar);
  expect(medicalPain(shock)).toBe(.8);expect(medicalStatus(shock)).toBe('downed');expect(shock.death).toBeUndefined();
  advanceMedical(shock,60,standing,noScar);expect(medicalStatus(shock)).toBe('mobile');valid(shock);
});

test('bleeding versus recovery: actual rates, weak-wound threshold, immediate tending and age-based coagulation',()=>{
  for(const [part,factor] of [['left-arm',1],['head',2],['neck',4],['heart',5],['nose',0]] as const) {
    const r=createMedicalRecord();addResolvedInjury(r,part,'cut',2000,noScar);expect(medicalBleed(r)).toBeCloseTo(.12*factor);
    advanceMedical(r,6,{...standing,starving:true},noScar);expect(r.bloodLoss).toBe(Math.round(.12*factor*BLOOD_UNIT/1000));
    expect(tendInjury(r,r.injuries[0]!.id,0)).toBe(true);expect(medicalBleed(r)).toBe(0);valid(r);
  }
  for(const [hp,bleeds] of [[9999,false],[10000,true]] as const) {
    const r=createMedicalRecord();r.bloodLoss=BLOOD_UNIT/2;addResolvedInjury(r,'left-arm','crush',hp,noScar);
    const old=r.bloodLoss;advanceMedical(r,6,{...standing,starving:true},noScar);
    expect(r.bloodLoss-old).toBe(bleeds?30000:-100000);valid(r);
  }
  const mixed=createMedicalRecord();addResolvedInjury(mixed,'left-arm','cut',1000,noScar);addResolvedInjury(mixed,'right-arm','crush',4000,noScar);
  expect(medicalBleed(mixed)).toBe(.1);advanceMedical(mixed,6,standing,noScar);expect(mixed.bloodLoss).toBe(30000);
  const r=createMedicalRecord();addResolvedInjury(r,'left-arm','cut',5000,noScar);
  const cutoff=coagulationAge(5000);r.tick=Math.floor(cutoff);expect(medicalBleed(r)).toBeGreaterThan(0);r.tick=Math.ceil(cutoff);expect(medicalBleed(r)).toBe(0);
  r.bloodLoss=BLOOD_UNIT/2;advanceMedical(r,6000,{...standing,starving:true},noScar);expect(r.bloodLoss).toBe(BLOOD_UNIT/6);valid(r);
});

test('healing: one wound per opportunity, real posture rates, no healing while starving, distinct tending contribution',()=>{
  for(const [posture,recovery] of [['standing',8],['ground',12],['bed',16]] as const) {
    const r=createMedicalRecord();addResolvedInjury(r,'left-arm','bruise',20000,noScar);addResolvedInjury(r,'right-arm','bruise',20000,noScar);
    advanceMedical(r,6000,{...standing,posture},()=>0);
    expect(total(r)).toBe(40-recovery);expect(r.injuries[1]!.severity).toBe(20000);valid(r);
  }
  for(const quality of [0,500,1000,1300]) {
    const r=createMedicalRecord();const i=addResolvedInjury(r,'left-arm','bruise',20000,noScar)!;tendInjury(r,i.id,quality);
    advanceMedical(r,600,{...standing,posture:'bed',starving:true},noScar);expect(total(r)).toBe(20);
    advanceMedical(r,600,standing,noScar);expect(total(r)).toBeCloseTo(20-10*(.08+.04+Math.min(quality,1000)*.00008));valid(r);
  }
  const r=createMedicalRecord();addResolvedInjury(r,'left-arm','bruise',50,noScar);addResolvedInjury(r,'right-arm','bruise',50,noScar);
  advanceMedical(r,60,standing,()=>0);expect(r.injuries).toHaveLength(1);expect(total(r)).toBe(.05); // unused healing never spills into the next wound
});

test('scars: damage-time roll, delicate parts, no bruise/bone scar, crossing threshold and permanent pain categories',()=>{
  expect(scarChance('left-arm','cut',4000)).toBe(0);expect(scarChance('left-arm','cut',5000)).toBe(.002);expect(scarChance('left-arm','cut',14000)).toBe(.02);
  expect(scarChance('left-eye','cut',1000)).toBe(.3);expect(scarChance('brain','crush',1000)).toBe(1);
  expect(scarChance('skull','crack',14000)).toBe(0);expect(scarChance('spine','crack',14000)).toBe(.12);
  expect(scarChance('left-arm','bruise',14000)).toBe(0);
  const r=createMedicalRecord();const rolls=[0,.5];const injury=addResolvedInjury(r,'left-arm','cut',14000,()=>rolls.shift()!)!;
  expect(injury.scar).toEqual({threshold:4000});tendInjury(r,injury.id,1000);
  advanceMedical(r,6000,{...standing,posture:'bed'},noScar);
  expect(injury.scar).toEqual({threshold:4000,pain:6});expect(injury.severity).toBe(4000);expect(medicalPain(r)).toBe(.15);expect(medicalBleed(r)).toBe(0);
  const before=structuredClone(injury);advanceMedical(r,6000,standing,noScar);expect(injury).toEqual(before);valid(r);
  for(const [roll,pain] of [[0,0],[.5,1],[.7,3],[.9,6]] as const) {
    const brain=createMedicalRecord();const wound=addResolvedInjury(brain,'brain','crush',1000,()=>roll)!;
    expect(wound.scar).toEqual({threshold:1000,pain});expect(medicalBleed(brain)).toBe(0);valid(brain);
  }
});

test('record validation: identities, ages, body ancestry, scar state, blood bounds and atomic malformed operations',()=>{
  const r=createMedicalRecord();addResolvedInjury(r,'left-arm','cut',5000,noScar);valid(r);
  const corrupt:((v:any)=>void)[]=[v=>v.tick=-1,v=>v.injuries[0].bornAt=1,v=>v.injuries[0].part='waist',v=>v.injuries[0].severity=NaN,v=>v.injuries.push({...v.injuries[0]}),v=>v.nextInjuryId=1,
    v=>v.injuries[0].scar={threshold:1000,pain:2},v=>v.injuries[0].scar={threshold:1000,pain:0},v=>v.injuries[0].tended=-1,v=>v.bloodLoss=BLOOD_UNIT+1,
    v=>v.missing=[{part:'left-arm',bornAt:0}],v=>v.death={tick:0,cause:'blood-loss'},v=>v.unexpected=true,v=>v.injuries[0].kind='Cut'];
  for(const mutate of corrupt){const copy=structuredClone(r);mutate(copy);expect(validateMedicalRecord(copy)).not.toBeNull();}
  const before=structuredClone(r),forbidden=()=>{throw Error('invalid operation consumed RNG');};
  expect(()=>addResolvedInjury(r,'waist','cut',10,forbidden)).toThrow('Invalid localized');
  expect(()=>advanceMedical(r,-1,standing,forbidden)).toThrow('Invalid medical');
  expect(()=>tendInjury(r,1,NaN)).toThrow('Invalid tending');expect(r).toEqual(before);
  const removed=createMedicalRecord();addResolvedInjury(removed,'left-hand','cut',20000,noScar);
  removed.missing.push({part:'left-thumb',bornAt:0});expect(validateMedicalRecord(removed)).not.toBeNull();
});

test('multi-day physiology: seeded wounds, every limb, serialized RNG/continuation, phased updates and finite invariants',()=>{
  for(const [index,part] of HUMAN_BODY.filter(p=>!p.conceptual).entries()) {
    const seed={value:index+987},random=rng(seed),record=createMedicalRecord();
    addResolvedInjury(record,part.id,index%2?'cut':'crack',Math.floor(BODY_PARTS[part.id].hp*700),random);
    const context={...standing,phase:index%60,posture:index%3===0?'bed' as const:'standing' as const};
    advanceMedical(record,1777,context,random);valid(record);
    const saved=JSON.stringify({record,seed});
    const restored=JSON.parse(saved) as {record:MedicalRecord;seed:{value:number}};
    if(record.injuries[0]){tendInjury(record,record.injuries[0].id,700);tendInjury(restored.record,restored.record.injuries[0]!.id,700);}
    const restoredRandom=rng(restored.seed);
    advanceMedical(record,10223,context,random);
    for(let tick=0;tick<10223;tick++)advanceMedical(restored.record,1,context,restoredRandom);
    expect(restored).toEqual({record,seed});expect(JSON.parse(saved).record).not.toBe(record);valid(record);
    expect(Object.values(assessMedical(record).capacities).every(v=>Number.isFinite(v)&&v>=0&&v<=1)).toBe(true);
  }
});
