import { queryArea,buildAreaIndex } from '../../src/sim/designation.ts';
import type { World } from '../../src/sim/types.ts';
import type { Decision } from './colony-player.ts';

/** A small second field after food and shelter. All changes are player commands. */
export function textileDecisions(w:World):Decision[] {
  if(w.tick<12000||w.structures.filter(s=>s.kind==='bed').length<3||w.stock.food<8||!w.growingZones.length)return [];
  const cx=Math.floor(w.width/2),cz=Math.floor(w.height/2),from={x:cx+7,z:cz+5},to={x:cx+9,z:cz+6};
  const zone=w.growingZones.find(z=>z.cells.includes(from.z*w.width+from.x));
  const out:Decision[]=[];
  if(!zone){const c={type:'area',action:'growing',from,to} as const,result=queryArea(w,c,buildAreaIndex(w));if(result.ok&&result.cells.length===6)out.push({reason:'Préparer six cotonniers après le potager, pour confectionner une tenue.',command:c});}
  else if(zone.plant!=='cotton')out.push({reason:'Choisir le coton pour ce second champ, sans toucher au potager de riz.',command:{type:'growing-policy',zoneId:zone.id,plant:'cotton',allowSow:true,allowCut:true}});
  const stored=w.stockpiles.some(s=>s.filters.textile);
  if(!stored){const cell={x:cx+7,z:cz+3},result=queryArea(w,{type:'area',action:'stockpile',from:cell,to:cell});if(result.ok&&result.cells.length)out.push({reason:'Réserver une case au tissu récolté.',command:{type:'stockpile',enabled:true,...cell,filters:{wood:false,food:false,textile:true},capacity:75}});}
  const cloth=w.piles.filter(p=>p.item==='cloth'&&p.owner.type==='ground').reduce((n,p)=>n+p.quantity,0),spot=w.structures.find(s=>s.kind==='crafting-spot');
  if(cloth>=60&&!spot)out.push({reason:'Fabriquer un premier équipement avec notre propre récolte.',command:{type:'designate',kind:'crafting-spot',x:cx+6,z:cz+3}});
  if(spot&&!spot.bills?.length&&!(w.tailoring?.completed))out.push({reason:'Confectionner une tenue tribale sans recherche préalable.',command:{type:'bill-add',structureId:spot.id}});
  const garment=w.piles.find(p=>p.item==='cloth-tribalwear'&&p.owner.type==='ground'),wearer=w.pawns.find(p=>p.state!=='dead'&&p.state!=='downed'&&!p.equipmentTask&&!w.piles.some(i=>i.owner.type==='apparel'&&i.owner.pawnId===p.id&&i.item==='cloth-tribalwear'));
  if(garment&&wearer)out.push({reason:'Porter la tenue issue du champ de coton.',command:{type:'order-equipment',pawnId:wearer.id,itemId:garment.id,action:'wear',queue:false}});
  return out;
}
