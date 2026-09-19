import { isPowerActive } from '../sim/power-rules';
import type { World } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';
import type { Placement } from './primitives';

/** Parts share the prepared furniture batch. Light is a shared field, never
 * a PointLight or shadow map per appliance. */
export function electricalParts(world:World,cutaway=false):Placement[] {
  const out:Placement[]=[];
  for(const s of world.structures) {
    const on=isPowerActive(s);
    if(s.kind==='cooler') {
      const h=cutaway?WORLD_SCALE.wallCutawayHeight:WORLD_SCALE.wallHeight,ry=s.orientation*Math.PI/2;
      out.push({x:s.x,z:s.z,y:h/2,sx:.94,sy:h,sz:.88,ry,color:0x8d9d98});
      for(const sign of [-1,1])for(const y of [.25,.5,.75])out.push({x:s.x+Math.sin(ry)*.455*sign,z:s.z+Math.cos(ry)*.455*sign,y:y*h,sx:.68,sy:.075,sz:.055,ry,color:sign>0?0x559bb6:0xb77757});
    } else if(s.kind==='standing-lamp') {
      out.push({x:s.x,z:s.z,y:.05,sx:.44,sy:.1,sz:.44,color:0x5f6f6c},
        {x:s.x,z:s.z,y:WORLD_SCALE.lampHeight/2,sx:.08,sy:WORLD_SCALE.lampHeight,sz:.08,color:0x758580},
        {x:s.x,z:s.z,y:WORLD_SCALE.lampHeight,sx:.4,sy:.24,sz:.4,color:on?0xffdfa0:0x8a8d7e},
        {x:s.x,z:s.z,y:WORLD_SCALE.lampHeight+.15,sx:.49,sy:.06,sz:.49,color:0x5f6f6c});
    } else if(s.kind==='wood-generator') {
      const x=s.x+.5,z=s.z+.5;
      out.push({x,z,y:.13,sx:1.85,sy:.26,sz:1.85,color:0x4e615c},
        {x:x-.37,z,y:WORLD_SCALE.generatorHeight/2+.12,sx:.9,sy:WORLD_SCALE.generatorHeight,sz:1.42,color:0x7e8c79},
        {x:x+.45,z:z+.15,y:.63,sx:.54,sy:.76,sz:.96,color:0x596c68},
        {x:x-.37,z:z+.73,y:.57,sx:.56,sy:.39,sz:.045,color:on?0xeb9542:0x514e42},
        {x:x-.37,z:z-.54,y:WORLD_SCALE.generatorHeight+.35,sx:.23,sy:.7,sz:.23,color:0x535e58});
      for(const dx of [-.4,-.1,.2])out.push({x:x+.45,z:z+dx,y:1.06,sx:.62,sy:.055,sz:.095,color:0x9eab97});
    }
  }
  return out;
}
