import type { World } from '../sim/types';
import type { Placement } from './primitives';

export const SANDBAG_HEIGHT=.66;

/** Paper cloth and seams use the existing textured furniture pipeline.
 * Fixed 1×1 cover has no visual rotation or per-object GPU resource. */
export function sandbagParts(world:World):Placement[] {
  const parts:Placement[]=[];
  for(const bag of world.structures){
    if(bag.kind!=='sandbags')continue;
    const add=(dx:number,y:number,dz:number,sx:number,sy:number,sz:number,color:number)=>
      parts.push({targetId:bag.id,key:bag.id,x:bag.x+dx,y,z:bag.z+dz,sx,sy,sz,color});
    for(let row=0;row<3;row++)for(const side of [-1,1]){
      const dx=side*(row===1?.205:.235),dz=row===1?.045:-.025,y=.12+row*.22;
      add(dx,y,dz,.44,.20,.83,row===1?0xc6bb94:side===-1?0xd7cba5:0xcec19b);
      add(dx,y+.086,dz,.36,.018,.73,0xe0d4b3);
      add(dx+side*.19,y,dz,.018,.145,.71,0xa99e7e);
    }
  }
  return parts;
}
