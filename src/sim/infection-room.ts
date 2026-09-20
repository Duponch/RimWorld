import { roomCleanliness } from './filth-room.ts';
import type { Cell,World } from './types.ts';

/** Capture only at the physical treatment. Exterior/doorway have Core's
 * roomless factor; a proper room need not have a roof. */
export function infectionRoomFactor(world:World,cell:Cell):number {
  const average=roomCleanliness(world,cell);if(average===null)return 1000;
  // InfectionChanceFactor (-5,1), (0,.5), (1,.2), clamped at endpoints.
  return Math.round(1000*(average<=-5?1:average<=0?.5-average*.1:average<=1?.5-average*.3:.2));
}
