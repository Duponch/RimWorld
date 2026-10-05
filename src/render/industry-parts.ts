import type { World } from '../sim/types';
import type { Placement } from './primitives';
import { WORLD_SCALE } from '../world/scale';

/** Three high-tech objects join the static resident furniture batch. Rebuilt
 * only on a world presentation change, never per frame or per actor. */
export function industryParts(world:World):Placement[]{
  const parts:Placement[]=[],h=WORLD_SCALE.stonecutterHeight;
  for(const s of world.structures){
    if(s.kind!=='hi-tech-research-bench'&&s.kind!=='multi-analyzer'&&s.kind!=='fabrication-bench')continue;
    const ry=s.orientation*Math.PI/2,cos=Math.cos(ry),sin=Math.sin(ry);
    const centerX=s.kind==='multi-analyzer'?.5:0,centerZ=.5;
    const add=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number)=>{
      const xx=x+centerX,zz=z+centerZ;
      parts.push({x:s.x+xx*cos+zz*sin,y,z:s.z+zz*cos-xx*sin,sx,sy,sz,ry,color});
    };
    if(s.kind==='multi-analyzer'){
      add(0,.14,0,1.7,.28,1.7,0x465a5d);
      add(0,.78,0,1.28,1.06,1.25,0x67868a);
      add(0,1.37,0,1.44,.16,1.42,0x345359);
      add(0,1.52,0,.62,.18,.62,0xb6c7b5);
      add(0,1.59,0,.36,.12,.36,0x73bdd0);
      for(const x of [-.46,.46])for(const z of [-.45,.45])add(x,.47,z,.13,.66,.13,0x34494c);
      continue;
    }
    const fabrication=s.kind==='fabrication-bench';
    const frame=fabrication?0x586f70:0x526879,top=fabrication?0x8b9d92:0x90a7ac;
    add(0,h-.09,0,4.78,.18,1.72,top);
    add(0,.20,.74,4.72,.30,.13,frame);
    add(0,.20,-.74,4.72,.30,.13,frame);
    for(const x of [-2.19,0,2.19])for(const z of [-.66,.66])add(x,(h-.17)/2,z,.16,h-.17,.16,frame);
    for(const x of [-1.55,-.52,.52,1.55]){
      if(fabrication){
        add(x,h+.17,-.1,.72,.36,.82,0x435c60);
        add(x,h+.37,-.1,.48,.06,.48,0xb2bfab);
        add(x,h+.42,-.1,.18,.04,.18,0xd4a665);
      }else{
        add(x,h+.19,.28,.71,.40,.12,0x455761);
        // The research service and keyboard are on local -z, before the desk.
        add(x,h+.20,.205,.55,.28,.035,0x6caaa9);
        add(x,h+.025,-.27,.66,.04,.43,0xd9d2b2);
      }
    }
    if(fabrication)add(0,h+.12,.64,3.7,.08,.11,0x374c52);
  }
  return parts;
}
