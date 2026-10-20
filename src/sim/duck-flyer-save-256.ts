import {validToxicBuildupTransport256} from './toxic-buildup-save-256.ts';
import {validCaravanRestField266} from './caravan-rest-state-266.ts';
import {validAnimalMindFields256} from './animal-condition-mental-state-256.ts';
import {hasCryptosleepSickness256} from './cryptosleep-sickness-256.ts';
import {validArrivalRotation256} from './arrival-rotation-256.ts';
import {validAnimalAgeCoreRemainder256} from './initial-animal-age-owner-256.ts';
import {MAX_WILDLIFE,type WildAnimal} from './wildlife-state.ts';
import {animalSpecies} from './animal-species.ts';
import {animalNutritionMax} from './animal-life.ts';
import {validDuckFlightFields256} from './duck-flight-save-256.ts';
import {validAnimalEggState256} from './animal-egg-save-v256.ts';
import {validateMedicalRecord} from './injury-validation.ts';
import {validAnimalClinicalOwner256} from './animal-clinical-age-v256.ts';
import {medicalStatus} from './injury-state.ts';
import {validStagger} from './stagger.ts';
import {validStunShape} from './melee-save.ts';
import type {World} from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const finite=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>required.every(k=>Object.hasOwn(v,k))&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&(required.includes(k)||optional.includes(k)));
/** Only this small physical owner tree, no World/tiles walker or mutable cache.
 * All descriptors are admitted before any biological validator reads fields. */
function heldData(v:unknown,seen=new Set<object>()):boolean {
 if(v===null||typeof v==='string'||typeof v==='boolean')return true;if(typeof v==='number')return Number.isFinite(v);if(typeof v!=='object'||seen.has(v))return false;
 const array=Array.isArray(v),prototype=Object.getPrototypeOf(v);if(prototype!==(array?Array.prototype:Object.prototype)&&!(prototype===null&&!array))return false;
 seen.add(v);const own=Reflect.ownKeys(v);if(array&&own.length!==v.length+1)return false;
 for(const k of own){if(typeof k!=='string')return false;const desc=Object.getOwnPropertyDescriptor(v,k)!;if(!('value'in desc))return false;if(array&&k==='length')continue;if(!desc.enumerable||array&&(!/^(0|[1-9]\d*)$/.test(k)||Number(k)>=v.length)||!heldData(desc.value,seen))return false;}
 seen.delete(v);return true;
}
export function validDuckExitFlight256(a:WildAnimal,version:number,tick:number):boolean {
 const desc=Object.getOwnPropertyDescriptor(a,'exitFlight');if(!desc)return true;if(!('value'in desc)||!desc.enumerable||version<256||a.species!=='duck'||!heldData(desc.value))return false;const e:unknown=desc.value;
 return object(e)&&keys(e,['revision','startedAtCore','readyAtCore'])&&e.revision===1&&int(e.startedAtCore,0,tick*10)&&int(e.readyAtCore,e.startedAtCore,e.startedAtCore+9)&&!a.domestic&&!a.manhunter&&!a.exiting&&!a.flee&&!a.predation&&!a.meal&&!a.mating&&!a.eggLay&&!a.animalRest&&!a.motion&&Array.isArray(a.path)&&!a.path.length&&a.state==='idle';
}
type FlyerWorld=Pick<World,'tick'|'width'|'height'|'nextId'|'wildlife'>&Partial<Pick<World,'piles'|'packed'>>;
/** Owner references only; descriptors precede the new incoming-content read.
 * Other pile/pack semantics stay with their existing full validators. */
