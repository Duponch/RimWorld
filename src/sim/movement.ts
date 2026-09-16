import { readyDoorEntry } from './doors.ts';
import { medicallyStopped,pawnBody } from './health-rules.ts';
import { doorAt, doorOpenTicks as importDoorDuration } from './door-rules.ts';
import type { Cell, Pawn, World } from './types.ts';
import { furnitureDelay } from './furniture-travel.ts';
import { LightEnvironmentCache, type LightReader } from './light-environment.ts';
/** Integer search costs approximate distance; physical travel uses the exact edge length. */
export const CARDINAL_COST = 1000;
export const DIAGONAL_COST = 1414;
export const TRAVEL_TICKS = 3;
export const edgeCost = (a:Cell,b:Cell):number => a.x!==b.x && a.z!==b.z ? DIAGONAL_COST : CARDINAL_COST;
export const edgeLength = (a:Cell,b:Cell):number => Math.hypot(b.x-a.x,b.z-a.z);
export interface TravelSegment { from:Cell; to:Cell; start:number; end:number; terrainDelay?:number; speedFactor?:number }
export function startTravel(world:World,pawn:Pawn,next:Cell,getLight?:LightReader):boolean {
  if(medicallyStopped(pawn))return false;
  if(!readyDoorEntry(world,pawn,next))return false;
  // Carry fractional tick overshoot to the next edge; never round each diagonal up.
  let start = pawn.motion && pawn.motion.end >= world.tick-1 ? pawn.motion.end : world.tick;
  const door=doorAt(world,next);if(door)start=Math.max(start,door.door!.changedAt+(1-door.door!.from)*importDoorDuration(door));
  const terrainDelay=furnitureDelay(world,pawn,next);
  const speedFactor=(getLight?.()??new LightEnvironmentCache().read(world)).speedAt(pawn)*pawnBody(pawn).capacities.moving;
  const duration = TRAVEL_TICKS * edgeLength(pawn,next)/speedFactor+terrainDelay;
  pawn.motion={from:{x:pawn.x,z:pawn.z},to:{x:next.x,z:next.z},start,end:start+duration,...terrainDelay?{terrainDelay}:{},...speedFactor!==1?{speedFactor}:{}};
  pawn.x=next.x; pawn.z=next.z; pawn.moveCooldown=Math.max(0,pawn.motion.end-world.tick);
  return true;
}
