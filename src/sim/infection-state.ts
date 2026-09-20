import type { BodyPartId } from './body-definition.ts';
import { medicalModel } from './body-model.ts';
import { HP_UNIT,isWithinPart } from './injury-rules.ts';
import type { Injury,MedicalRandom,MedicalRecord } from './injury-types.ts';
import type { Infection } from './infection-types.ts';
import { INFECTION_DELAY_MIN_CORE,INFECTION_DELAY_MAX_CORE,INFECTION_TEND_DURATION_CORE,INFECTION_TEND_OVERLAP_CORE,INFECTION_UNIT,injuryInfectionChance } from './infection-rules.ts';

/** Only called for a newly accepted, nonmerged wound; absence is never rerolled. */
export function initializeInfectionRisk(record:MedicalRecord,injury:Injury,random:MedicalRandom):void {
  const chance=injuryInfectionChance(record,injury);
  if(chance>0&&!Number.isSafeInteger(record.tick*10+INFECTION_DELAY_MAX_CORE))throw new Error('Infection exposure clock exhausted');
  if(chance>0&&random()<=chance)injury.infection={dueCore:record.tick*10+INFECTION_DELAY_MIN_CORE+
    Math.floor(random()*(INFECTION_DELAY_MAX_CORE-INFECTION_DELAY_MIN_CORE+1)),roomFactor:1000};
}
export function removeInfectionsWithin(record:MedicalRecord,part:BodyPartId):void {
  if(record.infections)record.infections.cases=record.infections.cases.filter(c=>!isWithinPart(c.part,part,medicalModel(record)));
}
export function captureInfectionTendRoom(record:MedicalRecord,injuryId:number,roomFactor:number):boolean {
  if(!Number.isSafeInteger(roomFactor)||roomFactor<200||roomFactor>1000)throw new Error('Invalid infection room factor');
  const injury=record.injuries.find(i=>i.id===injuryId);
  if(record.death||!injury?.infection||injury.tended===undefined)return false;
  injury.infection.roomFactor=roomFactor;return true;
}
/** Core overlap is strict: remaining == 7500 is still too early. */
export function infectionNextTendCore(condition:Infection):number {
  return condition.tend?condition.tend.expiresAtCore-INFECTION_TEND_OVERLAP_CORE+1:condition.bornAt*10;
}
export function infectionTendable(record:MedicalRecord,condition:Infection):boolean {
  return !record.death&&condition.severity>0&&(record.infections?.immunity??0)<INFECTION_UNIT&&
    record.tick*10>=infectionNextTendCore(condition);
}
export function tendInfection(record:MedicalRecord,id:number,quality:number):boolean {
  if(!Number.isSafeInteger(quality)||quality<0||quality>1300)throw new Error('Invalid infection tending quality');
  const condition=record.infections?.cases.find(c=>c.id===id);
  if(!condition||!infectionTendable(record,condition))return false;
  const expiresAtCore=Math.max(record.tick*10,condition.tend?.expiresAtCore??0)+INFECTION_TEND_DURATION_CORE;
  if(!Number.isSafeInteger(expiresAtCore))throw new Error('Infection treatment clock exhausted');
  condition.tend={quality,expiresAtCore};return true;
}
export function infectionTargets(record:MedicalRecord):{infectionId:number;part:BodyPartId;priority:number;severity:number}[] {
  return (record.infections?.cases??[]).filter(c=>infectionTendable(record,c)).map(c=>({infectionId:c.id,part:c.part,
    priority:c.severity>=780_000_000?1:.025,severity:c.severity/INFECTION_UNIT*HP_UNIT}));
}
export function infectionNeedsRest(record:MedicalRecord):boolean {
  return !record.death&&!!record.infections?.cases.length&&record.infections.immunity<INFECTION_UNIT;
}
