import { ITEM_DEFINITIONS, type ItemId } from './items.ts';
import type { CookingBill, CookingTask } from './cooking-types.ts';
import type { Structure, WorkType } from './types.ts';

export const STONE_INPUTS = ['granite-chunk','limestone-chunk','marble-chunk','sandstone-chunk','slate-chunk'] as const;
export type StoneIngredient = typeof STONE_INPUTS[number];
export type ProductionIngredient = 'rice'|'berries'|'cloth'|'unfinished-tribalwear'|StoneIngredient;
export type ProductionRecipe = 'simple-meal'|'stone-blocks'|'tribalwear';
export const PRODUCTION_RECIPES = Object.freeze({
  tribalwear:Object.freeze({label:'Tenue tribale en tissu',station:'crafting-spot',work:'craft',inputs:['cloth'] as readonly ProductionIngredient[],units:60,workTicks:180,outputUnits:1}),
  // Neutral recipe work, before station/room/light factors; Core ticks / 10.
  'simple-meal': Object.freeze({label:'Repas simple',station:'campfire',work:'cook',inputs:['rice','berries'] as readonly ProductionIngredient[],units:10,workTicks:30,outputUnits:1}),
  'stone-blocks': Object.freeze({label:'Blocs de pierre',station:'stonecutter',work:'craft',inputs:STONE_INPUTS as readonly ProductionIngredient[],units:1,workTicks:160,outputUnits:20}),
} as const);
/** Persist integer work units; rounding error is at most 0.00005 neutral ticks
 * per action. A rate change never rewrites previously performed work. */
export const PRODUCTION_WORK_SCALE=10000;
export const productionWorkTotal=(recipe:ProductionRecipe):number=>PRODUCTION_RECIPES[recipe].workTicks*PRODUCTION_WORK_SCALE;
export const legacyProductionTicks=(recipe:ProductionRecipe):number=>recipe==='simple-meal'?60:200;
export const taskRecipe=(task:CookingTask):ProductionRecipe=>task.recipe??'simple-meal';
export const taskWork=(task:CookingTask):WorkType=>PRODUCTION_RECIPES[taskRecipe(task)].work;
export const stationRecipe=(station:Pick<Structure,'kind'>):ProductionRecipe|null=>station.kind==='crafting-spot'?'tribalwear':station.kind==='campfire'?'simple-meal':station.kind==='stonecutter'?'stone-blocks':null;
export const stationWork=(station:Pick<Structure,'kind'>):'cook'|'craft'=>station.kind!=='campfire'?'craft':'cook';
export function admittedIngredient(bill:CookingBill,item:ItemId):item is ProductionIngredient {
  return PRODUCTION_RECIPES[bill.recipe].inputs.includes(item as ProductionIngredient)&&bill.filters[item as ProductionIngredient]===true;
}
export const blockFor=(chunk:StoneIngredient):ItemId=>chunk.replace('-chunk','-blocks') as ItemId;
export function recipeProduct(recipe:ProductionRecipe,ingredients:readonly {item:ProductionIngredient}[]):ItemId {
  return recipe==='tribalwear'?'cloth-tribalwear':recipe==='simple-meal'?'simple-meal':blockFor(ingredients[0]!.item as StoneIngredient);
}
export function isRecipeProduct(recipe:ProductionRecipe,item:ItemId):boolean {
  return recipe==='tribalwear'?item==='cloth-tribalwear':recipe==='simple-meal'?item==='simple-meal':ITEM_DEFINITIONS[item].kind==='blocks';
}
