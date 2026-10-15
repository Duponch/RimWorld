import { generatePlanet, tileCoordinates } from './planet-generation.ts';
import type { PlanetState, PlanetTile } from './planet-state.ts';
import { seasonalAmplitude, type ClimateDefinition } from './site-climate.ts';
import type { SiteOptions } from './site.ts';

/** Prospective choice only. The Worker reconstructs the world; no globe or
 * arbitrary geography received from the UI becomes simulation authority. */
export interface StartingWorld {version:1|2; seed:number; tile:number}
export interface StartingSite {seed:number; site:SiteOptions; climate:ClimateDefinition; planet:PlanetState}
const integer=(n:unknown,low:number,high:number):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=low&&n<=high;
export function validStartingWorld(value:unknown):value is StartingWorld {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  if(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)return false;
  const v=value as Record<string,unknown>,keys=Reflect.ownKeys(v);
  return keys.length===3&&keys.every(k=>(k==='version'||k==='seed'||k==='tile')&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'))&&(v.version===1||v.version===2)&&integer(v.seed,0,0xffffffff)&&integer(v.tile,0,161);
}
/** Textual world seeds are independent of candidate seeds and local map seeds.
 * Numeric seeds keep their literal uint32 interpretation for reproducibility. */
export function parseWorldSeed(text:string):number|undefined {
  const source=text.trim();
  if(!source||source.length>64||/[\u0000-\u001f\u007f-\u009f]/u.test(source))return undefined;
  if(/^\d+$/u.test(source)){const n=Number(source);if(integer(n,0,0xffffffff))return n;}
  let hash=0x811c9dc5;
  for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,0x01000193);}
  return hash>>>0;
}
export function generateStartingWorld(seed:number,version:1|2=1):PlanetState {
  // A full, original 162-tile globe, shared with the caravan system. Its
  // generation is not RimWorld's planet generator or its coverage percentages.
  return generatePlanet(seed,{biome:'temperate-forest',latitude:22.21,longitude:-18.23,meanTemperature:16.2,rainfall:900,hilliness:'small-hills'},0,version);
}
/** Land access to the existing civilian destination is required by our
 * current caravan mechanics. One bounded graph walk per generated draft. */
export function startingSiteChoices(planet:PlanetState):number[] {
  const seen=new Set<number>([planet.civilianTile]),queue=[planet.civilianTile];
  for(let head=0;head<queue.length;head++)for(const id of planet.tiles[queue[head]!]!.neighbours){
    if(seen.has(id)||planet.tiles[id]!.biome==='ocean')continue;
    seen.add(id);queue.push(id);
  }
  return queue.filter(id=>id!==planet.civilianTile&&planet.tiles[id]!.hilliness!=='mountainous').sort((a,b)=>a-b);
}
export function localSeedForTile(seed:number,id:number):number {
  let n=(seed^Math.imul(id+1,0x9e3779b1)^0x33351e)>>>0;
  n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);
  return (n^(n>>>16))>>>0;
}
export function startingTileClimate(tile:PlanetTile):ClimateDefinition {
  const {latitude,longitude}=tileCoordinates(tile);
  return {latitude,longitude,meanTemperature:tile.meanTemperature,rainfall:tile.rainfall,amplitude:seasonalAmplitude(latitude)};
}
export function resolveStartingSite(choice:StartingWorld):StartingSite {
  if(!validStartingWorld(choice))throw new Error('Le choix du lieu de départ est invalide.');
  const planet=generateStartingWorld(choice.seed,choice.version);
  if(!startingSiteChoices(planet).includes(choice.tile))throw new Error('Ce lieu de départ est indisponible : choisissez un terrain terrestre accessible, sans montagne ni comptoir.');
  const tile=planet.tiles[choice.tile]!;
  if(tile.biome==='ocean'||tile.hilliness==='mountainous')throw new Error('Ce terrain ne peut pas accueillir la colonie.');
  planet.homeTile=choice.tile;
  return {seed:localSeedForTile(choice.seed,choice.tile),site:{biome:tile.biome,hilliness:tile.hilliness},climate:startingTileClimate(tile),planet};
}
