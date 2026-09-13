import type { MaterialKind, MaterialPile, Pawn, World } from './types.ts';

/** Runtime content, not an exhaustive reference catalogue. Values and unresolved
 * rules are tracked in docs/development/food-items.md. Nutrition uses integer
 * hundredths here; the actor's 0..100 meter represents one nutrition unit. */
export const ITEM_DEFINITIONS = Object.freeze({
  wood: Object.freeze({ label: 'Bois', kind: 'wood', stackLimit: 75, nutrition: 0, maxIngest: 0, color: 0x896841 }),
  berries: Object.freeze({ label: 'Baies', kind: 'food', stackLimit: 75, nutrition: 5, maxIngest: 75, color: 0xb96f63 }),
  'survival-meal': Object.freeze({ label: 'Repas de survie', kind: 'food', stackLimit: 10, nutrition: 90, maxIngest: 1, color: 0xc7b96b }),
  'legacy-portion': Object.freeze({ label: 'Portion historique', kind: 'food', stackLimit: 75, nutrition: 35, maxIngest: 1, color: 0xba745a }),
} as const);
export type ItemId = keyof typeof ITEM_DEFINITIONS;
export const legacyItem = (kind: MaterialKind): ItemId => kind === 'wood' ? 'wood' : 'legacy-portion';
export const nutritionOf = (pile: MaterialPile): number => ITEM_DEFINITIONS[pile.item].nutrition * pile.quantity;
export function availableNutrition(world: World): number {
  return world.piles.reduce((sum, pile) => sum + (pile.owner.type === 'job' ? 0 : nutritionOf(pile)), 0) / 100;
}
/** Unity's midpoint-to-even rounding, used by the reference stack calculation. */
function roundEven(value: number): number {
  const lower = Math.floor(value), fraction = value - lower;
  return fraction === 0.5 ? lower + lower % 2 : Math.round(value);
}
export function mealQuantity(pawn: Pawn, pile: MaterialPile, available: number): number {
  const item = ITEM_DEFINITIONS[pile.item];
  if (!item.nutrition || available <= 0) return 0;
  return Math.min(available, item.maxIngest, Math.max(1, roundEven((100 - pawn.hunger) / item.nutrition)));
}

export function adultHungerFactor(level: number): number {
  return level <= 0 ? 0 : level < 12 ? 0.25 : level < 24 ? 0.5 : 1;
}
