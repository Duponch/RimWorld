import {medicalCivilTick271,medicalCivilCore271,validMedicalCivilHeader271} from './suspended-human-clock-271.ts';
import type {MedicalRecord,MedicalRandom} from './injury-types.ts';
import type {VomitState} from './food-poisoning.ts';
import {groupPawnInterval256} from './group-core-cadence-256.ts';
import {animalConditionMtbEvent256} from './animal-age-condition-runtime-256.ts';
import {tryApplyAnimalAgeCondition256} from './animal-birthday-application-256.ts';
import {assessMedical} from './injury-state.ts';
import type {InitialAnimalRandom256} from './initial-animal-age-256.ts';
const f=Math.fround;
export interface ToxicBuildup256 {severity:number;bornAt:number;vomit?:VomitState;rotOnDeath?:boolean;vomitRequestedAt?:number}
const integer=(v:unknown,min=0):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min;
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const data=(v:object,k:PropertyKey)=>{const d=Object.getOwnPropertyDescriptor(v,k);return d&&'value'in d&&d.enumerable?d:undefined;};
const exact=(v:Record<string,unknown>,keys:readonly string[])=>Reflect.ownKeys(v).every(k=>typeof k==='string'&&keys.includes(k)&&!!data(v,k));
export function toxicStage256(severity:number){
 return severity>=f(.8)?{offset:f(-.25),max:f(.1),vomit:.5,dementia:13,carcinoma:39}:severity>=f(.6)?{offset:f(-.25),max:Infinity,vomit:1,dementia:37,carcinoma:111}:severity>=f(.4)?{offset:f(-.15),max:Infinity,vomit:5,dementia:146,carcinoma:438}:severity>=f(.2)?{offset:f(-.1),max:Infinity,vomit:0,dementia:0,carcinoma:0}:severity>=f(.04)?{offset:f(-.05),max:Infinity,vomit:0,dementia:0,carcinoma:0}:{offset:0,max:Infinity,vomit:0,dementia:0,carcinoma:0};
}
/** Absence remains literal. Header descriptors are checked before any field
 * access; the actual owner supplies its clinical clock and episode frontier. */
export function validToxicBuildupHeader256(record:unknown,version:number,mechanical=false):boolean {
 if(!record||typeof record!=='object'||!validMedicalCivilHeader271(record,version,!Object.hasOwn(record,'body')))return false;
 const desc=Object.getOwnPropertyDescriptor(record,'toxicBuildup');if(!desc)return !('toxicBuildup'in record);
 if(version<256||mechanical||!('value'in desc)||!desc.enumerable||!plain(desc.value))return false;
 const t=desc.value;if(!exact(t,['severity','bornAt','vomit','rotOnDeath','vomitRequestedAt'])||!data(t,'severity')||!data(t,'bornAt')||typeof t.severity!=='number'||!Number.isFinite(t.severity)||f(t.severity)!==t.severity||t.severity<0||!integer(t.bornAt))return false;
 const tick=data(record,'tick'),death=data(record,'death');if(!tick||!integer(tick.value)||t.bornAt>tick.value||t.severity===0&&!Object.hasOwn(t,'vomit'))return false;
 if(Object.hasOwn(t,'rotOnDeath')&&(typeof t.rotOnDeath!=='boolean'||!death||!plain(death.value)))return false;
 if(Object.hasOwn(t,'vomitRequestedAt')&&(!integer(t.vomitRequestedAt)||t.vomitRequestedAt>medicalCivilTick271(record as MedicalRecord)*10||death))return false;
 if(Object.hasOwn(t,'vomit')){
  const v=t.vomit;if(death||!plain(v)||!exact(v,['remainingCore','cell'])||!data(v,'remainingCore')||!integer(v.remainingCore,1)||v.remainingCore>899||!data(v,'cell')||!plain(v.cell)||!exact(v.cell,['x','z'])||!data(v.cell,'x')||!data(v.cell,'z')||!integer(v.cell.x)||!integer(v.cell.z))return false;
  for(const key of ['foodPoisoning','flu','cryptosleepSickness']){const other=data(record,key);if(other&&plain(other.value)&&Object.hasOwn(other.value,'vomit'))return false;}
  const immune=data(record,'immuneDiseases');if(immune&&plain(immune.value)){const malaria=data(immune.value,'malaria');if(malaria&&plain(malaria.value)&&Object.hasOwn(malaria.value,'vomit'))return false;}
 }
 return true;
}
/** Called after the real anatomical hit, before the same private transaction
 * commits. totalDamage is the worker's capped post-armor sum, never tool power. */
