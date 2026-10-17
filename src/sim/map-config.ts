/** Playable presets; dimensions are cell counts, never a change in cell resolution. */
export const MAP_SIZE_PRESETS = [64, 128, 200, 250] as const;
export const DEFAULT_MAP_SIZE = 250;
export const MIN_MAP_SIZE = 8;
export const MAX_MAP_SIZE = 250;

/** Rectangular fixtures and existing 32-cell saves remain supported between these bounds. */
export function validMapDimension(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_MAP_SIZE && value <= MAX_MAP_SIZE;
}

/** Prospective schema256 capacity only. Existing validators and UI presets above
 * deliberately keep their historical250 bound until explicit integration. */
export const EXTENDED_MAP_SCHEMA_VERSION = 256;
export const MAX_EXTENDED_MAP_SIZE = 400;

/** Call with the schema being validated, BEFORE migration. A separate function
 * avoids treating Array.every's index as a version at legacy callback sites. */
export function validMapDimensionForSchema(value: unknown, schemaVersion: number): value is number {
  if (!Number.isSafeInteger(schemaVersion) || schemaVersion < 1) return false;
  if (schemaVersion < EXTENDED_MAP_SCHEMA_VERSION) return validMapDimension(value);
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_MAP_SIZE && value <= MAX_EXTENDED_MAP_SIZE;
}
