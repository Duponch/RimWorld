/** Movement compiles immutable definition facts once. No World, terrain cell,
 * bridge or navigation grid is cached; same-tick map edits remain live. Legacy
 * water/rock stay blocked and the historical grass/soil stay walkable. */
import {isNaturalTerrain256,NATURAL_TERRAIN_DEFINITIONS_256} from './local-terrain-definitions-256.ts';
import {PACKED_DIRT_256} from './road-ground-256.ts';
const walkableTerrains=new Set<unknown>(['grass','soil',
 ...Object.entries(NATURAL_TERRAIN_DEFINITIONS_256).filter(([,facts])=>facts.affordances.includes('Walkable')).map(([terrain])=>terrain),
 ...(PACKED_DIRT_256.affordances.includes('Walkable')?['packed-dirt']:[])]);
export function naturalTerrainCosts256(terrain:unknown){return terrain==='packed-dirt'?PACKED_DIRT_256:isNaturalTerrain256(terrain)?NATURAL_TERRAIN_DEFINITIONS_256[terrain]:undefined;}
export function naturalTerrainWalkable256(terrain:unknown):boolean {return walkableTerrains.has(terrain);}
