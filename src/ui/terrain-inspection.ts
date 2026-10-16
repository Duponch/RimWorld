import { isGrowingTerrain, soilFertility } from '../sim/soil';
import type { Terrain, Tile } from '../sim/types';
import { FLOOR_DEFINITIONS } from '../sim/flooring';

export const TERRAIN_LABELS: Record<Terrain, string> = {
  grass: 'Terre ordinaire',
  soil: 'Terre pauvre',
  'rich-soil': 'Terre riche',
  gravel: 'Gravier',
  'rough-stone': 'Sol rocheux brut',
  marsh: 'Marais',
  water: 'Eau infranchissable',
  'water-shallow': 'Eau peu profonde',
  rock: 'Massif rocheux infranchissable',
};

export const terrainSurfaceLabel=(tile:Tile):string=>tile.bridge?`Pont en bois sur ${tile.terrain==='water-shallow'?'eau peu profonde':'marais'}`:tile.floor?FLOOR_DEFINITIONS[tile.floor].label:TERRAIN_LABELS[tile.terrain];
export const bridgeTerrainNote=(tile:Tile):string=>`Support léger uniquement · Marche : +0 tick (${tile.terrain==='water-shallow'?'eau peu profonde nue':'marais nu'} : +3)`;

/** Describe the actual saved terrain even when a plant or rock occupies it.
 * This is soil suitability, not a promise that the cell can be sown now. */
function baseTerrainInspection(tile: Tile): string {
  if(tile.bridge)return `Sol : ${terrainSurfaceLabel(tile)} · Fertilité : 0 % · Terrain non cultivable · ${bridgeTerrainNote(tile)}`;
  if(tile.floor)return `Sol : ${FLOOR_DEFINITIONS[tile.floor].label} · Fertilité : 0 % · Propreté du revêtement : ${FLOOR_DEFINITIONS[tile.floor].cleanliness.toFixed(1)} · Terrain non cultivable`;
  if(tile.terrain==='water-shallow')return 'Sol : Eau peu profonde · Fertilité : 0 % · Terrain non cultivable · Déplacements ralentis · Marche : +3 ticks · Support de construction ordinaire absent · Pont en bois possible · Conduit électrique ordinaire incompatible';
  if(tile.terrain==='marsh')return 'Sol : Marais · Fertilité : 0 % · Terrain non cultivable · Déplacements ralentis · Support de construction ordinaire absent · Conduit électrique ordinaire incompatible';
  const fertility = Math.round(soilFertility(tile.terrain) * 100);
  return `Sol : ${TERRAIN_LABELS[tile.terrain]} · Fertilité : ${fertility} % · ${isGrowingTerrain(tile.terrain) ? 'Terrain cultivable' : 'Terrain non cultivable'}`;
}

export function terrainInspection(tile:Tile):string {const depth=tile.snowDepth??0;return baseTerrainInspection(tile)+(depth>0?` · Neige : ${Math.round(depth*100)} % · Marche : +${depth<.25?0:depth<.5?.4:depth<.75?.8:1.2} tick(s)`:'');}
