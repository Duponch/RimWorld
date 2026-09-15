import { ITEM_DEFINITIONS, type ItemId } from './items.ts';
import type { CookingBill, CookingTask } from './cooking-types.ts';
import type { Structure, WorkType } from './types.ts';

export const STONE_INPUTS = ['granite-chunk','limestone-chunk','marble-chunk','sandstone-chunk','slate-chunk'] as const;
export type StoneIngredient = typeof STONE_INPUTS[number];
export type ProductionIngredient = 'rice'|'berries'|StoneIngredient;
export type ProductionRecipe = 'simple-meal'|'stone-blocks';
export const PRODUCTION_RECIPES = Object.freeze({
  'simple-meal': Object.freeze({label:'Repas simple',station:'campfire',work:'cook',inputs:['rice','berries'] as readonly ProductionIngredient[],units:10,workTicks:60,outputUnits:1}),
  // 1600 Core ticks / 10 local; current open-air workshop factor 0.8.
  // Light, capacities and room roles remain explicit missing environment systems.
  'stone-blocks': Object.freeze({label:'Blocs de pierre',station:'stonecutter',work:'craft',inputs:STONE_INPUTS as readonly ProductionIngredient[],units:1,workTicks:200,outputUnits:20}),
} as const);
export const taskRecipe=(task:CookingTask):ProductionRecipe=>task.recipe??'simple-meal';
export const taskWork=(task:CookingTask):WorkType=>PRODUCTION_RECIPES[taskRecipe(task)].work;
export const stationRecipe=(station:Pick<Structure,'kind'>):ProductionRecipe|null=>station.kind==='campfire'?'simple-meal':station.kind==='stonecutter'?'stone-blocks':null;
export const stationWork=(station:Pick<Structure,'kind'>):'cook'|'craft'=>station.kind==='stonecutter'?'craft':'cook';
export function admittedIngredient(bill:CookingBill,item:ItemId):item is ProductionIngredient {
  return PRODUCTION_RECIPES[bill.recipe].inputs.includes(item as ProductionIngredient)&&bill.filters[item as ProductionIngredient]===true;
}
export const blockFor=(chunk:StoneIngredient):ItemId=>chunk.replace('-chunk','-blocks') as ItemId;
export function recipeProduct(recipe:ProductionRecipe,ingredients:readonly {item:ProductionIngredient}[]):ItemId {
  return recipe==='simple-meal'?'simple-meal':blockFor(ingredients[0]!.item as StoneIngredient);
}
export function isRecipeProduct(recipe:ProductionRecipe,item:ItemId):boolean {
  return recipe==='simple-meal'?item==='simple-meal':ITEM_DEFINITIONS[item].kind==='blocks';
}
