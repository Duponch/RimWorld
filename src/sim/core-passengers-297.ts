import {cryptosleepCarrying271} from './rescue-state.ts';
import {shipCasketCarrying277} from './ship-casket-carry-277.ts';
import {groupHumanCarryPairs257} from './group-human-admission-257.ts';
import {kidnapCarryPairs261} from './caravan-kidnap-261.ts';
import type {World} from './types.ts';
import type {TravelSegment} from './travel-timing.ts';
export interface CorePassenger297 {id:number;motion?:TravelSegment|null;moveCooldown?:number}
/** Actual owned mirrors, captured only until the next command/macro/impact.
 * No copied Actor or invented carrier is admitted to this small index. */
export function captureCorePassengers297(w:World):Map<number,CorePassenger297[]> {
 const result=new Map<number,CorePassenger297[]>();
 const add=(carrierId:number,id:number)=>{
  const actor=w.pawns.find(p=>p.id===id)??w.wildlife?.animals.find(p=>p.id===id)??w.mechanoids?.find(p=>p.id===id);
  if(!actor)throw Error('Actual passenger disappeared from its physical owner');
  const row=result.get(carrierId)??[];if(!row.some(a=>a.id===id))row.push(actor);result.set(carrierId,row);
 };
 for(const p of w.pawns){
  if(p.rescue?.phase==='carry')add(p.id,p.rescue.patientId);
  if(cryptosleepCarrying271(p))add(p.id,p.cryptosleepTask!.patientId!);
  if(shipCasketCarrying277(p)&&p.shipCasketTask277?.patient)add(p.id,p.shipCasketTask277.patient.id);
 }
 for(const row of groupHumanCarryPairs257(w))add(row.carrierId,row.patientId);
 for(const row of kidnapCarryPairs261(w))add(row.carrierId,row.patientId);
 return result;
}
