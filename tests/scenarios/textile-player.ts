import { queryArea,buildAreaIndex } from '../../src/sim/designation.ts';
import type { World } from '../../src/sim/types.ts';
import type { Decision } from './colony-player.ts';

/** A small second field after food and shelter. All changes are player commands. */
export function textileDecisions(w:World):Decision[] {
  if(w.tick<12000||w.structures.filter(s=>s.kind==='bed').length<3||w.stock.food<8||!w.growingZones.length)return [];
  const cx=Math.floor(w.width/2),cz=Math.floor(w.height/2),from={x:cx+7,z:cz+5},to={x:cx+9,z:cz+6};
  const zone=w.growingZones.find(z=>z.cells.includes(from.z*w.width+from.x));
  const out:Decision[]=[];
  if(!zone){const c={type:'area',action:'growing',from,to} as const,result=queryArea(w,c,buildAreaIndex(w));if(result.ok&&result.cells.length===6)out.push({reason:'Préparer six cotonniers après le potager, pour la future confection.',command:c});}
  else if(zone.plant!=='cotton')out.push({reason:'Choisir le coton pour ce second champ, sans toucher au potager de riz.',command:{type:'growing-policy',zoneId:zone.id,plant:'cotton',allowSow:true,allowCut:true}});
  const stored=w.stockpiles.some(s=>s.filters.textile);
  if(!stored){const cell={x:cx+7,z:cz+3},result=queryArea(w,{type:'area',action:'stockpile',from:cell,to:cell});if(result.ok&&result.cells.length)out.push({reason:'Réserver une case au tissu récolté.',command:{type:'stockpile',enabled:true,...cell,filters:{wood:false,food:false,textile:true},capacity:75}});}
  return out;
}
