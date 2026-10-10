import type { StockpileCell } from '../sim/types';
import type { Placement } from './primitives';
import {stockpileZoneId} from '../sim/stockpile-zones';
import {surfaceHeightAtCell,type FilthSurface} from './surface-height';

// Verse.ZoneColorUtility's six storage hues, each mixed halfway with gray.
// Its alpha is supplied by the resident storage material, not these RGB values.
const STORAGE_COLORS = [0xbf4040, 0xbf40bf, 0x4040bf, 0xbf4080, 0x4080bf, 0x8040bf];

function settingsKey(storage: StockpileCell): string {
  const allowed = (values: object) => Object.entries(values).filter(([, value]) => value === true).map(([key]) => key).sort().join(',');
  return `${storage.priority}:${storage.capacity}:${allowed(storage.filters)}:${storage.items ? allowed(storage.items) : '*'}`;
}

export function storageZoneSignature(stockpiles: readonly StockpileCell[]): string {
  return stockpiles.map(storage => `${storage.id}:${storage.x}:${storage.z}:${settingsKey(storage)}${storage.zoneId===undefined?'':`:zone=${storage.zoneId}`}`).join('|');
}

/** Stable simulation zone identity owns the colour, even after its original
 * anchor is removed or its policy changes. Selection outlines are separate. */
export function storageZonePlacements(width: number, stockpiles: readonly StockpileCell[],surface?:FilthSurface): { cells: Placement[]; borders: Placement[] } {
  const cells: Placement[] = [], borders: Placement[] = [];
  for (const storage of stockpiles) {
    const color = STORAGE_COLORS[(stockpileZoneId(storage)-1)%STORAGE_COLORS.length]!;
    cells.push({ x: storage.x, z: storage.z, y: (surface?surfaceHeightAtCell(surface,storage.x,storage.z)??0:0)+.021, sx: 1, sy: 0.014, sz: 1, color });
  }
  return { cells, borders };
}
