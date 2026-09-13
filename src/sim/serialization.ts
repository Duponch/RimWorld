import { CARRY_CAPACITY, footprintCells, JOB_DURATION, JOB_WOOD_COST, MAX_STACK } from './definitions.ts';
import { addGroundMaterial, addMaterial, deliveredStock, groundQuantity, refreshStock, reservedDestination, reservedSource } from './materials.ts';
import { validateLegacyWorld } from './legacy-validation.ts';
import type { World } from './types.ts';
import { validMapDimension } from './map-config.ts';

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const bounded = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const stock = (value: unknown): boolean => record(value) && integer(value.wood, 0, MAX_STACK * 32768) && integer(value.food, 0, MAX_STACK * 32768);
const oneOf = (value: unknown, values: string[]): boolean => typeof value === 'string' && values.includes(value);

/** Structural validation first, cross-reference validation second; accepts arbitrary JSON without throwing. */
export function validateWorld(input: unknown): string[] {
  const errors: string[] = [];
  if (!record(input)) return ['World must be an object.'];
  if (input.schemaVersion !== 2) errors.push('Unsupported schema version; migrate version 1 through deserializeWorld.');
  if (!integer(input.seed, 0, 0xffffffff) || !integer(input.rng, 1, 0xffffffff)) errors.push('Invalid deterministic random state.');
  if (!integer(input.tick, 0) || !integer(input.nextId, 1)) errors.push('Invalid tick or nextId.');
  if (!integer(input.logisticsCursor, 0)) errors.push('Invalid logistics search cursor.');
  if (!validMapDimension(input.width) || !validMapDimension(input.height)) return [...errors, 'Invalid dimensions.'];
  const size = input.width * input.height;
  const arrays = ['tiles', 'pawns', 'resources', 'structures', 'jobs', 'piles', 'stockpiles', 'events'] as const;
  if (arrays.some(key => !Array.isArray(input[key]))) return [...errors, 'Missing world arrays.'];
  const tiles = input.tiles as unknown[];
  if (tiles.length !== size || tiles.some(tile => !record(tile) || !oneOf(tile.terrain, ['grass', 'soil', 'water', 'rock']))) errors.push('Invalid terrain grid.');
  if (!stock(input.stock)) errors.push('Invalid derived stock.');
  const coord = (item: Record<string, unknown>): boolean => integer(item.x, 0, (input.width as number) - 1) && integer(item.z, 0, (input.height as number) - 1);
  const ids = new Set<number>();
  for (const key of ['pawns', 'resources', 'structures', 'jobs', 'piles', 'stockpiles'] as const) {
    const items = input[key] as unknown[];
    if (items.length > (key === 'piles' ? 32768 : size)) errors.push(`Too many ${key}.`);
    for (const item of items) {
      if (!record(item) || !integer(item.id, 1) || (key !== 'piles' && !coord(item))) { errors.push(`Invalid ${key} identity or cell.`); continue; }
      if (ids.has(item.id)) errors.push('Duplicate entity ID.'); ids.add(item.id);
      if (integer(input.nextId, 1) && item.id >= input.nextId) errors.push('nextId must exceed all entity IDs.');
      if (key === 'pawns') {
        if (typeof item.name !== 'string' || item.name.length === 0 || item.name.length > 80 || !bounded(item.hunger) || !bounded(item.rest) || !bounded(item.mood)
          || !oneOf(item.state, ['idle', 'moving', 'working', 'sleeping', 'hungry']) || !(item.jobId === null || integer(item.jobId, 1))
          || !record(item.priorities) || !integer(item.priorities.gather, 0, 4) || !integer(item.priorities.build, 0, 4) || !integer(item.priorities.haul, 0, 4)
          || !integer(item.moveCooldown, 0, 3) || !integer(item.planCooldown, 0, 20)) errors.push('Invalid pawn state.');
        if (!Array.isArray(item.path) || item.path.length > size) errors.push('Invalid pawn path.');
        else {
          let previous = item;
          for (const cell of item.path) {
            if (!record(cell) || !coord(cell)) { errors.push('Invalid pawn path cell.'); break; }
            if (Math.abs((cell.x as number) - (previous.x as number)) + Math.abs((cell.z as number) - (previous.z as number)) !== 1) { errors.push('Non-contiguous pawn path.'); break; }
            previous = cell;
          }
        }
        const haul = item.haul;
        if (haul !== null) {
          if (!record(haul) || !integer(haul.sourcePileId, 1) || !integer(haul.quantity, 1, CARRY_CAPACITY) || !oneOf(haul.phase, ['pickup', 'deliver'])
            || !(haul.carryPileId === null || integer(haul.carryPileId, 1)) || !record(haul.destination)
            || !(haul.destination.type === 'job' ? integer(haul.destination.jobId, 1) : haul.destination.type === 'stockpile' && integer(haul.destination.stockpileId, 1))) errors.push('Invalid haul task.');
        }
      } else if (key === 'resources') {
        if (!oneOf(item.kind, ['tree', 'berries', 'rock']) || !integer(item.amount, 1, 1000000)) errors.push('Invalid resource.');
      } else if (key === 'structures' || key === 'jobs') {
        if (!oneOf(item.kind, key === 'structures' ? ['wall', 'bed'] : ['chop', 'harvest', 'wall', 'bed']) || !integer(item.orientation, 0, 3)
          || !oneOf(item.footprint, ['standard', 'legacy-single']) || (item.footprint === 'legacy-single' && item.kind !== 'bed')) errors.push('Invalid structure definition or footprint.');
        if (key === 'jobs' && (!oneOf(item.status, ['pending', 'active']) || !(item.reservedBy === null || integer(item.reservedBy, 1)) || !stock(item.escrow) || !integer(item.progress, 0, 119))) errors.push('Invalid job.');
      } else if (key === 'piles') {
        if (!oneOf(item.kind, ['wood', 'food']) || !integer(item.quantity, 1, MAX_STACK) || !record(item.owner)) errors.push('Invalid material pile.');
        else {
          const owner = item.owner;
          if (owner.type === 'ground' ? !coord(owner) || Object.keys(owner).some(key => !['type', 'x', 'z'].includes(key))
            : owner.type === 'pawn' ? !integer(owner.pawnId, 1) || Object.keys(owner).some(key => !['type', 'pawnId'].includes(key))
              : owner.type === 'job' ? !integer(owner.jobId, 1) || Object.keys(owner).some(key => !['type', 'jobId'].includes(key)) : true) errors.push('Invalid material owner.');
        }
      } else if (!record(item.filters) || typeof item.filters.wood !== 'boolean' || typeof item.filters.food !== 'boolean'
        || !integer(item.priority, 1, 4) || !integer(item.capacity, 1, MAX_STACK)) errors.push('Invalid storage policy.');
    }
  }
  const events = input.events as unknown[];
  if (events.length > 80 || events.some(item => !record(item) || !integer(item.tick, 0, input.tick as number) || !oneOf(item.type, ['job', 'need', 'command']) || typeof item.message !== 'string' || item.message.length > 240)) errors.push('Invalid event log.');
  if (errors.length) return errors;
  const world = input as unknown as World;
  const cellKey = (item: { x: number; z: number }): number => item.z * world.width + item.x;
  const pawnById = new Map(world.pawns.map(item => [item.id, item])); const jobById = new Map(world.jobs.map(item => [item.id, item]));
  const pileById = new Map(world.piles.map(item => [item.id, item]));
  const resourceCells = new Map(world.resources.map(item => [cellKey(item), item]));
  const structureCells = new Map<number, World['structures'][number]>(); const jobCells = new Map<number, World['jobs'][number]>();
  if (resourceCells.size !== world.resources.length || new Set(world.stockpiles.map(cellKey)).size !== world.stockpiles.length) errors.push('Duplicate cell occupancy.');
  for (const [items, map] of [[world.structures, structureCells], [world.jobs, jobCells]] as const) {
    for (const item of items) for (const cell of footprintCells(item)) {
      if (cell.x < 0 || cell.z < 0 || cell.x >= world.width || cell.z >= world.height) { errors.push('Footprint outside map.'); continue; }
      if (map.has(cellKey(cell))) errors.push('Overlapping footprints.');
      (map as Map<number, typeof item>).set(cellKey(cell), item);
    }
  }
  const isImpassable = (cell: { x: number; z: number }): boolean => ['water', 'rock'].includes(world.tiles[cellKey(cell)]!.terrain);
  for (const item of [...world.resources, ...world.pawns, ...world.stockpiles]) if (isImpassable(item)) errors.push('Entity placed on impassable terrain.');
  for (const [key] of [...structureCells, ...jobCells]) if (['water', 'rock'].includes(world.tiles[key]!.terrain)) errors.push('Footprint on impassable terrain.');
  for (const resource of world.resources) if (structureCells.has(cellKey(resource))) errors.push('Resource overlaps a structure.');
  for (const zone of world.stockpiles) if (resourceCells.has(cellKey(zone)) || structureCells.has(cellKey(zone)) || jobCells.has(cellKey(zone))) errors.push('Storage overlaps fixed content.');
  const pawnCells = new Set<number>();
  for (const pawn of world.pawns) {
    const key = cellKey(pawn);
    if (pawnCells.has(key)) errors.push('Pawns overlap.'); pawnCells.add(key);
    if (structureCells.get(key)?.kind === 'wall' || jobCells.get(key)?.kind === 'wall') errors.push('Pawn occupies a wall target.');
    if (pawn.jobId !== null && pawn.haul !== null) errors.push('Pawn has two simultaneous tasks.');
    if (pawn.jobId !== null) {
      const job = jobById.get(pawn.jobId);
      if (!job || job.reservedBy !== pawn.id || job.status !== 'active') errors.push('Pawn/job reservation mismatch.');
      if (job && pawn.priorities[job.kind === 'chop' || job.kind === 'harvest' ? 'gather' : 'build'] === 0) errors.push('Pawn assigned to disabled work.');
    }
    const owned = world.piles.filter(pile => pile.owner.type === 'pawn' && pile.owner.pawnId === pawn.id);
    if (owned.length > 1 || (owned.length === 1 && pawn.haul?.phase !== 'deliver')) errors.push('Carried ownership mismatch.');
    if (pawn.jobId !== null || pawn.haul !== null) { if (!['moving', 'working'].includes(pawn.state)) errors.push('Assigned pawn has incompatible state.'); }
    else if (pawn.path.length || ['moving', 'working'].includes(pawn.state)) errors.push('Unassigned pawn has path or work state.');
    if (pawn.haul) {
      const haul = pawn.haul;
      if (pawn.priorities.haul === 0) errors.push('Pawn hauling with disabled work.');
      if (haul.sourcePileId >= world.nextId) errors.push('Invalid source identity.');
      const pile = pileById.get(haul.phase === 'pickup' ? haul.sourcePileId : haul.carryPileId!);
      if (haul.phase === 'pickup') {
        if (haul.carryPileId !== null || !pile || pile.owner.type !== 'ground' || reservedSource(world, pile.id) > pile.quantity) errors.push('Invalid source quantity reservation.');
      } else if (!pile || pile.owner.type !== 'pawn' || pile.owner.pawnId !== pawn.id || pile.quantity !== haul.quantity || owned[0]?.id !== haul.carryPileId) errors.push('Invalid carried quantity.');
      if (haul.destination.type === 'job') {
        const job = jobById.get(haul.destination.jobId);
        if (!job || pile?.kind !== 'wood' || deliveredStock(world, job.id).wood + reservedDestination(world, haul.destination) > JOB_WOOD_COST[job.kind]) errors.push('Invalid construction delivery reservation.');
      } else {
        const zone = world.stockpiles.find(item => haul.destination.type === 'stockpile' && item.id === haul.destination.stockpileId);
        if (!zone || !pile || !zone.filters[pile.kind] || groundQuantity(world, zone) + reservedDestination(world, haul.destination) > zone.capacity) errors.push('Invalid storage capacity reservation.');
        if (zone && pile?.owner.type === 'ground' && cellKey(zone) === cellKey(pile.owner)) errors.push('Haul source is its own destination.');
      }
    }
  }
  for (const job of world.jobs) {
    if (job.progress >= JOB_DURATION[job.kind]) errors.push('Completed job left in queue.');
    if ((job.status === 'active') !== (job.reservedBy !== null)) errors.push('Job reservation/status mismatch.');
    if (job.reservedBy !== null && pawnById.get(job.reservedBy)?.jobId !== job.id) errors.push('Job references missing or mismatched pawn.');
    const delivered = deliveredStock(world, job.id);
    if (job.escrow.wood !== delivered.wood || job.escrow.food !== delivered.food || delivered.food !== 0 || delivered.wood > JOB_WOOD_COST[job.kind]) errors.push('Invalid delivered material view.');
    // Version 1 could refund escrow on interruption while retaining progress. Such plans
    // keep that progress, but may only acquire a builder after physical delivery again.
    if (job.reservedBy !== null && delivered.wood !== JOB_WOOD_COST[job.kind]) errors.push('Construction work started before delivery.');
    const resource = resourceCells.get(cellKey(job));
    if (job.kind === 'chop' || job.kind === 'harvest') { if (resource?.kind !== (job.kind === 'chop' ? 'tree' : 'berries')) errors.push('Gather job has no matching resource.'); }
    else for (const cell of footprintCells(job)) if (resourceCells.has(cellKey(cell)) || structureCells.has(cellKey(cell))) errors.push('Construction overlaps existing content.');
  }
  const available = { wood: 0, food: 0 };
  for (const pile of world.piles) {
    const owner = pile.owner;
    if (owner.type === 'ground') {
      if (isImpassable(owner) || structureCells.get(cellKey(owner))?.kind === 'wall' || jobCells.get(cellKey(owner))?.kind === 'wall') errors.push('Pile on impassable cell.');
      available[pile.kind] += pile.quantity;
    } else if (owner.type === 'pawn') { if (!pawnById.has(owner.pawnId)) errors.push('Pile references missing carrier.'); available[pile.kind] += pile.quantity; }
    else if (!jobById.has(owner.jobId)) errors.push('Pile references missing construction.');
  }
  if (world.stock.wood !== available.wood || world.stock.food !== available.food) errors.push('Derived stock differs from physical piles.');
  return errors;
}

