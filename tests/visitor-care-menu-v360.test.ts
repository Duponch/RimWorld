import {expect,test} from 'vitest';
import {visitorCareScene} from './scenarios/visitor-care-v360';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {tacticalRescuePolicy,tacticalTendingPolicy} from '../src/ui/order-menu';
import {draftLabel} from '../src/ui/drafting-controls';
import {reconcilePawnHealth} from '../src/sim/health';
import type {World} from '../src/sim/types';

// Small prepared patients qualify the menu/command boundary, not V359 recovery.
test('V360 mobilized Doctor0 has separate rescue and dry tending choices without admitting on hover',()=>{
 const {w,doctor,patient}=visitorCareScene();doctor.priorities.doctor=0;
 expect(applyCommand(w,{type:'draft',pawnIds:[doctor.id],enabled:true}).ok).toBe(true);
 const ids=new Set([doctor.id]),before=structuredClone(w);
 expect(tacticalRescuePolicy(w,ids,patient.id,false)).toMatchObject({enabled:true,pawnId:doctor.id,patientId:patient.id});
 expect(tacticalTendingPolicy(w,ids,patient.id,false)?.enabled).toBe(true);expect(w).toEqual(before);
 expect(patient.visitor?.medicalGuestAt).toBeUndefined();
 expect(applyCommand(w,{type:'order-rescue',pawnId:doctor.id,patientId:patient.id,queue:false}).ok).toBe(true);
 expect(draftLabel(doctor)).toContain('secourir');
 for(let n=0;n<150&&doctor.rescue?.phase!=='carry';n++)stepWorld(w);
 expect(doctor.rescue?.phase).toBe('carry');expect(draftLabel(doctor)).toContain('porte le patient');
});

test('V360 tactical rescue reports selection, queue and NoCare refusals without changing the world',()=>{
 const {w,doctor,otherDoctor,patient}=visitorCareScene();
 expect(applyCommand(w,{type:'draft',pawnIds:[doctor.id],enabled:true}).ok).toBe(true);
 const ids=new Set([doctor.id]),before=structuredClone(w);
 expect(tacticalRescuePolicy(w,new Set([doctor.id,otherDoctor.id]),patient.id,false)).toMatchObject({enabled:false,reason:expect.stringMatching(/seul colon/)});
 expect(tacticalRescuePolicy(w,ids,patient.id,true)).toMatchObject({enabled:false,reason:expect.stringMatching(/file/)});
 expect(w).toEqual(before);patient.medicalCare='none';const denied=structuredClone(w);
 expect(tacticalRescuePolicy(w,ids,patient.id,false)?.enabled).toBe(false);expect(w).toEqual(denied);
});

test('V360 no rescue choice for historical236, standing visitor, enemy or unknown target',()=>{
 const {w,doctor,patient}=visitorCareScene();
 expect(applyCommand(w,{type:'draft',pawnIds:[doctor.id],enabled:true}).ok).toBe(true);
 const ids=new Set([doctor.id]);w.schemaVersion=236 as World['schemaVersion'];
 expect(tacticalRescuePolicy(w,ids,patient.id,false)).toBeUndefined();w.schemaVersion=237 as World['schemaVersion'];
 expect(tacticalRescuePolicy(w,ids,w.nextId+9,false)).toBeUndefined();
 patient.faction='outlaws';expect(tacticalRescuePolicy(w,ids,patient.id,false)).toBeUndefined();
 // The enemy can still receive dry field care; it is not a neutral guest.
 expect(tacticalTendingPolicy(w,ids,patient.id,false)?.enabled).toBe(true);patient.faction='outlanders';
 patient.health!.bloodLoss=0;reconcilePawnHealth(w,patient);expect(patient.state).not.toBe('downed');
 expect(tacticalRescuePolicy(w,ids,patient.id,false)).toBeUndefined();
});
