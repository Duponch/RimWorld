import { advanceWorldProjectiles } from './projectile-system.ts';
import { advanceShooter,shootingQueries } from './shooting.ts';
import { combatShotBatch } from './combat-shot-batch.ts';
import type { World } from './types.ts';

/** Emissions first, then flight/impacts, ordered by persistent ID at each Core
 * substep. Movable targets/standability expire at impact; fixed cover is checked by the
 * transaction owner. All captures expire at the end of this tick. */
export function advanceWorldCombat(world:World):void {
  const shooters=world.pawns.filter(p=>p.shooting).sort((a,b)=>a.id-b.id);
  if(!shooters.length){advanceWorldProjectiles(world);return;}
  const batch=combatShotBatch(world);
  let queries=shootingQueries(world,batch.read);
  advanceWorldProjectiles(world,core=>{for(const pawn of shooters)advanceShooter(world,pawn,core,queries);},()=>{batch.afterImpact();queries=shootingQueries(world,batch.read);});
}