/** Legacy cells, IDs and completed beds remain untouched; only previously abstract materials gain owners. */
function migrateLegacy(input: Record<string, unknown>): World {
  const errors = validateLegacyWorld(input);
  if (errors.length) throw new Error(`Invalid legacy save: ${errors.join(' ')}`);
  const world = input as unknown as World;
  const initial = { ...world.stock };
  const plannedPiles = Math.ceil(initial.wood / MAX_STACK) + Math.ceil(initial.food / MAX_STACK) + world.jobs.filter(job => job.escrow.wood > 0).length;
  if (plannedPiles > 32768 || !Number.isSafeInteger(world.nextId + plannedPiles)) throw new Error('Legacy material stock exceeds the supported migration capacity.');
  world.schemaVersion = 2; world.piles = []; world.stockpiles = []; world.logisticsCursor = 0;
  for (const pawn of world.pawns) { pawn.haul = null; pawn.priorities.haul = 3; }
  for (const item of [...world.structures, ...world.jobs]) { item.orientation = 0; item.footprint = item.kind === 'bed' ? 'legacy-single' : 'standard'; }
  const allocations = world.jobs.map(job => ({ id: job.id, wood: job.escrow.wood }));
  // A deterministic walkable drop point nearest the old camp; no terrain is regenerated or repaired.
  const origin = world.pawns[0] ?? { x: Math.floor(world.width / 2), z: Math.floor(world.height / 2) };
  const blocked = new Set([...world.structures, ...world.jobs].filter(item => item.kind === 'wall').map(item => item.z * world.width + item.x));
  const cells = world.tiles.map((tile, index) => ({ tile, x: index % world.width, z: Math.floor(index / world.width), index }))
    .filter(cell => !['water', 'rock'].includes(cell.tile.terrain) && !blocked.has(cell.index));
  cells.sort((a, b) => Math.abs(a.x - origin.x) + Math.abs(a.z - origin.z) - Math.abs(b.x - origin.x) - Math.abs(b.z - origin.z) || a.index - b.index);
  const drop = cells[0];
  if (!drop && (initial.wood || initial.food)) throw new Error('Legacy stock has no valid material drop location.');
  if (drop) { addGroundMaterial(world, 'wood', initial.wood, drop); addGroundMaterial(world, 'food', initial.food, drop); }
  for (const allocation of allocations) addMaterial(world, 'wood', allocation.wood, { type: 'job', jobId: allocation.id });
  refreshStock(world); return world;
}
export function serializeWorld(world: World): string {
  const errors = validateWorld(world); if (errors.length) throw new Error(`Cannot save invalid world: ${errors.join(' ')}`);
  const serialized = JSON.stringify(world); if (serialized.length > 16_000_000) throw new Error('Save exceeds supported size.'); return serialized;
}
export function deserializeWorld(serialized: string): World {
  if (typeof serialized !== 'string' || serialized.length > 16_000_000) throw new Error('Invalid or oversized save.');
  let input: unknown = JSON.parse(serialized);
  if (record(input) && input.schemaVersion === 1) input = migrateLegacy(input);
  const errors = validateWorld(input); if (errors.length) throw new Error(`Invalid save: ${errors.join(' ')}`); return input as World;
}
/** Deterministic diagnostic fingerprint, not a cryptographic digest. */
export function hashWorld(world: World): string {
  const serialized = JSON.stringify(world); let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index++) { hash ^= serialized.charCodeAt(index); hash = Math.imul(hash, 0x01000193); }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
