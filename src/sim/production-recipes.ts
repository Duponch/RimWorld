import { ANIMAL_MEAT_ITEMS, ANIMAL_CORPSE_ITEMS, ANIMAL_LEATHER_ITEMS, isAnimalMeat } from './biome-items.ts';
import { APPAREL_MATERIALS,isApparelMaterial,apparelItemFor, type ApparelItem, type ApparelMaterial } from './apparel-rules.ts';
import { isStove, isButcherStation } from './food-workstations.ts';
import { ITEM_DEFINITIONS, type ItemId } from './items.ts';
import type { CookingBill, CookingTask } from './cooking-types.ts';
import type { Structure, WorkType } from './types.ts';

export const STONE_INPUTS = ['granite-chunk','limestone-chunk','marble-chunk','sandstone-chunk','slate-chunk'] as const;
export type StoneIngredient = typeof STONE_INPUTS[number];
export const TAILORING_RECIPES = ['tribalwear','shirt','pants','duster','parka'] as const;
export type TailoringRecipe = typeof TAILORING_RECIPES[number];
export type TailoringMaterial = ApparelMaterial;
export type UnfinishedApparelItem = 'unfinished-tribalwear'|'unfinished-shirt'|'unfinished-pants'|'unfinished-duster'|'unfinished-parka';
export type ProductionIngredient = 'rice'|'berries'|'agave-fruit'|'potato'|'corn'|typeof ANIMAL_MEAT_ITEMS[number]|typeof ANIMAL_CORPSE_ITEMS[number]|TailoringMaterial|UnfinishedApparelItem|StoneIngredient;
export type ProductionRecipe = 'simple-meal'|'stone-blocks'|TailoringRecipe|'butcher-creature';

export const PRODUCTION_RECIPES = Object.freeze({
  'butcher-creature':Object.freeze({label:'Dépecer une créature',station:'butcher-spot',work:'cook',inputs:ANIMAL_CORPSE_ITEMS as readonly ProductionIngredient[],units:1,workTicks:45,outputUnits:50}),
  shirt:Object.freeze({label:'Chemise',station:'tailor-bench',work:'craft',inputs:APPAREL_MATERIALS as readonly ProductionIngredient[],units:45,workTicks:270,outputUnits:1}),
  tribalwear:Object.freeze({label:'Tenue tribale',station:'crafting-spot',work:'craft',inputs:APPAREL_MATERIALS as readonly ProductionIngredient[],units:60,workTicks:180,outputUnits:1}),
  pants:Object.freeze({label:'Pantalon',station:'tailor-bench',work:'craft',inputs:APPAREL_MATERIALS as readonly ProductionIngredient[],units:40,workTicks:160,outputUnits:1}),
  duster:Object.freeze({label:'Cache-poussière',station:'tailor-bench',work:'craft',inputs:APPAREL_MATERIALS as readonly ProductionIngredient[],units:80,workTicks:1000,outputUnits:1}),
  parka:Object.freeze({label:'Parka',station:'tailor-bench',work:'craft',inputs:APPAREL_MATERIALS as readonly ProductionIngredient[],units:80,workTicks:800,outputUnits:1}),
  // Neutral recipe work, before station/room/light factors; Core ticks / 10.
  'simple-meal': Object.freeze({label:'Repas simple',station:'campfire',work:'cook',inputs:['rice','berries',...ANIMAL_MEAT_ITEMS,'potato','corn','agave-fruit'] as readonly ProductionIngredient[],units:10,workTicks:30,outputUnits:1}),
  'stone-blocks': Object.freeze({label:'Blocs de pierre',station:'stonecutter',work:'craft',inputs:STONE_INPUTS as readonly ProductionIngredient[],units:1,workTicks:160,outputUnits:20}),
} as const);
/** Persist integer work units; rounding error is at most 0.00005 neutral ticks
 * per action. A rate change never rewrites previously performed work. */
