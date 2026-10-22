import type {HaulTask} from './types.ts';

/** A real map-local storage service; its single carried pile uses the original
 * animal's existing inventory holder, never a synthetic human. */
export type AnimalStorageHaul282=Omit<HaulTask,'destination'|'whole'|'serviceProgress'>&{
 destination:{type:'stockpile';stockpileId:number};
 startedAtCore:number;
};
/** Failed Near cleanup retains a true holder without reserving the former
 * source/storage or blocking hunger, rest and clinical services. */
export interface AnimalHaulHolding282 {phase:'holding';carryPileId:number;sinceCore:number}
export type AnimalHaulTask282=AnimalStorageHaul282|AnimalHaulHolding282;
