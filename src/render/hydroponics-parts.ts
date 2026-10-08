import { footprintCells } from '../sim/definitions';
import type { World } from '../sim/types';
import type { Placement } from './primitives';

export const HYDROPONIC_SUPPORT_HEIGHT=.30;

/** Four empty planting wells; living crops remain in their ordinary batches. */
export function hydroponicsParts(world:Pick<World,'structures'>):Placement[] {
  const parts:Placement[]=[];
  for(const basin of world.structures) {
    if(basin.kind!=='hydroponics-basin')continue;
    const cells=footprintCells(basin),last=cells[cells.length-1]!;
    const cx=(basin.x+last.x)/2,cz=(basin.z+last.z)/2;
    const ry=basin.orientation*Math.PI/2,cos=Math.cos(ry),sin=Math.sin(ry);
    const add=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number)=>
      parts.push({key:basin.id,x:cx+x*cos+z*sin,y,z:cz+z*cos-x*sin,sx,sy,sz,ry,color});
    const steel=0x94a6a7,rim=0xc0cbc4;
    add(0,.13,0,.88,.18,3.88,steel);
    for(const side of [-1,1]) {
      add(side*.44,.25,0,.08,.10,3.96,rim);
      add(0,.25,side*1.94,.88,.10,.08,rim);
      for(const end of [-1,1])add(side*.34,.04,end*1.72,.12,.08,.20,steel);
    }
    for(let i=0;i<4;i++) {
      const z=i-1.5;
      add(0,.235,z,.78,.03,.82,0x4e7977);
      if(i<3)add(0,.27,z+.5,.88,.06,.08,rim);
    }
    // A low pump housing stays under the rim and outside the planting centres.
    add(.33,.19,-1.5,.18,.16,.34,0x647d80);
  }
  return parts;
}
