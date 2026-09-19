import { canDesignate } from '../../src/sim/engine.ts';
import { queryArea } from '../../src/sim/designation.ts';
import { cookingPlaceFree,cookingSpot } from '../../src/sim/cooking-bills.ts';
import { equippedWeapon } from '../../src/sim/equipment-rules.ts';
import { isColonist } from '../../src/sim/affiliation.ts';
import type { World,Cell } from '../../src/sim/types';
import type { Decision } from './colony-player.ts';

/** One nearby animal after the shelter and food buffer, not an indiscriminate
 * cull. Decisions are player commands and never inject a corpse or ingredient. */
export function huntingDecisions(w:World):Decision[] {
  if(w.tick<6000||!w.wildlife||w.structures.filter(s=>s.kind==='bed').length<3||!w.structures.some(s=>s.kind==='campfire')||w.stock.food<8)return [];
  const hunter=w.pawns.find(p=>isColonist(p)&&p.state!=='dead'&&p.state!=='downed'&&p.state!=='sleeping'&&!p.mental?.crisis&&!p.draft&&!p.need&&p.hunger>55&&p.rest>55&&!!equippedWeapon(w,p));
  if(!hunter)return [];
  const out:Decision[]=[],cx=Math.floor(w.width/2),cz=Math.floor(w.height/2),distance=(c:Cell)=>(c.x-cx)**2+(c.z-cz)**2;
  let spot=w.structures.find(s=>s.kind==='butcher-spot');
  if(!spot){
    const cells:Cell[]=[];for(let z=cz-6;z<=cz+6;z++)for(let x=cx-6;x<=cx+6;x++)if(Math.abs(x-cx)>4||Math.abs(z-cz)>4)cells.push({x,z});cells.sort((a,b)=>distance(a)-distance(b)||a.z-b.z||a.x-b.x);
    const cell=cells.find(c=>!w.resources.some(r=>r.x===c.x&&r.z===c.z)&&!w.jobs.some(j=>j.x===c.x&&j.z===c.z)&&!w.stockpiles.some(z=>z.x===c.x&&z.z===c.z)&&!w.growingZones.some(z=>z.cells.includes(c.z*w.width+c.x))&&canDesignate(w,{type:'designate',kind:'butcher-spot',...c}).ok&&cookingPlaceFree(w,{x:c.x,z:c.z-1}));
    if(cell)out.push({reason:'Préparer la boucherie avant une chasse limitée pour diversifier les repas.',command:{type:'designate',kind:'butcher-spot',...cell}});
    return out;
  }
  if(!spot.bills?.length&&!w.butchery?.completed)out.push({reason:'Dépecer une dépouille fraîche, en conservant les deux produits.',command:{type:'bill-add',structureId:spot.id}});
  if(!w.stockpiles.some(s=>s.filters.corpse)){
    const places=[{x:spot.x,z:spot.z+1},{x:spot.x-1,z:spot.z},{x:spot.x+1,z:spot.z}];
    const cell=places.find(c=>!w.stockpiles.some(s=>s.x===c.x&&s.z===c.z)&&(()=>{const q=queryArea(w,{type:'area',action:'stockpile',from:c,to:c});return q.ok&&q.cells.length>0;})());
    if(cell)out.push({reason:'Prévoir une case dédiée à la dépouille avant de chasser.',command:{type:'stockpile',...cell,enabled:true,filters:{wood:false,food:false,corpse:true},capacity:1}});
    return out;
  }
  if((w.hunting?.completed??0)>=1||(w.butchery?.completed??0)>=1||w.hunting?.targets.length)return out;
  if(hunter.priorities.hunt!==1)out.push({reason:'Confier une courte chasse au colon déjà armé et reposé.',command:{type:'priority',pawnId:hunter.id,work:'hunt',value:1}});
  const target=w.wildlife.animals.filter(a=>a.state!=='dead'&&distance(a)<=28**2&&!w.pawns.some(p=>p!==hunter&&(p.x-a.x)**2+(p.z-a.z)**2<9)).sort((a,b)=>distance(a)-distance(b)||a.id-b.id)[0];
  if(target)out.push({reason:'Chasser un seul lièvre proche ; préserver le reste de la faune.',command:{type:'hunt',animalId:target.id,enabled:true}});
  return out;
}
/** Replacing an animal with its body and then food must not lose its census. */
export function wildlifePopulationAccount(w:World):number {
  return (w.wildlife?.animals.length??0)+w.piles.filter(p=>p.kind==='corpse').length+(w.butchery?.completed??0);
}
