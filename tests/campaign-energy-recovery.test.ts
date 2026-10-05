import {expect,test,vi} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {urgentTreatment,treatmentTarget} from '../src/sim/care-rules.ts';
import * as orders from '../src/sim/player-orders.ts';
import {careCamp} from './scenarios/care.ts';
import {rescueCamp} from './scenarios/rescue.ts';
import {controlledInjury} from './scenarios/health.ts';
import {energyDecisionDue,energyDecisions,energyRecoveryDecisions,type EnergyPlayerState} from './scenarios/energy-player.ts';
import type {Command,World} from '../src/sim/types.ts';

const notebook=(w:World):EnergyPlayerState=>({startTick:w.tick,origin:{x:5,z:5},stage:'construct',stageTick:w.tick,
  initialSteel:0,initialComponents:0,milestones:{},nightDrainTicks:0,previousBattery:0,electricMeals:0});
const valid=(w:World)=>expect(validateWorld(w),JSON.stringify({tick:w.tick,errors:validateWorld(w)})).toEqual([]);
const apply=(w:World,command:Command)=>{expect(applyCommand(w,command),JSON.stringify(command)).toMatchObject({ok:true});valid(w);};
const medicine=(w:World)=>w.piles.reduce((n,p)=>n+(p.item==='herbal-medicine'?p.quantity:0),0);

/** Existing clinical fixture: the patient reaches the real bed through the
 * ordinary giver while Doctor is disabled. The urgent wound is a new physical
 * incident; no lying posture, healing result or dose consumption is injected. */
function urgentPatientCamp() {
  const w=careCamp(),doctor=w.pawns[0]!,patient=w.pawns[1]!;
  apply(w,{type:'priority',pawnId:doctor.id,work:'doctor',value:0});
  for(let n=0;n<300&&patient.need?.phase!=='sleep';n++){stepWorld(w);valid(w);}
  expect(patient.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:w.structures[0]!.id});
  controlledInjury(w,patient,'neck',6000,'cut');
  doctor.hunger=25;doctor.rest=80;
  addMaterial(w,'medicine',1,{type:'ground',x:doctor.x+1,z:doctor.z},'herbal-medicine');refreshStock(w);
  // The clinical fixture deliberately preserves historical dry care. Admit
  // the actual herbal dose through the player's policy before requesting it.
  apply(w,{type:'medical-care',pawnId:patient.id,care:'herbal'});
  apply(w,{type:'priority',pawnId:doctor.id,work:'doctor',value:1});
  expect(urgentTreatment(patient)).toBe(true);valid(w);
  return {w,doctor,patient};
}

test('Énergie libère la mobilisation au contrôle suivant et le secours porte la vraie personne jusqu’au lit',()=>{
  const w=rescueCamp(),doctor=w.pawns[0]!,patient=w.pawns[1]!,s=notebook(w);
  controlledInjury(w,patient,'neck',6000,'cut');doctor.hunger=25;
  apply(w,{type:'draft',pawnIds:[doctor.id],enabled:true});
  stepWorld(w);valid(w);const endedAt=w.tick;
  while(!energyDecisionDue(w)){expect(doctor.draft).toBeDefined();stepWorld(w);valid(w);}
  expect(w.tick-endedAt).toBeLessThan(20);expect(w.tick%250).not.toBe(0);
  const before=serializeWorld(w),decisions=energyDecisions(w,s);
  expect(serializeWorld(w)).toBe(before);expect(decisions).toHaveLength(1);
  expect(decisions[0]!.command).toEqual({type:'draft',pawnIds:[doctor.id],enabled:false});
  apply(w,decisions[0]!.command);expect(doctor.draft).toBeUndefined();
  // A command is now confirmed. The next recovery observation may admit its
  // actual service; it does not project a hypothetical undrafted World.
  const rescue=energyRecoveryDecisions(w);
  expect(rescue).toHaveLength(1);expect(rescue![0]!.command.type).toBe('order-rescue');
  apply(w,rescue![0]!.command);
  const originalId=patient.id,bed=w.structures[0]!;let carried=false;
  for(let n=0;n<400&&patient.need?.phase!=='sleep';n++){
    if(energyDecisionDue(w))expect(energyDecisions(w,s)).toEqual([]);
    stepWorld(w);valid(w);
    if(doctor.rescue?.phase==='carry'){
      carried=true;expect(patient.x).toBe(doctor.x);expect(patient.z).toBe(doctor.z);
      expect(patient.need).toBeNull();
    }
  }
  expect(carried).toBe(true);expect(patient.id).toBe(originalId);expect(w.pawns.filter(p=>p.id===originalId)).toHaveLength(1);
  expect(patient.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:bed.id});
  expect({x:patient.x,z:patient.z}).toEqual({x:bed.x,z:bed.z});expect(doctor.rescue).toBeUndefined();
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,8);stepWorld(copy,8);
  expect(serializeWorld(copy)).toBe(serializeWorld(w));valid(w);
});

