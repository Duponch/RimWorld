import type { World } from '../sim/types';
import type { Placement } from './primitives';
import { WORLD_SCALE } from '../world/scale';

/** A table, a hand saw and a chisel. Existing furniture batch and material;
 * no new draw call, animation loop or per-building GPU allocation. */
export function stonecutterParts(world:World):Placement[] {
  const parts:Placement[]=[];
  const {stonecutterWidth:width,stonecutterDepth:depth,stonecutterHeight:height}=WORLD_SCALE;
  for(const s of world.structures)if(s.kind==='stonecutter') {
    const ry=s.orientation*Math.PI/2,cos=Math.cos(ry),sin=Math.sin(ry);
    const stuff=s.material==='steel'?0x89999e:0x927249;
    const add=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color=stuff)=>
      parts.push({x:s.x+x*cos+z*sin,y,z:s.z+z*cos-x*sin,sx,sy,sz,ry,color});
    add(0,height-.065,0,width,.13,depth);
    for(const x of [-1,1])for(const z of [-1,1])add(x*(width/2-.19),(height-.13)/2,z*(depth/2-.13),.15,height-.13,.15);
    add(0,.24,0,width-.3,.13,.13);
    // Fixed metal tools retain steel colour with either frame material.
    add(.75,height+.045,.21,.72,.065,.12,0xabb4b1);
    add(1.14,height+.08,.21,.16,.12,.16,0x4e4435);
    add(-.8,height+.055,.25,.10,.07,.29,0xabb4b1);
    add(-.8,height+.07,.04,.12,.10,.22,0x65513a);
    add(0,height+.055,.30,.24,.11,.16,0x6c7477);
  }
  return parts;
}
