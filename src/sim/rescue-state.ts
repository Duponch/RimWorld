import {shipCasketCarrierOf277,syncShipCasketPassenger277} from './ship-casket-carry-277.ts';
import {medicalCivilTick271} from './suspended-human-clock-271.ts';
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
export const cryptosleepCarrying271=(p:Pawn):boolean=>p.cryptosleepTask?.action==='carry'&&(p.cryptosleepTask.phase==='carry'||p.cryptosleepTask.phase==='closing');
export const cryptosleepCarrierOf271=(w:World,id:number):Pawn|undefined=>w.pawns.find(p=>cryptosleepCarrying271(p)&&p.cryptosleepTask!.patientId===id);
export const carrierOf=(world:World,patientId:number):Pawn|undefined=>world.pawns.find(p=>p.rescue?.phase==='carry'&&p.rescue.patientId===patientId||cryptosleepCarrying271(p)&&p.cryptosleepTask!.patientId===patientId)??shipCasketCarrierOf277(world,{kind:'human',id:patientId})??groupHumanCarrierOf257(world,patientId)??kidnapCarrierOf261(world,patientId);
export const rescueClaim=(world:World,patientId:number,except?:number):Pawn|undefined=>world.pawns.find(p=>p.id!==except&&(p.rescue?.patientId===patientId||p.cryptosleepTask?.action==='carry'&&p.cryptosleepTask.patientId===patientId||p.id===patientId&&p.cryptosleepTask?.action==='enter'||p.shipCasketTask277?.action==='carry'&&p.shipCasketTask277.patient?.kind==='human'&&p.shipCasketTask277.patient.id===patientId||p.id===patientId&&p.shipCasketTask277?.action==='enter'));
export function syncPatient(world:World,carrier:Pawn):void {
  syncShipCasketPassenger277(world,carrier);
  syncKidnappedPatient261(world,carrier);
  const patientId=carrier.rescue?.phase==='carry'?carrier.rescue.patientId:cryptosleepCarrying271(carrier)?carrier.cryptosleepTask!.patientId:undefined;if(patientId===undefined)return;
  const patient=world.pawns.find(p=>p.id===patientId);if(!patient)return;
  patient.x=carrier.x;patient.z=carrier.z;
  patient.motion=carrier.motion?{...carrier.motion,from:{...carrier.motion.from},to:{...carrier.motion.to},...carrier.motion.stagger?{stagger:carrier.motion.stagger.map(s=>({...s}))}:{}}:null;
  if(patient.motion)delete patient.motion.snowEntryPending;
  patient.moveCooldown=carrier.moveCooldown;
}
/** Cancelling cryptosleep keeps a passenger on the carrier's actual captured
 * edge. Civil people can share this floor; no remote bed or copied body. */
export function releaseCryptosleepCarry271(world:World,carrier:Pawn,despawning=false):void {
 const task=carrier.cryptosleepTask;if(!task)return;const carrying=cryptosleepCarrying271(carrier),patient=carrying?world.pawns.find(p=>p.id===task.patientId):undefined;
 if(!despawning&&patient?.health&&!patient.health.death&&medicalCivilTick271(patient.health)<world.tick)updatePawnHealth(world,patient);
 if(carrying)syncPatient(world,carrier);delete carrier.cryptosleepTask;
 if(patient){patient.planCooldown=0;patient.needCooldown=0;}
}
/** Civil people can share the floor, including an emergency fall on furniture.
 * A captured edge finishes with both bodies; there is no teleport to its origin. */
export function releaseRescue(world:World,carrier:Pawn,despawning=false):void {
  releaseKidnap261(world,carrier);
  const task=carrier.rescue;if(!task)return;
  const patient=world.pawns.find(p=>p.id===task.patientId);
  if(!despawning&&task.phase==='carry'&&patient?.health&&!patient.health.death&&medicalCivilTick271(patient.health)<world.tick)updatePawnHealth(world,patient);
  syncPatient(world,carrier);delete carrier.rescue;
  if(task.phase==='carry'&&patient){patient.planCooldown=0;patient.needCooldown=0;}
}
