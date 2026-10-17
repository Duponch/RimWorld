/** Generated road terrain facts. These identities never replace old cells. */
import type {NaturalTerrainDefinition256} from './local-terrain-definitions-256.ts';
export const ROAD_FLAGSTONES_256=['granite-flagstone','limestone-flagstone','marble-flagstone','sandstone-flagstone','slate-flagstone'] as const;
export type RoadFlagstone256=typeof ROAD_FLAGSTONES_256[number];
export type RoadFloor256=RoadFlagstone256|'broken-asphalt';
export const isRoadFloor256=(v:unknown):v is RoadFloor256=>v==='broken-asphalt'||typeof v==='string'&&(ROAD_FLAGSTONES_256 as readonly string[]).includes(v);
export const PACKED_DIRT_256:NaturalTerrainDefinition256=Object.freeze({fertility:0,pathCostCore:1,perceivedCivilCore:0,perceivedDraftedCore:0,
 affordances:Object.freeze(['Walkable','Light','Medium','Heavy','Diggable'] as const),water:false,river:false,ice:false,extinguishesFire:false,holdsSnow:true,acceptsUnnaturalFilth:true,extraDeterioration:0,stone:false,supportsRock:true});
