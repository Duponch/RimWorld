import type { World } from '../sim/types';
import { buildingMaterialColor } from './building-material-color';
import type { Placement } from './primitives';
import { WORLD_SCALE } from '../world/scale';

/** Static carved forms and a manual sculpting table in the resident box batch.
 * Shapes are expanded only when structure content changes. */
export function artParts(world:World):Placement[] {
  const parts:Placement[]=[];
  for(const structure of world.structures){
    const kind=structure.kind;
    if(kind!=='art-bench'&&kind!=='small-sculpture'&&kind!=='large-sculpture')continue;
    const {x,z,id}=structure,ry=structure.orientation*Math.PI/2,cos=Math.cos(ry),sin=Math.sin(ry);
    const stone=buildingMaterialColor(structure.material,0x9b7e58)??0x9b7e58;
    const trim=shade(stone,.7);
    const add=(localX:number,y:number,localZ:number,sx:number,sy:number,sz:number,color=stone):void=>{
      parts.push({key:id,x:x+localX*cos+localZ*sin,y,z:z+localZ*cos-localX*sin,sx,sy,sz,ry,color});
    };
    if(kind==='art-bench'){
      const height=WORLD_SCALE.stonecutterHeight,width=WORLD_SCALE.stonecutterWidth,depth=WORLD_SCALE.stonecutterDepth;
      add(0,height-.065,0,width,.13,depth);
      for(const dx of [-1,1])for(const dz of [-1,1])add(dx*(width/2-.18),(height-.13)/2,dz*(depth/2-.13),.14,height-.13,.14,trim);
      add(0,.26,0,width-.28,.12,.13,trim);
      // A raw block and a narrow hand chisel make the manual purpose visible.
      add(-.63,height+.16,0,.48,.32,.44,0xa5a097);
      add(-.63,height+.34,0,.35,.055,.33,0xb9b3a5);
      add(.48,height+.035,.19,.64,.05,.07,0xb0b9b8);
      add(.85,height+.045,.19,.18,.075,.15,0x685540);
      add(.82,height+.045,-.16,.42,.08,.13,trim);
      continue;
    }
    const large=kind==='large-sculpture';
    add(0,.09,0,large?.81:.68,.18,large?.81:.68,trim);
    add(0,large?.24:.21,0,large?.64:.51,.13,large?.64:.51,stone);
    if(!large){
      // Square-cut shoulders, neck, head and a forward nose read as a bust.
      add(0,.43,0,.46,.33,.31);
      add(0,.65,0,.18,.18,.18,trim);
      add(0,.89,0,.32,.34,.29);
      add(0,.88,-.18,.10,.10,.12,stone);
      add(-.17,.99,-.09,.045,.055,.045,trim);
      add(.17,.99,-.09,.045,.055,.045,trim);
    }else{
      // A compact stylized quadruped: body, four legs, neck, head and tail.
      add(0,.86,0,.43,.42,.57);
      for(const dx of [-.15,.15])for(const dz of [-.2,.2])add(dx,.52,dz,.11,.40,.12);
      add(0,1.16,-.2,.22,.28,.22);
      add(0,1.36,-.30,.28,.24,.24);
      add(0,1.31,-.48,.17,.105,.18);
      for(const dx of [-.09,.09])add(dx,1.53,-.29,.065,.14,.07);
      add(0,1.08,.35,.10,.10,.30,trim);
    }
  }
  return parts;
}

function shade(color:number,factor:number):number {
  const r=Math.round(((color>>16)&255)*factor),g=Math.round(((color>>8)&255)*factor),b=Math.round((color&255)*factor);
  return (r<<16)|(g<<8)|b;
}
