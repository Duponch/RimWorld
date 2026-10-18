import {isSchema256Or257} from './schema-compatibility-257.ts';
import {CORE_STARTING_ARRIVAL_PROFILE_256} from './starting-pod-state-256.ts';
import {hasCryptosleepSickness256,validCryptosleepSicknessHeader256} from './cryptosleep-sickness-256.ts';
import {validateMedicalRecord} from './injury-validation.ts';
import {medicalStatus} from './injury-state.ts';
import {captureHumanOwners,type HumanOwnershipCapture} from './human-owners.ts';
import {isAnimalSpecies} from './animal-species.ts';
import type {Pawn,World} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
type ClinicalOwner256=Pawn|WildAnimal;
/** Same real actor and owner clock; no map reconstruction or passive ticking.
 * General shape/identity/owner admission remains in the existing guards. */
export function validCryptosleepSicknessTransport256(actor:ClinicalOwner256,version:number,clock:number,spatial?:{width:number;height:number}):boolean {
 const record=actor.health;if(!hasCryptosleepSickness256(record))return true;
 if(!record||!validCryptosleepSicknessHeader256(record,version)||!Number.isSafeInteger(clock)||clock<0||record.tick>clock)return false;
 const animal=isAnimalSpecies(record.body);
 if(validateMedicalRecord(record,true,true,!animal,!animal,animal,animal,true,true,true,true,true,version,!animal)!==null)return false;
 const v=record.cryptosleepSickness!.vomit;
 if(v){
  if(!spatial||v.cell.x>=spatial.width||v.cell.z>=spatial.height||actor.state!=='idle'||actor.path.length||(actor.motion?.end??0)>clock||Math.max(Math.abs(v.cell.x-actor.x),Math.abs(v.cell.z-actor.z))>1)return false;
  if('hunger'in actor&&(actor.moveCooldown>0||actor.jobId!==null||actor.haul||actor.cooking||actor.need||actor.hunting||actor.research||actor.ward||actor.feed||actor.tend||actor.surgery||actor.rescue||actor.equipmentTask||actor.orders.active!==null||actor.orders.queue.length||actor.priorityWork||actor.recreation.task))return false;
  if('species'in actor&&(actor.meal||actor.strike||actor.retaliation))return false;
 }
 const status=medicalStatus(record);return status==='mobile'?actor.state!=='dead'&&actor.state!=='downed':actor.state===status;
}
/** Called at existing RAW/MAIN context boundaries. The owner capture includes
 * real local, travel, frozen/terminal and contained humans. Other map/global
 * contexts are admitted by their existing campaign validation pass. */
export function validCryptosleepSicknessWorldTransport256(world:World,version:number=world.schemaVersion):boolean {
 return validCryptosleepSicknessWorldTransportForSnapshot256(world,version,()=>captureHumanOwners(world));
}

/** @internal Fixed Decoder consumers only; all actual holder clocks stay checked. */
export function validCryptosleepSicknessWorldTransportForSnapshot256(world:World,version:number,readOwners:()=>HumanOwnershipCapture):boolean {
 try {
  for(const slot of readOwners().pawnOwners){
   const p=slot.pawn!;if(!hasCryptosleepSickness256(p.health))continue;
   // Only the newly represented Core holder can own the real PostMapGenerate
   // sickness at its explicit frozen clock0. Historical capsules stay strict.
   const arrival=world.startingArrival,place=slot.place;
   const coreHeld=isSchema256Or257(version)&&isSchema256Or257(world.schemaVersion)&&world.site?.revision===3&&world.planet?.revision===3&&world.climate?.revision===4
    &&slot.kind==='starting-pod'&&place.kind==='starting-pod'&&slot.validationTick===0
    &&arrival?.profile===CORE_STARTING_ARRIVAL_PROFILE_256&&arrival.phase!=='opened'&&arrival.personalTick===0
    &&arrival.pods.some(pod=>pod.id===place.podId&&pod.pawn===p);
   if(slot.kind==='starting-pod'&&!coreHeld||!validCryptosleepSicknessTransport256(p,version,slot.validationTick,slot.kind==='map'?world:undefined))return false;
  }
  for(const a of world.wildlife?.animals??[])if(!validCryptosleepSicknessTransport256(a,version,world.tick,world))return false;
  for(const row of world.worldFactions?.leaders??[])if(!validCryptosleepSicknessTransport256(row.pawn,version,row.pawn.health?.death?.tick??row.pawn.health?.tick??0))return false;
  return true;
 }catch{return false;}
}
