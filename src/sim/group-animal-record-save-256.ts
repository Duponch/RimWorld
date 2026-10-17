import {isSchema256Or257} from './schema-compatibility-257.ts';
import {validDetachedHiveInsect256} from './cave-hive-save-256.ts';
import {validHiveRuntimeFields256} from './cave-hive-runtime-save-256.ts';
import {validStartingPetHeader256} from './starting-pet-state-256.ts';
import {validToxicBuildupTransport256} from './toxic-buildup-save-256.ts';
import {validAnimalMindFields256} from './animal-condition-mental-state-256.ts';
import {validArrivalRotation256} from './arrival-rotation-256.ts';
import {validAnimalAgeCoreRemainder256} from './initial-animal-age-owner-256.ts';
import {validActorMapBedField256} from './actor-map-bed-256.ts';
import {validRetainedCorpseDamage256} from './retained-corpse-damage-256.ts';
import {validAnimalEggState256} from './animal-egg-save-v256.ts';
import {validAnimalClinicalOwner256} from './animal-clinical-age-v256.ts';
import {animalMechanicalReadiness256} from './animal-readiness-v256.ts';
import {isAnimalSpecies256} from './animal-core-v256.ts';
import {isAnimalSpeciesInVersion,animalSpecies} from './animal-species.ts';
import {validDetachedDomesticAnimal} from './domestic-save.ts';
import {validateMedicalRecord} from './injury-validation.ts';
import {medicalStatus} from './injury-state.ts';
import {validCorpseRot} from './corpse-save.ts';
import {adultAgeTicks,gestationTicks,animalNutritionMax} from './animal-life.ts';
import type {WorldGroupRecord} from './world-map-state.ts';
export interface GroupAnimalRecordContext256 {context:Pick<WorldGroupRecord['context'],'width'|'height'>;tick:number;nextId:number;version:number;mothballedWorldPawn256?:true}
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const finite=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,required:string[],optional:string[]=[])=>required.every(k=>Object.hasOwn(v,k))&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&(required.includes(k)||optional.includes(k)));
const dense=(v:unknown,max:number):v is unknown[]=>Array.isArray(v)&&Object.getPrototypeOf(v)===Array.prototype&&v.length<=max&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>Object.hasOwn(v,i)&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,String(i))!,'value')).every(Boolean);
const animalKeys=['id','species','sex','x','z','food','rest','state','path','nextDecision','health','corpseRot','domestic','ageTicks','parents','pregnancy','manhunter'];
/** Shape only, with true personal clock. No terrain, pathfinder, climate generation or passive advance. */
export function validCaravanAnimalRecord256(a:unknown,c:GroupAnimalRecordContext256):boolean {
 const {nextId,version}=c;if(c.mothballedWorldPawn256&&!isSchema256Or257(version))return false;
 if(!obj(a)||!validDetachedHiveInsect256(a,version,nextId)||!validHiveRuntimeFields256(a,version,c.tick,nextId)||!validStartingPetHeader256(a,version)||!validAnimalMindFields256(a,version,c.tick,c.context.width,c.context.height,false)||!validArrivalRotation256(a,version)||!validAnimalAgeCoreRemainder256(a,version,c.tick)||!keys(a,['id','species','sex','x','z','food','rest','state','path','nextDecision','ageTicks'],[...animalKeys,...(version>=256?['corpseDamage','eggLayer','mapBed','caravanCarrySick','ageCoreRemainder','growthTracker','arrivalRotation','wander','confusion','startingPet','hive','hiveThink']:[])])||!int(a.id,1,nextId-1)||!isAnimalSpeciesInVersion(a.species,version)||!int(a.x,0,c.context.width-1)||!int(a.z,0,c.context.height-1)||!['female','male'].includes(String(a.sex))||!finite(a.food,0,a.growthTracker?animalNutritionMax(a as unknown as import('./wildlife-state.ts').WildAnimal):animalSpecies(a.species).nutrition)||!finite(a.rest,0,1)||!['idle','downed','dead'].includes(String(a.state))||!dense(a.path,0)||!int(a.nextDecision,0,c.tick+100)||!int(a.ageTicks))return false;
 const animal=a as unknown as import('./wildlife-state.ts').WildAnimal,h=animal.health;if(!validToxicBuildupTransport256(animal,version,c.tick))return false;if(a.health!==undefined&&!obj(a.health))return false;
 if(!validActorMapBedField256(animal,version,nextId)||Object.hasOwn(a,'caravanCarrySick')&&typeof a.caravanCarrySick!=='boolean'||!validRetainedCorpseDamage256(animal,version)||!validAnimalEggState256(animal,version,{width:c.context.width,height:c.context.height,nextId,tick:c.tick}))return false;
 if(h&&Object.hasOwn(h,'animalBirthTick')&&!isAnimalSpecies256(animal.species)&&!animal.growthTracker)return false;
 if(isAnimalSpecies256(animal.species)&&!animalMechanicalReadiness256(animal.species).ok||h&&!validAnimalClinicalOwner256(h,animal.species,animal.ageTicks,c.tick))return false;
 if(h?.cryptosleepSickness?.vomit)return false;
 if(h&&(validateMedicalRecord(h,true,true,false,false,true,true,true,true,true,true,true,version)!==null||h.body!==animal.species||(h.death||c.mothballedWorldPawn256?h.tick>c.tick:h.tick!==c.tick)||(medicalStatus(h)==='mobile'?['downed','dead'].includes(animal.state):animal.state!==medicalStatus(h))))return false;
 if(!h&&['downed','dead'].includes(animal.state)||!validDetachedDomesticAnimal(animal,c.tick,nextId,version))return false;
 if(a.corpseRot!==undefined&&(animal.state!=='dead'||!h?.death||!validCorpseRot(a.corpseRot,c.tick,h.death.tick,h)))return false;
 const parents=a.parents;if(parents!==undefined&&(!obj(parents)||!keys(parents,['motherId','fatherId'])||!int(parents.motherId,1,animal.id-1)||!int(parents.fatherId,1,animal.id-1)||parents.motherId===parents.fatherId))return false;
 const pregnancy=a.pregnancy;if(pregnancy!==undefined&&(!obj(pregnancy)||!keys(pregnancy,['fatherId','progress'])||!int(pregnancy.fatherId,1,nextId-1)||pregnancy.fatherId===animal.id||!int(pregnancy.progress,0,gestationTicks(animal.species))||animal.sex!=='female'||animal.ageTicks<adultAgeTicks(animal.species)))return false;
 const m=a.manhunter;return m===undefined||obj(m)&&keys(m,['startedAtCore','rng','zeroRestTicks'],['exhausted'])&&int(m.startedAtCore,0,c.tick*10)&&int(m.rng,1,0xffffffff)&&int(m.zeroRestTicks,0,c.tick*10-m.startedAtCore+150)&&m.zeroRestTicks%150===0&&!animal.domestic&&animal.state==='idle'&&(m.exhausted===undefined||m.exhausted===true&&m.zeroRestTicks>1000&&animal.rest<.0001);
}
