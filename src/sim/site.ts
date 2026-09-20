import { isStoneKind,siteStones,type StoneKind } from './geology.ts';
import type { World } from './types.ts';

export const HILLINESS = ['flat','small-hills','large-hills'] as const;
export type Hilliness = typeof HILLINESS[number];
export const HILLINESS_LABELS:Record<Hilliness,string> = {flat:'Plat','small-hills':'Petites collines','large-hills':'Grandes collines'};
export interface SiteOptions {hilliness:Hilliness}
export interface LocalSite extends SiteOptions {
  revision:1;
  biome:'temperate-forest';
  river:'none';
  stones:StoneKind[];
}
const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
export function validSiteOptions(value:unknown):value is SiteOptions {
  return record(value)&&Object.keys(value).length===1&&Object.hasOwn(value,'hilliness')&&(HILLINESS as readonly unknown[]).includes(value.hilliness);
}
/** This is a declared local preset, not a random tile from a generated globe. */
export function resolveSite(seed:number,options:SiteOptions={hilliness:'small-hills'}):LocalSite {
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||!validSiteOptions(options))throw new Error('Configuration de site invalide.');
  return {revision:1,biome:'temperate-forest',hilliness:options.hilliness,river:'none',stones:siteStones(seed)};
}
/** Provenance survives later excavation and landscaping; do not regenerate to validate. */
export function validSite(value:unknown,version:number,scenario:World['scenario']):boolean {
  const requiresSite=scenario?.id==='crashlanded'&&scenario.revision===2;
  if(value===undefined)return !requiresSite;
  if(version<83||!requiresSite||!record(value)||Object.keys(value).length!==5||!Object.keys(value).every(k=>['revision','biome','hilliness','river','stones'].includes(k)))return false;
  return value.revision===1&&value.biome==='temperate-forest'&&value.river==='none'&&(HILLINESS as readonly unknown[]).includes(value.hilliness)&&
    Array.isArray(value.stones)&&[2,3].includes(value.stones.length)&&value.stones.every(isStoneKind)&&new Set(value.stones).size===value.stones.length;
}
