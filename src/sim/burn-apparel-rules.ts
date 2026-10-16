import {APPAREL,isApparelItem} from './apparel-rules.ts';
import {WEAPON_QUALITIES} from './equipment-rules.ts';
import {smeltingHitPointsPercent,validSmeltFilter} from './smelting-rules.ts';
import {BURN_APPAREL_INPUTS,isBurnApparelRecipe} from './burn-apparel-content.ts';
import type {CookingBill} from './cooking-types.ts';
import type {MaterialPile} from './types.ts';
export {BURN_APPAREL_INPUTS,BURN_APPAREL_WORK_TICKS,isBurnApparelRecipe,type BurnApparelRecipe} from './burn-apparel-content.ts';
/** Ownership is checked separately for each source/held/placed stage. */
export function burnApparelIngredientAllowed(bill:CookingBill,pile:MaterialPile):boolean {
  if(!isBurnApparelRecipe(bill.recipe)||!validSmeltFilter(bill.smeltFilter)||!isApparelItem(pile.item)
    ||!BURN_APPAREL_INPUTS.includes(pile.item)||pile.kind!=='apparel'||pile.quantity!==1||bill.filters[pile.item]!==true
    ||!pile.apparel||pile.apparel.forbidden!==undefined)return false;
  const state=pile.apparel,definition=APPAREL[pile.item],quality=WEAPON_QUALITIES.indexOf(state.quality);
  if(Object.keys(state).some(k=>!['quality','hitPoints','material','forbidden','forced'].includes(k))
    ||!Number.isInteger(state.hitPoints)||state.hitPoints<=0||state.hitPoints>definition.hitPoints||quality<0
    ||state.material!==undefined&&state.material!==definition.material||state.forced!==undefined&&state.forced!==true)return false;
  const hp=smeltingHitPointsPercent(state.hitPoints,definition.hitPoints),filter=bill.smeltFilter;
  return hp>=filter.hpMin&&hp<=filter.hpMax&&quality>=WEAPON_QUALITIES.indexOf(filter.qualityMin)&&quality<=WEAPON_QUALITIES.indexOf(filter.qualityMax);
}
export function validBurnApparelIngredients(parts:readonly unknown[]):boolean {
  if(!Array.isArray(parts)||parts.length!==1||!parts[0]||typeof parts[0]!=='object'||Array.isArray(parts[0]))return false;
  const part=parts[0] as Record<string,unknown>;return part.quantity===1&&BURN_APPAREL_INPUTS.some(item=>item===part.item);
}
