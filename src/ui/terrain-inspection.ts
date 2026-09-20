import { isGrowingTerrain, soilFertility } from '../sim/soil';
import type { Terrain, Tile } from '../sim/types';
import { FLOOR_DEFINITIONS } from '../sim/flooring';

export const TERRAIN_LABELS: Record<Terrain, string> = {
  grass: 'Terre ordinaire',
  soil: 'Terre pauvre',
  'rich-soil': 'Terre riche',
  gravel: 'Gravier',
  'rough-stone': 'Sol rocheux brut',
  water: 'Eau infranchissable',
  rock: 'Massif rocheux infranchissable',
};

/** Describe the actual saved terrain even when a plant or rock occupies it.
 * This is soil suitability, not a promise that the cell can be sown now. */
export function terrainInspection(tile: Tile): string {
  if(tile.floor)return `Sol : ${FLOOR_DEFINITIONS[tile.floor].label} · Fertilité : 0 % · Propreté du revêtement : ${FLOOR_DEFINITIONS[tile.floor].cleanliness.toFixed(1)} · Terrain non cultivable`;
  const fertility = Math.round(soilFertility(tile.terrain) * 100);
  return `Sol : ${TERRAIN_LABELS[tile.terrain]} · Fertilité : ${fertility} % · ${isGrowingTerrain(tile.terrain) ? 'Terrain cultivable' : 'Terrain non cultivable'}`;
}
