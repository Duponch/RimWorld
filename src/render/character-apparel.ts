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
    helmet:pieces.some(p=>p.item==='flak-helmet'||p.item==='recon-helmet'),
    reconHelmet:pieces.some(p=>p.item==='recon-helmet'),
    silhouette:outer?(definition!.family==='parka'?4:3):tribal?2:shirt?1:0,
    pants:pants?((['cloth','light-leather','plainleather','bluefur','camelhide','muffalo-wool','foxfur'].indexOf(APPAREL[pants.item as ApparelItem].material??'cloth')+1)):0,
    color:definition?.color,signature:pieces.map(p=>p.item).sort().join(' '),description:pieces.map(apparelLabel).join(', ')||'Aucun vêtement équipé'};
}
export const APPAREL_CARGO:Readonly<Record<ApparelItem,number>>=Object.freeze({
  'foxfur-tribalwear':76,'foxfur-shirt':77,'foxfur-pants':78,'foxfur-duster':79,'foxfur-parka':80,
  'plainleather-tribalwear':39,
  'plainleather-shirt':40,
  'plainleather-pants':41,
  'plainleather-duster':42,
  'plainleather-parka':43,
  'bluefur-tribalwear':44,
  'bluefur-shirt':45,
  'bluefur-pants':46,
  'bluefur-duster':47,
  'bluefur-parka':48,
  'camelhide-tribalwear':49,
  'camelhide-shirt':50,
  'camelhide-pants':51,
  'camelhide-duster':52,
  'camelhide-parka':53,
  'muffalo-wool-tribalwear':54,
  'muffalo-wool-shirt':55,
  'muffalo-wool-pants':56,
  'muffalo-wool-duster':57,
  'muffalo-wool-parka':58,
  'flak-helmet':59,
  'recon-helmet':72,
  'cloth-shirt':22,'flak-vest':23,'cloth-tribalwear':26,'light-leather-shirt':31,'light-leather-tribalwear':32,
  'cloth-pants':33,'light-leather-pants':34,'cloth-duster':35,'light-leather-duster':36,'cloth-parka':37,'light-leather-parka':38,
});
/** Folded ground/cargo meshes share dimensions and colors, in world units. */
export function foldedApparel(item:ApparelItem) {
  const color=APPAREL[item].color;
  if(item==='flak-helmet')return [{size:[.34,.14,.33],center:[0,.04,0],color},
    {size:[.42,.035,.36],center:[0,-.01,.03],color:0x424e51}];
  if(item==='recon-helmet')return [{size:[.36,.19,.35],center:[0,.025,0],color},
    {size:[.39,.045,.29],center:[0,-.085,.025],color:0x536a74},
    {size:[.29,.045,.035],center:[0,.015,.19],color:0x344a57}];
  return [{size:[.42,.12,.48],center:[0,0,0],color},
    {size:[.16,.025,.12],center:[0,.073,-.12],color:item==='flak-vest'?0x3d4945:0xf0e8d5}];
}
