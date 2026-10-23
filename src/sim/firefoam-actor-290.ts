import {carrierOf} from './rescue-state.ts';
import {animalCarrier} from './animal-rest-state.ts';
import {shipCasketCarrierOf277} from './ship-casket-carry-277.ts';
import {combatTargetByKey,isAnimalTarget,isMechanoidTarget,type LivingTarget,type LivingTargetKey} from './combat-target.ts';
import {createMedicalRecord} from './injury-state.ts';
import {createAnimalMedicalRecord256} from './animal-clinical-age-v256.ts';
import {createMechaMedicalRecord} from './mechanoid-health.ts';
import {medicalCivilTick271} from './suspended-human-clock-271.ts';
import {advanceCoveredInFirefoam290,validCoveredInFirefoamField290} from './firefoam-actor-state-290.ts';
import type {MedicalRecord} from './injury-types.ts';
import type {World} from './types.ts';
import type {CampaignState} from './world-map-state.ts';

const writable=(owner:object,key:string)=>{
 const d=Object.getOwnPropertyDescriptor(owner,key);
 return d?d.enumerable&&Object.hasOwn(d,'value')&&d.writable:!(key in owner)&&Object.isExtensible(owner);
};
/** A carried original is held, even when its dossier remains in a local collection. */
export function firefoamExposedActor290(w:World,key:LivingTargetKey):boolean {
 const id=Number(key.slice(key.indexOf(':')+1));
 return key.startsWith('pawn:')?!carrierOf(w,id):key.startsWith('animal:')?!animalCarrier(w,id):!shipCasketCarrierOf277(w,{kind:'mechanical',id});
}
function recipient(w:World,key:LivingTargetKey):{actor:LivingTarget;record:MedicalRecord;fresh:boolean}|undefined {
 if((Number(w.schemaVersion)!==290&&(Number(w.schemaVersion)!==291&&(Number(w.schemaVersion)!==292&&Number(w.schemaVersion)!==293)))||typeof key!=='string'||!/^(pawn|animal|mech):[1-9]\d*$/.test(key)||!Number.isSafeInteger(w.tick)||w.tick<0)return;
 if(!firefoamExposedActor290(w,key))return;
 const actor=combatTargetByKey(w,key);if(!actor||actor.state==='dead'||actor.shipCryptosleepHeldAt277!==undefined||'cryptosleepHeldAt271'in actor&&actor.cryptosleepHeldAt271!==undefined)return;
 const health=Object.getOwnPropertyDescriptor(actor,'health');
 if(health?(!health.enumerable||!Object.hasOwn(health,'value')||!health.value):'health'in actor)return;
 let record:MedicalRecord;
 if(health){
  record=health.value;if(!validCoveredInFirefoamField290(record,290)||record.death||!writable(record,'coveredInFirefoam290'))return;
  if(isMechanoidTarget(actor)?record.body!==actor.mechKind||record.tick>w.tick:isAnimalTarget(actor)?record.body!==actor.species||medicalCivilTick271(record)!==w.tick:record.body!==undefined||medicalCivilTick271(record)!==w.tick)return;
 }else{
  if(!writable(actor,'health'))return;
  record=isMechanoidTarget(actor)?createMechaMedicalRecord(w.tick,actor.mechKind):isAnimalTarget(actor)?createAnimalMedicalRecord256(w,actor):createMedicalRecord(w.tick);
 }
 return {actor,record,fresh:!health};
}
/** Pure preflight for the actual same-cell wave transaction. No RNG/clinic tick. */
export function canApplyFirefoamActor290(w:World,key:LivingTargetKey):boolean {
 try{return !!recipient(w,key);}catch{return false;}
}
/** Called only at the admitted end-of-local-step wave commit. */
export function applyFirefoamActor290(w:World,key:LivingTargetKey):boolean {
 try{
  const r=recipient(w,key);if(!r)return false;
  r.record.coveredInFirefoam290={remainingCore:Math.max(r.record.coveredInFirefoam290?.remainingCore??0,900)};
  if(r.fresh)r.actor.health=r.record;
  return true;
 }catch{return false;}
}
/** Current living installed originals only. Sparse clinical tick stays intact.
 * Optional beginning-of-step IDs exclude arrivals with no local interval. */
export function advanceLocalMechFirefoam290(w:World,activeIds?:ReadonlySet<number>):void {
 if((Number(w.schemaVersion)!==290&&(Number(w.schemaVersion)!==291&&(Number(w.schemaVersion)!==292&&Number(w.schemaVersion)!==293))))return;
 for(const m of w.mechanoids??[])if((!activeIds||activeIds.has(m.id))&&m.state!=='dead'&&m.shipCryptosleepHeldAt277===undefined&&m.health&&!m.health.death)advanceCoveredInFirefoam290(m.health,10);
}
/** Short-lived campaign frontier only, never persisted or read by rendering. */
export function captureFirefoamWorldPawnIds290(root:CampaignState):ReadonlySet<number> {
 return new Set((root.worldPawns?.owners??[]).filter(row=>row.mode==='active').map(row=>row.actor.id));
}
