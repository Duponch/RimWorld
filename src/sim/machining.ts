import { flakArmorUnlocked,gunsmithingUnlocked } from './research.ts';
import { craftingSkill } from './crafting-quality.ts';
import { FLAK_REQUIREMENTS,GUN_REQUIREMENTS,isFlakRecipe,isGunRecipe,type ProductionRecipe } from './production-recipes.ts';
import type { Pawn,World } from './types.ts';

export const productionResearchUnlocked=(world:World,recipe:ProductionRecipe):boolean=>isGunRecipe(recipe)?gunsmithingUnlocked(world):isFlakRecipe(recipe)?flakArmorUnlocked(world):true;
export const productionWorkerQualified=(pawn:Pawn,recipe:ProductionRecipe):boolean=>isGunRecipe(recipe)?craftingSkill(pawn).level>=GUN_REQUIREMENTS[recipe].skill:isFlakRecipe(recipe)?craftingSkill(pawn).level>=FLAK_REQUIREMENTS.skill:true;
/** Exact inputs for machining; the historic recipes retain their pooled units. */
export function validGunIngredients(recipe:ProductionRecipe,parts:readonly {item:string;quantity:number}[]):boolean {
  if(!isGunRecipe(recipe))return true;
  const required=GUN_REQUIREMENTS[recipe];
  return parts.every(p=>p.item==='steel'||p.item==='component')&&(['steel','component'] as const).every(item=>parts.reduce((n,p)=>n+(p.item===item?p.quantity:0),0)===required[item]);
}
export function validFlakIngredients(recipe:ProductionRecipe,parts:readonly {item:string;quantity:number}[]):boolean {
  if(!isFlakRecipe(recipe))return true;
  return parts.every(p=>p.item==='cloth'||p.item==='steel'||p.item==='component')
    &&(['cloth','steel','component'] as const).every(item=>parts.reduce((n,p)=>n+(p.item===item?p.quantity:0),0)===FLAK_REQUIREMENTS[item]);
}
