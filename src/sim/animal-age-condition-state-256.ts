import {isSchema256Or257} from './schema-compatibility-257.ts';
import {validHumanHealthScaleHeader256} from './native-human-clinical-scale-256.ts';
import {clinicalConditionPartFacts256} from './clinical-condition-parts-256.ts';
import type {BodyPartId} from './body-definition.ts';
import type {MedicalRecord} from './injury-types.ts';
import type {BodyModel} from './body-model-compiler.ts';
import {isAnimalSpecies256} from './animal-core-v256.ts';
import {ANIMAL_AGE_CONDITION_DEFINITIONS_256 as definitions,animalConditionStage256,type AnimalAgeConditionKind256} from './animal-age-condition-data-256.ts';
export interface AnimalConditionTend256 {ticksLeft:number;quality:number;totalQuality:number}
export interface AnimalAgeConditionCase256 {
 id:number;kind:AnimalAgeConditionKind256;part:BodyPartId;bornAt:number;ageCore:number;severity:number;noPain:boolean;
 growth?:{mode:0|1|2;growingFactor:number;remissionFactor:number};
 severityFactor?:number;tend?:AnimalConditionTend256;intervalFactor?:number;
 /** Product integer milli-XP representation only; human Dementia actual comp. */
 skillDecayRemainders?:Record<string,number>;
}
export interface AnimalAgeConditions256 {revision:1;nextId:number;cases:AnimalAgeConditionCase256[]}
export type AnimalAgeMedical256=MedicalRecord&{animalAgeConditions?:AnimalAgeConditions256};
const f=Math.fround;
function plain(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;}
function fields(v:unknown,keys:readonly string[]):v is Record<string,unknown>{if(!plain(v)||Reflect.ownKeys(v).length!==keys.length)return false;return keys.every(k=>{const d=Object.getOwnPropertyDescriptor(v,k);return !!d&&Object.hasOwn(d,'value')&&d.enumerable===true;});}
function real(v:unknown,low:number,high:number):v is number{return typeof v==='number'&&Number.isFinite(v)&&f(v)===v&&v>=f(low)&&v<=f(high);}
function integer(v:unknown,low=0):v is number{return typeof v==='number'&&Number.isSafeInteger(v)&&v>=low;}
function dense(v:unknown):v is unknown[]{if(!Array.isArray(v)||Reflect.ownKeys(v).length!==v.length+1)return false;for(let i=0;i<v.length;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));if(!d||!Object.hasOwn(d,'value')||!d.enumerable)return false;}return true;}
export function validAnimalAgeConditions256(value:unknown,version:number,animal:boolean,tick:number,model:BodyModel,missing:readonly {part:BodyPartId}[]):boolean {
 if(!value||typeof value!=='object')return false;const d=Object.getOwnPropertyDescriptor(value,'animalAgeConditions');if(!d)return !('animalAgeConditions'in value);
 if(version<256||!Object.hasOwn(d,'value')||!d.enumerable||!fields(d.value,['revision','nextId','cases'])||!animal&&model.kind!=='human')return false;
 const state=d.value;if(state.revision!==1||!integer(state.nextId,1)||!dense(state.cases)||!integer(tick)||!Number.isSafeInteger(tick*10))return false;
 const nativeHuman=model.kind==='human'&&isSchema256Or257(version)&&Object.hasOwn(value,'humanHealthScale')&&validHumanHealthScaleHeader256(value,version);
 const nativeRows=clinicalConditionPartFacts256(model,value),restricted=model.kind==='human'?!nativeHuman:!isAnimalSpecies256(model.kind)&&!Object.hasOwn(value,'animalGrowth');
 const ids=new Set<number>(),parts=new Set<string>();
 const lost=(part:BodyPartId)=>{for(let p:BodyPartId|null=part;p!==null;p=model.byId[p]!.parent)if(missing.some(m=>m.part===p))return true;return false;};
 for(const raw of state.cases){if(!plain(raw))return false;const kd=Object.getOwnPropertyDescriptor(raw,'kind');if(!kd||!Object.hasOwn(kd,'value')||typeof kd.value!=='string'||!Object.hasOwn(definitions,kd.value))return false;const kind=kd.value as AnimalAgeConditionKind256;if(restricted&&kind!=='Dementia'&&kind!=='Carcinoma')return false;
  const keys=['id','kind','part','bornAt','ageCore','severity','noPain',...(model.kind==='human'&&kind==='Dementia'?['skillDecayRemainders']:[]),...(kind==='Carcinoma'?['growth','tend']:kind==='Asthma'?['tend']:kind==='HeartArteryBlockage'?['severityFactor']:kind==='HeartAttack'?['intervalFactor']:[])];
  if(!fields(raw,keys)||!integer(raw.id,1)||raw.id>=state.nextId||ids.has(raw.id)||typeof raw.part!=='string'||!Object.hasOwn(model.byId,raw.part)||!integer(raw.bornAt)||raw.bornAt>tick||!integer(raw.ageCore)||raw.ageCore>(tick-raw.bornAt)*10+10||typeof raw.noPain!=='boolean')return false;
  const part=raw.part as BodyPartId,def=definitions[kind],nativeRow=nativeRows.find(row=>row.part===part);
  if(!nativeRow||lost(part)||def.part!==undefined&&nativeRow.defId!==def.part||def.anyLive&&!nativeRow.alive||!real(raw.severity,def.min,def.max))return false;
  const key=kind+':'+part;if(parts.has(key))return false;parts.add(key);ids.add(raw.id);
  if(model.kind==='human'&&kind==='Dementia'){const remainders=raw.skillDecayRemainders;if(!plain(remainders)||Reflect.ownKeys(remainders).some(k=>typeof k!=='string'||!['construction','medicine','shooting','melee','mining','plants','animals','artistic','cooking','intellectual','crafting','social'].includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(remainders,k)!,'value')||Object.getOwnPropertyDescriptor(remainders,k)!.enumerable!==true||!real(remainders[k],0,1)||remainders[k]===1))return false;}
  if(kind==='Carcinoma'){if(!fields(raw.growth,['mode','growingFactor','remissionFactor'])||!Number.isInteger(raw.growth.mode)||![0,1,2].includes(Number(raw.growth.mode))||!real(raw.growth.growingFactor,.45,1.65)||!real(raw.growth.remissionFactor,.7,1.5))return false;}
  if(kind==='Carcinoma'||kind==='Asthma'){if(!fields(raw.tend,['ticksLeft','quality','totalQuality'])||!integer(raw.tend.ticksLeft,-1)||!real(raw.tend.quality,0,Number.MAX_VALUE)||!real(raw.tend.totalQuality,0,Number.MAX_VALUE))return false;}
  if(kind==='HeartArteryBlockage'&&!real(raw.severityFactor,.5,3)||kind==='HeartAttack'&&!real(raw.intervalFactor,.1,2))return false;
 }
 return true;
}
/** Removing a REAL part removes its conditions, not unrelated organs. The
 * caller already performed the authoritative body-part removal transaction. */
