import type { World } from '../sim/types';

const WALKING_SURFACES:ReadonlyMap<number,number>=new Map();

/** Furniture passage stays at ground level. Seat rigs and reserved bed poses
 * supply their own interaction height; piles retain their separate surfaces.
 * Reuse the empty lookup without scanning structures or allocating per snapshot. */
export function furnitureSurfaces(_world:World):ReadonlyMap<number,number> {
  return WALKING_SURFACES;
}
/** Match shared GPU vertical interpolation for explicit interaction poses. */
export function travelHeight(from:number,to:number,alpha:number):number {
  const t=Math.max(0,Math.min(1,from<to?alpha*3:from>to?alpha*3-2:alpha));
  return from+(to-from)*t;
}
