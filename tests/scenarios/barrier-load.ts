import { shootingLoad } from './shooting.ts';
import { applyCommand } from '../../src/sim/engine.ts';
import { fixtureBuilding } from './deconstruction.ts';
import { validateWorld } from '../../src/sim/serialization.ts';
import type { Structure } from '../../src/sim/types.ts';

/** Generated forest + miners; one third physically attacks weak barriers,
 * one third repairs separate damaged barriers. No resets during measurement. */
export function barrierLoad(count:number){
  const result=shootingLoad(count),w=result.world;
  for(const [attackerId,builderId] of result.pairs){
    const a=w.pawns.find(p=>p.id===attackerId)!,b=w.pawns.find(p=>p.id===builderId)!;
    const wall:Structure=fixtureBuilding(w,'wall',a.x+2,a.z);wall.damage=180;
    const repair:Structure=fixtureBuilding(w,'wall',b.x+2,b.z);repair.damage=180;b.priorities.build=1;
    if(!applyCommand(w,{type:'draft',pawnIds:[b.id],enabled:false}).ok)throw Error('Cannot release builder');
    if(!applyCommand(w,{type:'area',action:'home',from:repair,to:repair}).ok)throw Error('Cannot enable maintenance');
    if(!applyCommand(w,{type:'melee',pawnIds:[a.id],targetId:wall.id,structure:true}).ok)throw Error('Cannot strike barrier');
  }
  const errors=validateWorld(w);if(errors.length)throw Error(errors.join('; '));return result;
}
