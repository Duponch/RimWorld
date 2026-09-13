import type { Cell, Footprint, JobKind, Orientation, StructureKind } from './types.ts';

/** Small immutable catalogue. These are prototype units, not verified RimWorld constants. */
export const MAX_STACK = 75;
export const CARRY_CAPACITY = 10;
export const MATERIAL_DEFINITIONS = Object.freeze({
  wood: Object.freeze({ id: 'wood', label: 'Bois', unit: 'unit', stackLimit: MAX_STACK }),
  food: Object.freeze({ id: 'food', label: 'Nourriture', unit: 'portion', stackLimit: MAX_STACK }),
});
export const JOB_DURATION: Readonly<Record<JobKind, number>> = Object.freeze({ chop: 100, harvest: 60, wall: 70, bed: 120 });
export const JOB_WOOD_COST: Readonly<Record<JobKind, number>> = Object.freeze({ chop: 0, harvest: 0, wall: 5, bed: 8 });
export const STRUCTURE_DEFINITIONS = Object.freeze({
  wall: Object.freeze({ id: 'wall', width: 1, depth: 1, blocksMovement: true }),
  bed: Object.freeze({ id: 'bed', width: 1, depth: 2, blocksMovement: false }),
});
export function footprintCells(entity: Cell & { kind: JobKind | StructureKind; orientation?: Orientation; footprint?: Footprint }): Cell[] {
  const cells = [{ x: entity.x, z: entity.z }];
  if (entity.kind !== 'bed' || entity.footprint === 'legacy-single') return cells;
  const direction = [[0, 1], [1, 0], [0, -1], [-1, 0]][entity.orientation ?? 0]!;
  cells.push({ x: entity.x + direction[0]!, z: entity.z + direction[1]! });
  return cells;
}
