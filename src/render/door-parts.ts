import { doorOrientations } from '../sim/door-rules';
import type { World } from '../sim/types';
import type { Placement } from './primitives';
import { buildingMaterialColor } from './building-material-color';
import { WORLD_SCALE } from '../world/scale';
export function doorParts(world:World,cutaway:boolean):Placement[] {
  const parts:Placement[]=[],height=cutaway?WORLD_SCALE.wallCutawayHeight:WORLD_SCALE.wallHeight;
  const axes=doorOrientations(world);
  for(const s of world.structures)if(s.kind==='door') {
    const ry=(axes.get(s.z*world.width+s.x)??0)*Math.PI/2,color=buildingMaterialColor(s.material);
    parts.push({x:s.x,z:s.z,y:height-.07,sx:1,sy:.14,sz:.3,ry,color});
    for(const side of [-1,1])parts.push({x:s.x+side*.46*Math.cos(ry),z:s.z-side*.46*Math.sin(ry),y:(height-.14)/2,sx:.08,sy:height-.14,sz:.3,ry,color});
  }
  return parts;
}
