import type { MedicalCare, TendMedicine } from './medicine-rules.ts';
import type { Cell } from './types.ts';

/** V106 covers the obtainable hare only. No historical animal changes faction. */
export interface DomesticAnimal {
  since:number;
  care:MedicalCare;
  tameness:number;
  nextDecay:number;
  lastTraining?:number;
  /** Marker identity, never a cached set of cells. Roamers alone use pens. */
  penMarkerId?:number;
  /** V120 body product fullness, 0..1. Only milkable/shearable adults carry it. */
  productFullness?:number;
}
export interface TamingDesignation { designated:boolean; lastAttempt?:number }
export interface AnimalHandlingTask {
  animalId:number;
  kind:'tame'|'maintain'|'lead'|'milk'|'shear';
  sourcePileId:number;
  carryPileId:number|null;
  quantity:number;
  phase:'pickup'|'approach'|'interact'|'lead';
  step:number;
  progress:number;
  markerId?:number;
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
