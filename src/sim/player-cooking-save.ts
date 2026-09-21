import { V91_ITEM_IDS } from './biome-items.ts';
import { isTailoring, unfinishedItem, PRODUCTION_RECIPES, type ProductionIngredient } from './production-recipes.ts';
import type { World } from './types.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
/** Initial gathered/placed reservations only; a queued cook cannot hold items. */
export function validCookingOrder(value:unknown,world:World):boolean {
  if(!record(value)||Object.keys(value).length!==1||!record(value.cooking))return false;
  const c=value.cooking,cell=(x:unknown)=>record(x)&&integer(x.x,0,world.width-1)&&integer(x.z,0,world.height-1);
  if(c.recipe!==undefined&&!((world.schemaVersion>=32&&c.recipe==='stone-blocks')||(world.schemaVersion>=72&&c.recipe==='tribalwear')||(world.schemaVersion>=73&&c.recipe==='shirt')||(world.schemaVersion>=79&&c.recipe==='butcher-creature')))return false;
  const recipe=PRODUCTION_RECIPES[c.recipe==='butcher-creature'?'butcher-creature':c.recipe==='shirt'?'shirt':c.recipe==='tribalwear'?'tribalwear':c.recipe==='stone-blocks'?'stone-blocks':'simple-meal'];
  if(Object.keys(c).some(k=>!['recipe','stationId','billId','spot','actionCell','phase','ingredients','progress','productId','storageId'].includes(k))
    ||!integer(c.stationId,1)||!integer(c.billId,1)||!cell(c.spot)||!cell(c.actionCell)||c.phase!=='gather'||c.progress!==0||c.productId!==null||c.storageId!==null||!Array.isArray(c.ingredients)||c.ingredients.length<1||c.ingredients.length>recipe.units)return false;
  const ids=new Set<number>();let total=0;
  for(const i of c.ingredients) {
    if(!record(i)||!integer(i.pileId,1)||!integer(i.quantity,1,recipe.units)||!(recipe.inputs.includes(i.item as ProductionIngredient)&&(world.schemaVersion>=91||!V91_ITEM_IDS.includes(String(i.item)))&&(world.schemaVersion>=79||i.item!=='hare-meat'&&i.item!=='hare-corpse')&&(world.schemaVersion>=84||i.item!=='potato'&&i.item!=='corn')||isTailoring(c.recipe)&&c.ingredients.length===1&&i.item===unfinishedItem(c.recipe)&&i.quantity===1)||!['source','placed'].includes(String(i.stage))||!cell(i.cell)||!isTailoring(c.recipe)&&ids.has(Number(i.pileId))||Object.keys(i).some(k=>!['pileId','item','quantity','stage','cell'].includes(k)))return false;
    ids.add(Number(i.pileId));total+=Number(i.quantity);
  }
  return total===(isTailoring(c.recipe)&&c.ingredients.length===1&&c.ingredients[0].item===unfinishedItem(c.recipe)?1:recipe.units);
}
