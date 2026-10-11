import type {World} from '../sim/types';
import type {Placement} from './primitives';
import {buildingMaterialColor} from './building-material-color';

/** The same resident parts supply finished furniture, ghosts and the portrait.
 * Corpses remain actual piles beside the interaction spot, never model props. */
export function crematoriumParts(world:World):Placement[] {
  const parts:Placement[]=[];
  for(const s of world.structures){
    if(s.kind!=='electric-crematorium')continue;
    const ry=s.orientation*Math.PI/2,c=Math.cos(ry),n=Math.sin(ry),stone=buildingMaterialColor(s.material)??0x8b9590;
    const add=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number)=>
      parts.push({key:s.id,targetId:s.id,x:s.x+x*c+z*n,y,z:s.z+z*c-x*n,sx,sy,sz,ry,color});
    add(0,.11,.5,2.88,.22,1.88,0x485c59);
    add(0,.72,.60,2.66,1.14,1.50,stone);
    add(0,1.34,.59,2.82,.13,1.72,0xa4aaa0);
    add(0,.68,-.17,1.70,.91,.055,0x263936);
    for(const x of [-.94,.94])add(x,.69,-.23,.19,1.04,.18,stone);
    add(0,1.20,-.23,1.94,.20,.18,stone);
    add(0,.23,-.23,1.94,.15,.18,stone);
    add(0,.36,-.18,1.47,.12,.31,0x69756b);
    for(const x of [-.60,-.30,0,.30,.60])add(x,.68,-.23,.045,.68,.05,0x72837a);
    add(1.24,.77,-.21,.33,.60,.12,0x425b58);
    add(1.24,.90,-.28,.21,.17,.03,0xb4c3ac);
    add(1.24,.65,-.28,.09,.09,.04,0xd9a468);
    add(-.91,1.47,1.09,.47,.25,.45,0x536762);
    add(-.91,1.61,1.09,.59,.07,.57,0x74867b);
  }
  return parts;
}
