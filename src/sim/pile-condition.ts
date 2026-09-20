import { copyRot } from './food-preservation.ts';
import type { MaterialPile } from './types.ts';

/** A split keeps the condition of the whole stack; it creates no fresh goods. */
export function copyPileCondition(pile:MaterialPile):Pick<MaterialPile,'rot'|'damage'> {
  return {...copyRot(pile),...(pile.damage?{damage:pile.damage}:{})};
}
