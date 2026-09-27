import { captureWorldBeauty } from '../sim/beauty-need';
import type { RoomBeautyCapture } from '../sim/room-beauty';
import { captureRoomQuality } from '../sim/room-quality';
import { FLOOR_DEFINITIONS } from '../sim/flooring';
import { terrainTravelDelay } from '../sim/furniture-travel';
import { isRoofed } from '../sim/roof-rules';
import { soilFertility } from '../sim/soil';
import { TemperatureView } from '../sim/temperature';
import { ROOM_ROLE_LABEL, WorkEnvironmentCache } from '../sim/work-environment';
import type { Cell, World } from '../sim/types';
import { TERRAIN_LABELS } from './terrain-inspection';
import { mapHoverLines } from './map-hover-readout';

const environmentCache = new WorkEnvironmentCache();
const beautyViews = new WeakMap<World, RoomBeautyCapture>();

export interface MapCellDetails {
  heading: string;
  things: string[];
  rows: { label: string; value: string }[];
}

/** Alt inspector: read-only and invoked only while the pointer/key is active. */
export function mapCellDetails(world: World, cell: Cell, lightLevel: number): MapCellDetails | null {
  const index = cell.z * world.width + cell.x, tile = world.tiles[index];
  if (!tile) return null;
  const environment = environmentCache.read(world);
  const room = environment.room(cell);
  const qualityCapture = captureRoomQuality(world);
  const quality = room && !room.space.touchesMapEdge ? qualityCapture.room(cell) : null;
  let beautyView = beautyViews.get(world);
  if (!beautyView) { beautyView = captureWorldBeauty(world, qualityCapture.topology); beautyViews.set(world, beautyView); }
  const speed = tile.terrain === 'rock' || tile.terrain === 'water' ? 0 : Math.round(300 / (3 + terrainTravelDelay(world, index)));
  const terrain = tile.floor ? FLOOR_DEFINITIONS[tile.floor].label : TERRAIN_LABELS[tile.terrain];
  const objects = mapHoverLines(world, cell, lightLevel).slice(2).filter(line => line !== 'Toit');
  const temperature = new TemperatureView(world).at(world, cell);
  const rows: MapCellDetails['rows'] = [];
  if (room && !room.psychologicallyOutdoors && room.role !== 'none') rows.push({ label: 'Pièce', value: ROOM_ROLE_LABEL[room.role] });
  const perceivedBeauty=beautyView.perceived(cell);
  rows.push({ label: 'Beauté', value: (Math.abs(perceivedBeauty)<.05?0:perceivedBeauty).toFixed(1) });
  if (quality) {
    rows.push({ label: 'Impression', value: quality.impressiveness.toFixed(1) });
    rows.push({ label: 'Richesse', value: quality.wealth.toFixed(0) });
    rows.push({ label: 'Espace', value: quality.space.toFixed(1) });
    rows.push({ label: 'Propreté', value: quality.cleanliness.toFixed(1) });
  }
  rows.push({ label: 'Terrain', value: terrain });
  rows.push({ label: 'Vitesse de déplacement', value: `${speed} %` });
  if (!tile.floor) rows.push({ label: 'Fertilité', value: `${Math.round(soilFertility(tile.terrain) * 100)} %` });
  rows.push({ label: 'Température', value: `${Math.round(temperature)} °C` });
  rows.push({ label: 'Luminosité', value: `${Math.round(lightLevel * 100)} %` });
  if (isRoofed(world, index)) rows.push({ label: 'Toit', value: 'Construit' });
  return { heading: objects[0] ?? terrain, things: objects.slice(1), rows };
}
