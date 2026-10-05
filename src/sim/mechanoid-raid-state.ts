import type { Cell } from './types.ts';

export interface MechanoidRaidPolicy {
  adoptedAt:number;
  rng:number;
  lastFaction?:'outlaws'|'mechanoid';
}
export interface MechanoidRaidComposition { budget:number;roster:'scyther'[] }
/** Mechanical raids share the existing agenda, without human retreat state. */
export interface MechanoidRaidGroup {
  id:number;startedAt:number;members:number[];lost:number[];
  phase:'staging'|'assault';
  stage:{point:Cell;activatedAtCore:number;delayCore:number};
  composition:MechanoidRaidComposition;
}
