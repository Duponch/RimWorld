import { footprintCells } from '../sim/definitions';
import type { World } from '../sim/types';
import type { Placement } from './primitives';

export function graveParts(world:World):Placement[]{
  const parts:Placement[]=[];
  for(const grave of world.structures){if(grave.kind!=='grave')continue;
    const cells=footprintCells(grave),last=cells[cells.length-1]!,x=(grave.x+last.x)/2,z=(grave.z+last.z)/2,ry=grave.orientation*Math.PI/2,occupied=grave.grave?.corpseId!==undefined;
    parts.push({targetId:grave.id,x,z,y:occupied?.075:.018,sx:.78,sz:1.78,sy:occupied?.14:.035,ry,color:occupied?0x746047:0x30291f});
    // A vertical wooden cross planted at the head of the grave. Both beams
    // remain in the resident furniture batch, never individual scene objects.
    const headX=x-Math.sin(ry)*.76,headZ=z-Math.cos(ry)*.76;
    parts.push({targetId:grave.id,x:headX,z:headZ,y:.36,sx:.09,sz:.09,sy:.72,ry,color:0x745337});
    parts.push({targetId:grave.id,x:headX,z:headZ,y:.57,sx:.42,sz:.095,sy:.09,ry,color:0x846644});
  }return parts;
}
