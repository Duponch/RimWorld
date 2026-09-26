import { isCookingOrder } from './order-types.ts';
import type { Cell, Pawn, World } from './types.ts';

/** Exclusive use of a workstation, dining place or bed. This is not physical
 * occupancy: a passer-by can cross any of these cells without claiming its use.
 * Sleeping/collapsing on the floor does not acquire furniture or a work spot. */
export function serviceCell(pawn: Pawn): Cell | null {
  if(pawn.animalCare)return pawn.animalCare.spot;
  if(pawn.ward)return pawn.ward.spot;
  if(pawn.research)return pawn.research.spot;
  if(pawn.feed)return pawn.feed.spot;
  if(pawn.tend)return pawn.tend.spot;
  if (pawn.recreation?.task?.activity === 'horseshoes') return pawn.recreation.task.target;
  if (pawn.cooking) return pawn.cooking.spot;
  if (pawn.need?.kind === 'eat') return pawn.need.dining?.target ?? null;
  if (pawn.need?.kind === 'sleep' && pawn.need.bedId !== null) return pawn.need.target;
  return null;
}
export function reservedServiceCells(world: World, exceptPawn?: number): Set<number> {
  const reserved = new Set<number>();
  for (const pawn of world.pawns) if (pawn.id !== exceptPawn) {
    const cell = serviceCell(pawn); if (cell) reserved.add(cell.z*world.width+cell.x);
  }
  for(const pawn of world.pawns)if(pawn.id!==exceptPawn&&pawn.rescue){const bed=world.structures.find(s=>s.id===pawn.rescue!.bedId);if(bed)reserved.add(bed.z*world.width+bed.x);}
  for(const pawn of world.pawns)for(const order of pawn.orders?.queue??[])if(isCookingOrder(order))reserved.add(order.cooking.spot.z*world.width+order.cooking.spot.x);
  return reserved;
}