export function removeAnimalConditionsWithin256(record:AnimalAgeMedical256,removed:BodyPartId,model:BodyModel):void {
 const state=record.animalAgeConditions;if(!state)return;
 state.cases=state.cases.filter(c=>{for(let p:BodyPartId|null=c.part;p!==null;p=model.byId[p]!.parent)if(p===removed)return false;return true;});
}
const NO_EFFECTS=Object.freeze({pain:0,moving:0,manipulation:0,talking:0,hearing:0,consciousnessFactor:1,consciousnessMax:Infinity,partOffsets:Object.freeze([] as {part:BodyPartId;offset:number}[])});
export function animalAgeConditionEffects256(record:AnimalAgeMedical256){
 if(!record.animalAgeConditions?.cases.length)return NO_EFFECTS;
 const partOffsets:{part:BodyPartId;offset:number}[]=[],out={pain:0,moving:0,manipulation:0,talking:0,hearing:0,consciousnessFactor:1,consciousnessMax:Infinity,partOffsets};
 for(const c of record.animalAgeConditions?.cases??[]){const stage=animalConditionStage256(c.kind,c.severity);if(stage.partOffset)partOffsets.push({part:c.part,offset:f(stage.partOffset)});if(!c.noPain)out.pain=f(out.pain+f(stage.pain??0));out.moving=f(out.moving+f(stage.moving??0));out.manipulation=f(out.manipulation+f(stage.manipulation??0));out.talking=f(out.talking+f(stage.talking??0));out.hearing=f(out.hearing+f(stage.hearing??0));out.consciousnessFactor=f(out.consciousnessFactor*f(stage.consciousnessFactor??1));out.consciousnessMax=Math.min(out.consciousnessMax,stage.consciousnessMax??Infinity);}
 return out;
}
