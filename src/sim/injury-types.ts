import type { BodyPartId } from './body-definition.ts';
import type { InjuryKind,ScarPain } from './injury-rules.ts';
import type { InfectionRisk,InfectionState } from './infection-types.ts';

/** Local medical kernel. World ownership and clocks are checked by health-save. */
export interface Injury {
  id:number; part:BodyPartId; kind:InjuryKind;
  /** Milli-HP; no global health bar. */
  severity:number; bornAt:number;
  /** Chosen when wounded; becomes permanent when healing crosses this threshold. */
  scar?:{threshold:number; pain?:ScarPain};
  /** One physical tending result, quality in thousandths. No doctor action here. */
  tended?:number;
  /** Present only if a post-V80 wound passed its initial exposure roll. */
  infection?:InfectionRisk;
}
export interface MissingPart {part:BodyPartId;bornAt:number;tended?:true}
export interface MedicalRecord {
  /** Absent is the historical human profile. Animal ownership is validated. */
  body?:'hare';
  tick:number; nextInjuryId:number;
  injuries:Injury[]; missing:MissingPart[];
  /** BLOOD_UNIT = all blood lost; integral, not a percent. */
  bloodLoss:number;
  /** Whole-body heat exposure, billionths of severity; absent means none. */
  heatstroke?:number;
  hypothermia?:number;
  infections?:InfectionState;
  death?:{tick:number;cause:'execution'|'blood-loss'|'vital-failure'|'trauma'|'heatstroke'|'hypothermia'|'downed'|'infection'};
}
export interface MedicalContext {
  /** Stable phase in [0,59], supplied by the owning actor. */
  phase:number;
  posture:'standing'|'ground'|'bed';
  starving:boolean;
  hunger?:number; rest?:number;
  /** Actual rest, not merely incapacitated on the ground or travelling to bed. */
  restingBonus?:boolean;
  infectionSeed?:number;
}
/** Caller owns and persists its deterministic PRNG; never Math.random. */
export type MedicalRandom=()=>number;
