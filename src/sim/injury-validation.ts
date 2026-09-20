import { validInfections } from './infection-save.ts';
import { HUMAN_MODEL,HARE_MODEL,modelHasPart } from './body-model.ts';
import { BLOOD_UNIT,INJURY_RULES,injuryPartRules,isWithinPart } from './injury-rules.ts';
import { createMedicalRecord,reconcileMedicalDeath,remainingPartHealth,medicalStatus } from './injury-state.ts';
import type { MedicalRecord } from './injury-types.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const keys=(v:Record<string,unknown>,allowed:readonly string[])=>Object.keys(v).every(k=>allowed.includes(k));
/** Strict isolated record validator. World ownership/migration is not implemented
 * by this function and must precede accepting a medical Pawn field. */
export function validateMedicalRecord(value:unknown,allowGunshot=true,allowBite=true,allowHeat=true,allowCold=true,animal=false,allowExecution=false,allowInfection=true):string|null {
  const model=animal?HARE_MODEL:HUMAN_MODEL,BODY_PARTS=model.byId,PART_INJURY_RULES=injuryPartRules(model);
  const bodyPartExists=(id:unknown)=>modelHasPart(model,id);
  const fail='Invalid medical record';
  if(!object(value)||!keys(value,[...(animal?['body']:[]),'tick','nextInjuryId','injuries','missing','bloodLoss','death',...(allowHeat?['heatstroke']:[]),...(allowCold?['hypothermia']:[]),...(allowInfection?['infections']:[])])||!integer(value.tick)||!integer(value.nextInjuryId,1)||!integer(value.bloodLoss,0,BLOOD_UNIT)||!Array.isArray(value.injuries)||!Array.isArray(value.missing))return fail;
  if(animal&&value.body!=='hare')return fail;
  if(value.heatstroke!==undefined&&(!allowHeat||!integer(value.heatstroke,1,1_000_000_000)))return fail;
  if(value.hypothermia!==undefined&&(!allowCold||!integer(value.hypothermia,1,1_000_000_000)))return fail;
  const ids=new Set<number>();let total=0;
  for(const i of value.injuries) {
    if(!object(i)||!keys(i,['id','part','kind','severity','bornAt','scar','tended',...(allowInfection?['infection']:[])])||!integer(i.id,1,value.nextInjuryId-1)||ids.has(i.id)||
      !bodyPartExists(i.part)||BODY_PARTS[i.part].conceptual||typeof i.kind!=='string'||!Object.hasOwn(INJURY_RULES,i.kind)||!allowGunshot&&i.kind==='gunshot'||!allowBite&&i.kind==='bite'||i.kind==='execution-cut'&&(!animal||!allowExecution||Number(i.severity)>1000||i.scar!==undefined)||!integer(i.severity,1)||!integer(i.bornAt,0,value.tick)||
      i.tended!==undefined&&!integer(i.tended,0,1300))return fail;
    ids.add(i.id);total+=i.severity;if(!Number.isSafeInteger(total*100))return fail;
    if(i.scar!==undefined&&(!object(i.scar)||!keys(i.scar,['threshold','pain'])||i.kind==='bruise'||PART_INJURY_RULES[i.part].scarFactor===0||!integer(i.scar.threshold,1,i.severity)||
      PART_INJURY_RULES[i.part].delicate&&i.scar.pain===undefined||
      i.scar.pain!==undefined&&(![0,1,3,6].includes(i.scar.pain as number)||i.scar.threshold!==i.severity)))return fail;
  }
  for(const m of value.missing) {
    if(!object(m)||!keys(m,['part','bornAt','tended'])||!bodyPartExists(m.part)||m.part==='torso'||BODY_PARTS[m.part].conceptual||!BODY_PARTS[m.part].destroyable||!integer(m.bornAt,0,value.tick)||m.tended!==undefined&&m.tended!==true)return fail;
  }
  const record=value as unknown as MedicalRecord;
  for(const [index,m] of record.missing.entries()) {
    if(record.missing.some((other,j)=>j!==index&&(isWithinPart(m.part,other.part,model)||isWithinPart(other.part,m.part,model)))||record.injuries.some(i=>isWithinPart(i.part,m.part,model)))return fail;
  }
  if(!validInfections(record,model,allowInfection))return fail;
  for(const i of record.injuries)if(i.part!=='torso'&&remainingPartHealth(record,i.part)===0)return fail;
  if(value.death!==undefined&&(!object(value.death)||!keys(value.death,['tick','cause'])||value.death.tick!==record.tick||!['blood-loss','vital-failure','trauma',...(animal?['downed',...(allowExecution?['execution']:[])]:[]),...(allowHeat?['heatstroke']:[]),...(allowCold?['hypothermia']:[]),...(allowInfection?['infection']:[])].includes(value.death.cause as string)))return fail;
  const living:MedicalRecord={...createMedicalRecord(record.tick),...(animal?{body:'hare' as const}:{}),injuries:record.injuries,missing:record.missing,bloodLoss:record.bloodLoss,...record.heatstroke?{heatstroke:record.heatstroke}:{},...record.hypothermia?{hypothermia:record.hypothermia}:{},...record.infections?{infections:record.infections}:{}};
  reconcileMedicalDeath(living);
  if(record.death?.cause==='execution')return animal&&allowExecution&&medicalStatus(living)==='downed'?null:fail;
  if(record.death?.cause==='downed')return !living.death&&medicalStatus(living)==='downed'?null:fail;
  if(!!living.death!==!!record.death||living.death?.cause!==record.death?.cause)return fail;
  return null;
}
