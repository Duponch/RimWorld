import {SHIP_CASKET_CONTENT_277} from './ship-casket-content-277.ts';
import type {Cell,Orientation} from './types.ts';

export interface ShipCasketPose277 extends Cell {readonly kind?:'ship-cryptosleep-casket';readonly orientation?:Orientation}
const direction=Object.freeze([[0,1],[1,0],[0,-1],[-1,0]] as const);
const interaction=Object.freeze([[1,0],[0,-1],[-1,0],[0,1]] as const);
/** Native1×2 center offsets, N/E/S/W. Default placement is South. */
export function shipCasketRect277(at:Cell,rotation:Orientation=SHIP_CASKET_CONTENT_277.defaultOrientation){
 return {x:at.x-(rotation===3?1:0),z:at.z-(rotation===2?1:0),width:rotation%2?2:1,depth:rotation%2?1:2};
}
export function shipCasketContains277(at:Cell,cell:Cell,rotation:Orientation=SHIP_CASKET_CONTENT_277.defaultOrientation):boolean {
 const dx=cell.x-at.x,dz=cell.z-at.z,minX=rotation===3?-1:0,minZ=rotation===2?-1:0;
 return dx>=minX&&dx<minX+(rotation%2?2:1)&&dz>=minZ&&dz<minZ+(rotation%2?1:2);
}
export function shipCasketCells277(at:Cell,rotation:Orientation=SHIP_CASKET_CONTENT_277.defaultOrientation):Cell[]{
 const [dx,dz]=direction[rotation];return [{x:at.x,z:at.z},{x:at.x+dx,z:at.z+dz}];
}
export function shipCasketInteraction277(at:Cell,rotation:Orientation=SHIP_CASKET_CONTENT_277.defaultOrientation):Cell {
 const [dx,dz]=interaction[rotation];return {x:at.x+dx,z:at.z+dz};
}
/** Only placement requires this real beam cell; it is not a saved ownership link. */
export function shipCasketBeamCell277(at:Cell,rotation:Orientation=SHIP_CASKET_CONTENT_277.defaultOrientation):Cell {
 const [dx,dz]=direction[rotation];return {x:at.x-dx,z:at.z-dz};
}
