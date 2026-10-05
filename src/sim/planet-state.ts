import type { BiomeId } from './biome-flora.ts';

export interface PlanetTile {
  id: number; // Geographic namespace, not Thing.nextId.
  center: [number, number, number];
  neighbours: number[];
  biome: BiomeId | 'ocean';
  hilliness: 'flat' | 'small-hills' | 'large-hills' | 'mountainous';
  meanTemperature: number;
  rainfall: number;
}
export interface PlanetState {
  revision: 1;
  adoptedAt: number;
  generationSeed: number;
  tiles: PlanetTile[];
  homeTile: number;
  civilianTile: number;
  nextGroupId: number;
}
