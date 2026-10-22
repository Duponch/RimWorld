import {isShipPartKind276,type ShipPartKind276} from './ship-part-content-276.ts';
import {shipPartRect276,type ShipPartRect276} from './ship-part-geometry-276.ts';
import {shipCasketCells277} from './ship-casket-geometry-277.ts';
import type {Cell,Orientation} from './types.ts';

/** Graph membership is distinct from the three solid hull definitions. A
 * spatial casket transmits electricity and joins the ship, but is traversable. */
export type ShipPartKind277=ShipPartKind276|'ship-cryptosleep-casket';
export const isShipPartKind277=(kind:unknown):kind is ShipPartKind277=>
 kind==='ship-cryptosleep-casket'||isShipPartKind276(kind);
export interface ShipPartPose277 extends Cell {kind:ShipPartKind277;orientation:Orientation}
/** Command/inspection preparation only; no graph work on a simulation tick. */
export function shipPartRect277(p:ShipPartPose277):ShipPartRect276 {
 if(p.kind!=='ship-cryptosleep-casket')return shipPartRect276({...p,kind:p.kind});
 const [a,b]=shipCasketCells277(p,p.orientation);
 return {x:Math.min(a!.x,b!.x),z:Math.min(a!.z,b!.z),width:Math.abs(a!.x-b!.x)+1,depth:Math.abs(a!.z-b!.z)+1};
}
