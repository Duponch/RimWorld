import { legacyPlantGrowth } from './plants.ts';
import { isGrowingTerrain } from './soil.ts';
import type { Terrain,World } from './types.ts';

export function initializeFarming(world: World): void {
  // Settle the old lighting contract once, without aging existing bushes again.
  for (const plant of world.resources) if (plant.kind === 'berries') {
    plant.growth = legacyPlantGrowth(world, plant); plant.growthTick = world.tick;
  }
  (world as unknown as { schemaVersion: number }).schemaVersion = 8; world.environment = 'temperate-equinox-v1';
  world.growingZones = []; world.growingCursor = 0;
  for (const pawn of world.pawns) pawn.priorities.grow = 2;
}

/** Guard untrusted additions before the main validator follows any references. */
export function validateFarming(input: Record<string, unknown>, size: number, ids: Set<number>): string[] {
  const errors: string[] = [], occupied = new Set<number>();
  const int = (n: unknown, min: number, max = Number.MAX_SAFE_INTEGER): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;
  if (input.environment !== 'temperate-equinox-v1' || !int(input.growingCursor, 0, size - 1)) errors.push('Invalid growing environment or cursor.');
  if (!Array.isArray(input.growingZones) || input.growingZones.length > size) return [...errors, 'Invalid growing zones.'];
  const zoneIds = new Set<number>();
  for (const value of input.growingZones) {
    if (!value || typeof value !== 'object') { errors.push('Invalid growing zone.'); continue; }
    const zone = value as Record<string, unknown>;
    if (!int(zone.id, 1, (input.nextId as number) - 1) || ids.has(zone.id)) errors.push('Invalid or duplicate growing zone ID.');
    else { ids.add(zone.id); zoneIds.add(zone.id); }
    if (!(zone.plant === 'rice' || Number(input.schemaVersion)>=71&&zone.plant==='cotton') || typeof zone.allowSow !== 'boolean' || typeof zone.allowCut !== 'boolean' || !Array.isArray(zone.cells) || !zone.cells.length || zone.cells.length > size) { errors.push('Invalid growing policy or cells.'); continue; }
    let previous = -1;
    for (const cell of zone.cells) {
      if (!int(cell, 0, size - 1) || cell <= previous || occupied.has(cell)) errors.push('Unordered, overlapping or invalid growing cell.');
      else {
        occupied.add(cell);
        const tile = (input.tiles as {terrain:string}[])[cell];
        if (!tile || !isGrowingTerrain(tile.terrain as Terrain)) errors.push('Growing zone on incompatible terrain.');
      }
      previous = cell as number;
    }
  }
  for (const value of input.jobs as Record<string, unknown>[]) {
    if (value.growingZoneId !== undefined && (!int(value.growingZoneId, 1) || !zoneIds.has(value.growingZoneId) || !['chop', 'cut', 'harvest', 'sow'].includes(value.kind as string))) errors.push('Invalid growing job association.');
    if (value.kind === 'sow' && value.growingZoneId === undefined) errors.push('Sowing requires a growing zone.');
    if (value.growingZoneId !== undefined && zoneIds.has(value.growingZoneId as number)) {
      const zone = (input.growingZones as {id:number;cells:number[]}[]).find(z=>z.id===value.growingZoneId)!;
      const cell = (value.z as number) * (input.width as number) + (value.x as number);
      if (!zone.cells.includes(cell) && !(value.kind === 'chop' && zone.cells.some(c => Math.abs(c % (input.width as number) - (value.x as number)) + Math.abs(Math.floor(c / (input.width as number)) - (value.z as number)) === 1))) errors.push('Growing job outside its zone.');
    }
  }
  for (const value of input.stockpiles as Record<string, unknown>[]) if (occupied.has((value.z as number) * (input.width as number) + (value.x as number))) errors.push('Storage overlaps growing zone.');
  return errors;
}
