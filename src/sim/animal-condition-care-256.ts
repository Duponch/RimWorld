import {treatmentBatch,type RankedTreatment} from './care-rules.ts';
import {animalConditionStage256} from './animal-age-condition-data-256.ts';
import type {AnimalAgeMedical256} from './animal-age-condition-state-256.ts';
import {HP_UNIT} from './injury-rules.ts';
export type AnimalConditionTreatment256={animalConditionId:number;priority:number;severity:number;injuryId?:never;part?:never;infectionId?:never;flu?:never;disease?:never};
export type ActualAnimalTreatment256=RankedTreatment|AnimalConditionTreatment256;
const isCondition=(t:ActualAnimalTreatment256):t is AnimalConditionTreatment256=>'animalConditionId'in t;
/** Ephemeral treatment selection, never an alias injury/infection ID. The
 * real record is still owned by the same animal and real doctor task. */
export function animalConditionCareTargets256(h:AnimalAgeMedical256):AnimalConditionTreatment256[]{
 if(h.death)return [];const out:AnimalConditionTreatment256[]=[];
 for(const c of h.animalAgeConditions?.cases??[]){if(c.severity<=0||c.kind!=='HeartAttack'&&(!c.tend||c.tend.ticksLeft>=7500))continue;
  out.push({animalConditionId:c.id,priority:animalConditionStage256(c.kind,c.severity).lifeThreatening?1:c.tend?.ticksLeft!==undefined ? .025 : 0,severity:c.severity*HP_UNIT});
 }return out;
}
/** Same first-target and injury batch rules as the existing clinic; asthma's
 * actual tendAllAtOnce adds only other currently tendable asthma originals. */
export function animalConditionTreatmentBatch256(h:AnimalAgeMedical256,targets:readonly ActualAnimalTreatment256[],medicine:boolean):ActualAnimalTreatment256[]{
 const first=targets[0];if(!first)return [];
 if(!isCondition(first))return treatmentBatch(targets.filter((t):t is RankedTreatment=>!isCondition(t)),medicine);
 const selected=h.animalAgeConditions?.cases.find(c=>c.id===first.animalConditionId);if(!selected)return [];
 return selected.kind==='Asthma'?targets.filter(t=>isCondition(t)&&h.animalAgeConditions?.cases.some(c=>c.id===t.animalConditionId&&c.kind==='Asthma')):[first];
}
export function animalConditionMedicineCount256(h:AnimalAgeMedical256,targets:readonly ActualAnimalTreatment256[]):number {
 let left=[...targets],count=0;while(left.length){const batch=new Set(animalConditionTreatmentBatch256(h,left,true));if(!batch.size)throw Error('Actual animal treatment lost its target');left=left.filter(t=>!batch.has(t));count++;}return count;
}
export function animalConditionMedicalRest256(h:AnimalAgeMedical256):boolean {return !h.death&&(animalConditionCareTargets256(h).length>0||!!h.animalAgeConditions?.cases.some(c=>!!c.tend&&c.tend.ticksLeft>0));}
