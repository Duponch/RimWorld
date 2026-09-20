import { isRoofed } from './roof-rules.ts';
import { weatherAccuracy,weatherMovement } from './weather.ts';
import type { Cell,World } from './types.ts';

/** Departure position, not destination; the resulting factor belongs to the
 * captured movement edge and does not change while the actor traverses it. */
export function weatherMoveFactor(w:World,from:Cell):number {
  return !w.weather||isRoofed(w,from.z*w.width+from.x)?1:weatherMovement(w);
}
/** A shot is sheltered only when both endpoints are roofed. Intermediate
 * uncovered cells and the distance do not change this weather rule. */
export function weatherShotFactor(w:World,shooter:Cell,target:Cell):number {
  return !w.weather||isRoofed(w,shooter.z*w.width+shooter.x)&&isRoofed(w,target.z*w.width+target.x)?1:weatherAccuracy(w);
}
