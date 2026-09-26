import type { MedicalCare, TendMedicine } from './medicine-rules.ts';
import type { Cell } from './types.ts';

/** V106 covers the obtainable hare only. No historical animal changes faction. */
export interface DomesticAnimal {
  since:number;
  care:MedicalCare;
  tameness:number;
  nextDecay:number;
  lastTraining?:number;
}
export interface TamingDesignation { designated:boolean; lastAttempt?:number }
export interface AnimalHandlingTask {
  animalId:number;
  kind:'tame'|'maintain';
  sourcePileId:number;
  carryPileId:number|null;
  quantity:number;
  phase:'pickup'|'approach'|'interact';
  step:number;
  progress:number;
}
export interface AnimalCareTask {
  animalId:number;
  spot:Cell;
  phase:'pickup'|'approach'|'treat';
  progress:number;
  duration?:number;
  medicine?:TendMedicine;
}
export type DomesticCommand =
  | {type:'tame';animalId:number;enabled:boolean}
  | {type:'animal-care-policy';animalId:number;care:MedicalCare};
