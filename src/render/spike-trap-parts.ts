import type {World} from '../sim/types';
import type {Placement} from './primitives';
import {buildingMaterialColor} from './building-material-color';
/** A single fixed footprint, also used by ghosts and portraits. The cones use
 * the resident primitive atlas, never an individual scene object per stake. */
export function spikeTrapParts(world:World):Placement[]{
 const parts:Placement[]=[];
 for(const s of world.structures){if(s.kind!=='spike-trap')continue;
  const color=buildingMaterialColor(s.material)??0xa38559;
  const add=(x:number,y:number,z:number,sx:number,sy:number,sz:number,shape?:Placement['shape'])=>parts.push({key:s.id,targetId:s.id,x:s.x+x,y,z:s.z+z,sx,sy,sz,color,...shape?{shape}:{}});
  for(const z of [-.26,.26])add(0,.08,z,.83,.16,.17);
  for(const x of [-.26,.26])add(x,.15,0,.16,.13,.83);
  for(const x of [-.27,.27])for(const z of [-.27,.27]){
   add(x,.27,z,.15,.19,.15);
   add(x,.48,z,.21,.29,.21,'trap-spike');
  }
 }
 return parts;
}
