import {INITIAL_ANIMAL_FACTS_256} from './initial-animal-data-256.ts';
import {ANIMAL_BIRTHDAY_KINDS_256,animalBirthdayChance256} from './animal-age-condition-data-256.ts';
import {tryApplyAnimalAgeCondition256} from './animal-birthday-application-256.ts';
import {animalClinicalRandom256} from './animal-condition-medical-frontier-256.ts';
import {createAnimalMedicalRecord256} from './animal-clinical-age-v256.ts';
import type {ActualAnimalMind256} from './animal-condition-mental-state-256.ts';
import type {MedicalRandom} from './injury-types.ts';
const facts=new Map(Object.values(INITIAL_ANIMAL_FACTS_256).map(f=>[f.species,f]));
/** Called immediately after the ACTUAL one-age operation. The current owner
 * advances ten Core ticks at one confirmed local boundary: birthday timing
 * retains that explicit quantization, not fictitious intra-step timestamps.
 * Only originals that really constructed this mind gain this producer. */
export function applyLiveAnimalBirthday256(world:{schemaVersion:number;tick:number},a:ActualAnimalMind256,previousAgeCore:number,draw:MedicalRandom):void {
 if(world.schemaVersion<256||!a.wander||!a.growthTracker||a.state==='dead'||a.health?.death)return;
 const age=a.ageTicks*10+(a.ageCoreRemainder??0);
 if(!Number.isSafeInteger(previousAgeCore)||previousAgeCore<0||age<previousAgeCore||age-previousAgeCore>10)throw Error('Birthday requires its actual biological operation');
 const from=Math.floor(previousAgeCore/3600000),to=Math.floor(age/3600000);if(from===to)return;
 const fact=facts.get(a.species);if(!fact)throw Error('Original birthday lacks actual native definition');
 const random=animalClinicalRandom256(draw),fraction=Math.fround(Math.fround(to)/Math.fround(fact.lifeExpectancy));
 for(const kind of ANIMAL_BIRTHDAY_KINDS_256){if(!(random.value()<animalBirthdayChance256(kind,fraction)))continue;
  const record=a.health??createAnimalMedicalRecord256(world,a,Math.max(0,world.tick-1)),result=tryApplyAnimalAgeCondition256(record,kind,random);
  if(result.status==='blocked')throw Error('Actual birthday native anatomy is unavailable');
  if(result.status==='applied'){for(const c of result.added)c.bornAt=world.tick;a.health=record;}
 }
 // No initial-generation severity simulation, medical catch-up, tending,
 // health repair or replay of earlier birthday years is performed here.
}
