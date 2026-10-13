import { medicalCamp,controlledInjury } from '../scenarios/health.ts';
import { recruitmentUiFixture } from '../scenarios/prison-camp.ts';
import { surgeryCamp } from './surgery-v192.ts';
import { createMedicalRecord } from '../../src/sim/injury-state.ts';
import { BLOOD_UNIT } from '../../src/sim/injury-rules.ts';
import { reconcilePawnHealth } from '../../src/sim/health.ts';
import { startTravel } from '../../src/sim/movement.ts';
import { syncPatient } from '../../src/sim/rescue-state.ts';
import type { Structure,World } from '../../src/sim/types.ts';

/** Prepared admission states, never a claim of natural sleep or clinical work. */
export function sleepingSpotFrame(orientation:0|1|2|3=0){
  const w=medicalCamp(2),p=w.pawns[0]!,other=w.pawns[1]!;
  const spot:Structure={id:w.nextId++,kind:'sleeping-spot',x:16,z:16,orientation,footprint:'standard'};
  w.structures.push(spot);Object.assign(p,{x:spot.x,z:spot.z,bedId:spot.id,state:'sleeping',path:[],moveCooldown:0});delete p.motion;
  p.need={kind:'sleep',phase:'sleep',bedId:spot.id,target:{x:spot.x,z:spot.z}};
  return {w,p,other,spot};
}
export function medicalSpotFrame(prison=false){
  const f=prison?(()=>{
    const c=recruitmentUiFixture(),w=c.world,p=w.pawns.find(p=>p.id===c.patientId)!,spot=w.structures.find(s=>s.id===c.bedId)!;
    spot.kind='sleeping-spot';delete spot.quality;delete spot.material;delete spot.damage;
    return {w,p,other:w.pawns[0]!,spot};
  })():sleepingSpotFrame();
  f.spot.medical=true;f.p.bedId=null;f.p.need=null;f.p.state='idle';
  controlledInjury(f.w,f.p,'torso',3000,'bruise');f.p.priorities.patient=1;
  Object.assign(f.p,{x:f.spot.x,z:f.spot.z,state:'resting',path:[],moveCooldown:0});delete f.p.motion;
  f.p.need={kind:'sleep',phase:'sleep',bedId:f.spot.id,target:{x:f.spot.x,z:f.spot.z},medical:'patient'};
  return f;
}
export function surgerySpotFrame():World {
  const c=surgeryCamp(),w=c.world,d=w.pawns[0]!,p=w.pawns[1]!,bed=w.structures.find(s=>s.id===c.bedId)!;
  bed.kind='sleeping-spot';delete bed.quality;delete bed.material;delete bed.damage;
  d.priorities.doctor=1;Object.assign(d,{x:10,z:9,state:'moving'});
  Object.assign(p,{x:10,z:10,state:'resting'});
  p.need={kind:'sleep',phase:'sleep',bedId:c.bedId,target:{x:10,z:10},medical:'patient'};
  p.surgeryRequest={part:'left-arm',requestedAt:w.tick};
  d.surgery={patientId:p.id,part:'left-arm',bedId:c.bedId,spot:{x:10,z:9},phase:'pickup',progress:0,workCore:0,
    medicine:{item:'medicine',sourcePileId:c.sourceId,carryPileId:null,quantity:1}};
  return w;
}
export function rescueSpotFrame(carry=false){
  const f=sleepingSpotFrame(),{w,p:actor,other:patient,spot}=f;
  actor.need=null;actor.bedId=null;actor.state='moving';actor.x=13;actor.z=16;actor.priorities.doctor=1;actor.orders.active='rescue';
  spot.medical=true;patient.health=createMedicalRecord(w.tick);patient.health.bloodLoss=Math.round(BLOOD_UNIT*.7);reconcilePawnHealth(w,patient);
  actor.rescue={patientId:patient.id,bedId:spot.id,phase:carry?'carry':'approach'};
  if(carry){actor.path=[{x:15,z:16},{x:16,z:16}];if(!startTravel(w,actor,{x:14,z:16}))throw Error('prepared carrier edge');syncPatient(w,actor);}
  return f;
}
