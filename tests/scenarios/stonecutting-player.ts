import { buildAreaIndex,queryArea } from '../../src/sim/designation.ts';
import type { World } from '../../src/sim/types.ts';
import type { Decision } from './colony-player.ts';

/** The player asks for a small first batch, using only mined physical chunks. */
export function stonecuttingDecisions(world:World):Decision[] {
  const station=world.structures.find(s=>s.kind==='stonecutter');if(!station)return [];
  const out:Decision[]=[],bill=station.bills?.[0];
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
