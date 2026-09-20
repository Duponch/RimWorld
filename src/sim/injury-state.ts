import { MALNUTRITION_UNIT,malnutritionModifiers } from './malnutrition.ts';
import { coldModifiers } from './cold-rules.ts';
import { HEAT_UNIT,heatModifiers } from './heat-rules.ts';
import type { BodyAssessment } from './body-capacities.ts';
import { projectedMedicalBody } from './medical-assessment-cache.ts';
import type { BodyPartId } from './body-definition.ts';
import { medicalModel,modelHasPart } from './body-model.ts';
import { BLOOD_UNIT,HP_UNIT,PAIN_UNIT,FRESH_MISSING_TICKS,INJURY_RULES,injuryPartRules,bloodConsciousness,coagulationAge,isWithinPart,scarChance,type InjuryKind,type ScarPain } from './injury-rules.ts';
import type { Injury,MedicalRandom,MedicalRecord } from './injury-types.ts';
import { INFECTION_DELAY_MAX_CORE,INFECTION_UNIT,infectionModifiers,injuryInfectionChance } from './infection-rules.ts';
import { initializeInfectionRisk,removeInfectionsWithin } from './infection-state.ts';

export function createMedicalRecord(tick=0):MedicalRecord {
  if(!Number.isSafeInteger(tick)||tick<0)throw new Error('Invalid medical tick');
  return {tick,nextInjuryId:1,injuries:[],missing:[],bloodLoss:0};
}
export function partMissing(record:MedicalRecord,part:BodyPartId):boolean {return record.missing.some(m=>isWithinPart(part,m.part,medicalModel(record)));}
export function remainingPartHealth(record:MedicalRecord,part:BodyPartId):number {
  if(partMissing(record,part))return 0;
  const hp=Math.max(medicalModel(record).byId[part].destroyable?0:1,medicalModel(record).byId[part].hp-record.injuries.reduce((n,i)=>n+(i.part===part?i.severity/HP_UNIT:0),0));
  const floor=Math.floor(hp);
  return (hp-floor===.5?floor+floor%2:Math.round(hp))*HP_UNIT;
}
export function freshMissing(record:MedicalRecord,part:MedicalRecord['missing'][number]):boolean {
  return !part.tended&&record.tick-part.bornAt<FRESH_MISSING_TICKS&&medicalModel(record).byId[part.part].depth==='outside'&&!injuryPartRules(medicalModel(record))[part.part].solid;
}
export function injuryBleed(record:MedicalRecord,injury:Injury):number {
  return injuryBleedUnits(record,injury)*1000/BLOOD_UNIT;
}
function injuryBleedUnits(record:MedicalRecord,injury:Injury):number {
  if(record.death||injury.tended!==undefined||injury.scar?.pain!==undefined||record.tick-injury.bornAt>=coagulationAge(injury.severity))return 0;
  return injury.severity*INJURY_RULES[injury.kind].bleedUnits*injuryPartRules(medicalModel(record))[injury.part].bleed;
}
export function medicalPain(record:MedicalRecord):number {
  if(record.death)return 0;
  let pain=(heatModifiers(record.heatstroke).pain+coldModifiers(record.hypothermia).pain)*PAIN_UNIT;
  for(const i of record.injuries)pain+=i.severity*(i.scar?.pain!==undefined?5*i.scar.pain:INJURY_RULES[i.kind].painUnits);
  for(const m of record.missing)if(freshMissing(record,m))pain+=medicalModel(record).byId[m.part].hp*10000;
  return Math.min(1,pain/PAIN_UNIT/medicalModel(record).healthScale+infectionModifiers(record).pain);
}
export function medicalBleed(record:MedicalRecord):number {
  return medicalBleedUnits(record)*1000/BLOOD_UNIT;
}
/** Blood units gained per reference 60-tick interval; exact integer threshold. */
export function medicalBleedUnits(record:MedicalRecord):number {
  if(record.death)return 0;
  let rate=record.injuries.reduce((n,i)=>n+injuryBleedUnits(record,i),0);
  for(const m of record.missing)if(freshMissing(record,m))rate+=medicalModel(record).byId[m.part].hp*HP_UNIT*36*injuryPartRules(medicalModel(record))[m.part].bleed;
  return Math.round(rate/medicalModel(record).healthScale);
}
export function assessMedical(record:MedicalRecord):BodyAssessment {
  const heat=heatModifiers(record.heatstroke),cold=coldModifiers(record.hypothermia),blood=bloodConsciousness(record.bloodLoss),infection=infectionModifiers(record),malnutrition=malnutritionModifiers(record.malnutrition);
  return projectedMedicalBody(record,{damage:record.injuries.map(i=>({part:i.part,loss:i.severity/HP_UNIT})),missing:record.missing.map(m=>m.part),pain:medicalPain(record),consciousnessOffset:(blood.consciousnessOffset??0)+heat.consciousnessOffset+cold.consciousnessOffset+infection.consciousnessOffset+malnutrition.consciousnessOffset,consciousnessMax:Math.min(blood.consciousnessMax??Infinity,heat.consciousnessMax,cold.consciousnessMax,infection.consciousnessMax,malnutrition.consciousnessMax),movingOffset:heat.movingOffset+cold.movingOffset,manipulationOffset:cold.manipulationOffset,breathingOffset:infection.breathingOffset},medicalModel(record));
}
export function medicalStatus(record:MedicalRecord,body=assessMedical(record)):'mobile'|'downed'|'dead' {
  return record.death?'dead':body.painShock||!body.canBeAwake||!body.movingCapable?'downed':'mobile';
}
export function reconcileMedicalDeath(record:MedicalRecord):void {
  if(record.death)return;
  const cause=(record.malnutrition??0)>=MALNUTRITION_UNIT?'malnutrition':(record.heatstroke??0)>=HEAT_UNIT?'heatstroke':(record.hypothermia??0)>=HEAT_UNIT?'hypothermia':record.bloodLoss>=BLOOD_UNIT?'blood-loss':record.infections?.cases.some(c=>c.severity>=INFECTION_UNIT)?'infection':assessMedical(record).vitalFailure?'vital-failure':record.injuries.reduce((n,i)=>n+i.severity,0)>=150*HP_UNIT*medicalModel(record).healthScale?'trauma':null;
  if(cause)record.death={tick:record.tick,cause};
}
export function rollScarPain(random:MedicalRandom):ScarPain {const n=random();return n<.5?0:n<.7?1:n<.9?3:6;}

