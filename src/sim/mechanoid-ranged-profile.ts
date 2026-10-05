import type { RevolverProfile } from './ranged-statistics.ts';
import type { MechanoidKind } from './mechanoid-definition.ts';

export type IntrinsicMechGunId='lancer-gun'|'pikeman-gun';
export const LANCER_GUN_PROFILE:Readonly<RevolverProfile>=Object.freeze({quality:'normal',damage:30,armorPenetration:.45,
  accuracy:Object.freeze([.65,.85,.85,.75] as const),range:32.9,warmupCoreTicks:102,cooldownCoreTicks:162,
  projectileTilesPerCoreTick:1.2,stoppingPower:1.5});
export const PIKEMAN_GUN_PROFILE:Readonly<RevolverProfile>=Object.freeze({quality:'normal',damage:15,armorPenetration:.35,
  accuracy:Object.freeze([.60,.80,.90,.85] as const),range:44.9,warmupCoreTicks:150,cooldownCoreTicks:126,
  projectileTilesPerCoreTick:.9,stoppingPower:1.5});
export const mechanoidGunId=(kind:MechanoidKind):IntrinsicMechGunId|undefined=>kind==='lancer'?'lancer-gun':kind==='pikeman'?'pikeman-gun':undefined;
export const mechanoidRangedProfile=(kind:MechanoidKind):Readonly<RevolverProfile>|undefined=>kind==='lancer'?LANCER_GUN_PROFILE:kind==='pikeman'?PIKEMAN_GUN_PROFILE:undefined;
