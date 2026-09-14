import { canStandAt } from './furniture-travel.ts';
import { releaseWork } from './work-release.ts';
import { reconcileOrders } from './player-orders.ts';
import type { World } from './types.ts';

/** Validate V21 before calling. Keep engaged edges and actor positions intact;
 * only obsolete service destinations are released on the unadopted copy. */
export function initializeFurnitureTravel(world:World):void {
  Object.assign(world,{schemaVersion:22});
  for(const pawn of world.pawns) {
    if(pawn.need?.kind==='eat'&&pawn.need.dining&&!canStandAt(world,pawn.need.dining.target)) {
      pawn.need.dining=null;pawn.need.phase='choose-spot';pawn.need.progress=0;pawn.path=[];pawn.state='moving';
    }
    const invalid=pawn.cooking&&!canStandAt(world,pawn.cooking.spot)
      ||pawn.recreation.task&&!canStandAt(world,pawn.recreation.task.target)
      ||pawn.need?.kind==='sleep'&&pawn.need.bedId===null&&!canStandAt(world,pawn.need.target);
    if(invalid&&!releaseWork(world,pawn))throw new Error('No room to release legacy furniture service.');
  }
  reconcileOrders(world);
}
