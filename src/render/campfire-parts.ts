import type { World } from '../sim/types';
import type { Placement } from './primitives';

/** Static procedural parts share furniture and unlit batches. Fuel quantity does
 * not rebuild geometry: only construction and lit/unlit transitions update it. */
export function campfireParts(world: World): {base:Placement[];flames:Placement[]} {
  const base:Placement[]=[],flames:Placement[]=[];
  for(const fire of world.structures) if(fire.kind==='campfire') {
    for(let i=0;i<7;i++) {
      const angle=i*Math.PI*2/7;
      base.push({x:fire.x+Math.sin(angle)*.34,z:fire.z+Math.cos(angle)*.34,y:.09,sx:.19,sy:.16,sz:.18,ry:angle,color:0x777768});
    }
    for(const angle of [.65,-.65])base.push({x:fire.x,z:fire.z,y:.11,sx:.13,sy:.12,sz:.63,ry:angle,color:0x5d4433});
    if(fire.fuel && fire.fuel.ticks>0)for(let i=0;i<3;i++)flames.push({x:fire.x+(i-1)*.09,z:fire.z+(i%2)*.06,y:.23+i*.07,sx:.14,sy:.2+i*.1,sz:.14,ry:i*1.2,color:i===1?0xffd270:0xf18b3d});
  }
  return {base,flames};
}
