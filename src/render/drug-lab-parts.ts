import type { World } from '../sim/types';
import { buildingMaterialColor } from './building-material-color';
import type { Placement } from './primitives';
import { WORLD_SCALE } from '../world/scale';

/** Manual chemistry bench, expanded only with the resident furniture batch. */
export function drugLabParts(world:World):Placement[] {
  const parts:Placement[]=[];
  for(const s of world.structures){
    if(s.kind!=='drug-lab')continue;
    const ry=s.orientation*Math.PI/2,c=Math.cos(ry),n=Math.sin(ry);
    const h=WORLD_SCALE.stonecutterHeight,width=WORLD_SCALE.stonecutterWidth,depth=WORLD_SCALE.stonecutterDepth;
    const frame=buildingMaterialColor(s.material,0x9b7e58)??0x9b7e58;
    const add=(lx:number,y:number,lz:number,sx:number,sy:number,sz:number,color:number)=>parts.push({key:s.id,x:s.x+lx*c+lz*n,y,z:s.z+lz*c-lx*n,sx,sy,sz,ry,color});
    add(0,h-.065,0,width,.13,depth,0xa3ac9a);
    for(const x of [-1,1])for(const z of [-1,1])add(x*(width/2-.18),(h-.13)/2,z*(depth/2-.13),.14,h-.13,.14,frame);
    add(0,.3,.24,width-.3,.12,.12,frame);
    // Rear rack and bottles leave the work edge at local -Z unobstructed.
    add(-.84,h+.10,.22,.64,.20,.25,0x6a6958);
    for(const [i,color] of [0x96b9af,0xa8be8b,0xc8b07e].entries()){
      const x=-1.04+i*.20;
      add(x,h+.26,.22,.11,.30,.12,color);
      add(x,h+.425,.22,.085,.035,.09,0x6b786e);
    }
    add(.22,h+.14,.12,.36,.28,.33,0xb1c4b4);
    add(.22,h+.34,.12,.12,.15,.12,0x90a99c);
    add(.22,h+.43,.12,.16,.035,.16,0x5e7068);
    add(.49,h+.36,.12,.44,.06,.06,0x90a99c);
    add(.70,h+.24,.12,.06,.26,.06,0x90a99c);
    add(.85,h+.075,-.12,.37,.15,.31,0xd3d2b2);
    add(.85,h+.17,-.12,.29,.035,.23,0xa1b9a3);
    add(-.22,h+.025,-.25,.42,.05,.19,0xe5dbbc);
  }
  return parts;
}
