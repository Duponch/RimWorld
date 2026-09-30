import {ART_MATERIALS,isArtRecipe,artWorkTotal,type ArtMaterial,type ArtRecipe} from './art-rules.ts';
import { ANIMAL_MEAT_ITEMS, ANIMAL_CORPSE_ITEMS, ANIMAL_LEATHER_ITEMS, isAnimalMeat } from './biome-items.ts';
import { APPAREL_MATERIALS,isApparelMaterial,apparelItemFor, type ApparelItem, type ApparelMaterial } from './apparel-rules.ts';
import { isStove, isButcherStation } from './food-workstations.ts';
import { ITEM_DEFINITIONS, type ItemId } from './items.ts';
import type { CookingBill, CookingTask } from './cooking-types.ts';
import type { Structure, WorkType, World } from './types.ts';

export const STONE_INPUTS = ['granite-chunk','limestone-chunk','marble-chunk','sandstone-chunk','slate-chunk'] as const;
export type StoneIngredient = typeof STONE_INPUTS[number];
export const TAILORING_RECIPES = ['tribalwear','shirt','pants','duster','parka'] as const;
export type TailoringRecipe = typeof TAILORING_RECIPES[number];
export type TailoringMaterial = ApparelMaterial;
export type UnfinishedApparelItem = 'unfinished-tribalwear'|'unfinished-shirt'|'unfinished-pants'|'unfinished-duster'|'unfinished-parka';
export type ProductionIngredient = ArtMaterial|'unfinished-sculpture'|'steel'|'component'|'advanced-component'|'plasteel'|'gold'|'unfinished-gun'|'unfinished-flak-vest'|'unfinished-flak-helmet'|'unfinished-recon-helmet'|'unfinished-component'|'rice'|'berries'|'milk'|'agave-fruit'|'potato'|'corn'|typeof ANIMAL_MEAT_ITEMS[number]|typeof ANIMAL_CORPSE_ITEMS[number]|TailoringMaterial|UnfinishedApparelItem|StoneIngredient;
export type FlakRecipe='make-flak-vest'|'make-flak-helmet'|'make-recon-helmet';
export const isFlakRecipe=(v:unknown):v is FlakRecipe=>v==='make-flak-vest'||v==='make-flak-helmet'||v==='make-recon-helmet';
export const FLAK_REQUIREMENTS={cloth:30,steel:60,component:1,skill:4} as const;
export const FLAK_HELMET_REQUIREMENTS={steel:40,component:2,plasteel:10,skill:5} as const;
export const RECON_HELMET_REQUIREMENTS={plasteel:30,'advanced-component':1,skill:6} as const;
export const flakRequirements=(recipe:FlakRecipe)=>recipe==='make-flak-vest'?FLAK_REQUIREMENTS:recipe==='make-flak-helmet'?FLAK_HELMET_REQUIREMENTS:RECON_HELMET_REQUIREMENTS;
export const flakWorkpiece=(recipe:FlakRecipe)=>recipe==='make-flak-vest'?'unfinished-flak-vest':recipe==='make-flak-helmet'?'unfinished-flak-helmet':'unfinished-recon-helmet';
export type ComponentRecipe='make-component'|'make-advanced-component';
export const isComponentRecipe=(v:unknown):v is ComponentRecipe=>v==='make-component'||v==='make-advanced-component';
export const ADVANCED_COMPONENT_REQUIREMENTS={component:1,steel:20,plasteel:10,gold:3,skill:8} as const;
export type AdvancedComponentMaterial=Exclude<keyof typeof ADVANCED_COMPONENT_REQUIREMENTS,'skill'>;
export type ProductionRecipe = ArtRecipe|GunRecipe|FlakRecipe|ComponentRecipe|'simple-meal'|'cook-simple-meal-bulk'|'fine-meal'|'cook-fine-meal-bulk'|'vegetarian-fine-meal'|'cook-vegetarian-fine-meal-bulk'|'carnivore-fine-meal'|'cook-carnivore-fine-meal-bulk'|'lavish-meal'|'cook-lavish-meal-bulk'|'vegetarian-lavish-meal'|'cook-carnivore-lavish-meal'|'stone-blocks'|TailoringRecipe|'butcher-creature';

