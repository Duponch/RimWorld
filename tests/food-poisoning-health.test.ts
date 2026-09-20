import { expect,test } from 'vitest';
import { addResolvedInjury,assessMedical,createMedicalRecord,medicalPain,medicalStatus,reconcileMedicalDeath } from '../src/sim/injury-state';
import { advanceMedical } from '../src/sim/injury-evolution';
import { exposeFoodPoisoning } from '../src/sim/food-poisoning';
import { validateMedicalRecord } from '../src/sim/injury-validation';
import { HEALTHY_BODY_INPUT,assessBody } from '../src/sim/body-capacities';
import type { MedicalRecord } from '../src/sim/injury-types';

const noRandom=()=>{throw new Error('Recovery draws no random numbers');};
function poisoned(animal=false):MedicalRecord{return {...createMedicalRecord(),...(animal?{body:'hare' as const}:{}),foodPoisoning:exposeFoodPoisoning(undefined,'filthy-kitchen','simple-meal',0)};}
const context={phase:0,posture:'standing' as const,starving:false};
const validate=(h:MedicalRecord,allowed=true)=>validateMedicalRecord(h,true,true,true,true,h.body==='hare',false,true,true,true,true,allowed);

test('illness projects factors before dependent capacities, shared by humans and hares without scaled disease pain',()=>{
  for(const animal of [false,true]){
    const h=poisoned(animal);expect(validate(h)).toBeNull();expect(validate(h,false)).toBeTruthy();expect(medicalPain(h)).toBe(.2);
    const initial=assessMedical(h);expect(initial.capacities.consciousness).toBe(.57);expect(initial.capacities.moving).toBe(.46);expect(initial.capacities.manipulation).toBe(.51);expect(initial.capacities.bloodFiltration).toBe(.95);expect(initial.capacities.eating).toBe(.28);
    expect(assessMedical(h)).toBe(initial);
    h.foodPoisoning!.severity=239000;const major=assessMedical(h);expect(major).not.toBe(initial);expect(medicalPain(h)).toBe(.4);
    expect(major.capacities.consciousness).toBe(.43);expect(major.capacities.moving).toBe(.22);expect(major.capacities.manipulation).toBe(.34);expect(major.capacities.bloodFiltration).toBe(.85);expect(major.capacities.eating).toBe(.13);expect(major.capacities.talking).toBe(animal?0:.34);expect(medicalStatus(h)).toBe('mobile');
  }
  expect(assessBody({...HEALTHY_BODY_INPUT,consciousnessFactor:.5,consciousnessMax:.4}).capacities.consciousness).toBe(.4);
  expect(assessBody({...HEALTHY_BODY_INPUT,eatingFactor:.01}).capacities.eating).toBe(.1);
});

test('medical advancement crosses phases, preserves split continuation and needs neither medication nor immunity',()=>{
  const a=poisoned(),b=structuredClone(a);advanceMedical(a,1200,context,noRandom);expect(a.foodPoisoning?.severity).toBe(240000);
  advanceMedical(a,20,context,noRandom);expect(a.foodPoisoning?.severity).toBe(239000);expect(assessMedical(a).capacities.moving).toBe(.22);
  for(let tick=0;tick<1220;tick++)advanceMedical(b,1,context,noRandom);expect(b).toEqual(a);expect(validate(a)).toBeNull();
  advanceMedical(a,4780,context,noRandom);expect(a.tick).toBe(6000);expect(a.foodPoisoning).toBeUndefined();expect(a.infections).toBeUndefined();expect(medicalStatus(a)).toBe('mobile');expect(assessMedical(a).capacities.moving).toBe(1);expect(validate(a)).toBeNull();
  const healthy=createMedicalRecord();advanceMedical(healthy,6000,context,noRandom);expect(healthy).toEqual(a);
});

test('combined severe injury can incapacitate or kill; retained records validate the same physiological cause',()=>{
  // 8 PV on the brain plus 3 PV on the torso: initial consciousness .06;
  // the major phase crosses zero. At only 1 torso PV it remains .01, alive.
  const h=poisoned();addResolvedInjury(h,'brain','bruise',8000,()=>.999);addResolvedInjury(h,'torso','bruise',3000,()=>.999);expect(medicalStatus(h)).toBe('downed');expect(h.death).toBeUndefined();expect(validate(h)).toBeNull();
  h.foodPoisoning!.severity=239000;reconcileMedicalDeath(h);expect(h.death?.cause).toBe('vital-failure');expect(validate(h)).toBeNull();
  const dead=structuredClone(h);advanceMedical(h,6000,context,noRandom);expect(h).toEqual(dead);
  const animal=poisoned(true);animal.foodPoisoning=exposeFoodPoisoning(undefined,'dangerous-food','rice',0);expect(validate(animal)).toBeTruthy();
});
