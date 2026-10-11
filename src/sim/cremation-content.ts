import { ANIMAL_CORPSE_ITEMS } from './biome-items.ts';
export type { CremationFilter } from './cooking-types.ts';

/** Recipe initialization remains independent of health, navigation and services. */
export type CremationRecipe='cremate-corpse';
export const CREMATION_WORK_TICKS=18;
export const CREMATION_INPUTS=['human-corpse',...ANIMAL_CORPSE_ITEMS] as const;
export const CREMATION_FILTER_KEYS=['colonists','strangers','fresh','rotting','desiccated'] as const;
export const isCremationRecipe=(value:unknown):value is CremationRecipe=>value==='cremate-corpse';
