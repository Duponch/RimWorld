import {terrainIsWater256} from './natural-terrain-runtime-256.ts';
/** Static V403 identity. Legacy water remains impassable and never Bridgeable. */
export const SHALLOW_WATER_SCHEMA_VERSION=254;
/** Water identity only. Bridgeability, supports, snow and filth use their own actual properties. */
export const isWetTerrain=(terrain:unknown):boolean=>terrainIsWater256(terrain);
