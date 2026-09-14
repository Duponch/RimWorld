import { recreationMood } from './recreation-rules.ts';
import { TICKS_PER_DAY } from './types.ts';
import type { Pawn, World } from './types.ts';

/** Comfort is a level approaching the furniture's ceiling, not an instant bonus.
 * Normal furniture only until quality/traits are implemented; see dining.md.
 */
export function updateWellbeing(world: World, pawn: Pawn): void {
  const need = pawn.need;
  let ceiling = 0;
  if (pawn.state === 'sleeping' && need?.kind === 'sleep' && need.bedId !== null && world.structures.some(item => item.id === need.bedId && item.kind === 'bed' && item.x === pawn.x && item.z === pawn.z)) ceiling = 75;
  if (pawn.state === 'eating' && need?.kind === 'eat' && need.dining?.seatId !== null && need.dining && world.structures.some(item => item.id === need.dining!.seatId && item.kind === 'stool' && item.x === pawn.x && item.z === pawn.z)) ceiling = 50;
  const perHour = pawn.comfort < ceiling ? 60 : -4;
  pawn.comfort = pawn.comfort < ceiling ? Math.min(ceiling, pawn.comfort + perHour * 24 / TICKS_PER_DAY)
    : Math.max(ceiling, pawn.comfort + perHour * 24 / TICKS_PER_DAY);
  if (pawn.memories.some(memory => memory.expiresAt <= world.tick)) pawn.memories = pawn.memories.filter(memory => memory.expiresAt > world.tick);
  // Transitional mood aggregate, explicitly not the full RimWorld mood simulation.
  pawn.mood = Math.max(0, Math.min(100, Math.round(pawn.hunger * 0.6 + pawn.rest * 0.4 + comfortMood(pawn.comfort) + recreationMood(pawn.recreation.level) - pawn.memories.reduce((sum, memory) => sum + (memory.kind === 'ate-raw-food' ? 7 : 3), 0))));
}

export function comfortMood(comfort: number): number {
  return comfort < 10 ? -3 : comfort < 60 ? 0 : comfort < 70 ? 4 : comfort < 80 ? 6 : comfort < 90 ? 8 : 10;
}

export function rememberMeal(world: World, pawn: Pawn, atTable: boolean, raw = false): void {
  // A good meal does not erase earlier memories; repeated meals refresh one entry.
  const kinds = [...(!atTable ? ['ate-without-table' as const] : []), ...(raw ? ['ate-raw-food' as const] : [])];
  pawn.memories = [...pawn.memories.filter(memory => !kinds.includes(memory.kind)), ...kinds.map(kind => ({kind, expiresAt: world.tick + TICKS_PER_DAY}))];
}
