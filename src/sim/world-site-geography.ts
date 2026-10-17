/** Read-only connection between the actual prospective surface tile and its
 * local generator. No legacy site preset, rerolled climate or forced coast.
 * Behavioural facts: Core1.6.4871; geometry/native angle boundary remains
 * qualified separately from the original mathematical representation. */
import {worldSurfaceCoordinates} from './world-surface-movement.ts';
import {worldSphericalHeading} from './world-spherical-heading.ts';
import {worldBiomeCanSettle} from './world-biome-properties.ts';
import {visibleWorldRivers,visibleWorldRoads,type WorldRoadLink} from './world-roads.ts';
import {WorldGenerationRandom,combineWorldSeed} from './world-generation-random.ts';
import type {WorldPhysicalSurface} from './world-surface-geography.ts';
import type {WorldRiverId} from './world-rivers.ts';
const f=Math.fround;
const ROCKS=['sandstone','granite','limestone','slate','marble'] as const;
export type WorldNaturalRock=typeof ROCKS[number];
const WIDTH:Readonly<Record<WorldRiverId,number>>={'huge-river':30,'large-river':14,river:6,creek:4};
export function surfaceTileHash(tileId:number):number {
 if(!Number.isSafeInteger(tileId)||tileId<0||tileId>0x7fffffff)throw Error('Invalid surface tile identity');
 return Math.imul(tileId,397);
}
export function localSurfaceMapSeed(worldSeed:number,tileId:number):number {
 if(!Number.isInteger(worldSeed)||worldSeed< -2147483648||worldSeed>0xffffffff)throw Error('Invalid world seed');
 return combineWorldSeed(worldSeed,surfaceTileHash(tileId));
}
/** Natural rock selection has its own tile-only stream. Neither climate nor
 * world seed changes the order/count for the same root-surface tile identity. */
export function surfaceNaturalRocks(tileId:number):WorldNaturalRock[] {
 const random=new WorldGenerationRandom(surfaceTileHash(tileId)),pool:WorldNaturalRock[]=[...ROCKS],count=random.integer(2,4),chosen:WorldNaturalRock[]=[];
 for(let i=0;i<count;i++){const remaining=pool.length-i,at=random.integer(0,remaining);chosen.push(pool[at]!);pool[at]=pool[remaining-1]!;}
 return chosen;
}
/** The generator sorts actual step definitions first; the occurrence ordinal
 * counts earlier steps sharing this SeedPart, not all preceding definitions. */
export function localGenerationStepSeed(mapSeed:number,seedPart:number,earlierSamePart:number):number {
 if(!Number.isInteger(mapSeed)||mapSeed< -2147483648||mapSeed>0xffffffff||!Number.isInteger(seedPart)||seedPart< -2147483648||seedPart>2147483647||!Number.isSafeInteger(earlierSamePart)||earlierSamePart<0||earlierSamePart>2147483647)throw Error('Invalid local generation step');
 return combineWorldSeed(mapSeed,(seedPart+earlierSamePart)|0);
}
export interface LocalRiverGeography {neighbour:number;river:WorldRiverId;width:number;riverDistance:number}
export interface WorldSiteGeography {
 tileId:number;mapSeed:number;biome:WorldPhysicalSurface['tiles'][number]['biome'];hilliness:WorldPhysicalSurface['tiles'][number]['hilliness'];
 latitude:number;longitude:number;elevation:number;meanTemperature:number;rainfall:number;swampiness:number;
 waterCovered:boolean;hasBedrock:boolean;naturalRocks:WorldNaturalRock[];
 coastAngle:number|null;rivers:LocalRiverGeography[];riverHeading:number|null;roads:{neighbour:number;road:WorldRoadLink['road'];heading:number}[];
}
/** Ocean and freshwater coast angles are queried independently. A lake is
 * not promoted to an ocean coast, but mountain orientation may consult it. */
export function surfaceCoastAngle256(surface:WorldPhysicalSurface,tileId:number,waterBiome:'ocean'|'lake'):number|null {
 const tile=surface.tiles[tileId];if(!Number.isSafeInteger(tileId)||!tile||tile.id!==tileId)throw Error('Unknown prospective coast tile');
 if(!worldBiomeCanSettle(tile.biome))return null;let cos=0,sin=0,count=0;
 for(const id of tile.neighbours){const water=surface.tiles[id];if(!water)throw Error('Coast leaves actual surface');if(water.biome!==waterBiome)continue;const angle=f(worldSphericalHeading(water.center,tile.center)*f(Math.PI/180));cos=f(cos+f(Math.cos(angle)));sin=f(sin+f(Math.sin(angle)));count++;}
 if(!count)return null;const mean=f(f(Math.atan2(f(sin/count),f(cos/count)))*f(180/Math.PI));return f(f(450-mean)%360);
}
export function describeWorldSite(surface:WorldPhysicalSurface,roads:readonly (readonly WorldRoadLink[])[],tileId:number):WorldSiteGeography {
 const tile=surface.tiles[tileId];if(!Number.isSafeInteger(tileId)||!tile||tile.id!==tileId||roads.length!==surface.tiles.length)throw Error('Unknown prospective local site');
 const neighbour=(id:number)=>{const t=surface.tiles[id];if(!t||!tile.neighbours.includes(id))throw Error('Local site link is not a geographic neighbour');return t;};
 const coastAngle=surfaceCoastAngle256(surface,tileId,'ocean');
 const rivers=visibleWorldRivers(tile).map(link=>({neighbour:link.neighbour,river:link.river,width:WIDTH[link.river],riverDistance:neighbour(link.neighbour).riverDistance}));
 // A stable equal-distance tie retains the actual saved link order.
 rivers.sort((a,b)=>b.riverDistance-a.riverDistance);
 const riverHeading=rivers.length?worldSphericalHeading(neighbour(rivers[0]!.neighbour).center,neighbour(rivers.at(-1)!.neighbour).center):null;
 return {tileId,mapSeed:localSurfaceMapSeed(surface.generationSeed,tileId),biome:tile.biome,hilliness:tile.hilliness,...worldSurfaceCoordinates(tile),
  elevation:tile.elevation,meanTemperature:tile.meanTemperature,rainfall:tile.rainfall,swampiness:tile.swampiness,
  waterCovered:tile.elevation<=0,hasBedrock:tile.biome!=='sea-ice',naturalRocks:surfaceNaturalRocks(tileId),coastAngle,rivers,riverHeading,
  roads:visibleWorldRoads(tile,roads[tileId]!).map(link=>({neighbour:link.neighbour,road:link.road,heading:worldSphericalHeading(tile.center,neighbour(link.neighbour).center)}))};
}