/** Apply already localized, post-armor/post-overkill damage. The producer must
 * resolve hit selection, outside-part preservation and instant-kill protection.
 * It must NOT feed raw weapon damage into this lower layer. */
export function addResolvedInjury(record:MedicalRecord,part:BodyPartId,kind:InjuryKind,severity:number,random:MedicalRandom):Injury|null {
  validateResolvedInjury(record,part,kind,severity);
  if(record.death||severity===0||partMissing(record,part))return null;
  if(!Number.isSafeInteger((record.injuries.reduce((n,i)=>n+i.severity,0)+severity)*100))throw new Error('Medical severity overflow');
  if(!Number.isSafeInteger(record.nextInjuryId+1))throw new Error('Medical identity exhausted');
  const injury=applyResolvedInjury(record,part,kind,severity,random);
  reconcileMedicalDeath(record);return injury;
}
export interface ResolvedInjury {part:BodyPartId;kind:InjuryKind;severity:number}
/** One already-resolved physical impact may injure several anatomical layers.
 * Commit all layers at the same medical tick, then evaluate the final status.
 * No future impact can extend a dead record. Input/capacity checks precede RNG. */
export function addResolvedInjuryBatch(record:MedicalRecord,hits:readonly ResolvedInjury[],random:MedicalRandom):void {
  if(hits.length>64)throw new Error('Too many layers in one impact');
  let severity=record.injuries.reduce((n,i)=>n+i.severity,0);
  for(const hit of hits){validateResolvedInjury(record,hit.part,hit.kind,hit.severity);severity+=hit.severity;}
  if(!Number.isSafeInteger(severity*100)||!Number.isSafeInteger(record.nextInjuryId+hits.length))throw new Error('Medical impact capacity exhausted');
  if(record.death)return;
  for(const hit of hits)if(hit.severity>0&&!partMissing(record,hit.part))applyResolvedInjury(record,hit.part,hit.kind,hit.severity,random);
  reconcileMedicalDeath(record);
}
function validateResolvedInjury(record:MedicalRecord,part:BodyPartId,kind:InjuryKind,severity:number):void {
  if(!modelHasPart(medicalModel(record),part)||medicalModel(record).byId[part].conceptual||!Object.hasOwn(INJURY_RULES,kind)||!Number.isSafeInteger(severity)||severity<0)throw new Error('Invalid localized injury');
  if(!record.death&&severity>0&&injuryInfectionChance(record,{part,kind})>0&&!Number.isSafeInteger(record.tick*10+INFECTION_DELAY_MAX_CORE))throw new Error('Infection exposure clock exhausted');
}
function applyResolvedInjury(record:MedicalRecord,part:BodyPartId,kind:InjuryKind,severity:number,random:MedicalRandom):Injury|null {
  const injury:Injury={id:record.nextInjuryId++,part,kind,severity,bornAt:record.tick};
  const chance=scarChance(part,kind,severity,medicalModel(record));
  if(chance>0&&(chance>=1||random()<chance)) {
    injury.scar=injuryPartRules(medicalModel(record))[part].delicate?{threshold:severity,pain:rollScarPain(random)}:
      {threshold:Math.round(HP_UNIT+random()*(severity/2-HP_UNIT))};
  }
  // Crush can merge into an untreated nonpermanent injury. Its older scar
  // threshold survives; the incoming threshold is discarded by that merge.
  const existing=INJURY_RULES[kind].merge&&injury.scar?.pain===undefined?record.injuries.find(i=>i.part===part&&i.kind===kind&&i.tended===undefined&&i.scar?.pain===undefined):undefined;
  if(existing){existing.severity+=severity;existing.bornAt=record.tick;}else record.injuries.push(injury);
  if(part!=='torso'&&remainingPartHealth(record,part)===0) {
    record.injuries=record.injuries.filter(i=>!isWithinPart(i.part,part,medicalModel(record)));
    record.missing=record.missing.filter(m=>!isWithinPart(m.part,part,medicalModel(record)));
    record.missing.push({part,bornAt:record.tick});
    removeInfectionsWithin(record,part);
    return null;
  }
  if(!existing)initializeInfectionRisk(record,injury,random);
  return existing??injury;
}

/** Physiological result only, not a remote-care player command. */
export function tendInjury(record:MedicalRecord,id:number,quality:number):boolean {
  if(!Number.isSafeInteger(quality)||quality<0||quality>1300)throw new Error('Invalid tending quality');
  if(record.death)return false;
  const injury=record.injuries.find(i=>i.id===id);
  if(!injury||injury.tended!==undefined||injury.scar?.pain!==undefined)return false;
  injury.tended=quality;return true;
}
export function tendMissingPart(record:MedicalRecord,part:BodyPartId):boolean {
  const missing=record.missing.find(m=>m.part===part);
  if(record.death||!missing||!freshMissing(record,missing))return false;
  missing.tended=true;return true;
}
