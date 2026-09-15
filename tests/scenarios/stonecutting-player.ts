import { buildAreaIndex,queryArea } from '../../src/sim/designation.ts';
import type { World } from '../../src/sim/types.ts';
import type { Decision } from './colony-player.ts';
import { isBlockMaterial } from '../../src/sim/building-materials.ts';
import { canDesignate } from '../../src/sim/engine.ts';

/** The player asks for a small first batch, using only mined physical chunks. */
export function stonecuttingDecisions(world:World):Decision[] {
  const station=world.structures.find(s=>s.kind==='stonecutter');if(!station)return [];
  const out:Decision[]=[],bill=station.bills?.[0];
  if(![...world.structures,...world.jobs].some(s=>s.kind==='wall'&&isBlockMaterial(s.material))) {
    const pile=world.piles.find(p=>p.owner.type==='ground'&&isBlockMaterial(p.item)&&p.quantity>=5);
    if(pile&&isBlockMaterial(pile.item)) {
      const command={type:'designate' as const,kind:'wall' as const,material:pile.item,x:Math.floor(world.width/2)-4,z:Math.floor(world.height/2)-3};
      if(canDesignate(world,command).ok)out.push({reason:'Prolonger le premier abri avec cinq blocs taillés sur place.',command});
    }
  }
  if(!bill)out.push({reason:'Tailler les premiers blocs du camp.',command:{type:'bill-add',structureId:station.id}});
  else if(bill.mode!=='until'||bill.target!==20)out.push({reason:'Maintenir vingt blocs de pierre disponibles.',command:{type:'bill-update',structureId:station.id,billId:bill.id,settings:{...bill,mode:'until',target:20}}});
  if(!world.stockpiles.some(s=>s.filters.blocks)) {
    const index=buildAreaIndex(world),cx=Math.floor(world.width/2),cz=Math.floor(world.height/2);
    for(let z=cz+3;z<=cz+7;z++)for(let x=cx+4;x<=cx+7;x++) {
      if(world.stockpiles.some(s=>s.x===x&&s.z===z))continue;
      const query=queryArea(world,{type:'area',action:'stockpile',from:{x,z},to:{x,z}},index);
      if(query.ok&&query.cells.length){out.push({reason:'Ranger les blocs taillés près des autres matériaux.',command:{type:'stockpile',x,z,enabled:true,filters:{wood:false,food:false,blocks:true},capacity:75}});return out;}
    }
  }
  return out;
}
