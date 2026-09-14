import type { Cell, Footprint, JobKind, Orientation, StructureKind } from './types.ts';

/** Immutable catalogue. Legacy wall/bed costs remain uncalibrated. New wooden
 * table/stool use reference costs and ceil(original work / 10); see dining.md. */
export const MAX_STACK = 75;
export const CARRY_CAPACITY = 10;
export const MATERIAL_DEFINITIONS = Object.freeze({
  wood: Object.freeze({ id: 'wood', label: 'Bois', unit: 'unit', stackLimit: MAX_STACK }),
  food: Object.freeze({ id: 'food', label: 'Nourriture', unit: 'portion', stackLimit: MAX_STACK, chairSearchRadius: 32, tableDesired: true }),
});
export const JOB_DURATION: Readonly<Record<JobKind, number>> = Object.freeze({ chop: 100, harvest: 60, cut: 60, sow: 17, horseshoes: 7, campfire: 20, wall: 70, bed: 120, table: 53, stool: 32 });
export const JOB_WOOD_COST: Readonly<Record<JobKind, number>> = Object.freeze({ chop: 0, harvest: 0, cut: 0, sow: 0, horseshoes: 10, campfire: 20, wall: 5, bed: 8, table: 28, stool: 25 });
export const STRUCTURE_DEFINITIONS = Object.freeze({
  horseshoes: Object.freeze({ id: 'horseshoes', width: 1, depth: 1, blocksMovement: false }),
  campfire: Object.freeze({ id: 'campfire', width: 1, depth: 1, blocksMovement: false }),
  wall: Object.freeze({ id: 'wall', width: 1, depth: 1, blocksMovement: true }),
  table: Object.freeze({ id: 'table', width: 1, depth: 2, blocksMovement: true }),
  stool: Object.freeze({ id: 'stool', width: 1, depth: 1, blocksMovement: false }),
  bed: Object.freeze({ id: 'bed', width: 1, depth: 2, blocksMovement: false }),
});
export function footprintCells(entity: Cell & { kind: JobKind | StructureKind; orientation?: Orientation; footprint?: Footprint }): Cell[] {
  const cells = [{ x: entity.x, z: entity.z }];
  if ((entity.kind !== 'bed' && entity.kind !== 'table') || entity.footprint === 'legacy-single') return cells;
  const direction = [[0, 1], [1, 0], [0, -1], [-1, 0]][entity.orientation ?? 0]!;
  cells.push({ x: entity.x + direction[0]!, z: entity.z + direction[1]! });
  return cells;
}
