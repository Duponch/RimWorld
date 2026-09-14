import { validSchedule } from './schedule.ts';
import type { World } from './types.ts';

export function validateSchedules(world: World, version: number): string[] {
  if (version < 12) return world.restRules !== undefined || world.pawns.some(p => p.schedule !== undefined || p.restZeroTicks !== undefined || p.collapsePending !== undefined)
    ? ['Legacy save contains schedule fields.'] : [];
  const errors: string[] = [];
  if (world.restRules !== 'legacy' && world.restRules !== 'adult') errors.push('Invalid rest rules profile.');
  for (const pawn of world.pawns) {
    if (!validSchedule(pawn.schedule) || version<15&&pawn.schedule.includes('recreation')) errors.push('Invalid 24-hour pawn schedule.');
    if (!Number.isInteger(pawn.restZeroTicks) || pawn.restZeroTicks < 0 || pawn.restZeroTicks > 4500 || typeof pawn.collapsePending !== 'boolean'
      || (pawn.collapsePending && (pawn.rest >= 0.01 || pawn.restZeroTicks <= 100 || pawn.need?.kind === 'sleep'))
      || (world.restRules === 'legacy' && (pawn.restZeroTicks !== 0 || pawn.collapsePending))) errors.push('Invalid exhaustion continuation.');
  }
  return errors;
}

export function initializeSchedules(world: World): void {
  (world as unknown as {schemaVersion: number}).schemaVersion = 12; world.restRules = 'legacy';
  // Existing games retain their old fatigue economy and unplanned day. No task,
  // position, need, food, RNG or ownership is changed at load time.
  for (const pawn of world.pawns) { pawn.schedule = Array.from({length: 24}, () => 'anything'); pawn.restZeroTicks = 0; pawn.collapsePending = false; }
}
