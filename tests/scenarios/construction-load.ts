import { applyCommand, addGroundMaterial } from '../../src/sim/index.ts';
import { deconstructionCamp } from './deconstruction.ts';
import { BLOCK_MATERIALS } from '../../src/sim/building-materials.ts';

/** Synthetic mixed workload: real wood/steel supply chains on a clear 250² map. */
export function constructionLoad(count:number,workshops=false,stone=false) {
  const w=deconstructionCamp(count,250);w.tick=2000;
  if(workshops) {
    for(const [i,p] of w.pawns.entries()) {
      const x=92+i%10*6,z=92+Math.floor(i/10)*6;p.x=x;p.z=z;
      const material=i%2===0?'wood':'steel';
      addGroundMaterial(w,material,75,{x:x-2,z},material);
      addGroundMaterial(w,'steel',30,{x:x-2,z:z+1},'steel');
      if(!applyCommand(w,{type:'designate',kind:'stonecutter',material,x:x+1,z:z+1}).ok)throw Error('Invalid workshop load');
    }
    return w;
  }
  for(const [i,p] of w.pawns.entries()) {
    const x=105+i%10*4,z=105+Math.floor(i/10)*4;p.x=x;p.z=z;
    const wall=stone?BLOCK_MATERIALS[i%5]!:'wood',stool=stone?BLOCK_MATERIALS[(i+1)%5]!:'steel';
    addGroundMaterial(w,stone?'blocks':'wood',5,{x:x-1,z},wall);
    addGroundMaterial(w,stone?'blocks':'steel',25,{x:x-1,z:z+1},stool);
    for(const command of [{type:'designate',kind:'wall',material:wall,x:x+1,z}, {type:'designate',kind:'stool',material:stool,x:x+1,z:z+1}] as const)
      if(!applyCommand(w,command).ok)throw Error('Invalid construction load');
  }
  return w;
}
