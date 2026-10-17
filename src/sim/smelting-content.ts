import type { WeaponItem } from './equipment-rules.ts';

/** Recipe declarations must not load pawn health or learning during initialization. */
export type SmeltingRecipe='smelt-weapon'|'smelt-slag';
export const SMELTING_WORK_TICKS=160;
export const SMELTING_MAX_OUTPUT=19;
export const SMELTING_WEAPONS=['revolver','bolt-action-rifle','emp-launcher','plasteel-knife'] as const;
export const isSmeltingRecipe=(value:unknown):value is SmeltingRecipe=>value==='smelt-weapon'||value==='smelt-slag';
export const smeltingProduct=(item:WeaponItem):'steel'|'plasteel'=>item==='plasteel-knife'?'plasteel':'steel';
