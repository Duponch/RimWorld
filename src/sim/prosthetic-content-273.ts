/** Core1.6.4871 rev590 Prosthetics: independent clinical and production facts.
 * No item/runtime import, so physiology and manufacturing share no cycle. */
export const PROSTHETIC_ITEMS_273=['prosthetic-arm','prosthetic-leg'] as const;
export type ProstheticItem273=typeof PROSTHETIC_ITEMS_273[number];
export const PROSTHETIC_RECIPES_273=['make-prosthetic-arm','make-prosthetic-leg'] as const;
export type ProstheticRecipe273=typeof PROSTHETIC_RECIPES_273[number];
export const PROSTHETIC_RESEARCH_COST_273=600;
export const PROSTHETIC_REQUIREMENTS_273=Object.freeze({steel:40,component:4,skill:5});
export const PROSTHETIC_PRODUCTION_WORK_TICKS_273=1500;
export const PROSTHETIC_DEFINITIONS_273=Object.freeze({
 'prosthetic-arm':Object.freeze({label:'Bras prothétique',sites:['left-shoulder','right-shoulder'] as const,efficiency:.5,work:2500,medicineSkill:4,ingredient:'prosthetic-arm' as const,massGrams:5000,hitPoints:50,flammability:.7}),
 'prosthetic-leg':Object.freeze({label:'Jambe prothétique',sites:['left-leg','right-leg'] as const,efficiency:.85,work:2500,medicineSkill:4,ingredient:'prosthetic-leg' as const,massGrams:8000,hitPoints:50,flammability:.7}),
});
export const isProstheticItem273=(v:unknown):v is ProstheticItem273=>typeof v==='string'&&(PROSTHETIC_ITEMS_273 as readonly string[]).includes(v);
export const isProstheticRecipe273=(v:unknown):v is ProstheticRecipe273=>typeof v==='string'&&(PROSTHETIC_RECIPES_273 as readonly string[]).includes(v);
export const prostheticProduct273=(recipe:ProstheticRecipe273):ProstheticItem273=>recipe==='make-prosthetic-arm'?'prosthetic-arm':'prosthetic-leg';
export const PROSTHETIC_ITEM_DEFINITIONS_273=Object.freeze({
 'prosthetic-arm':Object.freeze({label:'Bras prothétique',kind:'prosthesis' as const,stackLimit:1,nutrition:0,maxIngest:0,color:0xbfc5bc}),
 'prosthetic-leg':Object.freeze({label:'Jambe prothétique',kind:'prosthesis' as const,stackLimit:1,nutrition:0,maxIngest:0,color:0xb1bcb4}),
});
