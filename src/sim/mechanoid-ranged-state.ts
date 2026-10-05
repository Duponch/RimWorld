import type { LivingTargetKey } from './combat-target.ts';
export type RangedMechanoidKind='lancer'|'pikeman';
export type IntrinsicMechGunId='lancer-gun'|'pikeman-gun';
export interface MechanoidRangedOrder {
  targetKey:LivingTargetKey;admittedAtCore:number;jobUntilCore:number;
}
interface MechanoidBusyClock {
  targetKey:LivingTargetKey;startedAtCore:number;lastAdvancedAtCore:number;remainingCore:number;
}
export type MechanoidRangedStance=
  | (MechanoidBusyClock&{phase:'warmup';targetStartedDowned:boolean})
  | (MechanoidBusyClock&{phase:'cooldown'});
export interface MechanoidRangedState {order:MechanoidRangedOrder|null;stance:MechanoidRangedStance|null}
/** Stop the voluntary preparation/intention; physical recovery remains owned. */
export function cancelMechanoidRanged(owner:{ranged?:MechanoidRangedState}):void {
  if(owner.ranged?.stance?.phase==='cooldown')owner.ranged.order=null;else delete owner.ranged;
}
