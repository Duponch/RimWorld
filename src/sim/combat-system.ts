import { advanceWorldProjectiles } from './projectile-system.ts';
import { advanceShooter,shootingQueries } from './shooting.ts';
import type { World } from './types.ts';

/** Emissions first, then flight/impacts, ordered by persistent ID at each Core
 * substep. All query captures expire at impact and at the end of this tick. */
export function advanceWorldCombat(world:World):void {
  const shooters=world.pawns.filter(p=>p.shooting).sort((a,b)=>a.id-b.id);
  if(!shooters.length){advanceWorldProjectiles(world);return;}
  let queries=shootingQueries(world);
  advanceWorldProjectiles(world,core=>{for(const pawn of shooters)advanceShooter(world,pawn,core,queries);},()=>{queries=shootingQueries(world);});
}
