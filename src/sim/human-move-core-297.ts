import type {Cell} from './types.ts';
/** Captured human pace. Does not read present Pawn, World, job or terrain. */
export interface CapturedCoreMove297 {readonly coreMove297?:true;readonly coreMoveWalk297?:true;readonly from:Cell;readonly to:Cell;readonly speedFactor?:number;readonly terrainDelay?:number}
export const HUMAN_MOVE_SPEED297=4.6;
export const CORE_MOVE_DIAGONAL297=1.41421;
export function coreMoveDuration297(from:Cell,to:Cell,speedFactor:number,terrainDelay:number,walk:boolean):number {
 const diagonal=from.x!==to.x&&from.z!==to.z;
 const base=Math.min(450,Math.max(1,60/(HUMAN_MOVE_SPEED297*speedFactor)*(diagonal?CORE_MOVE_DIAGONAL297:1)));
 const total=Math.min(450,base+terrainDelay*10);
 return Math.max(1,walk?Math.max(50,total*2):total)/10;
}
export function capturedCoreMoveDuration297(m:CapturedCoreMove297):number {
 return coreMoveDuration297(m.from,m.to,m.speedFactor??1,m.terrainDelay??0,m.coreMoveWalk297===true);
}
