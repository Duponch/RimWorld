import type { HaulDestination, World } from './types.ts';

/** The zone/cell intent survives regeneration of the bounded automatic job list. */
export function validSowingClearance(world:World,d:HaulDestination):boolean {
  if(d.type!=='aside'||d.growingZoneId===undefined)return true;
  const zone=world.growingZones.find(z=>z.id===d.growingZoneId);
  return !!zone?.allowSow&&!!d.sowCell&&zone.cells.includes(d.sowCell.z*world.width+d.sowCell.x);
}
