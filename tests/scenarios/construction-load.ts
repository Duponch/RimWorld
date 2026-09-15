import { applyCommand, addGroundMaterial } from '../../src/sim/index.ts';
import { deconstructionCamp } from './deconstruction.ts';

/** Synthetic mixed workload: real wood/steel supply chains on a clear 250² map. */
export function constructionLoad(count:number) {
  const w=deconstructionCamp(count,250);w.tick=2000;
  for(const [i,p] of w.pawns.entries()) {
    const x=105+i%10*4,z=105+Math.floor(i/10)*4;p.x=x;p.z=z;
    addGroundMaterial(w,'wood',5,{x:x-1,z},'wood');
    addGroundMaterial(w,'steel',25,{x:x-1,z:z+1},'steel');
    for(const command of [{type:'designate',kind:'wall',material:'wood',x:x+1,z}, {type:'designate',kind:'stool',material:'steel',x:x+1,z:z+1}] as const)
      if(!applyCommand(w,command).ok)throw Error('Invalid construction load');
  }
  return w;
}
