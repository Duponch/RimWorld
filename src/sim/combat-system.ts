import { disturbanceEvents } from './disturbance.ts';
import { advanceMelee } from './melee.ts';
import { blockedCells } from './pathfinding.ts';
import { advanceWorldProjectiles } from './projectile-system.ts';
import { advanceShooter,shootingQueries } from './shooting.ts';
import { combatShotBatch } from './combat-shot-batch.ts';
import type { World } from './types.ts';

/** Emissions first, then flight/impacts, ordered by persistent ID at each Core
 * substep. Movable targets/standability expire at impact; fixed cover is checked by the
 * transaction owner. All captures expire at the end of this tick. */
export function advanceWorldCombat(world:World):void {
  const disturbance=disturbanceEvents(world);
  const shooters=world.pawns.filter(p=>p.shooting||p.melee).sort((a,b)=>a.id-b.id);
  if(!shooters.length){advanceWorldProjectiles(world,undefined,undefined,disturbance);return;}
  const batch=combatShotBatch(world);
  let queries=shootingQueries(world,batch.read);
  let physical:Uint8Array|undefined;const contactGrid=()=>physical??=blockedCells(world,true);
  advanceWorldProjectiles(world,core=>{let changed=false;for(const pawn of shooters){
    if(advanceMelee(world,pawn,core,contactGrid,queries,disturbance)){changed=true;physical=undefined;batch.afterImpact();queries=shootingQueries(world,batch.read);}
    advanceShooter(world,pawn,core,queries);
  }return changed;},()=>{physical=undefined;batch.afterImpact();queries=shootingQueries(world,batch.read);},disturbance);
}
