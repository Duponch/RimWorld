import { copyRot } from './food-preservation.ts';
import { mergedFoodPoison } from './food-poisoning.ts';
import type { MaterialPile } from './types.ts';

/** A split keeps the condition of the whole stack; it creates no fresh goods. */
export function copyPileCondition(pile:MaterialPile):Pick<MaterialPile,'rot'|'damage'|'foodPoison'> {
  return {...copyRot(pile),...(pile.damage?{damage:pile.damage}:{}),...(pile.foodPoison?{foodPoison:{...pile.foodPoison}}:{})};
}
/** Capture both quantities before the material transfer, including fresh food. */
export function mergePileContamination(target:MaterialPile,quantity:number,source?:MaterialPile['foodPoison']):void {
  if(!quantity)return;
  const poison=mergedFoodPoison(target.foodPoison,target.quantity,source,quantity);
  if(poison)target.foodPoison=poison;else delete target.foodPoison;
}
