import {mergeFertilizedEgg256} from './animal-egg-state-v256.ts';
import { copyRot } from './food-preservation.ts';
import { mergedFoodPoison } from './food-poisoning.ts';
import type { MaterialPile } from './types.ts';

/** A split keeps the condition of the whole stack; it creates no fresh goods. */
export function copyPileCondition(pile:Pick<MaterialPile,'rot'|'damage'|'foodPoison'|'egg'|'eggForbidden'|'forbidden'>):Pick<MaterialPile,'rot'|'damage'|'foodPoison'|'egg'|'eggForbidden'|'forbidden'> {
  return {...(pile.forbidden?{forbidden:true as const}:{}),...(pile.eggForbidden?{eggForbidden:true as const}:{}),...copyRot(pile),...(pile.egg?{egg:{...pile.egg}}:{}),...(pile.damage?{damage:pile.damage}:{}),...(pile.foodPoison?{foodPoison:{...pile.foodPoison}}:{})};
}
/** Capture both quantities before the material transfer, including fresh food. */
export function mergePileContamination(target:MaterialPile,quantity:number,source?:MaterialPile['foodPoison']):void {
  if(!quantity)return;
  const poison=mergedFoodPoison(target.foodPoison,target.quantity,source,quantity);
  if(poison)target.foodPoison=poison;else delete target.foodPoison;
}

/** Before quantity changes; this helper never hatches or advances a clock. */
export function mergePileEgg256(target:MaterialPile,quantity:number,source:MaterialPile['egg']):void {
 if(!quantity||!target.egg&&!source)return;
 if(!target.egg||!source)throw Error('Missing egg biological source.');
 target.egg=mergeFertilizedEgg256(target.egg,target.quantity,source,quantity);
}
