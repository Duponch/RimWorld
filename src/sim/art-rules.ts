import type { Pawn } from './types.ts';
import type { SkillRecord } from './skills.ts';

export const ART_MATERIALS=['wood','steel','granite-blocks','limestone-blocks','marble-blocks','sandstone-blocks','slate-blocks'] as const;
export type ArtMaterial=typeof ART_MATERIALS[number];
export type ArtRecipe='small-sculpture'|'large-sculpture';
export const isArtMaterial=(v:unknown):v is ArtMaterial=>(ART_MATERIALS as readonly unknown[]).includes(v);
export const isArtRecipe=(v:unknown):v is ArtRecipe=>v==='small-sculpture'||v==='large-sculpture';
/** Core WorkToMake (not WorkToBuild), 10 Core ticks per local tick. */
const factors:Record<ArtMaterial,number>={wood:.7,steel:1,'granite-blocks':1.3,'limestone-blocks':1.3,'marble-blocks':1.15,'sandstone-blocks':1.1,'slate-blocks':1.3};
export const artWorkTotal=(recipe:ArtRecipe,material:ArtMaterial):number=>Math.round((recipe==='small-sculpture'?1800:3000)*factors[material]*10000);
export const artisticSkill=(pawn:Pawn):SkillRecord=>pawn.skills.artistic??{level:0,xp:0,dailyXp:0,passion:0};
