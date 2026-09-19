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
