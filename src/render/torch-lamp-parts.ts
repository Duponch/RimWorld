import type {World} from '../sim/types';
import type {Placement} from './primitives';

/** Original standing wooden torch. Body only: the resident FireLayer owns
 * the flame, so an empty structure has exactly the same physical silhouette. */
export function torchLampParts(world:World):Placement[]{
  const parts:Placement[]=[];
  for(const s of world.structures)if(s.kind==='torch-lamp'){
    const add=(dx:number,y:number,dz:number,sx:number,sy:number,sz:number,color:number,ry=0)=>parts.push({targetId:s.id,x:s.x+dx,y,z:s.z+dz,sx,sy,sz,color,ry});
    add(0,.045,0,.36,.09,.36,0x79684f);
    add(0,.44,0,.10,.80,.10,0x9b7853);
    for(const ry of [0,Math.PI/2])add(0,.11,0,.12,.17,.45,0x85684c,ry);
    add(0,.79,0,.25,.18,.25,0x6e5744);
    add(0,.87,0,.28,.05,.28,0x51483e);
    for(const dx of [-.12,.12])add(dx,.80,0,.035,.20,.26,0x80684e);
  }
  return parts;
}
