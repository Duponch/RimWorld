import type { World } from './types.ts';
import { TICKS_PER_DAY } from './types.ts';

/** Civil time is distinct from elapsed time. Historical worlds retain midnight;
 * the versioned new-game profile arrives at 06:00 without aging any state. */
export function calendarTick(world: Pick<World, 'tick' | 'gameProfile'>, tick = world.tick): number {
  return tick + (world.gameProfile ? TICKS_PER_DAY / 4 : 0);
}
