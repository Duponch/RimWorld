import {validToxicBuildupHeader256} from './toxic-buildup-256.ts';
import {validHumanClinicalConditionOwner256} from './human-condition-mind-256.ts';
import {captureHumanOwners,type HumanOwnershipCapture} from './human-owners.ts';
import {validateMedicalRecord} from './injury-validation.ts';
import {isAnimalSpecies} from './animal-species.ts';
import {cobraAdmissionReasonForSnapshot256} from './cobra-admission-256.ts';
import {toxicVomitEngagement256} from './toxic-vomit-256.ts';
import {groupPawnInterval256} from './group-core-cadence-256.ts';
import {assessMedical} from './injury-state.ts';
import type {Pawn,World} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
export function validToxicBuildupTransport256(actor:Pawn|WildAnimal,version:number,clock:number,spatial?:{width:number;height:number}):boolean {
 if('hunger'in actor&&!validHumanClinicalConditionOwner256(actor,version,clock,!!spatial))return false;
 const record=actor.health;if(!record)return true;
 if(!validToxicBuildupHeader256(record,version))return false;
 const t=record.toxicBuildup;if(!t)return true;
 const animal=isAnimalSpecies(record.body);
 if(record.tick>clock||validateMedicalRecord(record,true,true,!animal,!animal,animal,animal,true,true,true,true,true,version,!animal)!==null||record.death&&typeof t.rotOnDeath!=='boolean')return false;
 const request=t.vomitRequestedAt;
 if(request!==undefined){const edge=toxicVomitEngagement256(actor,clock);if(!spatial||record.tick!==clock||!groupPawnInterval256(actor.id,request,600,1)||!edge||edge.startCore>request||edge.endCore<=clock*10||actor.state==='sleeping'||actor.state==='downed'||!assessMedical(record).canBeAwake||actor.stun)return false;}
 const v=t.vomit;if(!v)return true;
 if(!spatial||v.cell.x>=spatial.width||v.cell.z>=spatial.height||!['idle','downed'].includes(actor.state)||actor.path.length||(actor.motion?.end??0)>clock||!assessMedical(record).canBeAwake||Math.max(Math.abs(v.cell.x-actor.x),Math.abs(v.cell.z-actor.z))>1)return false;
 if('hunger'in actor&&(actor.melee?.order||actor.shooting?.order||actor.shooting?.stance?.phase==='aim'||actor.moveCooldown>0||actor.jobId!==null||actor.haul||actor.cooking||actor.need||actor.hunting||actor.research||actor.ward||actor.feed||actor.tend||actor.surgery||actor.rescue||actor.equipmentTask||actor.orders.active!==null||actor.orders.queue.length||actor.priorityWork||actor.recreation.task))return false;
 if('species'in actor&&(actor.meal||actor.strike||actor.retaliation))return false;
 return true;
}
/** Existing RAW/MAIN owner boundary. This walks actual retained owners only;
 * no clock, diagnosis, corpse roll, holder or past history is manufactured. */
export function validCobraClinicalWorld256(w:World,version:number=w.schemaVersion):boolean {
 return validCobraClinicalWorldForSnapshot256(w,version,()=>captureHumanOwners(w));
}

/** @internal Fixed Decoder consumers only. Keep all local/foreign clinical checks. */
export function validCobraClinicalWorldForSnapshot256(w:World,version:number,readOwners:()=>HumanOwnershipCapture):boolean {
 try {
  for(const slot of readOwners().pawnOwners)if(!validToxicBuildupTransport256(slot.pawn!,version,slot.validationTick,slot.kind==='map'?w:undefined))return false;
  for(const a of w.wildlife?.animals??[])if(!validToxicBuildupTransport256(a,version,w.tick,w))return false;
  for(const row of w.worldFactions?.leaders??[])if(!validToxicBuildupTransport256(row.pawn,version,row.clock))return false;
  if(w.wildlife?.animals.some(a=>a.species==='cobra'&&a.state!=='dead')&&cobraAdmissionReasonForSnapshot256(w,readOwners))return false;
  return true;
 }catch{return false;}
}