test('Énergie admet le médecin sous faim30, réserve la continuation engagée et consomme la vraie dose une seule fois',()=>{
  const {w,doctor,patient}=urgentPatientCamp(),s=notebook(w);
  expect(doctor.hunger).toBeLessThan(30);
  expect(orders.queryOrderOptions(w,doctor.id,patient).some(o=>o.enabled&&o.tendPatientId===patient.id)).toBe(true);
  const before=serializeWorld(w),decisions=energyDecisions(w,s);
  expect(serializeWorld(w)).toBe(before);expect(decisions).toHaveLength(1);
  expect(decisions[0]!.command).toEqual({type:'order-tend',pawnId:doctor.id,patientId:patient.id,queue:false});
  apply(w,decisions[0]!.command);expect(doctor.tend).toBeDefined();
  const initialMedicine=medicine(w),copy=deserializeWorld(serializeWorld(w)),query=vi.spyOn(orders,'queryOrderOptions');
  let pulses=0,progressed=false,pickedUp=false;
  try {
    for(let n=0;n<300&&doctor.tend;n++){
      if(energyDecisionDue(w)){
        const confirmed=serializeWorld(w);expect(energyDecisions(w,s)).toEqual([]);
        expect(serializeWorld(w)).toBe(confirmed);pulses++;
      }
      stepWorld(w);stepWorld(copy);valid(w);
      expect(serializeWorld(copy)).toBe(serializeWorld(w));
      progressed ||= (doctor.tend?.progress??0)>0;
      const carried=doctor.tend?.medicine?.carryPileId;
      if(carried!==null&&carried!==undefined){pickedUp=true;expect(w.piles.find(p=>p.id===carried)).toMatchObject({item:'herbal-medicine',quantity:1,owner:{type:'pawn',pawnId:doctor.id}});}
    }
    expect(query).not.toHaveBeenCalled();
  } finally {query.mockRestore();}
  expect(pulses).toBeGreaterThan(0);expect(progressed).toBe(true);expect(pickedUp).toBe(true);
  expect(doctor.tend).toBeUndefined();expect(treatmentTarget(patient)).toBeUndefined();
  expect(patient.health!.injuries.every(i=>i.tended!==undefined)).toBe(true);
  expect(doctor.skills.medicine.xp).toBeGreaterThan(0);expect(medicine(w)).toBe(initialMedicine-1);
  expect(patient.state).not.toBe('dead');expect(doctor.hunger).toBeGreaterThan(0);
  expect(energyRecoveryDecisions(w)).toBeUndefined();
  // Healing alone does not reserve the fast decision cadence or freeze the
  // construction branch: assisted feeding is only urgent at its real threshold.
  while(w.tick%250===0||w.tick%20===0){stepWorld(w);valid(w);}
  expect(energyDecisionDue(w)).toBe(false);
});

test('Énergie attend un refus clinique réel sans forcer un ordre, une priorité ou une consommation',()=>{
  const {w,doctor,patient}=urgentPatientCamp();
  apply(w,{type:'priority',pawnId:doctor.id,work:'doctor',value:0});
  expect(orders.queryOrderOptions(w,doctor.id,patient).some(o=>o.enabled&&o.tendPatientId===patient.id)).toBe(false);
  const before=serializeWorld(w),quantity=medicine(w),rng=w.rng,nextId=w.nextId;
  expect(energyRecoveryDecisions(w)).toEqual([]);
  expect(serializeWorld(w)).toBe(before);expect(medicine(w)).toBe(quantity);
  expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(doctor.tend).toBeUndefined();
  // Changing the actual policy admits the service at the same real bed. The
  // pilot never manufactures a permissive projected actor to bypass the guard.
  apply(w,{type:'priority',pawnId:doctor.id,work:'doctor',value:1});
  const allowed=energyRecoveryDecisions(w);expect(allowed).toHaveLength(1);
  apply(w,allowed![0]!.command);expect(doctor.tend?.patientId).toBe(patient.id);
  expect(medicine(w)).toBe(quantity);expect(patient.health!.injuries.every(i=>i.tended===undefined)).toBe(true);
});
