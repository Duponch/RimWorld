import type { Cell } from './types.ts';
import type { MechanoidKind } from './mechanoid-definition.ts';

export interface MechanoidRaidPolicy {
  adoptedAt:number;
  rng:number;
  lastFaction?:'outlaws'|'mechanoid';
  ranged?:{adoptedAt:number};
}
export interface MechanoidRaidComposition { budget:number;roster:MechanoidKind[] }
/** Mechanical raids share the existing agenda, without human retreat state. */
export interface MechanoidRaidGroup {
  id:number;startedAt:number;members:number[];lost:number[];
  phase:'staging'|'assault';
  stage:{point:Cell;activatedAtCore:number;delayCore:number};
  composition:MechanoidRaidComposition;
}
