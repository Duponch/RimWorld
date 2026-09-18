import { encounterCamp,encounterLoad } from './encounter.ts';
import { applyCommand } from '../../src/sim/engine.ts';
export function meleeCamp(){
  const w=encounterCamp();w.piles=[];const p=w.pawns[0],enemy=w.pawns[3];
  Object.assign(enemy,{x:11,z:10});p.skills.melee.level=16;enemy.skills.melee.level=16;return w;
}
/** Existing mixed map and work, one third fights at contact with armed sentries.
 * No healing/health reset: record the period where fighting is actually active. */
export function meleeLoad(count:number){
  const result=encounterLoad(count),w=result.world;
  for(const [id,targetId] of result.pairs){const p=w.pawns.find(p=>p.id===id)!,target=w.pawns.find(p=>p.id===targetId)!;Object.assign(p,{x:target.x-2,z:target.z,motion:null,moveCooldown:0,path:[]});delete p.shooting;
    const r=applyCommand(w,{type:'melee',pawnIds:[id],targetId});if(!r.ok)throw Error(r.reason);
  }
  return result;
}
