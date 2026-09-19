import { addMaterial } from '../../src/sim/materials.ts';
import { applyCommand } from '../../src/sim/engine.ts';
import { animalNavigation } from '../../src/sim/wildlife-navigation.ts';
import { damageAnimalWithBullet } from '../../src/sim/wildlife-health.ts';
import { researchLoad } from './research-load.ts';
import { enableWildlife } from '../../src/sim/wildlife.ts';
export function wildlifeLoad(count:number) {
  const w=researchLoad(count);enableWildlife(w,count);
  for(const [i,a] of w.wildlife!.animals.entries()){a.food=i%2?.02:.16;a.rest=i%3?.8:.2;}
  return w;
}

/** Same mixed colony, with real anatomical impacts and escape decisions. */
export function injuredWildlifeLoad(count:number) {
  const w=wildlifeLoad(count);
  for(const [i,a] of w.wildlife!.animals.entries())if(i%2===0)damageAnimalWithBullet(w,a,{part:'tail',damage:1},w.tick*10,{x:Math.max(0,a.x-5),z:a.z});
  return w;
}

/** One miner in six attacks an adjacent hare. Other workers keep the same
 * research/crafting contracts; no health injection is needed for the duels. */
export function meleeWildlifeLoad(count:number){
  const w=injuredWildlifeLoad(count),nav=animalNavigation(w);
  for(let i=1;i<count;i+=6){
    const p=w.pawns[i]!,a=w.wildlife!.animals[i]!;
    const cell=[[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dz])=>({x:p.x+dx!,z:p.z+dz!})).find(c=>nav.free(c)&&nav.step(p,c));
    if(!cell)throw new Error('No adjacent animal duel position');
    Object.assign(a,cell,{food:.2,rest:1,path:[],nextDecision:w.tick+100});delete a.motion;delete a.meal;
    if(!applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok||!applyCommand(w,{type:'melee',pawnIds:[p.id],targetId:a.id}).ok)throw new Error('Animal duel rejected');
  }
  return w;
}

/** Hunters replace one miner in six, keeping the other activity workloads intact. */
export function huntingWildlifeLoad(count:number){
  const w=wildlifeLoad(count),nav=animalNavigation(w);
  for(let i=1;i<count;i+=6){
    const p=w.pawns[i]!,a=w.wildlife!.animals[i]!;
    const cell=[[-3,0],[3,0],[0,-3],[0,3],[-1,0],[1,0]].map(([dx,dz])=>({x:p.x+dx!,z:p.z+dz!})).find(c=>nav.free(c));
    if(!cell)throw Error('No hunting prey position');
    Object.assign(a,cell,{food:.2,rest:1,path:[],nextDecision:w.tick+100});delete a.motion;delete a.meal;
    p.priorities.hunt=1;p.priorities.mine=0;p.priorities.gather=0;p.skills.shooting.level=12;
    addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'revolver');
    if(!applyCommand(w,{type:'hunt',animalId:a.id,enabled:true}).ok)throw Error('Hunt rejected');
  }
  return w;
}