/** Local raw foods all provide 0.05 nutrition per unit. Core's mixed fine and
 * lavish meals ask 0.25 and 0.5 from each group; milk is an animal product. */
export function fineMealIngredientGroup(item:ProductionIngredient):'protein'|'vegetable'|null {
  if(item==='milk'||isAnimalMeat(item))return 'protein';
  return item==='rice'||item==='berries'||item==='potato'||item==='corn'||item==='agave-fruit'?'vegetable':null;
}
export function validFineMealIngredients(ingredients:readonly {item:ProductionIngredient;quantity:number}[]):boolean {
  return validMixedMealIngredients(ingredients,5);
}
export function validFineMealBulkIngredients(ingredients:readonly {item:ProductionIngredient;quantity:number}[]):boolean {
  return validMixedMealIngredients(ingredients,20);
}
export function validLavishMealIngredients(ingredients:readonly {item:ProductionIngredient;quantity:number}[]):boolean {
  return validMixedMealIngredients(ingredients,10);
}
/** Core's four-portion mixed lavish bill asks 2.0 nutrition from each group. */
export function validLavishMealBulkIngredients(ingredients:readonly {item:ProductionIngredient;quantity:number}[]):boolean {
  return validMixedMealIngredients(ingredients,40);
}
/** One 0.75 nutrition quota: local plants and milk each provide 0.05. */
export function validVegetarianFineMealIngredients(ingredients:readonly {item:ProductionIngredient;quantity:number}[]):boolean {
  return validVegetarianMealIngredients(ingredients,15);
}
/** Core's four-portion vegetarian fine bill asks one 3.0 nutrition quota. */
export function validVegetarianFineMealBulkIngredients(ingredients:readonly {item:ProductionIngredient;quantity:number}[]):boolean {
  return validVegetarianMealIngredients(ingredients,60);
}
/** One 1.25 nutrition quota: raw plants and milk, never meat. */
export function validVegetarianLavishMealIngredients(ingredients:readonly {item:ProductionIngredient;quantity:number}[]):boolean {
  return validVegetarianMealIngredients(ingredients,25);
}
function validVegetarianMealIngredients(ingredients:readonly {item:ProductionIngredient;quantity:number}[],required:number):boolean {
  let units=0;
  for(const ingredient of ingredients){
    if(!Number.isSafeInteger(ingredient.quantity)||ingredient.quantity<=0||ingredient.item!=='milk'&&fineMealIngredientGroup(ingredient.item)!=='vegetable')return false;
    units+=ingredient.quantity;
  }
  return units===required;
}
/** One 0.75 nutrition quota: only raw animal meat, never milk or plants. */
export function validCarnivoreFineMealIngredients(ingredients:readonly {item:ProductionIngredient;quantity:number}[]):boolean {
  return validCarnivoreMealIngredients(ingredients,15);
}
/** Core's four-portion carnivore fine bill asks one 3.0 nutrition meat quota. */
export function validCarnivoreFineMealBulkIngredients(ingredients:readonly {item:ProductionIngredient;quantity:number}[]):boolean {
  return validCarnivoreMealIngredients(ingredients,60);
}
/** One 1.25 nutrition quota: only raw animal meat, never milk or plants. */
export function validCarnivoreLavishMealIngredients(ingredients:readonly {item:ProductionIngredient;quantity:number}[]):boolean {
  return validCarnivoreMealIngredients(ingredients,25);
}
function validCarnivoreMealIngredients(ingredients:readonly {item:ProductionIngredient;quantity:number}[],required:number):boolean {
  let units=0;
  for(const ingredient of ingredients){
    if(!Number.isSafeInteger(ingredient.quantity)||ingredient.quantity<=0||!isAnimalMeat(ingredient.item))return false;
    units+=ingredient.quantity;
  }
  return units===required;
}
export const mixedMealGroupUnits=(recipe:ProductionRecipe):number=>recipe==='fine-meal'?5:recipe==='cook-fine-meal-bulk'?20:recipe==='lavish-meal'?10:recipe==='cook-lavish-meal-bulk'?40:0;
function validMixedMealIngredients(ingredients:readonly {item:ProductionIngredient;quantity:number}[],required:number):boolean {
  let protein=0,vegetable=0;
  for(const ingredient of ingredients) {
    if(!Number.isSafeInteger(ingredient.quantity)||ingredient.quantity<=0)return false;
    const group=fineMealIngredientGroup(ingredient.item);
    if(group==='protein')protein+=ingredient.quantity;
    else if(group==='vegetable')vegetable+=ingredient.quantity;
    else return false;
  }
  return protein===required&&vegetable===required;
}

