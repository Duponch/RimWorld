import type { ProductionIngredient, ProductionRecipe } from './production-recipes.ts';
import type { Cell } from './types.ts';

export type RawIngredient = 'rice' | 'berries';
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
  recipe?:'stone-blocks'|'tribalwear'|'shirt';
  stationId:number;
  billId:number;
  spot:Cell;
  actionCell:Cell;
  phase:'gather'|'work'|'output'|'interrupted';
  ingredients:CookingIngredient[];
  /** V36: integer neutral work units (10 000 per local work tick). */
  progress:number;
  productId:number|null;
  storageId:number|null;
  storageQuantity?:number;
}
