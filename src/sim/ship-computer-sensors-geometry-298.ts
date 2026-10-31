import type {Cell} from './types.ts';
import type {ShipPartRect276} from './ship-part-geometry-276.ts';

/** Two nonrotatable 2x2 parts, canonical North. At even size the stored
 * Position is the minimum cell for North, consistent with the closed276 facts.
 * Geometry is not admission; placement/save reject a nonzero orientation. */
export function shipComputerSensorsRect298(at:Cell):ShipPartRect276 {
 return {x:at.x,z:at.z,width:2,depth:2};
}
export const shipComputerSensorsContains298=(at:Cell,cell:Cell):boolean=>
 cell.x>=at.x&&cell.x<=at.x+1&&cell.z>=at.z&&cell.z<=at.z+1;
export const shipComputerSensorsCells298=(at:Cell):Cell[]=>[
 {x:at.x,z:at.z},{x:at.x+1,z:at.z},{x:at.x,z:at.z+1},{x:at.x+1,z:at.z+1},
];
