/** Prospective local provenance bound to the actual immutable planet. It
 * survives mining, landscaping and plant growth; no map is regenerated on
 * admission. Historic local presets retain their own literal schema. */
import type {World} from './types.ts';
import type {WorldLandBiome} from './world-biome-selection.ts';
import type {WorldRelief} from './world-climate-evaluation.ts';
import type {WorldNaturalRock} from './world-site-geography.ts';
import type {WorldRiverId} from './world-rivers.ts';
import {describeWorldSite} from './world-site-geography.ts';
import {planetGeography256} from './planet-geography-256.ts';
import {WORLD_LAND_BIOMES} from './world-biome-selection.ts';
import {isStoneKind} from './geology.ts';

export interface GeographicLocalSite256 {
 revision:3;tileId:number;mapSeed:number;biome:WorldLandBiome;hilliness:WorldRelief;
 river:WorldRiverId|'none';stones:WorldNaturalRock[];coastAngle:number|null;mutatorCode:number;
}
const FIELDS=['revision','tileId','mapSeed','biome','hilliness','river','stones','coastAngle','mutatorCode'];
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
export function validGeographicLocalSite256(value:unknown,version:number):value is GeographicLocalSite256 {
 if(version<256||!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return false;
 const v=value as Record<string,unknown>;
 if(Reflect.ownKeys(v).length!==FIELDS.length||!FIELDS.every(k=>Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)??{},'value')))return false;
 return v.revision===3&&integer(v.tileId,0)&&integer(v.mapSeed,-2147483648,2147483647)&&
 (WORLD_LAND_BIOMES as readonly unknown[]).includes(v.biome)&&['flat','small-hills','large-hills','mountainous','impassable'].includes(String(v.hilliness))&&
 ['none','creek','river','large-river','huge-river'].includes(String(v.river))&&integer(v.mutatorCode,0,15)&&
 (v.coastAngle===null||typeof v.coastAngle==='number'&&Number.isFinite(v.coastAngle)&&v.coastAngle>=0&&v.coastAngle<360)&&
 Array.isArray(v.stones)&&[2,3].includes(v.stones.length)&&Reflect.ownKeys(v.stones).length===v.stones.length+1&&v.stones.every(isStoneKind)&&new Set(v.stones).size===v.stones.length;
}
export function geographicLocalSite256(planet:Extract<NonNullable<World['planet']>,{revision:3}>,tileId:number):GeographicLocalSite256 {
 const owner=planetGeography256(planet),site=describeWorldSite(owner.surface,owner.roads,tileId);
 if(!(WORLD_LAND_BIOMES as readonly string[]).includes(site.biome))throw Error('Water biome has no terrestrial local provenance');
 return {revision:3,tileId:site.tileId,mapSeed:site.mapSeed,biome:site.biome as WorldLandBiome,hilliness:site.hilliness,
  river:site.rivers[0]?.river??'none',stones:[...site.naturalRocks],coastAngle:site.coastAngle,mutatorCode:owner.mutators[tileId]!};
}
/** The only comparison is the tiny immutable geographic description. This
 * neither samples terrain noise nor reads altered map resources or history. */
export function validGeographicSiteBinding256(world:Pick<World,'schemaVersion'|'seed'|'site'|'planet'>):boolean {
 const site=world.site;
 if(site?.revision!==3)return world.planet?.revision!==3;
 if(!validGeographicLocalSite256(site,world.schemaVersion)||world.planet?.revision!==3||world.seed!==(site.mapSeed>>>0))return false;
 try {const expected=geographicLocalSite256(world.planet,site.tileId);
  return FIELDS.every(k=>k==='stones'?site.stones.length===expected.stones.length&&site.stones.every((s,i)=>s===expected.stones[i]):site[k as keyof GeographicLocalSite256]===expected[k as keyof GeographicLocalSite256]);
 }catch{return false;}
}
