import { captureRoomQuality } from './room-quality.ts';
import { isPowerActive } from './power-rules.ts';
import type { RoomTopology } from './room-topology.ts';
import type { Cell,Structure,World } from './types.ts';

export const TELEVISION_GAIN_FACTOR=1.2;
export const TELEVISION_MAX_PARTICIPANTS=8;
export const TELEVISION_WEIGHT=3.5;
const directions=[[0,1],[1,0],[0,-1],[-1,0]] as const;
type TelevisionPosition=Pick<Structure,'x'|'z'|'orientation'>;

/** Geometric area only. A real seat, room, sight and reservations still apply. */
export function televisionWatchCells(tv:TelevisionPosition):Cell[] {
  const [dx,dz]=directions[tv.orientation]!,cells:Cell[]=[];
  for(let distance=2;distance<=4;distance++)for(let side=-2;side<=2;side++)
    cells.push({x:tv.x+dx*distance+dz*side,z:tv.z+dz*distance-dx*side});
  return cells;
}
export function isTelevisionCell(tv:TelevisionPosition,cell:Cell):boolean {
  const [dx,dz]=directions[tv.orientation]!,x=cell.x-tv.x,z=cell.z-tv.z;
  const distance=x*dx+z*dz,side=x*dz-z*dx;
  return Number.isInteger(cell.x)&&Number.isInteger(cell.z)&&distance>=2&&distance<=4&&Math.abs(side)<=2;
}
export const tvActive=(tv:Structure):boolean=>tv.kind==='tube-television'&&isPowerActive(tv);

/** The engine supplies its current light topology; isolated callers use the
 * ordinary room cache. No room-quality calculation is requested. */
export function televisionSameRoom(world:World,tv:Cell,cell:Cell,readTopology?:()=>RoomTopology):boolean {
  const topology=readTopology?.()??captureRoomQuality(world).topology;
  const source=topology.at(tv.x,tv.z),target=topology.at(cell.x,cell.z);
  return source?.kind==='space'&&target?.kind==='space'&&source.id===target.id;
}
