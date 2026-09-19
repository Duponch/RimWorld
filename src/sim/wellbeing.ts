import { updateMood,expireMealMemories } from './mood.ts';
export { comfortMood } from './mood.ts';
import type { BodyAssessment } from './body-capacities.ts';
import { TICKS_PER_DAY } from './types.ts';
import type { Pawn, World } from './types.ts';

/** Comfort is a level approaching the furniture's ceiling, not an instant bonus.
 * Normal furniture only until quality/traits are implemented; see dining.md.
 */
export function updateWellbeing(world: World, pawn: Pawn,body?:BodyAssessment): void {
  const need = pawn.need;
  let ceiling = 0;
  if (pawn.state === 'sleeping' && need?.kind === 'sleep' && need.bedId !== null && world.structures.some(item => item.id === need.bedId && item.kind === 'bed' && item.x === pawn.x && item.z === pawn.z)) ceiling = 75;
  if (pawn.state === 'eating' && need?.kind === 'eat' && need.dining?.seatId !== null && need.dining && world.structures.some(item => item.id === need.dining!.seatId && item.kind === 'stool' && item.x === pawn.x && item.z === pawn.z)) ceiling = 50;
  if(pawn.research && pawn.state==='working' && pawn.x===pawn.research.spot.x && pawn.z===pawn.research.spot.z && world.structures.some(s=>s.kind==='stool'&&s.x===pawn.x&&s.z===pawn.z))ceiling=50;
  const perHour = pawn.comfort < ceiling ? 60 : -4;
  pawn.comfort = pawn.comfort < ceiling ? Math.min(ceiling, pawn.comfort + perHour * 24 / TICKS_PER_DAY)
    : Math.max(ceiling, pawn.comfort + perHour * 24 / TICKS_PER_DAY);
  expireMealMemories(world,pawn);
  updateMood(world,pawn,body);
}

export function rememberMeal(world: World, pawn: Pawn, atTable: boolean, raw = false): void {
  // A good meal does not erase earlier memories; repeated meals refresh one entry.
  const kinds = [...(!atTable ? ['ate-without-table' as const] : []), ...(raw ? ['ate-raw-food' as const] : [])];
  pawn.memories = [...pawn.memories.filter(memory => !kinds.includes(memory.kind)), ...kinds.map(kind => ({kind, expiresAt: world.tick + TICKS_PER_DAY}))];
}
