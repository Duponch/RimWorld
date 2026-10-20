import type { WeaponItem } from './equipment-rules.ts';
import {SMITHING_APPAREL_ITEMS267,isSmithingApparel267,smithingApparelStuff267,type SmithingApparel267,type ArmorMetal267} from './smithing-apparel-267.ts';

/** Recipe declarations must not load pawn health or learning during initialization. */
export type SmeltingRecipe='smelt-weapon'|'smelt-slag'|'smelt-apparel';
export const SMELTING_WORK_TICKS=160;
export const SMELTING_MAX_OUTPUT=19;
export const SMELTING_WEAPONS=['revolver','bolt-action-rifle','emp-launcher','plasteel-knife'] as const;
export const SMELTING_APPAREL_INPUTS267=Object.freeze(SMITHING_APPAREL_ITEMS267.filter(item=>smithingApparelStuff267(item)!=='wood'));
export const SMELTING_APPAREL_MAX_OUTPUT267=425;
export const isSmeltingRecipe=(value:unknown):value is SmeltingRecipe=>value==='smelt-weapon'||value==='smelt-slag'||value==='smelt-apparel';
export const smeltingProduct=(item:WeaponItem|SmithingApparel267):ArmorMetal267=>{
 if(isSmithingApparel267(item)){const stuff=smithingApparelStuff267(item);if(stuff==='wood')throw Error('Wooden apparel is not smeltable');return stuff;}
 return item==='plasteel-knife'?'plasteel':'steel';
};
