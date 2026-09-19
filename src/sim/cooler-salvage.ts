import { constructionRecipe } from './construction-materials.ts';
import { groundCapacity,planGroundPlacement } from './ground-placement.ts';
import { addMaterial } from './materials.ts';
import { ITEM_DEFINITIONS,type ItemId } from './items.ts';
import type { Structure,World } from './types.ts';

/** Preview destruction's quarter yield on a private material ledger. Failed
 * placement consumes neither the building nor random state nor existing piles. */
export function coolerSalvage(w:World,s:Structure,rng:number){
  const view={...w,structures:w.structures.filter(b=>b!==s),piles:w.piles.map(p=>({...p,owner:{...p.owner}})),jobs:w.jobs.map(j=>({...j,escrow:{...j.escrow}}))};
  const drops:{item:ItemId;quantity:number;cell:{x:number;z:number}}[]=[],returned=new Map<ItemId,number>();
  for(const c of constructionRecipe(s).ingredients){
    let quantity=Math.floor(c.quantity/4);const fraction=c.quantity/4-quantity;
    if(fraction){rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;rng>>>=0;if(rng/0x100000000<fraction)quantity++;}
    returned.set(c.item,quantity);if(!quantity)continue;
    const placements=groundCapacity(view,s,c.item)>=quantity?[{cell:{x:s.x,z:s.z},quantity}]:planGroundPlacement(view,quantity,s,c.item);
    if(!placements||view.piles.length+placements.length>32768||!Number.isSafeInteger(view.nextId+placements.length))return null;
    for(const d of placements){drops.push({...d,item:c.item});addMaterial(view,ITEM_DEFINITIONS[c.item].kind,d.quantity,{type:'ground',...d.cell},c.item);}
  }return {rng,drops,returned};
}