export function applyToxicBite256(record:MedicalRecord,totalDamage:number,bodySize:number,resistance:number,random:MedicalRandom,huntingForFood=false):void {
 if(!Number.isFinite(totalDamage)||totalDamage<0||!Number.isFinite(bodySize)||bodySize<=0||!Number.isFinite(resistance))throw Error('Invalid actual toxic bite');
 if(record.death||huntingForFood)return;
 let dose=f(f(totalDamage)*f(.015));dose=f(dose*f(1/f(bodySize)));dose=f(dose*Math.max(f(1-f(resistance)),0));
 // PostApplyDamage makes the actual hediff even when resistance makes0.
 // PostMake's noPain Value is real; the constant1 immunizable range draws0.
 const noPain=random();if(!Number.isFinite(noPain)||noPain<0||noPain>=1)throw Error('Invalid hediff creation draw');
 const old=record.toxicBuildup,severity=f(f(old?.severity??0)+dose);
 if(!Number.isFinite(severity))throw Error('Toxic severity exhausted');
 if(severity===0&&!old?.vomit)return;
 if(old){old.severity=severity;old.bornAt=record.tick;}else record.toxicBuildup={severity,bornAt:record.tick};
}
/** ONE completed unsuspended Core interval, on the record's true owner clock.
 * Chronic risks use the single shared condition producer and persisted cases. */
export function advanceToxicBuildupCore256(record:MedicalRecord,id:number,atCore:number,random:InitialAnimalRandom256,physical:{spawned:boolean;awake:boolean}):void {
 const t=record.toxicBuildup;if(!t||record.death)return;
 const stage=toxicStage256(t.severity);
 if(groupPawnInterval256(id,medicalCivilCore271(record,atCore),60,1)){
  if(stage.dementia&&animalConditionMtbEvent256(stage.dementia,60,random)){const r=tryApplyAnimalAgeCondition256(record,'Dementia',random);if(r.status==='blocked')throw Error('Unrepresented actual toxic Dementia victim');}
  if(stage.carcinoma&&animalConditionMtbEvent256(stage.carcinoma,60,random)){const r=tryApplyAnimalAgeCondition256(record,'Carcinoma',random);if(r.status==='blocked')throw Error('Unrepresented actual toxic Carcinoma victim');}
 }
 // Same stage and order as Hediff.TickInterval, before Immunizable's comp.
 // A rejected Spawned/Awake trial creates NO future wake-up intention.
 if(stage.vomit&&groupPawnInterval256(id,medicalCivilCore271(record,atCore),600,1)&&animalConditionMtbEvent256(stage.vomit,600,random)&&physical.spawned&&physical.awake&&assessMedical(record).canBeAwake)t.vomitRequestedAt=medicalCivilCore271(record,atCore);
 if(groupPawnInterval256(id,medicalCivilCore271(record,atCore),200,1))t.severity=Math.max(0,f(t.severity+f(f(-.08)*f(.0033333334))));
 if(!t.severity&&!t.vomit)delete record.toxicBuildup;
}
/** This is a physical-owner commit operation. Read/load/validation never call
 * it. Explosive outcomes supply their staged RNG only after capacity preflight. */
export function commitToxicDeath256(record:MedicalRecord,random:MedicalRandom):void {
 const t=record.toxicBuildup;if(!record.death||!t||Object.hasOwn(t,'rotOnDeath'))return;
 // Severity0 can retain only the pre-existing physical job in this product's
 // illness carrier. The systemic hediff is gone: no terminal poison roll.
 if(t.severity===0){delete record.toxicBuildup;return;}
 const roll=random();if(!Number.isFinite(roll)||roll<0||roll>=1)throw Error('Invalid toxic corpse draw');
 t.rotOnDeath=roll<t.severity;delete t.vomit;delete t.vomitRequestedAt;
}
export function cancelToxicVomit256(record:MedicalRecord):void {const t=record.toxicBuildup;if(!t)return;delete t.vomit;delete t.vomitRequestedAt;if(!t.severity)delete record.toxicBuildup;}
export const toxicVomitChance256=(state:ToxicBuildup256|undefined)=>state&&state.severity>0&&toxicStage256(state.severity).vomit?600/(toxicStage256(state.severity).vomit*60000):0;
