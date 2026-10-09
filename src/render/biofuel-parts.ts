import type { World } from '../sim/types';
import type { Placement } from './primitives';
import { WORLD_SCALE } from '../world/scale';

export const CHEMFUEL_CARGO = 81;

/** Machinery joins the resident furniture batch; inputs and products remain
 * ordinary physical piles. No reservoir content is drawn as a ground item. */
export function biofuelParts(world:World):Placement[] {
  const parts:Placement[]=[];
  for(const s of world.structures){
    if(s.kind!=='biofuel-refinery'&&s.kind!=='chemfuel-generator')continue;
    const refinery=s.kind==='biofuel-refinery',ry=refinery?s.orientation*Math.PI/2:0,c=Math.cos(ry),n=Math.sin(ry);
    const cx=refinery?0:.5,cz=.5;
    const add=(lx:number,y:number,lz:number,sx:number,sy:number,sz:number,color:number)=>{
      const x=lx+cx,z=lz+cz;
      parts.push({key:s.id,x:s.x+x*c+z*n,y,z:s.z+z*c-x*n,sx,sy,sz,ry,color});
    };
    if(refinery){
      add(0,.11,0,2.86,.22,1.86,0x435c60);
      add(0,.47,0,2.65,.72,1.65,0x7e9486);
      add(0,WORLD_SCALE.stonecutterHeight,-.56,2.67,.10,.58,0xb3bc9f);
      for(const x of [-.89,.89]){
        add(x,1.10,.29,.63,1.06,.87,0xb2ba9c);
        add(x,1.65,.29,.68,.07,.92,0x5d7771);
        add(x,.96,-.19,.10,.58,.12,0x81958a);
      }
      add(0,1.27,.31,1.19,.13,.15,0x637c71);
      add(0,1.03,-.13,.73,.48,.19,0x496b6b);
      add(0,1.05,-.24,.50,.28,.04,0x93b0a1);
      add(.64,.72,-.83,.33,.32,.06,0x5c776f);
      add(.64,.74,-.87,.15,.10,.04,0xc7ac6e);
    }else{
      add(0,.12,0,1.86,.24,1.86,0x465f5d);
      add(-.35,.58,0,.89,.85,1.40,0x7c9384);
      add(-.35,1.04,0,.94,.08,1.47,0xadc0a5);
      add(.45,.66,.09,.55,1.03,1.30,0xaf9561);
      for(const z of [-.31,.44])add(.45,.69,z,.60,.08,.08,0x5d756c);
      add(.45,1.23,.09,.29,.12,.32,0x4a6762);
      add(-.35,.66,.73,.61,.31,.05,0x344e50);
      for(const x of [-.55,-.35,-.15])add(x,.69,.77,.08,.15,.04,0x98aa8e);
      add(-.35,1.39,-.52,.19,.64,.19,0x526b66);
    }
  }
  return parts;
}
