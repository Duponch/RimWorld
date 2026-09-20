import { releaseFurniture } from './furniture-transfer.ts';
import { pawnBody } from './health-rules.ts';
import { clearQueuedOrders } from './player-orders.ts';
import { commitDrop,releaseAssignments,releaseWork } from './work-release.ts';
import type { Pawn,World } from './types.ts';

/** A forced interruption cannot fail because a drop failed. Existing ownership
 * survives without preserving the task, destination, workstation or queue. */
export function interruptWork(world:World,pawn:Pawn):void {
  clearQueuedOrders(world,pawn);delete pawn.priorityWork;
  if(releaseWork(world,pawn))return;
  releaseAssignments(world,pawn);
  pawn.interruptedCargo=true;
  pawn.planCooldown=1+pawn.id%20;
}

/** Bounded retry using existing drop rules. Does not cancel sleep or grant work.
 * No per-frame work; ordinary actors never enter this path. */
export function retryInterruptedCargo(world:World,pawn:Pawn):void {
  if(!pawn.interruptedCargo||pawn.planCooldown>0)return;
  const held=world.piles.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id);
  const pack=world.packed.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id);
  if(!held&&!pack){delete pawn.interruptedCargo;return;}
  pawn.planCooldown=20;
  if(pack?!releaseFurniture(world,pawn):held&&!commitDrop(world,held,pawn))return;
  delete pawn.interruptedCargo;
  pawn.planCooldown=0;
}

/** Shape validation precedes this ownership check. Sleeping is the only task
 * compatible with retained emergency cargo in V44. */
export function validateInterruptedCargo(world:World):string[] {
  const errors:string[]=[];
  for(const pawn of world.pawns)if(pawn.interruptedCargo) {
    const burning=world.schemaVersion>=87&&!!pawn.burning;
    const tactical=burning||world.schemaVersion>=65&&!!pawn.mental?.crisis||world.schemaVersion>=53&&!!pawn.draft||world.schemaVersion>=58&&!!pawn.flee;
    const owners=world.piles.filter(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id).length
      +world.packed.filter(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id).length;
    if(owners!==1||pawn.jobId!==null||pawn.ward||pawn.feed||pawn.tend||pawn.rescue||pawn.haul||pawn.cooking||pawn.recreation.task||pawn.orders.active!==null||pawn.orders.queue.length||pawn.priorityWork
      ||pawn.path.length&&!tactical||pawn.moveCooldown>0&&world.schemaVersion<53&&!tactical&&!(world.schemaVersion>=45&&(pawn.state==='downed'||pawn.state==='dead'||pawnBody(pawn).capacities.manipulation===0))||pawn.transitExit&&!tactical||pawn.need&&(pawn.need.kind!=='sleep'||pawn.need.phase!=='sleep')||!['sleeping','idle','hungry',...(tactical?['moving']:[]),...(burning?['working']:[]),...(world.schemaVersion>=45?['downed','dead']:[])].includes(pawn.state))errors.push('Invalid interrupted cargo ownership or task.');
  }
  return errors;
}
