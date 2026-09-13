import { JOB_DURATION, JOB_WOOD_COST } from './definitions.ts';
import type { World } from './types.ts';

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const bounded = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const stock = (value: unknown): boolean => record(value) && integer(value.wood, 0, 1e9) && integer(value.food, 0, 1e9);
const oneOf = (value: unknown, values: string[]): boolean => typeof value === 'string' && values.includes(value);

/** Accepts unknown at the persistence boundary; malformed nested input returns errors, never crashes. */
export function validateLegacyWorld(input: unknown): string[] {
  const errors: string[] = [];
  if (!record(input)) return ['World must be an object.'];
  if (input.schemaVersion !== 1) errors.push('Unsupported schema version.');
  if (!integer(input.seed, 0, 0xffffffff) || !integer(input.rng, 1, 0xffffffff)) errors.push('Invalid deterministic random state.');
  if (!integer(input.tick, 0) || !integer(input.nextId, 1)) errors.push('Invalid tick or nextId.');
  if (!integer(input.width, 8, 128) || !integer(input.height, 8, 128)) return [...errors, 'Invalid dimensions.'];
  const size = input.width * input.height;
  const arrays = ['tiles', 'pawns', 'resources', 'structures', 'jobs', 'events'] as const;
  if (arrays.some(key => !Array.isArray(input[key]))) return [...errors, 'Missing world arrays.'];
  const tiles = input.tiles as unknown[];
  if (tiles.length !== size || tiles.some(tile => !record(tile) || !oneOf(tile.terrain, ['grass', 'soil', 'water', 'rock']))) {
    errors.push('Invalid terrain grid.');
  }
  if (!stock(input.stock)) errors.push('Invalid global stock.');
  const coord = (item: Record<string, unknown>): boolean => integer(item.x, 0, (input.width as number) - 1)
    && integer(item.z, 0, (input.height as number) - 1);
  const ids = new Set<number>();
  for (const key of ['pawns', 'resources', 'structures', 'jobs'] as const) {
    const items = input[key] as unknown[];
    if (items.length > size) errors.push(`Too many ${key}.`);
    for (const item of items) {
      if (!record(item) || !coord(item) || !integer(item.id, 1)) { errors.push(`Invalid ${key} identity or cell.`); continue; }
      if (ids.has(item.id)) errors.push('Duplicate entity ID.');
      ids.add(item.id);
      if (integer(input.nextId, 1) && item.id >= input.nextId) errors.push('nextId must exceed all entity IDs.');
      if (key === 'pawns') {
        if (typeof item.name !== 'string' || item.name.length === 0 || item.name.length > 80
          || !bounded(item.hunger) || !bounded(item.rest) || !bounded(item.mood)
          || !oneOf(item.state, ['idle', 'moving', 'working', 'sleeping', 'hungry'])
          || !(item.jobId === null || integer(item.jobId, 1))
          || !record(item.priorities) || !integer(item.priorities.gather, 0, 3) || !integer(item.priorities.build, 0, 3)
          || !integer(item.moveCooldown, 0, 3) || !integer(item.planCooldown, 0, 20)) errors.push('Invalid pawn state.');
        if (!Array.isArray(item.path) || item.path.length > size) errors.push('Invalid pawn path.');
        else {
          let previous = item;
          for (const cell of item.path) {
            if (!record(cell) || !coord(cell)) { errors.push('Invalid pawn path cell.'); break; }
            if (Math.abs((cell.x as number) - (previous.x as number)) + Math.abs((cell.z as number) - (previous.z as number)) !== 1) {
              errors.push('Non-contiguous pawn path.'); break;
            }
            previous = cell;
          }
        }
      } else if (key === 'resources') {
        if (!oneOf(item.kind, ['tree', 'berries', 'rock']) || !integer(item.amount, 1, 1000000)) errors.push('Invalid resource.');
      } else if (key === 'structures') {
        if (!oneOf(item.kind, ['wall', 'bed'])) errors.push('Invalid structure.');
      } else {
        if (!oneOf(item.kind, ['chop', 'harvest', 'wall', 'bed']) || !oneOf(item.status, ['pending', 'active'])
          || !(item.reservedBy === null || integer(item.reservedBy, 1)) || !stock(item.escrow)
          || !integer(item.progress, 0, 119)) errors.push('Invalid job.');
      }
    }
  }
  const events = input.events as unknown[];
  if (events.length > 80 || events.some(item => !record(item) || !integer(item.tick, 0, input.tick as number)
    || !oneOf(item.type, ['job', 'need', 'command']) || typeof item.message !== 'string' || item.message.length > 240)) errors.push('Invalid event log.');
  if (errors.length > 0) return errors;
  const world = input as unknown as World;
  const cellKey = (item: { x: number; z: number }): number => item.z * world.width + item.x;
  const pawnCells = new Set<number>();
  const resourceCells = new Map(world.resources.map(item => [cellKey(item), item]));
  const structureCells = new Map(world.structures.map(item => [cellKey(item), item]));
  const jobCells = new Map(world.jobs.map(item => [cellKey(item), item]));
  if (resourceCells.size !== world.resources.length || structureCells.size !== world.structures.length || jobCells.size !== world.jobs.length) {
    errors.push('Duplicate cell occupancy within entity collection.');
  }
  for (const item of [...world.resources, ...world.structures, ...world.pawns, ...world.jobs]) {
    if (['water', 'rock'].includes(world.tiles[cellKey(item)]!.terrain)) errors.push('Entity placed on impassable terrain.');
  }
  for (const resource of world.resources) {
    if (structureCells.has(cellKey(resource))) errors.push('Resource overlaps a structure.');
  }
  const pawnById = new Map(world.pawns.map(pawn => [pawn.id, pawn]));
  const jobById = new Map(world.jobs.map(job => [job.id, job]));
  for (const pawn of world.pawns) {
    const key = cellKey(pawn);
    if (pawnCells.has(key)) errors.push('Pawns overlap.');
    pawnCells.add(key);
    if (structureCells.get(key)?.kind === 'wall' || jobCells.get(key)?.kind === 'wall') errors.push('Pawn occupies a wall or its construction target.');
    if (pawn.jobId !== null) {
      const job = jobById.get(pawn.jobId);
      if (!job || job.reservedBy !== pawn.id || job.status !== 'active') errors.push('Pawn/job reservation mismatch.');
      if (!['moving', 'working'].includes(pawn.state)) errors.push('Assigned pawn has incompatible state.');
      if (job && pawn.priorities[job.kind === 'chop' || job.kind === 'harvest' ? 'gather' : 'build'] === 0) errors.push('Pawn assigned to disabled work.');
    } else if (pawn.path.length > 0 || ['moving', 'working'].includes(pawn.state)) errors.push('Unassigned pawn has path or work state.');
  }
  for (const job of world.jobs) {
    if (job.progress >= JOB_DURATION[job.kind]) errors.push('Completed job left in queue.');
    const active = job.status === 'active';
    if (active !== (job.reservedBy !== null)) errors.push('Job reservation/status mismatch.');
    if (active && pawnById.get(job.reservedBy!)?.jobId !== job.id) errors.push('Job references missing or mismatched pawn.');
    if (job.escrow.wood !== (active ? JOB_WOOD_COST[job.kind] : 0) || job.escrow.food !== 0) errors.push('Invalid escrow; materials would be created or lost.');
    const resource = resourceCells.get(cellKey(job));
    if (job.kind === 'chop' || job.kind === 'harvest') {
      if (resource?.kind !== (job.kind === 'chop' ? 'tree' : 'berries')) errors.push('Gather job has no matching resource.');
    } else if (resource || structureCells.has(cellKey(job))) errors.push('Construction target overlaps existing content.');
  }
  return errors;
}
