import type { Pawn,World } from './types.ts';
import { updatePawnHealth } from './health.ts';

/** One authoritative carrier owns this relationship; the patient is never cloned
 * into an item. During carry its saved position/edge mirror that carrier. */
export interface RescueTask { patientId:number; bedId:number; phase:'approach'|'carry';capture?:true }
export const carrierOf=(world:World,patientId:number):Pawn|undefined=>world.pawns.find(p=>p.rescue?.phase==='carry'&&p.rescue.patientId===patientId);
export const rescueClaim=(world:World,patientId:number,except?:number):Pawn|undefined=>world.pawns.find(p=>p.id!==except&&p.rescue?.patientId===patientId);
export function syncPatient(world:World,carrier:Pawn):void {
  if(carrier.rescue?.phase!=='carry')return;
  const patient=world.pawns.find(p=>p.id===carrier.rescue!.patientId);if(!patient)return;
  patient.x=carrier.x;patient.z=carrier.z;
  patient.motion=carrier.motion?{...carrier.motion,from:{...carrier.motion.from},to:{...carrier.motion.to},...carrier.motion.stagger?{stagger:carrier.motion.stagger.map(s=>({...s}))}:{}}:null;
  patient.moveCooldown=carrier.moveCooldown;
}
/** Civil people can share the floor, including an emergency fall on furniture.
 * A captured edge finishes with both bodies; there is no teleport to its origin. */
export function releaseRescue(world:World,carrier:Pawn):void {
  const task=carrier.rescue;if(!task)return;
  const patient=world.pawns.find(p=>p.id===task.patientId);
  if(task.phase==='carry'&&patient?.health&&!patient.health.death&&patient.health.tick<world.tick)updatePawnHealth(world,patient);
  syncPatient(world,carrier);delete carrier.rescue;
  if(task.phase==='carry'&&patient){patient.planCooldown=0;patient.needCooldown=0;}
}
