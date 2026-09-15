import { footprintCells, footprintContains } from './definitions.ts';
import type { Cell, World } from './types.ts';

// Reference frame pathCost 14 Core ticks, converted to the local 10 Hz clock.
export const FRAME_TRAVEL_DELAY=1.4;
export const FRAME_SEARCH_COST=467; // 1.4 / 3 * 1000, rounded only for search.
export function frameAt(world: World, cell: Cell): boolean {
  return world.jobs.some(j=>j.construction==='frame'&&footprintContains(j,cell));
}
/** Sparse snapshot owned by this synchronous search, never cached across ticks. */
export function frameCosts(world: World): ReadonlyMap<number,number>|undefined {
  let costs:Map<number,number>|undefined;
  for(const job of world.jobs)if(job.construction==='frame') {
    costs??=new Map();for(const c of footprintCells(job))costs.set(c.z*world.width+c.x,FRAME_SEARCH_COST);
  }
  return costs;
}
