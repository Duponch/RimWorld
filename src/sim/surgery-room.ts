import { isRoofed } from './roof-rules.ts';
import type { CleanlinessCapture } from './filth-room.ts';
import type { Cell,World } from './types.ts';

/** Core StatPart_Outdoors: bare anchor or room open by >100 cells or >25%.
 * Reuse the result's topology; count existing roofs instead of flooding a large
 * exterior a second time. Constructed roofs are the local represented scope. */
export function surgeryOutdoors(world:World,bed:Cell,capture:CleanlinessCapture):boolean {
  const space=capture.topology.at(bed.x,bed.z);
  if(!space||space.kind!=='space')return false;
  if(!isRoofed(world,bed.z*world.width+bed.x))return true;
  let covered=0;
  for(const index of world.roofing?.constructed??[]){const room=capture.topology.at(index%world.width,Math.floor(index/world.width));if(room?.kind==='space'&&room.id===space.id)covered++;}
  const open=space.cellCount-covered;
  return open>100||open>space.cellCount*.25;
}
