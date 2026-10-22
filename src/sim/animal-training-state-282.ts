/** Prospective skills on the original animal. Tameness steps remain on the
 * existing domestic owner; no migration installs this tracker. */
export const ANIMAL_TRAINING_SKILLS_282=Object.freeze(['tameness','obedience','haul'] as const);
export type AnimalTrainingSkill282=typeof ANIMAL_TRAINING_SKILLS_282[number];
export type AnimalTrainable282=AnimalTrainingSkill282;
export interface AnimalTrainingProgress282 {steps:number;learned:boolean;wanted:boolean}
export interface AnimalTrainingState282 {
 revision:1;
 sinceCore:number;
 lastLocalCore:number;
 /** The ONE active decay deadline. domestic.nextDecay is retained history. */
 nextDecayCore:number;
 tamenessWanted:boolean;
 /** An explicit zero overrides the immutable starting-pet birth receipt. */
 obedience?:AnimalTrainingProgress282;
 haul?:AnimalTrainingProgress282;
 /** Factual start of the last final attempt, including a failed attempt. */
 lastAttemptCore?:number;
 masterId?:number;
 lastHaulCheckCore?:number;
}
export interface AnimalTrainingRead282 extends Readonly<AnimalTrainingProgress282> {readonly maxSteps:number}
export interface AnimalTrainingAdvance282 {becameWild:boolean;decayed?:AnimalTrainingSkill282}
export const ANIMAL_TRAINING_LABELS_282=Object.freeze({tameness:'Apprivoisement',obedience:'Obéissance',haul:'Transport'} as const);
export const ANIMAL_TRAINING_STEPS_282=Object.freeze({tameness:5,obedience:3,haul:7} as const);
/** Core units, independent of the ten-Core local simulation step. */
export const ANIMAL_TRAINING_INTERVAL_CORE_282=15000;
export const ANIMAL_TRAINING_RARE_CORE_282=250;
export const ANIMAL_TRAINING_CONVERSATION_CORE_282=270;
export const ANIMAL_TRAINING_FINAL_CORE_282=100;
export const ANIMAL_HAUL_CHECK_CORE_282=2500;
export const ANIMAL_HAUL_CHANCE_282=2/3;
export const ANIMAL_TRAINING_MIN_BODY_SIZE_282=Object.freeze({tameness:0,obedience:0,haul:.4} as const);
export const isAnimalTrainingSkill282=(value:unknown):value is AnimalTrainingSkill282=>value==='tameness'||value==='obedience'||value==='haul';
