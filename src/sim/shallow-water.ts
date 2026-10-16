/** Static V403 identity. Legacy water remains impassable and never Bridgeable. */
export const SHALLOW_WATER_SCHEMA_VERSION=254;
/** Shared only by the two delivered soft wet terrains; no generic terrain system. */
export const isWetTerrain=(terrain:unknown):boolean=>terrain==='marsh'||terrain==='water-shallow';
