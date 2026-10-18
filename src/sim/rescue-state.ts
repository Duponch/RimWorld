import {kidnapCarrierOf261,syncKidnappedPatient261,releaseKidnap261} from './caravan-kidnap-261.ts';
import {groupHumanCarrierOf257} from './group-human-admission-257.ts';
import type { Cell,Pawn,World } from './types.ts';
import { updatePawnHealth } from './health.ts';

/** One authoritative carrier owns this relationship; the patient is never cloned
 * into an item. During carry its saved position/edge mirror that carrier. */
export interface RescueTask {
  patientId:number;bedId:number;bedSlot?:import('./types.ts').BedSlot;phase:'approach'|'carry';capture?:true;arrest?:true;
  /** A release uses no bed (bedId=0), and cannot also capture the person. */
  release?:{drop:Cell;exit:Cell};
}
export const carrierOf=(world:World,patientId:number):Pawn|undefined=>world.pawns.find(p=>p.rescue?.phase==='carry'&&p.rescue.patientId===patientId)??groupHumanCarrierOf257(world,patientId)??kidnapCarrierOf261(world,patientId);
export const rescueClaim=(world:World,patientId:number,except?:number):Pawn|undefined=>world.pawns.find(p=>p.id!==except&&p.rescue?.patientId===patientId);
export function syncPatient(world:World,carrier:Pawn):void {
  syncKidnappedPatient261(world,carrier);
  if(carrier.rescue?.phase!=='carry')return;
  const patient=world.pawns.find(p=>p.id===carrier.rescue!.patientId);if(!patient)return;
  patient.x=carrier.x;patient.z=carrier.z;
  patient.motion=carrier.motion?{...carrier.motion,from:{...carrier.motion.from},to:{...carrier.motion.to},...carrier.motion.stagger?{stagger:carrier.motion.stagger.map(s=>({...s}))}:{}}:null;
  if(patient.motion)delete patient.motion.snowEntryPending;
  patient.moveCooldown=carrier.moveCooldown;
}
/** Civil people can share the floor, including an emergency fall on furniture.
 * A captured edge finishes with both bodies; there is no teleport to its origin. */
export function releaseRescue(world:World,carrier:Pawn,despawning=false):void {
  releaseKidnap261(world,carrier);
  const task=carrier.rescue;if(!task)return;
  const patient=world.pawns.find(p=>p.id===task.patientId);
  if(!despawning&&task.phase==='carry'&&patient?.health&&!patient.health.death&&patient.health.tick<world.tick)updatePawnHealth(world,patient);
  syncPatient(world,carrier);delete carrier.rescue;
  if(task.phase==='carry'&&patient){patient.planCooldown=0;patient.needCooldown=0;}
}
