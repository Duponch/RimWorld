import { canDesignate } from '../../src/sim/engine.ts';
import type { World } from '../../src/sim/types.ts';
import type { Decision } from './colony-player.ts';

/** Expand the camp only after its first shelter and food buffer exist. The
 * player opens four exposed cells, then explicitly requests chunk storage. */
export function miningDecisions(world:World):Decision[] {
  if(world.tick<6000||world.structures.filter(s=>s.kind==='bed').length<3)return [];
  const out:Decision[]=[],cx=Math.floor(world.width/2),cz=Math.floor(world.height/2);
  const mined=world.tiles.filter(t=>t.terrain==='rough-stone').length;
  const pending=world.jobs.filter(j=>j.kind==='mine').length;
  if(mined+pending<4) {
    const targets=world.tiles.flatMap((t,i)=>t.terrain==='rock'?[{x:i%world.width,z:Math.floor(i/world.width)}]:[])
      .sort((a,b)=>Math.hypot(a.x-cx,a.z-cz)-Math.hypot(b.x-cx,b.z-cz));
    for(const target of targets) {
      if(out.length>=4-mined-pending)break;
      const command={type:'designate' as const,kind:'mine' as const,...target};
      const exposed=[[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dz])=>{const x=target.x+dx!,z=target.z+dz!;return x>=0&&z>=0&&x<world.width&&z<world.height&&['grass','soil','rough-stone'].includes(world.tiles[z*world.width+x]!.terrain);});
      if(exposed&&canDesignate(world,command).ok)out.push({reason:'Ouvrir quelques cases du massif proche pour préparer la pierre.',command});
    }
  }
  for(let i=0;i<4;i++) {
    const x=cx+5,z=cz+i-1;
    if(!world.stockpiles.some(s=>s.x===x&&s.z===z))out.push({reason:'Réserver des cases aux fragments, sans les mélanger aux aliments.',command:{type:'stockpile',x,z,enabled:true,filters:{wood:false,food:false,chunk:true},capacity:1}});
  }
  for(const p of world.piles)if(p.kind==='chunk'&&p.owner.type==='ground'&&!p.haulRequested&&!world.stockpiles.some(s=>s.filters.chunk&&p.owner.type==='ground'&&s.x===p.owner.x&&s.z===p.owner.z))out.push({reason:'Désigner les fragments extraits pour leur transport.',command:{type:'area',action:'haul-chunks',from:p.owner,to:p.owner}});
  return out;
}
