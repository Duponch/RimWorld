import type { World } from '../sim/types.ts';

/** Publish discrete phase changes at their own tick. Continuous walking,
 * hunger, work progress and food age still use the periodic snapshots. This
 * transport observer never changes the simulation or enters a save. */
export class PresentationChanges {
  private signature:string|undefined;
  capture(world:World):boolean {
    const signature=JSON.stringify([
      world.seed,world.width,world.height,world.events.at(-1),
      world.pawns.map(p=>[p.id,p.state,p.jobId,p.need?.phase,p.need?.kind==='sleep'?p.need.bedId:undefined,
        p.haul?.phase,p.haul?.carryPileId,p.cooking?.phase,p.cooking?.productId,
        p.recreation.task?.activity,p.recreation.task?.buildingId]),
      world.piles.map(p=>[p.id,p.item,p.quantity,p.owner]),
      world.structures.map(s=>[s.id,s.x,s.z,s.fuel? s.fuel.ticks>0:undefined,s.door?.changedAt,s.door?.open]),
      (world.packed??[]).map(p=>[p.building.id,p.owner]),
      world.roofing?.constructed,
    ]);
    // Value comparison also works on immutable worlds decoded across a worker.
    const changed=this.signature!==signature;this.signature=signature;return changed;
  }
}
