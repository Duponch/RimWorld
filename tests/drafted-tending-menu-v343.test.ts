import {expect,test} from 'vitest';
import {medicalCamp,controlledInjury} from './scenarios/health';
import {animalCombatCamp} from './scenarios/animal-combat';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {reconcilePawnHealth} from '../src/sim/health';
import {BLOOD_UNIT} from '../src/sim/injury-rules';
import {tacticalTendingPolicy,tacticalAttackPolicy} from '../src/ui/order-menu';
import {draftLabel} from '../src/ui/drafting-controls';

function prepared(){
  const w=medicalCamp(3),doctor=w.pawns[0]!,patient=w.pawns[1]!;
  Object.assign(doctor,{x:10,z:10,background:{childhood:'quiet-child',adulthood:'medic'}});
  Object.assign(patient,{x:14,z:10,medicalCare:'dry'});doctor.priorities.doctor=0;
  controlledInjury(w,patient,'left-arm',5000,'cut');patient.health!.bloodLoss=BLOOD_UNIT*.61;reconcilePawnHealth(w,patient);
  expect(patient.state).toBe('downed');expect(applyCommand(w,{type:'draft',pawnIds:[doctor.id],enabled:true}).ok).toBe(true);
  return {w,doctor,patient,ids:new Set([doctor.id])};
}

test('pacifist clinical option is usable even though context attacks on the friend are absent',()=>{
  const {w,doctor,patient,ids}=prepared(),before=structuredClone(w),choice=tacticalTendingPolicy(w,ids,patient.id,false);
  expect(choice).toMatchObject({enabled:true,pawnId:doctor.id,patientId:patient.id});expect(choice!.label).toContain('sans médicament');
  expect(w).toEqual(before);expect(tacticalAttackPolicy(w,ids,patient.id,false).options).toEqual([]);
  expect(applyCommand(w,{type:'order-drafted-tend',pawnId:doctor.id,patientId:choice!.patientId,queue:false}).ok).toBe(true);
  expect(doctor.tend).toMatchObject({drafted:true,patientId:patient.id});expect(doctor.draft).toBeTruthy();
});

test('medical selection and shift limits stay explicit and do not mutate the confirmed world',()=>{
  const {w,doctor,patient,ids}=prepared(),before=structuredClone(w);
  expect(tacticalTendingPolicy(w,new Set([doctor.id,w.pawns[2]!.id]),patient.id,false)).toMatchObject({enabled:false,reason:expect.stringMatching(/seul colon/)});
  expect(tacticalTendingPolicy(w,ids,patient.id,true)).toMatchObject({enabled:false,reason:expect.stringMatching(/file/)});
  expect(tacticalTendingPolicy(w,new Set(),patient.id,false)).toMatchObject({enabled:false});expect(w).toEqual(before);
});

test('standing patients and forbidden care report clinical limits instead of context attacks',()=>{
  const {w,doctor,patient,ids}=prepared();patient.health!.bloodLoss=0;reconcilePawnHealth(w,patient);
  expect(patient.state).not.toBe('downed');expect(tacticalTendingPolicy(w,ids,patient.id,false)).toMatchObject({enabled:false,reason:expect.stringMatching(/terre|couché/)});
  patient.health!.bloodLoss=BLOOD_UNIT*.61;reconcilePawnHealth(w,patient);patient.medicalCare='none';
  expect(tacticalTendingPolicy(w,ids,patient.id,false)?.enabled).toBe(false);
  expect(applyCommand(w,{type:'draft',pawnIds:[doctor.id],enabled:false}).ok).toBe(true);
  expect(tacticalTendingPolicy(w,ids,patient.id,false)?.enabled).toBe(false);
});

test('animals retain their existing tactical policy and receive no human field-care option',()=>{
  const w=animalCombatCamp(),doctor=w.pawns[0]!,animal=w.wildlife!.animals[0]!,ids=new Set([doctor.id]),before=structuredClone(w);
  expect(tacticalTendingPolicy(w,ids,animal.id,false)).toBeUndefined();
  expect(tacticalAttackPolicy(w,ids,animal.id,false).options.find(o=>o.kind==='shoot')?.enabled).toBe(true);
  expect(tacticalTendingPolicy(w,ids,w.nextId+100,false)).toBeUndefined();expect(w).toEqual(before);
});

test('draft inspector distinguishes real clinical approach and work from waiting',()=>{
  const {w,doctor,patient}=prepared();expect(applyCommand(w,{type:'order-drafted-tend',pawnId:doctor.id,patientId:patient.id,queue:false}).ok).toBe(true);
  expect(draftLabel(doctor)).toContain('rejoint le patient');
  for(let n=0;n<150&&doctor.tend?.phase!=='tend';n++)stepWorld(w);
  expect(doctor.tend?.phase).toBe('tend');expect(draftLabel(doctor)).toContain('soins sans médicament');
  expect(applyCommand(w,{type:'draft-stop',pawnIds:[doctor.id]}).ok).toBe(true);expect(doctor.tend).toBeUndefined();expect(draftLabel(doctor)).toContain('attend les ordres');
});
