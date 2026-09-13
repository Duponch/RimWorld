import type { Cell, Pawn, World } from './types.ts';
import { blockedCells, canStep, cellIndex } from './pathfinding.ts';

/** A diagonal passes over the common corner of four cells. Construction cannot
 * materialize a solid corner through an actor already traversing that edge. */
export function blocksBuildingDuringTravel(pawn:Pawn,cell:Cell,tick:number):boolean {
  const motion=pawn.motion;
  return !!motion&&motion.end>tick&&cell.x>=Math.min(motion.from.x,motion.to.x)&&cell.x<=Math.max(motion.from.x,motion.to.x)&&cell.z>=Math.min(motion.from.z,motion.to.z)&&cell.z<=Math.max(motion.from.z,motion.to.z);
}
/** Called only after structural validation of coordinates and segment fields. */
export function validateTravel(world:World):string[] {
  const active=world.pawns.filter(p=>p.motion&&p.motion.end>world.tick);
  const errors:string[]=[];
  if(!active.length)return errors;
  const blocked=blockedCells(world);
  for(const pawn of active) {
    const occupied=new Set<number>();
    for(const other of world.pawns)if(other.id!==pawn.id) {
      occupied.add(cellIndex(world,other.x,other.z));
      if(other.motion&&other.motion.end>world.tick)occupied.add(cellIndex(world,other.motion.from.x,other.motion.from.z));
    }
    // Another actor may occupy a side cell after the diagonal began. This is
    // not an overlap of the reserved endpoints; static corner clearance persists.
    if(occupied.has(cellIndex(world,pawn.motion!.from.x,pawn.motion!.from.z))||occupied.has(cellIndex(world,pawn.x,pawn.z))||blocked[cellIndex(world,pawn.motion!.from.x,pawn.motion!.from.z)]||!canStep(world,pawn.motion!.from,pawn.motion!.to,blocked,new Set()))errors.push('Blocked or overlapping travel edge.');
  }
  return errors;
}
