import type { Cell } from './types.ts';

export type RawIngredient = 'rice' | 'berries';
export interface CookingBill {
  id:number;
  recipe:'simple-meal';
  mode:'times'|'until'|'forever';
  target:number;
  suspended:boolean;
  filters:Record<RawIngredient,boolean>;
  radius:number;
  destination:'stockpile'|'drop';
}
export type BillSettings=Omit<CookingBill,'id'|'recipe'>;
export interface CookingIngredient {
  pileId:number;
  item:RawIngredient;
  quantity:number;
  stage:'source'|'held'|'placed';
  cell:Cell;
}
export interface CookingTask {
  stationId:number;
  billId:number;
  spot:Cell;
  actionCell:Cell;
  phase:'gather'|'work'|'output'|'interrupted';
  ingredients:CookingIngredient[];
  progress:number;
  productId:number|null;
  storageId:number|null;
}
