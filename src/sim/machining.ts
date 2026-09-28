import { advancedFabricationUnlocked,fabricationUnlocked,flakArmorUnlocked,gunsmithingUnlocked } from './research.ts';
import { craftingSkill } from './crafting-quality.ts';
import { ADVANCED_COMPONENT_REQUIREMENTS,flakRequirements,FLAK_HELMET_REQUIREMENTS,FLAK_REQUIREMENTS,GUN_REQUIREMENTS,isFlakRecipe,isGunRecipe,type ProductionRecipe } from './production-recipes.ts';
import type { Pawn,World } from './types.ts';

export const productionResearchUnlocked=(world:World,recipe:ProductionRecipe):boolean=>recipe==='make-component'?fabricationUnlocked(world):recipe==='make-advanced-component'?advancedFabricationUnlocked(world):isGunRecipe(recipe)?gunsmithingUnlocked(world):isFlakRecipe(recipe)?flakArmorUnlocked(world):true;
export const productionWorkerQualified=(pawn:Pawn,recipe:ProductionRecipe):boolean=>recipe==='make-component'||recipe==='make-advanced-component'?craftingSkill(pawn).level>=ADVANCED_COMPONENT_REQUIREMENTS.skill:isGunRecipe(recipe)?craftingSkill(pawn).level>=GUN_REQUIREMENTS[recipe].skill:isFlakRecipe(recipe)?craftingSkill(pawn).level>=flakRequirements(recipe).skill:true;
/** Exact inputs for machining; the historic recipes retain their pooled units. */
export function validGunIngredients(recipe:ProductionRecipe,parts:readonly {item:string;quantity:number}[]):boolean {
  if(!isGunRecipe(recipe))return true;
  const required=GUN_REQUIREMENTS[recipe];
  return parts.every(p=>p.item==='steel'||p.item==='component')&&(['steel','component'] as const).every(item=>parts.reduce((n,p)=>n+(p.item===item?p.quantity:0),0)===required[item]);
}
export function validFlakIngredients(recipe:ProductionRecipe,parts:readonly {item:string;quantity:number}[]):boolean {
  if(!isFlakRecipe(recipe))return true;
  if(recipe==='make-flak-vest')return parts.every(p=>p.item==='cloth'||p.item==='steel'||p.item==='component')
    &&(['cloth','steel','component'] as const).every(item=>parts.reduce((n,p)=>n+(p.item===item?p.quantity:0),0)===FLAK_REQUIREMENTS[item]);
  return parts.every(p=>p.item==='steel'||p.item==='component'||p.item==='plasteel')
    &&(['steel','component','plasteel'] as const).every(item=>parts.reduce((n,p)=>n+(p.item===item?p.quantity:0),0)===FLAK_HELMET_REQUIREMENTS[item]);
}
export function validAdvancedComponentIngredients(recipe:ProductionRecipe,parts:readonly {item:string;quantity:number}[]):boolean {
  if(recipe!=='make-advanced-component')return true;
  return parts.every(p=>p.item==='component'||p.item==='steel'||p.item==='plasteel'||p.item==='gold')
    &&(['component','steel','plasteel','gold'] as const).every(item=>parts.reduce((n,p)=>n+(p.item===item?p.quantity:0),0)===ADVANCED_COMPONENT_REQUIREMENTS[item]);
}
