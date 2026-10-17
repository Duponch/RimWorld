import {validAnimalGrowthTracker256,validAnimalGrowthClinicalOwner256} from './animal-growth-runtime-256.ts';
/** An exact remainder, not a second ticking clock. Historical actors retain
 * their existing local integer age and absence; no migration installs it. */
import type {WildAnimal} from './wildlife-state.ts';
import type {MedicalRecord} from './injury-types.ts';
import {INITIAL_ANIMAL_FACTS_256,type InitialAnimalFact256} from './initial-animal-data-256.ts';
import {initialAnimalStage256} from './initial-animal-age-256.ts';
type AgeOwner256=Pick<WildAnimal,'ageTicks'>&{readonly ageCoreRemainder?:number};
export function validAnimalAgeCoreRemainder256(value:unknown,version:number,ownerTick?:number):boolean {
 if(!validAnimalGrowthTracker256(value,version,ownerTick)||!validAnimalGrowthClinicalOwner256(value,version))return false;
 if(!value||typeof value!=='object')return false;const d=Object.getOwnPropertyDescriptor(value,'ageCoreRemainder');if(!d)return true;
 const age=Object.getOwnPropertyDescriptor(value,'ageTicks');
 return version>=256&&Object.hasOwn(d,'value')&&d.enumerable===true&&Number.isInteger(d.value)&&d.value>=0&&d.value<=9&&!!age&&Object.hasOwn(age,'value')&&age.enumerable===true&&Number.isSafeInteger(age.value)&&age.value>=0&&Number.isSafeInteger(age.value*10+d.value);
}
export function actualAnimalBiologicalCoreAge256(animal:AgeOwner256):number {
 if(!Number.isSafeInteger(animal.ageTicks)||animal.ageTicks<0||!validAnimalAgeCoreRemainder256(animal,256))throw Error('Invalid exact biological age owner');
 const age=animal.ageTicks*10+(animal.ageCoreRemainder??0);if(!Number.isSafeInteger(age))throw Error('Core biological age overflow');return age;
}
export const actualAnimalBiologicalYears256=(a:AgeOwner256):number=>Math.floor(actualAnimalBiologicalCoreAge256(a)/3600000);
export const actualAnimalBiologicalYearsFloat256=(a:AgeOwner256):number=>Math.fround(Math.fround(actualAnimalBiologicalCoreAge256(a))/3600000);
const bySpecies=new Map<string,InitialAnimalFact256>(Object.values(INITIAL_ANIMAL_FACTS_256).map(row=>[row.species,row]));
/** Constructor-time reconstruction only. Runtime growth240Core has its own
 * real owner and hunger factor; this is NOT a replacement for that state. */
export function initialStageOfGeneratedAnimal256(a:AgeOwner256&Pick<WildAnimal,'species'>):InitialAnimalFact256['stages'][number] {
 const fact=bySpecies.get(a.species);if(!fact)throw Error('Missing actual generated animal stage definition');return initialAnimalStage256(fact,actualAnimalBiologicalCoreAge256(a));
}
/** Keep MedicalRecord.animalBirthTick integer. The same actual owner supplies
 * its stable remainder at every clinical join, including a retained corpse or
 * a held animal. No health object, epoch or owner is rewritten by this reader. */
export function actualAnimalClinicalBirthCore256(record:Pick<MedicalRecord,'animalBirthTick'>,animal:AgeOwner256):number {
 if(!Number.isSafeInteger(record.animalBirthTick))throw Error('Missing real integer clinical birth anchor');
 actualAnimalBiologicalCoreAge256(animal);const birth=record.animalBirthTick!*10-(animal.ageCoreRemainder??0);if(!Number.isSafeInteger(birth))throw Error('Clinical birth Core overflow');return birth;
}
export function validExactAnimalClinicalAge256(record:{tick:number;death?:{tick:number};animalBirthTick?:number},animal:AgeOwner256,worldTick:number):boolean {
 try {const clinical=record.death?.tick??record.tick;if(!Number.isSafeInteger(worldTick)||!Number.isSafeInteger(clinical)||clinical>worldTick)return false;
  const age=actualAnimalBiologicalCoreAge256(animal)-(record.death?0:(worldTick-clinical)*10);
  return Number.isSafeInteger(age)&&age>=0&&clinical*10-actualAnimalClinicalBirthCore256(record,animal)===age;
 }catch{return false;}
}
