import { researchLoad } from './research-load.ts';
import { enableWildlife } from '../../src/sim/wildlife.ts';
export function wildlifeLoad(count:number) {
  const w=researchLoad(count);enableWildlife(w,count);
  for(const [i,a] of w.wildlife!.animals.entries()){a.food=i%2?.02:.16;a.rest=i%3?.8:.2;}
  return w;
}
