import type { World } from '../sim/types';
import type { Placement } from './primitives';

/** Empty hoppers and the dispenser share the resident furniture batch.
 * Ingredients remain ordinary physical piles, presented independently. */
export function nutrientPasteParts(world:World):Placement[]{
  const parts:Placement[]=[];
  for(const s of world.structures){
    if(s.kind!=='nutrient-paste-dispenser'&&s.kind!=='hopper')continue;
    const ry=s.orientation*Math.PI/2,c=Math.cos(ry),sn=Math.sin(ry);
    const add=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number)=>
      parts.push({targetId:s.id,x:s.x+x*c+z*sn,y,z:s.z+z*c-x*sn,sx,sy,sz,ry,color});
    if(s.kind==='hopper'){
      // Open interior leaves the real pile visible. No simulated food model.
      add(0,.07,0,.90,.14,.90,0x597276);
      for(const x of [-.43,.43])add(x,.36,0,.09,.58,.90,0x8da6a0);
      for(const z of [-.43,.43])add(0,.36,z,.80,.58,.09,0x8da6a0);
      add(0,.67,-.43,.90,.06,.11,0xb6c1ac);
    }else{
      // Authored shell covers the complete footprint; service port faces south.
      add(0,.11,.5,2.86,.22,3.86,0x445c62);
      add(0,.99,.18,2.70,1.76,3.13,0x81978b);
      for(const x of [-.89,.89]){
        add(x,1.15,-.60,.62,2.04,1.55,0xa4b4a3);
        add(x,2.20,-.60,.66,.10,1.59,0xc5cfb7);
        add(x,1.21,1.62,.15,1.12,.20,0x597a78);
      }
      add(0,1.88,.43,1.65,.12,2.59,0xb9c4ab);
      add(0,.87,1.80,1.38,1.32,.20,0x466970);
      add(0,.85,1.94,.70,.64,.07,0x243e45);
      add(0,.55,2.06,.86,.08,.42,0xa6b8a4);
      add(.77,1.17,1.90,.32,.43,.09,0x97bfb0);
      add(.77,1.45,1.90,.14,.10,.10,0xcfb977);
    }
  }
  return parts;
}
