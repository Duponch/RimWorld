import type { World } from '../sim/types.ts';

/** Publish discrete phase changes at their own tick. Continuous walking,
 * hunger, work progress and food age still use the periodic snapshots. This
 * transport observer never changes the simulation or enters a save. */
export class PresentationChanges {
  private world:World|undefined;
  private event:World['events'][number]|undefined;
  private signature='';
  capture(world:World):boolean {
    const signature=JSON.stringify([
      world.pawns.map(p=>[p.id,p.state,p.jobId,p.need?.phase,p.need?.kind==='sleep'?p.need.bedId:undefined,
        p.haul?.phase,p.haul?.carryPileId,p.cooking?.phase,p.cooking?.productId,
        p.recreation.task?.activity,p.recreation.task?.buildingId]),
      world.piles.map(p=>[p.id,p.item,p.quantity,p.owner]),
      world.structures.map(s=>[s.id,s.x,s.z,s.fuel? s.fuel.ticks>0:undefined,s.door?.changedAt,s.door?.open]),
      (world.packed??[]).map(p=>[p.building.id,p.owner]),
      world.roofing?.constructed,
    ]);
    const event=world.events.at(-1),changed=this.world!==world||this.event!==event||this.signature!==signature;
    this.world=world;this.event=event;this.signature=signature;return changed;
  }
}