export const PRODUCTION_WORK_SCALE=10000;
export const productionWorkTotal=(recipe:ProductionRecipe):number=>PRODUCTION_RECIPES[recipe].workTicks*PRODUCTION_WORK_SCALE;
export const legacyProductionTicks=(recipe:ProductionRecipe):number=>recipe==='simple-meal'?60:200;
export const taskRecipe=(task:CookingTask):ProductionRecipe=>(task.recipe??'simple-meal') as ProductionRecipe;
export const taskWork=(task:CookingTask):WorkType=>PRODUCTION_RECIPES[taskRecipe(task)].work;
export const isTailoring=(recipe:unknown):recipe is TailoringRecipe=>typeof recipe==='string'&&TAILORING_RECIPES.includes(recipe as TailoringRecipe);
export const unfinishedItem=(recipe:TailoringRecipe):UnfinishedApparelItem=>({tribalwear:'unfinished-tribalwear',shirt:'unfinished-shirt',pants:'unfinished-pants',duster:'unfinished-duster',parka:'unfinished-parka'} as const)[recipe];
export const stationRecipe=(station:Pick<Structure,'kind'>):ProductionRecipe|null=>isButcherStation(station.kind)?'butcher-creature':station.kind==='tailor-bench'||station.kind==='electric-tailor-bench'?'shirt':station.kind==='crafting-spot'?'tribalwear':station.kind==='campfire'||isStove(station.kind)?'simple-meal':station.kind==='stonecutter'?'stone-blocks':null;
/** The electrical bench remains a physical work surface without power. Its
 * power state changes the work factor in WorkEnvironment instead of
 * invalidating an already reserved bill or unfinished garment. */
export const productionStationUsable=(_station:Structure):boolean=>true;
export const stationWork=(station:Pick<Structure,'kind'>):'cook'|'craft'=>station.kind==='campfire'||isStove(station.kind)||isButcherStation(station.kind)?'cook':'craft';
export function admittedIngredient(bill:CookingBill,item:ItemId):item is ProductionIngredient {
  return PRODUCTION_RECIPES[bill.recipe].inputs.includes(item as ProductionIngredient)&&bill.filters[item as ProductionIngredient]===true;
}
export const blockFor=(chunk:StoneIngredient):ItemId=>chunk.replace('-chunk','-blocks') as ItemId;
export function tailoringMaterialFromIngredients(ingredients:readonly {item:ProductionIngredient}[]):TailoringMaterial|undefined {
  const found=new Set(ingredients.map(i=>i.item).filter((item):item is TailoringMaterial=>isApparelMaterial(item)));
  return found.size===1?[...found][0]:undefined;
}
export function recipeProduct(recipe:ProductionRecipe,ingredients:readonly {item:ProductionIngredient}[],material?:TailoringMaterial):ItemId {
  if(isTailoring(recipe)){const resolved=material??tailoringMaterialFromIngredients(ingredients);if(!resolved)throw new RangeError('Tailoring product requires one material');return apparelItemFor(recipe,resolved);}
  return recipe==='butcher-creature'?((ingredients[0]?.item??'hare-corpse').replace('-corpse','-meat') as ItemId):recipe==='simple-meal'?'simple-meal':blockFor(ingredients[0]!.item as StoneIngredient);
}
export function isRecipeProduct(recipe:ProductionRecipe,item:ItemId):boolean {
  if(isTailoring(recipe))return APPAREL_MATERIALS.some(material=>item===apparelItemFor(recipe,material));
  return recipe==='butcher-creature'?(isAnimalMeat(item)||(ANIMAL_LEATHER_ITEMS as readonly string[]).includes(item)):recipe==='simple-meal'?item==='simple-meal':ITEM_DEFINITIONS[item].kind==='blocks';
}
export function tailoringProduct(recipe:TailoringRecipe,material:TailoringMaterial):ApparelItem { return apparelItemFor(recipe,material); }

export const stationRecipes=(station:Pick<Structure,'kind'>):readonly ProductionRecipe[]=>(station.kind==='tailor-bench'||station.kind==='electric-tailor-bench')?['shirt','pants','duster','parka','tribalwear']:station.kind==='crafting-spot'?['tribalwear']:stationRecipe(station)?[stationRecipe(station)!]:[];
export const stationAccepts=(station:Pick<Structure,'kind'>,recipe:ProductionRecipe):boolean=>stationRecipes(station).includes(recipe);
