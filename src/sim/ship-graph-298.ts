import {isShipPartKind277,shipPartRect277,type ShipPartKind277} from './ship-casket-graph-277.ts';
import {isShipComputerSensorsKind298,type ShipComputerSensorsKind298} from './ship-computer-sensors-content-298.ts';
import {shipComputerSensorsRect298} from './ship-computer-sensors-geometry-298.ts';
import type {ShipPartRect276} from './ship-part-geometry-276.ts';
import type {Cell,Orientation} from './types.ts';

export type ShipPartKind298=ShipPartKind277|ShipComputerSensorsKind298;
export interface ShipPartPose298 extends Cell {kind:ShipPartKind298;orientation:Orientation}
export const isShipPartKind298=(kind:unknown):kind is ShipPartKind298=>isShipPartKind277(kind)||isShipComputerSensorsKind298(kind);
/** Shares the exact existing cardinal-perimeter graph reader. This adapter
 * grants no legacy/future-world admission and never scans a running tick. */
export function shipPartRect298(p:ShipPartPose298):ShipPartRect276 {
 return isShipComputerSensorsKind298(p.kind)?shipComputerSensorsRect298(p):shipPartRect277({...p,kind:p.kind});
}
