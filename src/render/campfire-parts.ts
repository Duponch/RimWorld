import type { World } from '../sim/types';
import type { Placement } from './primitives';

/** Stone and logs remain static furniture. Lit flame cones are part of the
 * existing resident FireLayer, animated by its shared GPU clock. */
export function campfireParts(world: World): Placement[] {
  const base:Placement[]=[];
  for(const fire of world.structures) if(fire.kind==='campfire') {
    for(let i=0;i<7;i++) {
      const angle=i*Math.PI*2/7;
      base.push({x:fire.x+Math.sin(angle)*.34,z:fire.z+Math.cos(angle)*.34,y:.09,sx:.19,sy:.16,sz:.18,ry:angle,color:0x777768});
    }
    for(const angle of [.65,-.65])base.push({x:fire.x,z:fire.z,y:.11,sx:.13,sy:.12,sz:.63,ry:angle,color:0x5d4433});
  }
  return base;
}
