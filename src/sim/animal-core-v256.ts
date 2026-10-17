import {trackedAnimalLifeStage256} from './animal-growth-runtime-256.ts';
import {CORE_ANIMAL_DATA_256,CORE_ANIMAL_LIFE_STAGES_256,CORE_ANIMAL_IDS_256,type AnimalSpeciesId256} from './animal-core-data-v256.ts';
import {TICKS_PER_DAY} from './types.ts';
export {CORE_ANIMAL_IDS_256};
export const ANIMAL_SPECIES_IDS_256=Object.freeze(Object.values(CORE_ANIMAL_IDS_256));
export const isAnimalSpecies256=(id:unknown):id is AnimalSpeciesId256=>typeof id==='string'&&Object.hasOwn(CORE_ANIMAL_DATA_256,id);
export const animalCore256=(id:AnimalSpeciesId256)=>CORE_ANIMAL_DATA_256[id];
export type AnimalLifeStageDef256=keyof typeof CORE_ANIMAL_LIFE_STAGES_256;
const YEAR=60*TICKS_PER_DAY;
export function animalLifeStageData256(id:AnimalSpeciesId256,ageTicks:number,growth?:number){
 if(growth!==undefined)return trackedAnimalLifeStage256(id,{value:growth});
 if(!Number.isSafeInteger(ageTicks)||ageTicks<0)throw Error('Invalid animal age.');
 const stages=animalCore256(id).lifeStages;let selected:typeof stages[number]=stages[0]!;for(const row of stages){if(ageTicks<Math.round(row.minAgeYears*YEAR))break;selected=row;}
 return {definition:selected.defId,minimumAgeTicks:Math.round(selected.minAgeYears*YEAR),...CORE_ANIMAL_LIFE_STAGES_256[selected.defId]};
}
export const animalStageAgeTicks256=(id:AnimalSpeciesId256,stage:'juvenile'|'adult'):number=>{
 const stages=animalCore256(id).lifeStages,row=stage==='juvenile'?stages[1]:stages.at(-1);if(!row)throw Error('Missing animal life stage.');return Math.round(row.minAgeYears*YEAR);
};
export const animalBodySize256=(id:AnimalSpeciesId256,ageTicks:number,growth?:number)=>animalCore256(id).race.baseBodySize*animalLifeStageData256(id,ageTicks,growth).bodySizeFactor;
/** FoodMax uses body size and its own life-stage factor, not health scale. */
export const animalNutritionMax256=(id:AnimalSpeciesId256,ageTicks:number,growth?:number)=>animalCore256(id).stats.MaxNutrition*animalBodySize256(id,ageTicks,growth)*animalLifeStageData256(id,ageTicks,growth).foodMaxFactor;
export const animalFoodPerDay256=(id:AnimalSpeciesId256,ageTicks:number,growth?:number)=>animalCore256(id).race.baseHungerRate*1.6*animalLifeStageData256(id,ageTicks,growth).hungerRateFactor;
/** Bare full natural mass. Gear/inventory/missing-part modifiers remain owners. */
export const animalNaturalMass256=(id:AnimalSpeciesId256,ageTicks:number,growth?:number)=>animalCore256(id).stats.Mass*animalBodySize256(id,ageTicks,growth);
/** Confirmed Core Pawn.HealthScale; body size is deliberately separate. */
export const animalHealthScale256=(id:AnimalSpeciesId256,ageTicks:number,growth?:number)=>Math.fround(Math.fround(animalCore256(id).race.baseHealthScale)*Math.fround(animalLifeStageData256(id,ageTicks,growth).healthScaleFactor));
export const animalGestationTicks256=(id:AnimalSpeciesId256):number|undefined=>{const days=animalCore256(id).race.gestationPeriodDays;return days<0?undefined:Math.round(days*TICKS_PER_DAY);};
export const animalComfyRange256=(id:AnimalSpeciesId256)=>({minimum:animalCore256(id).stats.ComfyTemperatureMin,maximum:animalCore256(id).stats.ComfyTemperatureMax});
