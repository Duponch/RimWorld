import { climateTick } from './site-climate.ts';
import { TICKS_PER_DAY, type Structure, type World } from './types.ts';

export const SUN_LAMP_DEMAND=2900;
export const SUN_LAMP_RADIUS=14;
export const SUN_LAMP_OVERLIGHT_RADIUS=7;
export const SUN_LAMP_HEAT_PER_SECOND=3;

/** Core's strict civil schedule, evaluated on confirmed local ticks rather
 * than rare ticks. A schedule permits startup; it never grants power. */
export function sunLampScheduled(world:Pick<World,'tick'|'climate'|'gameProfile'>,tick=world.tick):boolean {
  const civil=climateTick(world,tick),phase=((civil%TICKS_PER_DAY)+TICKS_PER_DAY)%TICKS_PER_DAY/TICKS_PER_DAY;
  return phase>.25&&phase<.8;
}

/** Also guard readers between a civil-clock mutation and power reconciliation. */
export const sunLampActive=(world:Pick<World,'tick'|'climate'|'gameProfile'>,s:Structure):boolean=>
  s.kind==='sun-lamp'&&!s.breakdown&&!!s.power?.on&&s.power.switchOn!==false&&sunLampScheduled(world);
