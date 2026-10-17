/** No map scan or stored duplicate: movement consumes the same definition as
 * generation. Legacy water/rock and the historical neutral grass/soil remain
 * literal; admission rejects future identities before old-schema migration. */
import {isNaturalTerrain256,NATURAL_TERRAIN_DEFINITIONS_256} from './local-terrain-definitions-256.ts';
import {PACKED_DIRT_256} from './road-ground-256.ts';
export function naturalTerrainCosts256(terrain:unknown){return terrain==='packed-dirt'?PACKED_DIRT_256:isNaturalTerrain256(terrain)?NATURAL_TERRAIN_DEFINITIONS_256[terrain]:undefined;}
export function naturalTerrainWalkable256(terrain:unknown):boolean {
 const natural=naturalTerrainCosts256(terrain);return natural?natural.affordances.includes('Walkable'):terrain==='grass'||terrain==='soil';
}
