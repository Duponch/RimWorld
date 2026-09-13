/** Playable presets; dimensions are cell counts, never a change in cell resolution. */
export const MAP_SIZE_PRESETS = [64, 128, 200, 250] as const;
export const DEFAULT_MAP_SIZE = 250;
export const MIN_MAP_SIZE = 8;
export const MAX_MAP_SIZE = 250;

/** Rectangular fixtures and existing 32-cell saves remain supported between these bounds. */
export function validMapDimension(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_MAP_SIZE && value <= MAX_MAP_SIZE;
}
