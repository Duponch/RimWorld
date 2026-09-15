import { canDesignate } from '../../src/sim/engine.ts';
import { buildAreaIndex, queryArea } from '../../src/sim/designation.ts';
import type { World } from '../../src/sim/types.ts';
import type { Decision } from './colony-player.ts';

/** Prepare the first electrical purchases after the camp has its workshop.
 * The player observes deposits and sends ordinary mining/storage commands. */
export function componentDecisions(world:World):Decision[] {
  if(!world.structures.some(s=>s.kind==='stonecutter'))return [];
  const out:Decision[]=[],cx=Math.floor(world.width/2),cz=Math.floor(world.height/2);
  const quantity=world.piles.reduce((n,p)=>n+(p.item==='component'?p.quantity:0),0);
  const pending=world.jobs.filter(j=>j.kind==='mine'&&world.tiles[j.z*world.width+j.x]!.ore==='machinery').length;
  let missing=Math.max(0,Math.ceil((6-quantity)/2)-pending);
  const targets=world.tiles.flatMap((t,i)=>t.ore==='machinery'?[{x:i%world.width,z:Math.floor(i/world.width)}]:[])
    .sort((a,b)=>Math.hypot(a.x-cx,a.z-cz)-Math.hypot(b.x-cx,b.z-cz));
  for(const target of targets) {
    if(!missing)break;
    const command={type:'designate' as const,kind:'mine' as const,...target};
    const exposed=[[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dz])=>{const x=target.x+dx!,z=target.z+dz!;return x>=0&&z>=0&&x<world.width&&z<world.height&&['grass','soil','rough-stone'].includes(world.tiles[z*world.width+x]!.terrain);});
    if(exposed&&canDesignate(world,command).ok){out.push({reason:'Extraire six composants pour préparer les appareils électriques.',command});missing--;}
  }
  if(!world.stockpiles.some(s=>s.filters.component)) {
    const index=buildAreaIndex(world);
    for(let z=cz+3;z<=cz+8;z++)for(let x=cx+4;x<=cx+8;x++) {
      if(world.stockpiles.some(s=>s.x===x&&s.z===z))continue;
      const query=queryArea(world,{type:'area',action:'stockpile',from:{x,z},to:{x,z}},index);
      if(query.ok&&query.cells.length){out.push({reason:'Ranger séparément les composants extraits.',command:{type:'stockpile',x,z,enabled:true,filters:{wood:false,food:false,component:true},capacity:50}});return out;}
    }
  }
  return out;
}
