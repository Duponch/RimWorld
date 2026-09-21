import { emptyLandscape } from './generation.ts';
import { geologicalField } from './geology.ts';
import { isBiomeSite,type LocalSite } from './site.ts';
import { generateSiteFields } from './site-noise.ts';
import { generateSiteOres } from './site-ores.ts';
import { generateBiomeSiteVegetation,generateSiteChunks,generateSiteVegetation } from './site-vegetation.ts';
import type { World } from './types.ts';
import { initializeWildFlora } from './wild-flora.ts';

export const SITE_ELEVATION_FACTORS={flat:.8,'small-hills':.9,'large-hills':1} as const;

/** Site-local temperate landscape, without a planet or invented river/pond.
 * Terrain is the authority after creation. No clipping to a target rock quota,
 * no cleanup of small mountains, and no clearing resources for a landing spot. */
export function generateSiteWorld(seed:number,width:number,height:number,site:LocalSite):World {
  const world=emptyLandscape(seed,width,height),stoneAt=geologicalField(world.seed,site.stones);
  const fields=generateSiteFields(world.seed,width,height,SITE_ELEVATION_FACTORS[site.hilliness]);
  world.tiles=Array.from(fields.elevation,(elevation,i)=>{
    if(elevation>.7)return {terrain:'rock',stone:stoneAt(i%width,Math.floor(i/width))};
    if(elevation>=.61)return {terrain:'rough-stone',stone:stoneAt(i%width,Math.floor(i/width))};
    if(elevation>.55)return {terrain:'gravel'};
    return {terrain:fields.fertility[i]!>=.87?'rich-soil':'grass'};
  });
  generateSiteOres(world,site,stoneAt);
  generateSiteChunks(world,site,fields.elevation);
  if(isBiomeSite(site)){generateBiomeSiteVegetation(world,site);initializeWildFlora(world,site);}
  else generateSiteVegetation(world);
  return world;
}
