import type { World } from '../sim/types';
import type { Placement } from './primitives';
import { WORLD_SCALE } from '../world/scale';

/** A slatted evaporation vessel inside its one-cell footprint. All parts
 * share the existing furniture batch; no light, particles or per-frame work. */
export function passiveCoolerParts(world:World):Placement[] {
  const parts:Placement[]=[],height=WORLD_SCALE.passiveCoolerHeight;
  for(const s of world.structures)if(s.kind==='passive-cooler') {
    const {x,z}=s;
    parts.push({x,z,y:.09,sx:.72,sy:.18,sz:.72,color:0x725b3f});
    for(let side=0;side<4;side++) {
      const ry=side*Math.PI/2;
      for(const offset of [-.25,0,.25])parts.push({x:x+Math.cos(ry)*offset+Math.sin(ry)*.32,z:z-Math.sin(ry)*offset+Math.cos(ry)*.32,y:height/2,sx:.2,sy:height,sz:.09,ry,color:0xa0865d});
    }
    for(const y of [.18,height-.14])parts.push({x,z,y,sx:.75,sy:.055,sz:.75,color:0x524d3f});
    parts.push({x,z,y:height-.08,sx:.53,sy:.035,sz:.53,color:s.fuel?.ticks?0x708a84:0x6e654c});
  }
  return parts;
}
