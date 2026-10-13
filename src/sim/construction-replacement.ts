import { constructionHaulId } from './construction-rules.ts';
import { zonesUnderPlan } from './construction-zones.ts';
import { footprintCells } from './definitions.ts';
import { isHaulOrder } from './order-types.ts';
import { planPawnDrops, releaseWork, type DropPlan } from './work-release.ts';
import type { DesignateCommand, Job, World } from './types.ts';

/** Replacing a ghost is distinct from dismantling a supplied frame or wall. */
export function wallBlueprintForDoor(world:World,command:DesignateCommand):Job|undefined {
  if(command.kind!=='door'&&command.kind!=='autodoor')return undefined;
  const job=world.jobs.find(j=>j.kind==='wall'&&j.x===command.x&&j.z===command.z&&j.construction==='blueprint'
    &&j.footprint==='standard'&&footprintCells(j).length===1&&j.progress===0&&j.workRemainder===undefined&&j.escrow.wood===0&&j.escrow.food===0);
  return job&&!world.piles.some(p=>p.owner.type==='job'&&p.owner.jobId===job.id)?job:undefined;
}
const workingFor=(pawn:World['pawns'][number],job:Job):boolean=>pawn.jobId===job.id||!!pawn.haul&&constructionHaulId(pawn.haul.destination)===job.id;

/** One physical drop plan covers both the retired wall and ordinary zone cleanup.
 * A carried object must not be deposited at the logical end of an active edge. */
export function planBlueprintDoorReplacement(world:World,command:DesignateCommand,job:Job):DropPlan|null {
  if(wallBlueprintForDoor(world,command)!==job||!Number.isSafeInteger(world.nextId+1))return null;
  const affected=zonesUnderPlan(world,command),growingJobs=new Set(world.jobs.filter(j=>j.growingZoneId!==undefined&&affected.growing.has(j.growingZoneId)).map(j=>j.id));
  const actors=new Set(world.pawns.filter(p=>workingFor(p,job)||p.jobId!==null&&growingJobs.has(p.jobId)
    ||p.haul&&(p.haul.destination.type==='stockpile'&&affected.deliveries.has(p.haul.destination.stockpileId)
      ||p.haul.destination.type==='aside'&&affected.growing.has(p.haul.destination.growingZoneId??-1))).map(p=>p.id));
  for(const pawn of world.pawns)if(actors.has(pawn.id)&&(pawn.moveCooldown>0||(pawn.motion?.end??0)>world.tick)
    &&(world.piles.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id)||world.packed.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id)))return null;
  return planPawnDrops(world,actors);
}
/** Called after all placement and drop preflights, immediately before creation. */
export function retireWallBlueprint(world:World,job:Job,drops:DropPlan):void {
  for(const pawn of world.pawns){
    if(workingFor(pawn,job)){
      const priority=pawn.priorityWork;
      const retiredPriority=priority&&(priority.work==='build'||priority.work==='haul')&&priority.cell.x===job.x&&priority.cell.z===job.z;
      if(!releaseWork(world,pawn,drops))throw new Error('Preflighted wall replacement has no physical drop.');
      // A command for this wall remembered its service family at this cell.
      // Foreign mandates, including those of queue-only actors, remain intact.
      if(retiredPriority)delete pawn.priorityWork;
    }
    pawn.orders.queue=pawn.orders.queue.filter(order=>typeof order==='number'?order!==job.id:!isHaulOrder(order)||constructionHaulId(order.destination)!==job.id);
  }
  world.jobs=world.jobs.filter(j=>j!==job);
}