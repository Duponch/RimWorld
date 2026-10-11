import type {World} from '../sim/types';
import type {Placement} from './primitives';

/** Furnace, refractory mouth, grate and controls share the resident furniture
 * batch. Power/work glow is drawn by StructureVfxLayer. */
export function smeltingParts(world:World):Placement[] {
  const parts:Placement[]=[];
  for(const s of world.structures){
    if(s.kind!=='electric-smelter')continue;
    const ry=s.orientation*Math.PI/2,c=Math.cos(ry),n=Math.sin(ry);
    const add=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number)=>
      parts.push({key:s.id,targetId:s.id,x:s.x+x*c+z*n,y,z:s.z+z*c-x*n,sx,sy,sz,ry,color});
    add(0,.10,0,2.84,.20,.84,0x455856);
    add(-.65,.69,0,1.35,1.08,.77,0x819889);
    add(-.65,1.27,0,1.45,.10,.84,0xa7b09a);
    add(-.65,.69,-.397,.93,.72,.025,0x2c3736);
    for(const x of [-1.19,-.11])add(x,.69,-.43,.15,.83,.10,0xd5b983);
    for(const y of [.28,1.10])add(-.65,y,-.43,1.15,.14,.10,0xc8ac78);
    add(-.65,.29,-.30,.81,.06,.28,0x6b6350);
    for(const x of [-.96,-.76,-.56,-.36])add(x,.35,-.32,.065,.055,.22,0x9b8a69);
    add(.62,.40,0,1.02,.60,.77,0x71867b);
    add(.64,.76,0,1.06,.11,.84,0x9aa895);
    add(.64,.83,0,.82,.025,.53,0x465650);
    for(const x of [.34,.49,.64,.79,.94])add(x,.852,0,.055,.024,.49,0x899888);
    add(1.20,.63,.14,.24,.96,.56,0x5d756c);
    add(1.20,1.15,.14,.28,.08,.60,0xa2ac95);
    add(.72,.52,-.405,.57,.25,.032,0x344e4c);
    add(.57,.55,-.434,.15,.11,.024,0x93b6a8);
    add(.89,.56,-.432,.072,.072,.029,0xc89c61);
    add(.89,.44,-.432,.072,.04,.029,0x947451);
    add(-1.32,.64,.28,.12,.62,.18,0x5d726a);
    add(-.25,1.08,.29,.19,.24,.18,0x5e736a);
  }
  return parts;
}