function incomingInventoryOwners(w:FlyerWorld):Set<number>|undefined {
 const result=new Set<number>();
 for(const list of [w.piles,w.packed]){
  if(list===undefined)continue;if(!Array.isArray(list))return;
  for(let i=0;i<list.length;i++){
   const row=Object.getOwnPropertyDescriptor(list,String(i));if(!row||!('value'in row)||!object(row.value))return;
   const owner=Object.getOwnPropertyDescriptor(row.value,'owner');if(!owner||!('value'in owner)||!object(owner.value))return;
   const type=Object.getOwnPropertyDescriptor(owner.value,'type');if(!type||!('value'in type))return;
   if(type.value!=='inventory')continue;
   const id=Object.getOwnPropertyDescriptor(owner.value,'pawnId');if(!id||!('value'in id)||!int(id.value,1,w.nextId-1))return;
   result.add(id.value);
  }
 }
 return result;
}
function validHeldDuck(w:FlyerWorld,a:unknown,personalTick:number,incoming:boolean,version:number):a is WildAnimal {
 if(!object(a)||!validCaravanRestField266(a,version,personalTick)||!validAnimalMindFields256(a,256,personalTick,w.width,w.height,false)||!validArrivalRotation256(a,256)||!validAnimalAgeCoreRemainder256(a,256,personalTick)||Object.hasOwn(a,'caravanCarrySick')&&typeof a.caravanCarrySick!=='boolean'||!keys(a,['id','species','sex','x','z','ageTicks','food','rest','state','path','nextDecision'],['parents','health','eggLayer','stagger','stun','strike','sleepUntilCore','ageCoreRemainder','caravanCarrySick','growthTracker','arrivalRotation','wander','confusion',...(version>=266?['caravanRest']:[])])||a.species!=='duck'||!int(a.id,1,w.nextId-1)||!['female','male'].includes(String(a.sex))||!int(a.x,0,w.width-1)||!int(a.z,0,w.height-1)||!int(a.ageTicks)||!finite(a.food,0,a.growthTracker?animalNutritionMax(a as unknown as WildAnimal):animalSpecies('duck').nutrition)||!finite(a.rest,0,1)||a.state!=='idle'||!Array.isArray(a.path)||a.path.length||!int(a.nextDecision,0,personalTick+100))return false;
 if(hasCryptosleepSickness256(a.health))return false;
 const animal=a as unknown as WildAnimal;if(!validToxicBuildupTransport256(animal,256,personalTick))return false;if(!validDuckFlightFields256(animal,256,personalTick)||!validAnimalEggState256(animal,256,{...w,tick:personalTick}))return false;
 if(a.parents!==undefined&&(!object(a.parents)||!keys(a.parents,['motherId','fatherId'])||!int(a.parents.motherId,1,a.id-1)||!int(a.parents.fatherId,1,a.id-1)||a.parents.motherId===a.parents.fatherId))return false;
 if(a.health!==undefined&&(validateMedicalRecord(a.health,true,true,false,false,true,true,true,true,true,true,true,256)||!validAnimalClinicalOwner256(animal.health!,'duck',animal.ageTicks,personalTick)||animal.health!.tick!==personalTick||medicalStatus(animal.health!)!=='mobile'))return false;
 if(!validStagger(a.stagger,256,personalTick)||!validStunShape(a.stun,256,personalTick,420)||a.sleepUntilCore!==undefined&&!int(a.sleepUntilCore,personalTick*10+1,personalTick*10+1000))return false;
 const strike=a.strike;if(strike!==undefined&&(!object(strike)||!keys(strike,['targetId','atCore','untilCore','tool','outcome'],['structure'])||!(int(strike.targetId,1,w.nextId-1)||strike.targetId===null&&strike.structure===undefined)||!int(strike.atCore,0,personalTick*10)||!int(strike.untilCore,personalTick*10+1)||!['hit','miss','dodge'].includes(String(strike.outcome))||!animalSpecies('duck').melee.some(t=>t.id===strike.tool&&t.cooldownCore===Number(strike.untilCore)-Number(strike.atCore))||strike.structure!==undefined&&(!object(strike.structure)||!keys(strike.structure,['x','z'])||!int(strike.structure.x,0,w.width-1)||!int(strike.structure.z,0,w.height-1)||strike.outcome!=='hit')))return false;
 // Exact current incoming producer. An injured leaving owner above is admitted;
 // no dossier is erased to transform it into a permitted incoming record.
 return !incoming||!Object.hasOwn(a,'health')&&!Object.hasOwn(a,'flight')&&!Object.hasOwn(a,'stagger')&&!Object.hasOwn(a,'stun')&&!Object.hasOwn(a,'strike')&&!Object.hasOwn(a,'sleepUntilCore')&&!Object.hasOwn(a,'caravanRest');
}
/** Adds holder AND original IDs only after the whole local proposal is valid. */
export function validateDuckFlyers256(w:FlyerWorld,version:number,ids?:{has(id:number):boolean;add(id:number):unknown}):string[] {
 const s=w.wildlife;if(!s)return [];const desc=Object.getOwnPropertyDescriptor(s,'flyers');if(!desc)return [];if(version<256||!('value'in desc)||!desc.enumerable||!heldData(desc.value)||!Array.isArray(desc.value)||desc.value.length+(s.animals?.length??0)>MAX_WILDLIFE)return ['Invalid or future Duck flyer owner'];
 const incoming=desc.value.some(f=>object(f)&&f.kind==='arrival')?incomingInventoryOwners(w):new Set<number>();if(!incoming)return ['Invalid incoming Duck content owner'];
 if(!Array.isArray(s.animals))return ['Invalid spawned Duck owner list'];
 const found=new Set<number>(),spawned=new Set<number>();
 for(let i=0;i<s.animals.length;i++){const d=Object.getOwnPropertyDescriptor(s.animals,String(i)),a=d&&'value'in d?d.value:undefined;if(!object(a))return ['Invalid spawned Duck identity'];const id=Object.getOwnPropertyDescriptor(a,'id');if(!id||!('value'in id)||!int(id.value,1,w.nextId-1)||spawned.has(id.value))return ['Invalid spawned Duck identity'];spawned.add(id.value);}
 for(const value of desc.value){if(!object(value)||!keys(value,['revision','id','kind','cell','startedAtCore','atCore','totalCore','remainingCore','personalTick','animal'],value.kind==='arrival'?['roofHit']:['flipped'])||value.revision!==1||!['arrival','leaving'].includes(String(value.kind))||!int(value.id,1,w.nextId-1)||!object(value.cell)||!keys(value.cell,['x','z'])||!int(value.cell.x,0,w.width-1)||!int(value.cell.z,0,w.height-1)||!int(value.startedAtCore,0,w.tick*10)||value.atCore!==w.tick*10||!int(value.totalCore,value.kind==='arrival'?600:220,value.kind==='arrival'?650:220)||!int(value.remainingCore,0,value.totalCore)||value.remainingCore!==Math.max(0,value.totalCore-(w.tick*10-value.startedAtCore))||!int(value.personalTick,0,w.tick)||value.personalTick*10!==value.startedAtCore||!validHeldDuck(w,value.animal,value.personalTick,value.kind==='arrival',version)||value.animal.x!==value.cell.x||value.animal.z!==value.cell.z||value.id===value.animal.id)return ['Invalid Duck flyer state'];
  if(value.kind==='arrival'&&incoming.has(value.animal.id))return ['Unexpected contents on exact incoming Duck producer'];
  if(value.kind==='arrival'?(typeof value.roofHit!=='boolean'||value.roofHit&&value.remainingCore>15):typeof value.flipped!=='boolean')return ['Invalid Duck flyer phase'];
  for(const id of [value.id,value.animal.id]){if(found.has(id)||spawned.has(id)||ids?.has(id))return ['Duplicate Duck flyer physical owner'];found.add(id);}
 }
 if(!Number.isSafeInteger((s.exitedAnimals??0)+desc.value.filter(f=>f.kind==='leaving').length))return ['Duck exit counter budget exhausted'];
 for(const id of found)ids?.add(id);return [];
}
