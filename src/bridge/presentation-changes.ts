// Affiliation and flight are discrete gameplay presentation phases.
import type { World } from '../sim/types.ts';

/** Publish discrete phase changes at their own tick. Continuous walking,
 * hunger, work progress and food age still use the periodic snapshots. This
 * transport observer never changes the simulation or enters a save. */
export class PresentationChanges {
  private signature:string|undefined;
  capture(world:World):boolean {
    const signature=JSON.stringify([
      world.seed,world.width,world.height,world.events.at(-1),
      world.wildlife?.animals.map(a=>[a.id,a.state,a.burning?.phase,a.meal?.id,a.flee,a.stagger,a.stun,a.threat,a.strike,a.health?.nextInjuryId]),world.wildlife?.eatenNutrition,
      world.fires?.items.map(f=>[f.id,f.attachedPawnId,f.attachedAnimalId]),world.weather?.current,
      world.visitors?.groups.map(g=>[g.id,g.phase,g.hostile,g.reason]),world.trade?.count,
      world.projectiles?.map(p=>[p.id,p.emittedAtCore,p.arrival]),
      world.pawns.map(p=>[p.id,p.state,p.burning?.phase,p.firefighting?.phase,p.firefighting?.fireId,p.raid?.exiting,p.mental?.crisis?.kind,p.mental?.crisis?.target,p.jobId,p.faction,p.prisoner?.capturedAt,p.prisoner?.mode,p.prisoner?.lastChatTick,p.prisoner?.escape,p.ward?.kind,p.ward?.patientId,p.ward?.phase,p.hostilityResponse,p.draft?.holdFire,p.tactics?.targetId,p.tactics?.post,p.flee,p.melee,p.stun,p.shooting,p.stagger,!!p.draft,p.draft?.target,p.draft?.queue,p.equipmentTask?.itemId,p.equipmentTask?.action,p.equipmentDropPending,p.rescue,p.tend?.patientId,p.tend?.phase,p.feed?.patientId,p.feed?.phase,p.medicalSleep,p.interruptedCargo,p.need?.phase,p.need?.kind==='sleep'?p.need.bedId:undefined,
        p.hunting?.animalId,p.hunting?.phase,p.research?.stationId,p.haul?.phase,p.haul?.carryPileId,p.cooking?.phase,p.cooking?.productId,
        p.recreation.task?.activity,p.recreation.task?.buildingId,p.visitor?.group,p.visitor?.role,p.visitor?.phase,p.trade?.traderId,p.trade?.phase]),
      world.piles.map(p=>[p.id,p.item,p.quantity,p.owner]),
      world.structures.map(s=>[s.id,s.x,s.z,s.medical,s.prisoner,s.fuel? s.fuel.ticks>0:undefined,s.door?.changedAt,s.door?.open,s.power?.on,s.power?.parentId,s.power?.switchOn]),
      (world.packed??[]).map(p=>[p.building.id,p.owner]),
      world.roofing?.constructed,
    ]);
    // Value comparison also works on immutable worlds decoded across a worker.
    const changed=this.signature!==signature;this.signature=signature;return changed;
  }
}
