import {APPAREL,type ApparelItem} from './apparel-rules.ts';
/** Core BurnableByRecipe, distinct from the physical fire flammability stat.
 * Delivered textiles and fixed flak/recon pieces burn; steel-stuff helmet does not. */
export const BURN_APPAREL_INPUTS:readonly ApparelItem[]=Object.freeze((Object.keys(APPAREL) as ApparelItem[]).filter(item=>item!=='flak-helmet'));
export type BurnApparelRecipe='burn-apparel';
export const isBurnApparelRecipe=(v:unknown):v is BurnApparelRecipe=>v==='burn-apparel';
/** 60 Core work / ten Core ticks per local tick. Campfire factor .5 is separate. */
export const BURN_APPAREL_WORK_TICKS=6;
