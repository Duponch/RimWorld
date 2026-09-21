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
  const family=(name:string)=>pieces.find(p=>APPAREL[p.item as ApparelItem]?.family===name);
  const shirt=family('shirt'),tribal=family('tribalwear'),pants=family('pants'),outer=family('duster')??family('parka');
  const top=outer??tribal??shirt,definition=top?APPAREL[top.item as ApparelItem]:undefined;
  return {shirt:!!shirt,tribal:!!tribal,vest:pieces.some(p=>p.item==='flak-vest')&&!outer,
    silhouette:outer?(definition!.family==='parka'?4:3):tribal?2:shirt?1:0,
    pants:pants?(APPAREL[pants.item as ApparelItem].material==='light-leather'?2:1):0,
    color:definition?.color,signature:pieces.map(p=>p.item).sort().join(' '),description:pieces.map(apparelLabel).join(', ')||'Aucun vêtement équipé'};
}
export const APPAREL_CARGO:Readonly<Record<ApparelItem,number>>=Object.freeze({
  'cloth-shirt':22,'flak-vest':23,'cloth-tribalwear':26,'light-leather-shirt':31,'light-leather-tribalwear':32,
  'cloth-pants':33,'light-leather-pants':34,'cloth-duster':35,'light-leather-duster':36,'cloth-parka':37,'light-leather-parka':38,
});
/** Folded ground/cargo meshes share dimensions and colors, in world units. */
export function foldedApparel(item:ApparelItem) {
  const color=APPAREL[item].color;
  return [{size:[.42,.12,.48],center:[0,0,0],color},
    {size:[.16,.025,.12],center:[0,.073,-.12],color:item==='flak-vest'?0x3d4945:0xf0e8d5}];
}
