import { footprintCells, JOB_WOOD_COST } from './definitions.ts';
import { cookingSpot } from './cooking-bills.ts';
import { availableCookingStations } from './cooking-planner.ts';
import { reservedSource, reservedDestination } from './materials.ts';
import { interactionGoals } from './pathfinding.ts';
import type { World, Pawn, Job, Structure } from './types.ts';

/** Each group is one candidate's alternative interaction cells. The generic
 * planner needs the cheapest reachable cell of EVERY candidate, not merely
 * the nearest candidate. Unknown/unreachable groups require a full component.
 * Include a superset so ranking and reservations remain the planner's job. */
export function planningGoals(world:World,pawn:Pawn,ready:Job[],fires:Structure[]):ReadonlySet<number>[] {
  const groups:ReadonlySet<number>[]=[];
  for(const job of ready) {
    const cells=footprintCells(job),goals=interactionGoals(world,cells);
    if(job.kind!=='sow')for(const c of cells)goals.delete(c.z*world.width+c.x);
    groups.push(goals);
  }
  for(const pile of world.piles)if(pile.owner.type==='ground'&&pile.quantity>reservedSource(world,pile.id))groups.push(interactionGoals(world,[pile.owner]));
  if(pawn.priorities.haul>0&&pawn.hunger>20) {
    for(const zone of world.stockpiles)groups.push(interactionGoals(world,[zone]));
    for(const fire of fires)groups.push(interactionGoals(world,[fire]));
    for(const job of world.jobs)if(JOB_WOOD_COST[job.kind]>job.escrow.wood+reservedDestination(world,{type:'job',jobId:job.id})) {
      const cells=footprintCells(job),goals=interactionGoals(world,cells);
      for(const c of cells)goals.delete(c.z*world.width+c.x);groups.push(goals);
    }
  }
  for(const fire of availableCookingStations(world,pawn)) {
    const spot=cookingSpot(fire);
    if(spot.x>=0&&spot.z>=0&&spot.x<world.width&&spot.z<world.height)groups.push(new Set([spot.z*world.width+spot.x]));
  }
  return groups;
}
