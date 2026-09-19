import { encounterCamp,encounterLoad } from './encounter.ts';
import { applyCommand } from '../../src/sim/engine.ts';
export function automaticCamp(){
  const w=encounterCamp();w.piles=w.piles.filter(p=>p.owner.type!=='equipment'||p.owner.pawnId!==w.pawns[3].id);return w;
}
/** Real hostile sentries, drafted autofire, civilian Attack/Flee and workers. */
export function automaticLoad(count:number){
  const r=encounterLoad(count),w=r.world;
  for(const [i,[id]] of r.pairs.entries()) {
    applyCommand(w,{type:'fire-at-will',pawnIds:[id],enabled:true});
    const p=w.pawns[i*3+2];if(p&&i%4===0)applyCommand(w,{type:'hostility-response',pawnId:p.id,response:'attack'});
  }
  return r;
}
