import { footprintCells } from '../sim/definitions';
import type { World } from '../sim/types';
import type { Placement } from './primitives';

export function graveParts(world:World):Placement[]{
  const parts:Placement[]=[];
  for(const grave of world.structures){if(grave.kind!=='grave')continue;
    const cells=footprintCells(grave),last=cells[cells.length-1]!,x=(grave.x+last.x)/2,z=(grave.z+last.z)/2,ry=grave.orientation*Math.PI/2,occupied=grave.grave?.corpseId!==undefined;
    parts.push({x,z,y:occupied?.075:.018,sx:.78,sz:1.78,sy:occupied?.14:.035,ry,color:occupied?0x746047:0x30291f});
    // A simple field marker and soil, not a monument requiring stone materials.
    parts.push({x:x-Math.sin(ry)*.76,z:z-Math.cos(ry)*.76,y:.19,sx:.36,sz:.08,sy:.38,ry,color:0x7a6c51});
  }return parts;
}
