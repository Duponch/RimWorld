import { APPAREL,apparelLabel,type ApparelItem } from '../sim/apparel-rules';
import type { World,MaterialPile } from '../sim/types';

/** One snapshot projection for map and portraits; no render-owned inventory. */
export function apparelProjection(world:World):ReadonlyMap<number,readonly MaterialPile[]> {
  const result=new Map<number,MaterialPile[]>();
  for(const pile of world.piles)if(pile.owner.type==='apparel'){
    const list=result.get(pile.owner.pawnId)??[];list.push(pile);result.set(pile.owner.pawnId,list);
  }
  return result;
}
export function apparelAppearance(pieces:readonly MaterialPile[]=[]) {
  const shirt=pieces.some(p=>p.item==='cloth-shirt'),tribal=pieces.some(p=>p.item==='cloth-tribalwear'),vest=pieces.some(p=>p.item==='flak-vest');
  return {shirt,tribal,vest,color:tribal?APPAREL['cloth-tribalwear'].color:shirt?APPAREL['cloth-shirt'].color:undefined,signature:pieces.map(p=>p.item).sort().join(' '),description:pieces.map(apparelLabel).join(', ')||'Aucun vêtement équipé'};
}
/** Folded ground/cargo meshes share dimensions and colors, in world units. */
export function foldedApparel(item:ApparelItem) {
  const color=APPAREL[item].color;
  return [{size:[.42,.12,.48],center:[0,0,0],color},
    {size:[.16,.025,.12],center:[0,.073,-.12],color:item==='flak-vest'?0x3d4945:0xf0e8d5}];
}
