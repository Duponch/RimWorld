import {isWorldFactionDef256,WORLD_FACTION_DEFINITIONS_256} from './world-faction-catalog.ts';
import type {WorldSurfaceTile} from './world-surface-geography.ts';
import {worldBiomeCanSettle} from './world-biome-properties.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const dense=(v:unknown):v is unknown[]=>Array.isArray(v)&&Object.getPrototypeOf(v)===Array.prototype&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>Object.hasOwn(Object.getOwnPropertyDescriptor(v,String(i))??{},'value')).every(Boolean);
export interface PlanetFactionTargets256 {occupied:ReadonlySet<number>;civilianTiles:readonly number[];initialForeignDefs:readonly import('./world-faction-catalog.ts').WorldFactionDef256[]}
/** Narrow geographic join only. The separate World faction guard still owns
 * leaders, names, relations, personal clocks, stocks and the Thing namespace.
 * Cost is factions+settlements, never all geographic cells. */
export function planetFactionTargets256(value:unknown,tiles:readonly WorldSurfaceTile[]):PlanetFactionTargets256|undefined {
 if(!object(value)||!dense(value.factions)||!dense(value.settlements))return;
 const defs=new Map<number,import('./world-faction-catalog.ts').WorldFactionDef256>(),initialForeignDefs:import('./world-faction-catalog.ts').WorldFactionDef256[]=[];
 for(const row of value.factions){if(!object(row)||!int(row.id,1)||!isWorldFactionDef256(row.def)||defs.has(row.id)||row.hidden!==WORLD_FACTION_DEFINITIONS_256[row.def].hidden)return;defs.set(row.id,row.def);if(!WORLD_FACTION_DEFINITIONS_256[row.def].player)initialForeignDefs.push(row.def);}
 const occupied=new Set<number>(),settlementIds=new Set<number>(),civilianTiles:number[]=[];
 for(const row of value.settlements){if(!object(row)||!int(row.id,1)||settlementIds.has(row.id)||!int(row.factionId,1)||!int(row.tile,0,tiles.length-1))return;const def=defs.get(row.factionId),tile=tiles[row.tile];if(!def||WORLD_FACTION_DEFINITIONS_256[def].player||WORLD_FACTION_DEFINITIONS_256[def].hidden||occupied.has(row.tile)||!tile||!worldBiomeCanSettle(tile.biome)||tile.hilliness==='impassable')return;occupied.add(row.tile);settlementIds.add(row.id);if(def==='OutlanderCivil'||def==='TribeCivil')civilianTiles.push(row.tile);}
 for(const tile of occupied)if(tiles[tile]!.neighbours.some(id=>occupied.has(id)))return;
 return {occupied,civilianTiles,initialForeignDefs};
}
