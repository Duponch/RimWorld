import type { World } from '../sim/types';
import type { Placement } from './primitives';

/** Static machinery joins the existing resident furniture batch. Work progress
 * changes neither its geometry nor the number of pieces. */
export function deepDrillingParts(world:World):Placement[]{
  const parts:Placement[]=[];
  for(const s of world.structures){
    if(s.kind!=='deep-drill'&&s.kind!=='ground-scanner')continue;
    const ry=s.orientation*Math.PI/2,cos=Math.cos(ry),sin=Math.sin(ry);
    const add=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number)=>
      parts.push({x:s.x+x*cos+z*sin,y,z:s.z+z*cos-x*sin,sx,sy,sz,ry,color});
    if(s.kind==='deep-drill'){
      add(0,.10,0,.86,.20,.84,0x465559);
      add(-.31,.65,.08,.12,1.10,.16,0x6c8282);add(.31,.65,.08,.12,1.10,.16,0x6c8282);
      add(0,1.19,.08,.78,.16,.28,0x9eafa5);
      add(0,.65,.08,.14,1.06,.14,0xa4b1a6);
      for(const y of [.28,.46,.64,.82])add(0,y,.08,.28,.07,.23,0x526b70);
      add(.22,.43,-.21,.29,.40,.30,0x4c747b);add(.22,.65,-.23,.27,.07,.26,0xb3a76b);
      add(0,.82,-.27,.56,.08,.09,0x8d9d91);
      add(-.27,.27,-.30,.17,.14,.16,0xc3b77c);
    }else{
      add(0,.14,0,2.32,.28,2.22,0x465b60);
      for(const x of [-.88,.88])for(const z of [-.83,.83])add(x,.35,z,.25,.42,.25,0x647e7e);
      add(0,.61,-.35,1.48,.62,1.11,0x6a8587);
      add(0,1.09,-.35,.24,.44,.24,0xaab6a5);
      add(0,1.35,-.35,2.20,.14,.40,0xaab6a5);
      for(const x of [-.87,-.43,0,.43,.87])add(x,1.43,-.35,.08,.10,.90,0x8caa9e);
      add(0,.71,.81,1.30,.24,.47,0x4e6e72);
      add(-.22,.85,.79,.70,.06,.31,0x83b7a4);
      add(.42,.86,.78,.12,.06,.13,0xd4b976);
      add(-.90,.59,.60,.16,.35,.41,0x9ba99b);add(.90,.59,.60,.16,.35,.41,0x9ba99b);
    }
  }
  return parts;
}
