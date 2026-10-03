import type { StockpileCell } from '../sim/types';
import type { Placement } from './primitives';

// Verse.ZoneColorUtility's six storage hues, each mixed halfway with gray.
// Its alpha is supplied by the resident storage material, not these RGB values.
const STORAGE_COLORS = [0xbf4040, 0xbf40bf, 0x4040bf, 0xbf4080, 0x4080bf, 0x8040bf];

function settingsKey(storage: StockpileCell): string {
  const allowed = (values: object) => Object.entries(values).filter(([, value]) => value === true).map(([key]) => key).sort().join(',');
  return `${storage.priority}:${storage.capacity}:${allowed(storage.filters)}:${storage.items ? allowed(storage.items) : '*'}`;
}

export function storageZoneSignature(stockpiles: readonly StockpileCell[]): string {
  return stockpiles.map(storage => `${storage.id}:${storage.x}:${storage.z}:${settingsKey(storage)}`).join('|');
}

/** Adjacent cells with equal settings share one subtle tint. The empty border
 * result preserves the caller contract without constructing hidden outlines.
 * This grouping never enters save data or simulation decisions. */
export function storageZonePlacements(width: number, stockpiles: readonly StockpileCell[]): { cells: Placement[]; borders: Placement[] } {
  const cells: Placement[] = [], borders: Placement[] = [];
  const keys = new Map(stockpiles.map(storage => [storage.z * width + storage.x, settingsKey(storage)]));
  const components = new Map<number, number>();
  const componentColors: number[] = [];
  const neighbors = (index: number, x: number) => [
    ...(x > 0 ? [index - 1] : []), ...(x < width - 1 ? [index + 1] : []), index - width, index + width,
  ];
  for (const start of [...stockpiles].sort((a, b) => a.id - b.id)) {
    const startIndex = start.z * width + start.x;
    if (components.has(startIndex)) continue;
    const component = componentColors.length;
    componentColors.push(STORAGE_COLORS[(start.id - 1) % STORAGE_COLORS.length]!);
    const key = keys.get(startIndex), pending = [startIndex];
    components.set(startIndex, component);
    for (let head = 0; head < pending.length; head++) {
      const index = pending[head]!;
      for (const next of neighbors(index, index % width)) {
        if (components.has(next) || keys.get(next) !== key) continue;
        components.set(next, component);
        pending.push(next);
      }
    }
  }
  for (const storage of stockpiles) {
    const { x, z } = storage, index = z * width + x;
    const component = components.get(index)!;
    const color = componentColors[component]!;
    cells.push({ x: storage.x, z: storage.z, y: 0.021, sx: 1, sy: 0.014, sz: 1, color });
  }
  return { cells, borders };
}
