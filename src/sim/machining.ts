import { medicineProductionUnlocked,intellectualSkill,machiningUnlocked,packagedSurvivalMealsUnlocked,advancedFabricationUnlocked,fabricationUnlocked,flakArmorUnlocked,gunsmithingUnlocked,reconArmorUnlocked } from './research.ts';
import { effectiveSkillLevel } from './work-types.ts';
import { pawnBody } from './health-rules.ts';
import { learnSkill,type SkillRecord } from './skills.ts';
import { craftingSkill } from './crafting-quality.ts';
import { ADVANCED_COMPONENT_REQUIREMENTS,flakRequirements,FLAK_HELMET_REQUIREMENTS,FLAK_REQUIREMENTS,RECON_HELMET_REQUIREMENTS,GUN_REQUIREMENTS,isFlakRecipe,isGunRecipe,type ProductionRecipe } from './production-recipes.ts';
import type { Pawn,World } from './types.ts';

export const productionResearchUnlocked=(world:World,recipe:ProductionRecipe):boolean=>recipe==='make-medicine'?world.schemaVersion>=206&&medicineProductionUnlocked(world):recipe==='smash-mechanoid'?world.schemaVersion>=194:recipe==='shred-mechanoid'?world.schemaVersion>=194&&machiningUnlocked(world):recipe==='cook-survival-meal'?world.schemaVersion>=188&&packagedSurvivalMealsUnlocked(world):recipe==='make-component'?fabricationUnlocked(world):recipe==='make-advanced-component'?advancedFabricationUnlocked(world):recipe==='make-recon-helmet'?reconArmorUnlocked(world):isGunRecipe(recipe)?gunsmithingUnlocked(world):isFlakRecipe(recipe)?flakArmorUnlocked(world):true;
export const productionWorkerQualified=(pawn:Pawn,recipe:ProductionRecipe):boolean=>recipe==='make-medicine'?effectiveSkillLevel(pawn,'crafting',craftingSkill(pawn).level)>=4&&effectiveSkillLevel(pawn,'intellectual',intellectualSkill(pawn).level)>=4:recipe==='fine-meal'||recipe==='cook-fine-meal-bulk'||recipe==='vegetarian-fine-meal'||recipe==='cook-vegetarian-fine-meal-bulk'||recipe==='carnivore-fine-meal'||recipe==='cook-carnivore-fine-meal-bulk'?(pawn.skills.cooking?.level??0)>=6:recipe==='cook-survival-meal'||recipe==='lavish-meal'||recipe==='cook-lavish-meal-bulk'||recipe==='vegetarian-lavish-meal'||recipe==='cook-vegetarian-lavish-meal-bulk'||recipe==='cook-carnivore-lavish-meal'||recipe==='cook-carnivore-lavish-meal-bulk'?(pawn.skills.cooking?.level??0)>=8:recipe==='make-component'||recipe==='make-advanced-component'?craftingSkill(pawn).level>=ADVANCED_COMPONENT_REQUIREMENTS.skill:isGunRecipe(recipe)?craftingSkill(pawn).level>=GUN_REQUIREMENTS[recipe].skill:isFlakRecipe(recipe)?craftingSkill(pawn).level>=flakRequirements(recipe).skill:true;
/** Core DrugSynthesisSpeed; delivered WorkSpeedGlobal modifiers are neutral.
 * Room, light and temperature belong to the production environment. */
export function medicineProductionSpeed(pawn:Pawn):number {
  const c=pawnBody(pawn).capacities;
  return Math.max(.1,(.3+.0875*effectiveSkillLevel(pawn,'intellectual',intellectualSkill(pawn).level))*(.4+.6*Math.min(1,c.sight))*c.manipulation);
}
/** Completion-only learning, projected before the physical producer commits. */
export function completedMedicineSkill(pawn:Pawn,workTicks:number):SkillRecord {
  const skill={...intellectualSkill(pawn)},worker={...pawn,skills:{...pawn.skills,intellectual:skill}};
  learnSkill(skill,workTicks*1000,worker);return skill;
}
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
  if(recipe==='make-recon-helmet')return parts.every(p=>p.item==='plasteel'||p.item==='advanced-component')
    &&(['plasteel','advanced-component'] as const).every(item=>parts.reduce((n,p)=>n+(p.item===item?p.quantity:0),0)===RECON_HELMET_REQUIREMENTS[item]);
  return parts.every(p=>p.item==='steel'||p.item==='component'||p.item==='plasteel')
    &&(['steel','component','plasteel'] as const).every(item=>parts.reduce((n,p)=>n+(p.item===item?p.quantity:0),0)===FLAK_HELMET_REQUIREMENTS[item]);
}
export function validAdvancedComponentIngredients(recipe:ProductionRecipe,parts:readonly {item:string;quantity:number}[]):boolean {
  if(recipe!=='make-advanced-component')return true;
  return parts.every(p=>p.item==='component'||p.item==='steel'||p.item==='plasteel'||p.item==='gold')
    &&(['component','steel','plasteel','gold'] as const).every(item=>parts.reduce((n,p)=>n+(p.item===item?p.quantity:0),0)===ADVANCED_COMPONENT_REQUIREMENTS[item]);
}