export type GunRecipe='make-revolver'|'make-bolt-action-rifle';
export const isGunRecipe=(v:unknown):v is GunRecipe=>v==='make-revolver'||v==='make-bolt-action-rifle';
export const GUN_REQUIREMENTS={ 'make-revolver':{steel:30,component:2,skill:3}, 'make-bolt-action-rifle':{steel:60,component:3,skill:5} } as const;
export const PRODUCTION_RECIPES = Object.freeze({
  'small-sculpture':Object.freeze({label:'Petite sculpture',station:'art-bench',work:'art',inputs:ART_MATERIALS as readonly ProductionIngredient[],units:50,workTicks:1800,outputUnits:1}),
  'large-sculpture':Object.freeze({label:'Grande sculpture',station:'art-bench',work:'art',inputs:ART_MATERIALS as readonly ProductionIngredient[],units:100,workTicks:3000,outputUnits:1}),
  'make-revolver':Object.freeze({label:'Revolver',station:'machining-table',work:'craft',inputs:['steel','component'] as readonly ProductionIngredient[],units:32,workTicks:400,outputUnits:1}),
  'make-bolt-action-rifle':Object.freeze({label:'Fusil à verrou',station:'machining-table',work:'craft',inputs:['steel','component'] as readonly ProductionIngredient[],units:63,workTicks:1200,outputUnits:1}),
  'make-flak-vest':Object.freeze({label:'Gilet pare-balles',station:'machining-table',work:'craft',inputs:['cloth','steel','component'] as readonly ProductionIngredient[],units:91,workTicks:900,outputUnits:1}),
  'make-flak-helmet':Object.freeze({label:'Casque pare-balles',station:'machining-table',work:'craft',inputs:['steel','component','plasteel'] as readonly ProductionIngredient[],units:52,workTicks:800,outputUnits:1}),
  'make-recon-helmet':Object.freeze({label:'Casque de reconnaissance',station:'fabrication-bench',work:'craft',inputs:['plasteel','advanced-component'] as readonly ProductionIngredient[],units:31,workTicks:1575,outputUnits:1}),
  'make-component':Object.freeze({label:'Composant',station:'fabrication-bench',work:'craft',inputs:['steel'] as readonly ProductionIngredient[],units:12,workTicks:500,outputUnits:1}),
  'make-advanced-component':Object.freeze({label:'Composant avancé',station:'fabrication-bench',work:'craft',inputs:['component','steel','plasteel','gold'] as readonly ProductionIngredient[],units:34,workTicks:1000,outputUnits:1}),
  'butcher-creature':Object.freeze({label:'Dépecer une créature',station:'butcher-spot',work:'cook',inputs:ANIMAL_CORPSE_ITEMS as readonly ProductionIngredient[],units:1,workTicks:45,outputUnits:50}),
  shirt:Object.freeze({label:'Chemise',station:'tailor-bench',work:'craft',inputs:APPAREL_MATERIALS as readonly ProductionIngredient[],units:45,workTicks:270,outputUnits:1}),
  tribalwear:Object.freeze({label:'Tenue tribale',station:'crafting-spot',work:'craft',inputs:APPAREL_MATERIALS as readonly ProductionIngredient[],units:60,workTicks:180,outputUnits:1}),
  pants:Object.freeze({label:'Pantalon',station:'tailor-bench',work:'craft',inputs:APPAREL_MATERIALS as readonly ProductionIngredient[],units:40,workTicks:160,outputUnits:1}),
  duster:Object.freeze({label:'Cache-poussière',station:'tailor-bench',work:'craft',inputs:APPAREL_MATERIALS as readonly ProductionIngredient[],units:80,workTicks:1000,outputUnits:1}),
  parka:Object.freeze({label:'Parka',station:'tailor-bench',work:'craft',inputs:APPAREL_MATERIALS as readonly ProductionIngredient[],units:80,workTicks:800,outputUnits:1}),
  // Neutral recipe work, before station/room/light factors; Core ticks / 10.
  'simple-meal': Object.freeze({label:'Repas simple',station:'campfire',work:'cook',inputs:['rice','berries','milk',...ANIMAL_MEAT_ITEMS,'potato','corn','agave-fruit'] as readonly ProductionIngredient[],units:10,workTicks:30,outputUnits:1}),
  'cook-simple-meal-bulk': Object.freeze({label:'Cuisiner des plats simples x4',station:'campfire',work:'cook',inputs:['rice','berries','milk',...ANIMAL_MEAT_ITEMS,'potato','corn','agave-fruit'] as readonly ProductionIngredient[],units:40,workTicks:120,outputUnits:4}),
  'fine-meal': Object.freeze({label:'Cuisiner un plat raffiné',station:'fueled-stove',work:'cook',inputs:['rice','berries','milk',...ANIMAL_MEAT_ITEMS,'potato','corn','agave-fruit'] as readonly ProductionIngredient[],units:10,workTicks:45,outputUnits:1}),
  'cook-fine-meal-bulk': Object.freeze({label:'Cuisiner des plats raffinés x4',station:'fueled-stove',work:'cook',inputs:['rice','berries','milk',...ANIMAL_MEAT_ITEMS,'potato','corn','agave-fruit'] as readonly ProductionIngredient[],units:40,workTicks:180,outputUnits:4}),
  'vegetarian-fine-meal': Object.freeze({label:'Cuisiner un plat raffiné végétarien',station:'fueled-stove',work:'cook',inputs:['rice','berries','milk','potato','corn','agave-fruit'] as readonly ProductionIngredient[],units:15,workTicks:45,outputUnits:1}),
  'cook-vegetarian-fine-meal-bulk': Object.freeze({label:'Cuisiner des plats raffinés végétariens x4',station:'fueled-stove',work:'cook',inputs:['rice','berries','milk','potato','corn','agave-fruit'] as readonly ProductionIngredient[],units:60,workTicks:180,outputUnits:4}),
  'carnivore-fine-meal': Object.freeze({label:'Cuisiner un plat raffiné carnivore',station:'fueled-stove',work:'cook',inputs:ANIMAL_MEAT_ITEMS as readonly ProductionIngredient[],units:15,workTicks:45,outputUnits:1}),
  'cook-carnivore-fine-meal-bulk': Object.freeze({label:'Cuisiner des plats raffinés carnivores x4',station:'fueled-stove',work:'cook',inputs:ANIMAL_MEAT_ITEMS as readonly ProductionIngredient[],units:60,workTicks:180,outputUnits:4}),
  'lavish-meal': Object.freeze({label:'Cuisiner un plat gastronomique',station:'fueled-stove',work:'cook',inputs:['rice','berries','milk',...ANIMAL_MEAT_ITEMS,'potato','corn','agave-fruit'] as readonly ProductionIngredient[],units:20,workTicks:80,outputUnits:1}),
  'cook-lavish-meal-bulk': Object.freeze({label:'Cuisiner des plats gastronomiques x4',station:'fueled-stove',work:'cook',inputs:['rice','berries','milk',...ANIMAL_MEAT_ITEMS,'potato','corn','agave-fruit'] as readonly ProductionIngredient[],units:80,workTicks:320,outputUnits:4}),
  'vegetarian-lavish-meal': Object.freeze({label:'Cuisiner un plat gastronomique végétarien',station:'fueled-stove',work:'cook',inputs:['rice','berries','milk','potato','corn','agave-fruit'] as readonly ProductionIngredient[],units:25,workTicks:80,outputUnits:1}),
  'cook-carnivore-lavish-meal': Object.freeze({label:'Cuisiner un plat gastronomique carnivore',station:'fueled-stove',work:'cook',inputs:ANIMAL_MEAT_ITEMS as readonly ProductionIngredient[],units:25,workTicks:80,outputUnits:1}),
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
export const stationRecipe=(station:Pick<Structure,'kind'>):ProductionRecipe|null=>station.kind==='art-bench'?'small-sculpture':station.kind==='machining-table'?'make-revolver':station.kind==='fabrication-bench'?'make-component':isButcherStation(station.kind)?'butcher-creature':station.kind==='tailor-bench'||station.kind==='electric-tailor-bench'?'shirt':station.kind==='crafting-spot'?'tribalwear':station.kind==='campfire'||isStove(station.kind)?'simple-meal':station.kind==='stonecutter'?'stone-blocks':null;
/** The electrical bench remains a physical work surface without power. Its
 * power state changes the work factor in WorkEnvironment instead of
 * invalidating an already reserved bill or unfinished garment. */
export const productionStationUsable=(station:Structure):boolean=>(station.kind!=='machining-table'&&station.kind!=='fabrication-bench')||station.power?.on===true;
export const stationWork=(station:Pick<Structure,'kind'>):'cook'|'craft'|'art'=>station.kind==='art-bench'?'art':station.kind==='campfire'||isStove(station.kind)||isButcherStation(station.kind)?'cook':'craft';
export function admittedIngredient(bill:CookingBill,item:ItemId):item is ProductionIngredient {
  return PRODUCTION_RECIPES[bill.recipe].inputs.includes(item as ProductionIngredient)&&bill.filters[item as ProductionIngredient]===true;
}
export const blockFor=(chunk:StoneIngredient):ItemId=>chunk.replace('-chunk','-blocks') as ItemId;
export function tailoringMaterialFromIngredients(ingredients:readonly {item:ProductionIngredient}[]):TailoringMaterial|undefined {
  const found=new Set(ingredients.map(i=>i.item).filter((item):item is TailoringMaterial=>isApparelMaterial(item)));
  return found.size===1?[...found][0]:undefined;
}
export function recipeProduct(recipe:ProductionRecipe,ingredients:readonly {item:ProductionIngredient}[],material?:TailoringMaterial):ItemId {
  if(isArtRecipe(recipe))throw new RangeError('Sculptures are whole furniture products');
  if(isGunRecipe(recipe))return recipe==='make-revolver'?'revolver':'bolt-action-rifle';
  if(isFlakRecipe(recipe))return recipe==='make-flak-vest'?'flak-vest':recipe==='make-flak-helmet'?'flak-helmet':'recon-helmet';
  if(recipe==='make-component')return 'component';
  if(recipe==='make-advanced-component')return 'advanced-component';
  if(isTailoring(recipe)){const resolved=material??tailoringMaterialFromIngredients(ingredients);if(!resolved)throw new RangeError('Tailoring product requires one material');return apparelItemFor(recipe,resolved);}
  return recipe==='butcher-creature'?((ingredients[0]?.item??'hare-corpse').replace('-corpse','-meat') as ItemId):recipe==='simple-meal'||recipe==='cook-simple-meal-bulk'?'simple-meal':recipe==='fine-meal'||recipe==='cook-fine-meal-bulk'?'fine-meal':recipe==='vegetarian-fine-meal'||recipe==='cook-vegetarian-fine-meal-bulk'?'vegetarian-fine-meal':recipe==='carnivore-fine-meal'||recipe==='cook-carnivore-fine-meal-bulk'?'carnivore-fine-meal':recipe==='lavish-meal'||recipe==='cook-lavish-meal-bulk'?'lavish-meal':recipe==='vegetarian-lavish-meal'?'vegetarian-lavish-meal':recipe==='cook-carnivore-lavish-meal'?'carnivore-lavish-meal':blockFor(ingredients[0]!.item as StoneIngredient);
}
export function isRecipeProduct(recipe:ProductionRecipe,item:ItemId):boolean {
  if(isArtRecipe(recipe))return false;
  if(isGunRecipe(recipe))return item===(recipe==='make-revolver'?'revolver':'bolt-action-rifle');
  if(isFlakRecipe(recipe))return item===(recipe==='make-flak-vest'?'flak-vest':recipe==='make-flak-helmet'?'flak-helmet':'recon-helmet');
  if(recipe==='make-component')return item==='component';
  if(recipe==='make-advanced-component')return item==='advanced-component';
  if(isTailoring(recipe))return APPAREL_MATERIALS.some(material=>item===apparelItemFor(recipe,material));
  return recipe==='butcher-creature'?(isAnimalMeat(item)||(ANIMAL_LEATHER_ITEMS as readonly string[]).includes(item)):recipe==='simple-meal'||recipe==='cook-simple-meal-bulk'?item==='simple-meal':recipe==='fine-meal'||recipe==='cook-fine-meal-bulk'?item==='fine-meal':recipe==='vegetarian-fine-meal'||recipe==='cook-vegetarian-fine-meal-bulk'?item==='vegetarian-fine-meal':recipe==='carnivore-fine-meal'||recipe==='cook-carnivore-fine-meal-bulk'?item==='carnivore-fine-meal':recipe==='lavish-meal'||recipe==='cook-lavish-meal-bulk'?item==='lavish-meal':recipe==='vegetarian-lavish-meal'?item==='vegetarian-lavish-meal':recipe==='cook-carnivore-lavish-meal'?item==='carnivore-lavish-meal':ITEM_DEFINITIONS[item].kind==='blocks';
}
export function tailoringProduct(recipe:TailoringRecipe,material:TailoringMaterial):ApparelItem { return apparelItemFor(recipe,material); }

export const stationRecipes=(station:Pick<Structure,'kind'>):readonly ProductionRecipe[]=>station.kind==='art-bench'?['small-sculpture','large-sculpture']:station.kind==='machining-table'?['make-revolver','make-bolt-action-rifle','make-flak-vest','make-flak-helmet']:station.kind==='fabrication-bench'?['make-component','make-advanced-component','make-recon-helmet']:(station.kind==='tailor-bench'||station.kind==='electric-tailor-bench')?['shirt','pants','duster','parka','tribalwear']:station.kind==='crafting-spot'?['tribalwear']:isStove(station.kind)?['simple-meal','cook-simple-meal-bulk','fine-meal','cook-fine-meal-bulk','vegetarian-fine-meal','cook-vegetarian-fine-meal-bulk','carnivore-fine-meal','cook-carnivore-fine-meal-bulk','lavish-meal','cook-lavish-meal-bulk','vegetarian-lavish-meal','cook-carnivore-lavish-meal']:station.kind==='campfire'?['simple-meal','cook-simple-meal-bulk']:stationRecipe(station)?[stationRecipe(station)!]:[];
export const stationAccepts=(station:Pick<Structure,'kind'>,recipe:ProductionRecipe):boolean=>stationRecipes(station).includes(recipe);

/** Snapshot-only display total; the authoritative workpiece owns its material. */
export function productionTaskTotal(world:World,task:CookingTask):number {
  if(isArtRecipe(task.recipe)){const work=world.piles.find(p=>p.id===task.ingredients[0]?.pileId)?.artWork;if(work)return artWorkTotal(work.recipe,work.material);}
  return productionWorkTotal(taskRecipe(task));
}
