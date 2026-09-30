import { ANIMAL_MEAT_ITEMS } from './biome-items.ts';
import type { ProductionIngredient, ProductionRecipe } from './production-recipes.ts';
import type { Cell } from './types.ts';

export type RawIngredient = 'rice' | 'berries' | 'agave-fruit' | typeof ANIMAL_MEAT_ITEMS[number] | 'potato' | 'corn';
export interface CookingBill {
  id:number;
  recipe:ProductionRecipe;
  mode:'times'|'until'|'forever';
  target:number;
  suspended:boolean;
  filters:Partial<Record<ProductionIngredient,boolean>>;
  radius:number;
  destination:'stockpile'|'drop';
}
export type BillSettings=Omit<CookingBill,'id'|'recipe'>;
export interface CookingIngredient {
  pileId:number;
  item:ProductionIngredient;
  quantity:number;
  stage:'source'|'held'|'placed';
  cell:Cell;
}
/** Historical serialized envelope shared by meal and material production. */
export interface CookingTask {
  recipe?:'small-sculpture'|'large-sculpture'|'make-revolver'|'make-bolt-action-rifle'|'make-flak-vest'|'make-flak-helmet'|'make-recon-helmet'|'make-component'|'make-advanced-component'|'stone-blocks'|'tribalwear'|'shirt'|'pants'|'duster'|'parka'|'butcher-creature'|'fine-meal'|'cook-fine-meal-bulk'|'vegetarian-fine-meal'|'cook-vegetarian-fine-meal-bulk'|'carnivore-fine-meal'|'cook-carnivore-fine-meal-bulk'|'lavish-meal'|'cook-lavish-meal-bulk'|'vegetarian-lavish-meal'|'cook-vegetarian-lavish-meal-bulk'|'cook-carnivore-lavish-meal'|'cook-carnivore-lavish-meal-bulk'|'cook-simple-meal-bulk';
  stationId:number;
  billId:number;
  spot:Cell;
  actionCell:Cell;
  phase:'gather'|'work'|'output'|'interrupted';
  ingredients:CookingIngredient[];
  /** V36: integer neutral work units (10 000 per local work tick). */
  progress:number;
  /** V79: actual local work ticks, for completion-time Cooking learning. */
  workTicks?:number;
  productId:number|null;
  storageId:number|null;
  storageQuantity?:number;
}
