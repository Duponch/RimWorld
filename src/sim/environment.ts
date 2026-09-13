import { TICKS_PER_DAY } from './types.ts';

/** Fixed site: 45°N at equinox. Outdoor temperature/weather are still a preset.
 * Celestial glow follows the reference's horizon correction, independently of
 * rendered pixels and the artistic ambient light used for night readability. */
export function naturalLight(tick: number): number {
  const hourAngle = (tick % TICKS_PER_DAY / TICKS_PER_DAY - .5) * 2 * Math.PI;
  const altitudeDot = Math.cos(hourAngle) * Math.SQRT1_2;
  const correctedAngle = Math.max(0, Math.acos(altitudeDot) - 23.25 * Math.PI / 180);
  return Math.max(0, Math.min(1, Math.cos(correctedAngle) / .7));
}
export const OUTDOOR_TEMPERATURE = 21;

// Inclusive integer-tick integral. CPU growth remains O(1) per query, regardless
// of elapsed days; no per-tick walk over the forest or permanent growth deltas.
const prefix = new Float64Array(TICKS_PER_DAY + 1);
for (let tick = 1; tick <= TICKS_PER_DAY; tick++) {
  const phase = tick % TICKS_PER_DAY / TICKS_PER_DAY;
  const light = Math.max(0, (naturalLight(tick) - .51) / .49);
  prefix[tick] = prefix[tick - 1]! + (phase >= .25 && phase <= .8 ? light : 0);
}
export function growingLightIntegral(tick: number): number {
  const days = Math.floor(tick / TICKS_PER_DAY), remainder = tick % TICKS_PER_DAY;
  return days * prefix[TICKS_PER_DAY]! + prefix[remainder]!;
}
