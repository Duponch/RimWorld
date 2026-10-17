import { isStoneKind,siteStones,type StoneKind } from './geology.ts';
import { isBiomeId,type BiomeId } from './biome-flora.ts';
import type { World } from './types.ts';
import {validGeographicLocalSite256,type GeographicLocalSite256} from './site-geographic-256.ts';

export const HILLINESS = ['flat','small-hills','large-hills'] as const;
export type Hilliness = typeof HILLINESS[number];
export const HILLINESS_LABELS:Record<import('./world-climate-evaluation.ts').WorldRelief,string> = {flat:'Plat','small-hills':'Petites collines','large-hills':'Grandes collines',mountainous:'Montagnes',impassable:'Infranchissable'};
export const BIOME_LABELS:Record<import('./world-biome-selection.ts').WorldLandBiome,string>={'temperate-forest':'Forêt tempérée','boreal-forest':'Forêt boréale','arid-shrubland':'Broussailles arides',tundra:'Toundra','cold-bog':'Tourbière froide','temperate-swamp':'Marécage tempéré','tropical-rainforest':'Forêt tropicale','tropical-swamp':'Marécage tropical',desert:'Désert','extreme-desert':'Désert extrême','ice-sheet':'Calotte glaciaire','sea-ice':'Banquise'};
export interface SiteOptions {hilliness:Hilliness;biome?:BiomeId}
export interface LegacySite {
  revision:1;
  biome:'temperate-forest';
  hilliness:Hilliness;
  river:'none';
  stones:StoneKind[];
}
export interface BiomeSite {
  revision:2;
  biome:BiomeId;
  hilliness:Hilliness;
  river:'none';
  stones:StoneKind[];
}
export type LocalSite=LegacySite|BiomeSite|GeographicLocalSite256;
const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
export function validSiteOptions(value:unknown):value is SiteOptions {
  return record(value)&&Object.keys(value).length>0&&Object.keys(value).length<=2&&Object.keys(value).every(key=>key==='hilliness'||key==='biome')&&
    Object.hasOwn(value,'hilliness')&&(HILLINESS as readonly unknown[]).includes(value.hilliness)&&
    (!Object.hasOwn(value,'biome')||isBiomeId(value.biome));
}
/** This is a declared local preset, not a random tile from a generated globe. */
export function resolveSite(seed:number,options:SiteOptions={hilliness:'small-hills'}):LegacySite|BiomeSite {
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||!validSiteOptions(options))throw new Error('Configuration de site invalide.');
  const common={biome:options.biome??'temperate-forest',hilliness:options.hilliness,river:'none' as const,stones:siteStones(seed)};
  return options.biome===undefined?{revision:1,...common,biome:'temperate-forest'}:{revision:2,...common};
}
export const isBiomeSite=(site:LocalSite):site is BiomeSite=>site.revision===2;
/** Provenance survives later excavation and landscaping; do not regenerate to validate. */
export function validSite(value:unknown,version:number,scenario:World['scenario'],expedition=false):boolean {
  if(record(value)&&value.revision===3)return validGeographicLocalSite256(value,version);
  const requiresSite=expedition&&version>=240||scenario?.id==='crashlanded'&&scenario.revision>=2;
  if(value===undefined)return !requiresSite;
  if(version<83||!requiresSite||!record(value)||Object.keys(value).length!==5||!Object.keys(value).every(k=>['revision','biome','hilliness','river','stones'].includes(k)))return false;
  const provenance=value.revision===1?value.biome==='temperate-forest':value.revision===2&&version>=91&&isBiomeId(value.biome)&&(value.biome!=='tundra'||version>=239);
  return provenance&&value.river==='none'&&(HILLINESS as readonly unknown[]).includes(value.hilliness)&&
    Array.isArray(value.stones)&&[2,3].includes(value.stones.length)&&value.stones.every(isStoneKind)&&new Set(value.stones).size===value.stones.length;
}
