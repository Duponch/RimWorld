import type { World } from '../sim/types';
import type { Placement } from './primitives';
import { buildingMaterialColor } from './building-material-color';

type Structure = World['structures'][number];
const boundary=(s:Structure):boolean=>s.kind==='fence'||s.kind==='fence-gate'||s.kind==='wall'||s.kind==='door';

/** Gate and fence axes follow their neighboring boundary, without changing the
 * persisted orientation or doing work on each rendered frame. */
export function penBoundaryAxes(world:World):ReadonlyMap<number,0|1> {
  const index=new Map<number,Structure>();
  for(const item of world.structures)if(boundary(item))index.set(item.z*world.width+item.x,item);
  const has=(x:number,z:number)=>x>=0&&z>=0&&x<world.width&&z<world.height&&index.has(z*world.width+x);
  const axes=new Map<number,0|1>();
  for(const s of index.values()) {
    const horizontal=Number(has(s.x-1,s.z))+Number(has(s.x+1,s.z));
    const vertical=Number(has(s.x,s.z-1))+Number(has(s.x,s.z+1));
    axes.set(s.z*world.width+s.x,horizontal>=vertical?0:1);
  }
  return axes;
}

/** All posts, rails, gate frames and marker pieces enter one resident box batch. */
export function penParts(world:World):Placement[] {
  const parts:Placement[]=[];
  const penStructures=world.structures.filter(s=>s.kind==='fence'||s.kind==='fence-gate'||s.kind==='pen-marker');
  if(!penStructures.length)return parts;
  const index=new Map<number,Structure>();
  for(const s of world.structures)if(boundary(s))index.set(s.z*world.width+s.x,s);
  const orientations=penBoundaryAxes(world);
  const at=(x:number,z:number)=>x>=0&&z>=0&&x<world.width&&z<world.height?index.get(z*world.width+x):undefined;
  for(const s of penStructures) {
    const color=buildingMaterialColor(s.material,0x96734a)??0x96734a;
    if(s.kind==='pen-marker') {
      parts.push({x:s.x,z:s.z,y:.55,sx:.12,sy:1.1,sz:.12,color});
      parts.push({x:s.x,z:s.z,y:1.13,sx:.62,sy:.39,sz:.08,color:0xd8c79b});
      parts.push({x:s.x,z:s.z+.047,y:1.13,sx:.43,sy:.035,sz:.02,color:0x3b614e});
      parts.push({x:s.x,z:s.z+.047,y:1.05,sx:.28,sy:.035,sz:.02,color:0x3b614e});
      continue;
    }
    const horizontal=!!at(s.x-1,s.z)||!!at(s.x+1,s.z);
    const vertical=!!at(s.x,s.z-1)||!!at(s.x,s.z+1);
    const axes=horizontal&&vertical?[0,1]:[horizontal?0:vertical?1:orientations.get(s.z*world.width+s.x)??0];
    if(s.kind==='fence') {
      parts.push({x:s.x,z:s.z,y:.48,sx:.12,sy:.96,sz:.12,color});
      parts.push({x:s.x,z:s.z,y:1.02,sx:.17,sy:.12,sz:.17,color});
      for(const axis of axes)for(const height of [.34,.73])parts.push({x:s.x,z:s.z,y:height,sx:axis===0?.96:.09,sy:.075,sz:axis===1?.96:.09,color});
    } else {
      const axis=axes[0]??0;
      for(const side of [-1,1])parts.push({x:s.x+(axis===0?side*.45:0),z:s.z+(axis===1?side*.45:0),y:.53,sx:.13,sy:1.06,sz:.13,color});
      parts.push({x:s.x,z:s.z,y:1.04,sx:axis===0?.98:.1,sy:.1,sz:axis===1?.98:.1,color});
    }
  }
  return parts;
}
