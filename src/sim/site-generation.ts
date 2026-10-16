import {shallowWaterPatchAt} from './shallow-water-generation.ts';
import {SHALLOW_WATER_SCHEMA_VERSION} from './shallow-water.ts';
import {marshPatchAt} from './marsh-generation.ts';
import {MARSH_SCHEMA_VERSION} from './marsh.ts';
import {SCHEMA_VERSION} from './types.ts';
import { emptyLandscape } from './generation.ts';
import { geologicalField } from './geology.ts';
import { isBiomeSite,type LocalSite } from './site.ts';
import { generateSiteFields } from './site-noise.ts';
import { generateSiteOres } from './site-ores.ts';
import { generateBiomeSiteVegetation,generateSiteChunks,generateSiteVegetation } from './site-vegetation.ts';
import type { World } from './types.ts';
import { initializeWildFlora } from './wild-flora.ts';

export const SITE_ELEVATION_FACTORS={flat:.8,'small-hills':.9,'large-hills':1} as const;

/** Site-local landscape, without a planet or invented river. V385 tundra
 * lowland can contain static marsh pockets; V403 boreal lowland static shallow
 * ponds use an original prospective field. Historical RAW maps are never regenerated.
 * Terrain is the authority after creation. No clipping to a target rock quota,
 * no cleanup of small mountains, and no clearing resources for a landing spot. */
export function generateSiteWorld(seed:number,width:number,height:number,site:LocalSite,generationVersion:number=SCHEMA_VERSION):World {
  const world=emptyLandscape(seed,width,height),stoneAt=geologicalField(world.seed,site.stones);
  const fields=generateSiteFields(world.seed,width,height,SITE_ELEVATION_FACTORS[site.hilliness]);
  world.tiles=Array.from(fields.elevation,(elevation,i)=>{
    if(elevation>.7)return {terrain:'rock',stone:stoneAt(i%width,Math.floor(i/width))};
    if(elevation>=.61)return {terrain:'rough-stone',stone:stoneAt(i%width,Math.floor(i/width))};
    if(elevation>.55)return {terrain:'gravel'};
    if(generationVersion>=SHALLOW_WATER_SCHEMA_VERSION&&isBiomeSite(site)&&site.biome==='boreal-forest'&&shallowWaterPatchAt(world.seed,i%width,Math.floor(i/width)))return {terrain:'water-shallow'};
    if(generationVersion>=MARSH_SCHEMA_VERSION&&isBiomeSite(site)&&site.biome==='tundra'&&marshPatchAt(world.seed,i%width,Math.floor(i/width)))return {terrain:'marsh'};
    return {terrain:fields.fertility[i]!>=.87?'rich-soil':'grass'};
  });
  generateSiteOres(world,site,stoneAt);
  generateSiteChunks(world,site,fields.elevation);
  if(isBiomeSite(site)){generateBiomeSiteVegetation(world,site);initializeWildFlora(world,site);}
  else generateSiteVegetation(world);
  return world;
}
