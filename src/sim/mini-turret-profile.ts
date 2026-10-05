import type { RevolverProfile } from './ranged-statistics.ts';

/** Intrinsic, unqualityable gun. No Item/Pawn stats or learning cycle. */
export const MINI_TURRET_PROFILE:RevolverProfile=Object.freeze({
  quality:'normal',damage:12,armorPenetration:.18,
  accuracy:Object.freeze([.77,.70,.45,.24] as const),range:28.9,
  warmupCoreTicks:0,cooldownCoreTicks:288,projectileTilesPerCoreTick:.70,stoppingPower:.5,
});
export const MINI_TURRET_ACCURACY=.96;
export const MINI_TURRET_BURST_INTERVAL=8;
export const MINI_TURRET_COOLDOWN=288;
