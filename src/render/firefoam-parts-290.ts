import type {World} from '../sim/types';
import type {Placement} from './primitives';

/** Original compact canister, drawn through the resident instance batches.
 * The same parts supply installed objects, previews and inspection portraits. */
export function firefoamParts290(world:World):Placement[]{
 const parts:Placement[]=[];
 for(const s of world.structures){if(s.kind!=='firefoam-popper')continue;
  const add=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number,ry=0)=>parts.push({key:s.id,targetId:s.id,x:s.x+x,y,z:s.z+z,sx,sy,sz,color,ry});
  add(0,.055,0,.70,.11,.70,0x47545b);
  for(let i=0;i<8;i++){const angle=i*Math.PI/4;add(Math.sin(angle)*.19,.40,Math.cos(angle)*.19,.28,.61,.20,0xa8b8b7,angle);}
  add(0,.39,0,.60,.13,.60,0xe6eee3);
  add(0,.76,0,.53,.12,.53,0x8aaba2);
  add(0,.86,0,.23,.12,.23,0xb74835);
  add(0,.94,0,.40,.06,.14,0x4c5b5d);
  add(0,.52,-.32,.20,.24,.035,0x47766d);
  add(0,.52,-.345,.13,.055,.012,0xf5eed2);
  add(0,.52,-.35,.045,.16,.012,0xf5eed2);
 }
 return parts;
}
