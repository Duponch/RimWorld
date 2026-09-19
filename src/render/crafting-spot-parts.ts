import type { World } from '../sim/types';
import type { Placement } from './primitives';

/** Floor markings share the resident furniture batch. */
export function craftingSpotParts(world:World):Placement[] {
  const parts:Placement[]=[];
  for(const s of world.structures)if(s.kind==='crafting-spot'||s.kind==='butcher-spot'){
    const butcher=s.kind==='butcher-spot',border=butcher?0xaa8c77:0xd9ccaa;
    for(const side of [-1,1]){
      parts.push({x:s.x+side*.42,z:s.z,y:.035,sx:.04,sy:.02,sz:.88,color:border},
        {x:s.x,z:s.z+side*.42,y:.035,sx:.88,sy:.02,sz:.04,color:border});
    }
    const a=s.orientation*Math.PI/2;
    parts.push({x:s.x-Math.sin(a)*.34,z:s.z-Math.cos(a)*.34,y:.05,sx:.22,sy:.025,sz:.12,ry:a,color:butcher?0x898d84:0x5c756c});
    if(butcher)parts.push({x:s.x-Math.sin(a)*.34+Math.cos(a)*.17,z:s.z-Math.cos(a)*.34-Math.sin(a)*.17,y:.05,sx:.12,sy:.035,sz:.045,ry:a,color:0x73513b});
  }
  return parts;
}
