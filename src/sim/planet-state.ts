import type {StoredCampaignGeography256} from './world-geography-owner-256.ts';

export type LegacyPlanetBiome='temperate-forest'|'boreal-forest'|'arid-shrubland'|'tundra'|'ocean';
export interface PlanetTile {
  id: number; // Geographic namespace, not Thing.nextId.
  center: [number, number, number];
  neighbours: number[];
  biome: LegacyPlanetBiome;
  hilliness: 'flat' | 'small-hills' | 'large-hills' | 'mountainous';
  meanTemperature: number;
  rainfall: number;
}
export interface LegacyPlanetState {
  revision: 1 | 2;
  adoptedAt: number;
  generationSeed: number;
  tiles: PlanetTile[];
  homeTile: number;
  civilianTile: number;
  nextGroupId: number;
}

/** Prospective worlds persist scalar columns only. The exact runtime owner
 * holds their immutable derived geometry outside World/JSON. */
export interface GeographicPlanetState {
 revision:3;adoptedAt:number;generationSeed:number;
 geography:StoredCampaignGeography256;
 homeTile:number;civilianTile:number|null;nextGroupId:number;
}
export type PlanetState=LegacyPlanetState|GeographicPlanetState;

/** Real metadata needed by the pure planet guard. This is not a local World
 * and carries no invented map, person, clock, RNG or ownership container. */
export interface PlanetValidationWorld {tick:number;schemaVersion:number;planet?:PlanetState;worldFactions?:import('./world-faction-state.ts').WorldFactionRegistry256}
