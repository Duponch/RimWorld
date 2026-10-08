import { apparelFamily,isApparelItem } from './apparel-rules.ts';
import { biologicalYears } from './human-age.ts';
import type { ItemId } from './items.ts';
import type { MaterialPile,Pawn,World } from './types.ts';

export interface CommercialMass {grams:number;capacityGrams:number}
const FIXED:Readonly<Partial<Record<ItemId,number>>>=Object.freeze({
  silver:8,'survival-meal':300,medicine:500,neutroamine:20,component:600,cloth:26,'muffalo-wool':28,
  revolver:1400,'bolt-action-rifle':3500,'plasteel-knife':500,'emp-launcher':3400,
  'flak-vest':4000,'flak-helmet':1200,'recon-helmet':1000,
});
const TEXTILE=Object.freeze({tribalwear:500,shirt:300,pants:500,duster:2000,parka:2000});

/** The delivered shirt is Core's CollarShirt, not the lighter BasicShirt.
 * Quality, HP and the seven represented stuffs do not alter these masses. */
export function commercialItemMassGrams(item:ItemId):number|undefined {
  const fixed=FIXED[item];if(fixed!==undefined)return fixed;
  if(!isApparelItem(item))return undefined;
  const family=apparelFamily(item);return family?TEXTILE[family]:undefined;
}
/** Pure ownership projection. All worn/equipped gear counts once; the live
 * person's body and goods owned by the map or another actor do not count. */
export function commercialPawnMass(p:Pawn,items:readonly MaterialPile[]):CommercialMass|null {
  if(p.age&&biologicalYears(p.age)<18)return null;
  let grams=0;const ids=new Set<number>();
  for(const pile of items){
    const o=pile.owner;
    if(!o||!('pawnId' in o)||o.pawnId!==p.id||!['inventory','equipment','apparel'].includes(o.type))continue;
    const unit=commercialItemMassGrams(pile.item);
    if(unit===undefined||!Number.isSafeInteger(pile.quantity)||pile.quantity<1
      ||o.type!=='inventory'&&pile.quantity!==1||ids.has(pile.id))return null;
    ids.add(pile.id);grams+=unit*pile.quantity;
    if(!Number.isSafeInteger(grams))return null;
  }
  return {grams,capacityGrams:35000};
}
/** Pass trip.items off-map; the default only consults live map possessions. */
export function commercialMass(w:World,p:Pawn,items:readonly MaterialPile[]=w.piles):CommercialMass|null {
  return commercialPawnMass(p,items);
}
