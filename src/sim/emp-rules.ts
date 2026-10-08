/** Core EMP damage is non-lethal. Quality changes the dose before the stunner
 * converts it to thirty reference-time ticks per point. */
export const EMP_ADAPTATION_CORE_TICKS=2200;
export const EMP_MAX_STUN_CORE_TICKS=2250;
export const EMP_DAMAGE_AMOUNTS=[45,50,62,75] as const;
export function empStunDuration(damage:number):number {
  return (EMP_DAMAGE_AMOUNTS as readonly number[]).includes(damage)?damage*30:0;
}
