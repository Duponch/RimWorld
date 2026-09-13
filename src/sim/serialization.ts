import { initializeFarming, validateFarming } from './farming-save.ts';
import { jobDuration } from './farming.ts';
import { workType } from './work-planner.ts';
import { asideCapacity, haulingWork } from './haul-aside.ts';
import { harvestable, isPlant, legacyPlantGrowth } from './plants.ts';
import { groundPile, storageCapacity } from './ground-placement.ts';
import { validateTravel } from './travel-validation.ts';
import { edgeLength, TRAVEL_TICKS } from './movement.ts';
import { CARRY_CAPACITY, footprintCells, JOB_WOOD_COST, MAX_STACK } from './definitions.ts';
import { deliveredStock, groundQuantity, reservedDestination, reservedSource } from './materials.ts';
import { migrateLegacy, initializeNeeds, initializeDining, initializeFood, initializeSpatial, initializePlants } from './save-migrations.ts';
import type { World } from './types.ts';
import { validMapDimension } from './map-config.ts';
import { INGEST_TICKS } from './eating.ts';
import { validDiningPlace } from './dining.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { TICKS_PER_DAY } from './types.ts';

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const bounded = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const stock = (value: unknown): boolean => record(value) && integer(value.wood, 0, MAX_STACK * 32768) && integer(value.food, 0, MAX_STACK * 32768);
const oneOf = (value: unknown, values: string[]): boolean => typeof value === 'string' && values.includes(value);

/** Structural validation first, cross-reference validation second; accepts arbitrary JSON without throwing. */
export function validateWorld(input: unknown): string[] {
  return validateSchema(input, 9);
}
function validateSchema(input: unknown, version: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9): string[] {
  const legacyV2 = version === 2;
  const errors: string[] = [];
  if (!record(input)) return ['World must be an object.'];
  if (version >= 5 && !oneOf(input.foodRules, ['legacy', 'adult'])) errors.push('Invalid food rules profile.');
  if (version < 5 && input.foodRules !== undefined) errors.push('Legacy save contains version 5 fields.');
  if (input.schemaVersion !== version) errors.push('Unsupported schema version; migrate older saves through deserializeWorld.');
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
          || !oneOf(item.state, legacyV2 ? ['idle', 'moving', 'working', 'sleeping', 'hungry'] : ['idle', 'moving', 'working', 'sleeping', 'hungry', 'eating']) || !(item.jobId === null || integer(item.jobId, 1))
          || !record(item.priorities) || !integer(item.priorities.gather, 0, 4) || !integer(item.priorities.build, 0, 4) || !integer(item.priorities.haul, 0, 4) || (version >= 8 && !integer(item.priorities.grow, 0, 4))
          || !(version < 6 ? integer(item.moveCooldown, 0, 3) : typeof item.moveCooldown === 'number' && Number.isFinite(item.moveCooldown) && item.moveCooldown >= 0 && item.moveCooldown <= 4.243) || !integer(item.planCooldown, 0, 20)) errors.push('Invalid pawn state.');
        if (!Array.isArray(item.path) || item.path.length > size) errors.push('Invalid pawn path.');
        else {
          let previous = item;
          for (const cell of item.path) {
            if (!record(cell) || !coord(cell)) { errors.push('Invalid pawn path cell.'); break; }
            if ((version<6 ? Math.abs((cell.x as number)-(previous.x as number))+Math.abs((cell.z as number)-(previous.z as number)) : Math.max(Math.abs((cell.x as number)-(previous.x as number)),Math.abs((cell.z as number)-(previous.z as number)))) !== 1) { errors.push('Non-contiguous pawn path.'); break; }
            previous = cell;
          }
        }
        if(version<6 && item.motion!==undefined) errors.push('Legacy save contains spatial fields.');
        if(version>=6 && item.motion==null && item.moveCooldown!==0) errors.push('Missing travel segment for movement delay.');
        if(version>=6 && item.motion!=null) {
          const m=item.motion;
          if(!record(m)||!record(m.from)||!record(m.to)||!coord(m.from)||!coord(m.to)||typeof m.start!=='number'||typeof m.end!=='number'||!Number.isFinite(m.start)||!Number.isFinite(m.end)||m.start<0||m.start>(input.tick as number)||m.to.x!==item.x||m.to.z!==item.z||Math.max(Math.abs((m.to.x as number)-(m.from.x as number)),Math.abs((m.to.z as number)-(m.from.z as number)))!==1) errors.push('Invalid travel segment.');
          else if(Math.abs(m.end-m.start-TRAVEL_TICKS*edgeLength(m.from as unknown as import('./types.ts').Cell,m.to as unknown as import('./types.ts').Cell) )>1e-7 || Math.abs((item.moveCooldown as number)-Math.max(0,m.end-(input.tick as number)))>1e-7) errors.push('Inconsistent travel duration.');
        }
        const haul = item.haul;
        if (!legacyV2) {
          if (!(item.bedId === null || integer(item.bedId, 1)) || !integer(item.needCooldown, 0, 20)) errors.push('Invalid need cadence or bed ownership.');
          const need = item.need;
          if (need !== null && (!record(need) || (need.kind === 'eat'
            ? !oneOf(need.phase, version < 4 ? ['pickup', 'ingest'] : ['pickup', 'choose-spot', 'travel', 'ingest']) || !integer(need.sourcePileId, 1) || !(need.carryPileId === null || integer(need.carryPileId, 1)) || !integer(need.progress, 0, INGEST_TICKS - 1)
            : need.kind === 'sleep' ? !oneOf(need.phase, ['travel', 'sleep']) || !(need.bedId === null || integer(need.bedId, 1)) || !record(need.target) || !coord(need.target)
              : true))) errors.push('Invalid need task.');
        } else if (item.need !== undefined || item.bedId !== undefined || item.needCooldown !== undefined) errors.push('Version 2 cannot contain version 3 task fields.');
        if (record(item.need) && item.need.kind === 'eat') {
          if (version >= 5 ? !integer(item.need.quantity, 1, MAX_STACK) : item.need.quantity !== undefined) errors.push('Invalid meal quantity.');
        }
        if (version >= 4) {
          if (!bounded(item.comfort) || !Array.isArray(item.memories) || item.memories.length > (version >= 8 ? 2 : 1) || item.memories.some(memory => !record(memory) || !oneOf(memory.kind, version >= 8 ? ['ate-without-table', 'ate-raw-food'] : ['ate-without-table']) || !integer(memory.expiresAt, (input.tick as number) + 1, (input.tick as number) + TICKS_PER_DAY))) errors.push('Invalid comfort or meal memory.');
          else if (new Set(item.memories.map(memory => (memory as {kind:string}).kind)).size !== item.memories.length) errors.push('Duplicate meal memory.');
          if (record(item.need) && item.need.kind === 'eat') {
            const dining = item.need.dining;
            if (dining !== null && (!record(dining) || !record(dining.target) || !coord(dining.target) || !(dining.seatId === null || integer(dining.seatId, 1)) || !(dining.tableId === null || integer(dining.tableId, 1)))) errors.push('Invalid dining place.');
          }
        } else if (item.comfort !== undefined || item.memories !== undefined || (record(item.need) && item.need.dining !== undefined)) errors.push('Legacy save contains version 4 fields.');
        if (haul !== null) {
          if (record(haul) && haul.pickupCell!==undefined && (version<6 || haul.phase!=='deliver' || !record(haul.pickupCell) || !coord(haul.pickupCell))) errors.push('Invalid pickup facing cell.');
          if (!record(haul) || !integer(haul.sourcePileId, 1) || !integer(haul.quantity, 1, CARRY_CAPACITY) || !oneOf(haul.phase, ['pickup', 'deliver'])
            || !(haul.carryPileId === null || integer(haul.carryPileId, 1)) || !record(haul.destination)
            || !(haul.destination.type === 'job' ? integer(haul.destination.jobId, 1) : haul.destination.type === 'stockpile' ? integer(haul.destination.stockpileId, 1) : version >= 9 && haul.destination.type === 'aside' && coord(haul.destination))) errors.push('Invalid haul task.');
        }
      } else if (key === 'resources') {
        if (!oneOf(item.kind, ['tree', 'berries', 'rock', ...(version >= 8 ? ['rice'] : [])]) || !integer(item.amount, 1, 1000000)) errors.push('Invalid resource.');
        if (item.growth !== undefined || item.growthTick !== undefined) {
          if (version < 7 || !(item.kind === 'berries' || (version >= 8 && item.kind === 'rice')) || typeof item.growth !== 'number' || !Number.isFinite(item.growth) || item.growth < 0 || item.growth > 1 || !integer(item.growthTick, 0, input.tick as number)) errors.push('Invalid plant growth checkpoint.');
        }
      } else if (key === 'structures' || key === 'jobs') {
        if (!oneOf(item.kind, key === 'structures' ? (version < 4 ? ['wall', 'bed'] : ['wall', 'bed', 'table', 'stool']) : (version < 4 ? ['chop', 'harvest', 'wall', 'bed'] : ['chop', 'harvest', ...(version >= 7 ? ['cut'] : []), ...(version >= 8 ? ['sow'] : []), 'wall', 'bed', 'table', 'stool'])) || !integer(item.orientation, 0, 3)
          || !oneOf(item.footprint, ['standard', 'legacy-single']) || (item.footprint === 'legacy-single' && item.kind !== 'bed')) errors.push('Invalid structure definition or footprint.');
        if (key === 'jobs' && (!oneOf(item.status, ['pending', 'active']) || !(item.reservedBy === null || integer(item.reservedBy, 1)) || !stock(item.escrow) || !integer(item.progress, 0, 119))) errors.push('Invalid job.');
      } else if (key === 'piles') {
        if (!oneOf(item.kind, ['wood', 'food']) || !integer(item.quantity, 1, MAX_STACK) || !record(item.owner)) errors.push('Invalid material pile.');
        else {
          if (version >= 5) {
            if (typeof item.item !== 'string' || !Object.hasOwn(ITEM_DEFINITIONS, item.item)) errors.push('Unknown item definition.');
            else {
              const definition = ITEM_DEFINITIONS[item.item as keyof typeof ITEM_DEFINITIONS];
              if (definition.kind !== item.kind || (item.quantity as number) > definition.stackLimit) errors.push('Invalid item category or stack limit.');
            }
          } else if (item.item !== undefined) errors.push('Legacy save contains version 5 item.');
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
  if (version >= 8 && !errors.length) errors.push(...validateFarming(input, size, ids));
  if (errors.length) return errors;
  const world = input as unknown as World;
  if(version>=6)errors.push(...validateTravel(world));
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
  const bedOwners = new Set<number>();
  const sleepingBeds = new Set<number>();
  const diningCells = new Set<number>();
  for (const pawn of world.pawns) {
    const key = cellKey(pawn);
    if (pawnCells.has(key)) errors.push('Pawns overlap.'); pawnCells.add(key);
    if (['wall', 'table'].includes(structureCells.get(key)?.kind ?? '') || ['wall', 'table'].includes(jobCells.get(key)?.kind ?? '')) errors.push('Pawn occupies a wall target.');
    if (Number(pawn.jobId !== null) + Number(pawn.haul !== null) + Number(!legacyV2 && pawn.need !== null) > 1) errors.push('Pawn has two simultaneous tasks.');
    if (pawn.jobId !== null) {
      const job = jobById.get(pawn.jobId);
      if (!job || job.reservedBy !== pawn.id || job.status !== 'active') errors.push('Pawn/job reservation mismatch.');
      if (job && pawn.priorities[workType(job)] === 0) errors.push('Pawn assigned to disabled work.');
    }
    const owned = world.piles.filter(pile => pile.owner.type === 'pawn' && pile.owner.pawnId === pawn.id);
    if (owned.length > 1 || (owned.length === 1 && pawn.haul?.phase !== 'deliver' && (legacyV2 || pawn.need?.kind !== 'eat' || pawn.need.phase === 'pickup'))) errors.push('Carried ownership mismatch.');
    if (pawn.jobId !== null || pawn.haul !== null) { if (!['moving', 'working'].includes(pawn.state)) errors.push('Assigned pawn has incompatible state.'); }
    else if ((legacyV2 || pawn.need === null) && (pawn.path.length || ['moving', 'working'].includes(pawn.state))) errors.push('Unassigned pawn has path or work state.');
    if (!legacyV2) {
      if (pawn.bedId !== null) {
        if (!world.structures.some(bed => bed.kind === 'bed' && bed.id === pawn.bedId) || bedOwners.has(pawn.bedId)) errors.push('Invalid or duplicate bed ownership.');
        bedOwners.add(pawn.bedId);
      }
      const need = pawn.need;
      if (need?.kind === 'eat') {
        if (need.sourcePileId >= world.nextId) errors.push('Invalid food source identity.');
        const pile = pileById.get(need.phase === 'pickup' ? need.sourcePileId : need.carryPileId!);
        if (need.phase === 'pickup') {
          if (pawn.state !== 'moving' || need.progress !== 0 || need.carryPileId !== null || !pile || pile.kind !== 'food' || pile.owner.type !== 'ground' || reservedSource(world, pile.id) > pile.quantity) errors.push('Invalid meal reservation.');
        } else {
          if (owned[0]?.id !== need.carryPileId || !pile || pile.kind !== 'food' || pile.quantity !== (need.quantity ?? 1) || pile.owner.type !== 'pawn' || pile.owner.pawnId !== pawn.id) errors.push('Invalid ingestion ownership or state.');
          if (need.phase === 'ingest' ? pawn.state !== 'eating' || pawn.path.length > 0 : pawn.state !== 'moving' || need.progress !== 0) errors.push('Invalid meal phase or state.');
        }
        if (version >= 5 && pile && need.quantity > ITEM_DEFINITIONS[pile.item].maxIngest) errors.push('Meal exceeds item ingestion limit.');
        if (version >= 4) {
          if (need.phase === 'pickup' || need.phase === 'choose-spot') {
            if (need.dining !== null || (need.phase === 'choose-spot' && pawn.path.length)) errors.push('Meal search has a premature dining reservation.');
          } else {
            const place = need.dining;
            if (!place || !validDiningPlace(world, place)) errors.push('Invalid dining furniture reference.');
            else {
              const target = cellKey(place.target);
              if (diningCells.has(target) || isImpassable(place.target) || ['wall', 'table'].includes(structureCells.get(target)?.kind ?? '') || ['wall', 'table'].includes(jobCells.get(target)?.kind ?? '')) errors.push('Invalid or duplicate dining destination.');
              diningCells.add(target);
              if (need.phase === 'ingest' && key !== target) errors.push('Eating away from reserved place.');
              if (place.seatId !== null && place.tableId === null) errors.push('Dining seat has no eating surface.');
            }
          }
        }
      } else if (need?.kind === 'sleep') {
        if (need.bedId !== null) {
          const bed = world.structures.find(item => item.id === need.bedId && item.kind === 'bed');
          if (!bed || pawn.bedId !== bed.id || cellKey(bed) !== cellKey(need.target) || sleepingBeds.has(need.bedId)) errors.push('Invalid sleep reservation.');
          sleepingBeds.add(need.bedId);
        }
        if (need.phase === 'sleep' ? pawn.state !== 'sleeping' || pawn.path.length > 0 || cellKey(pawn) !== cellKey(need.target) : pawn.state !== 'moving') errors.push('Invalid sleep position or phase.');
      } else if (['eating', 'sleeping'].includes(pawn.state)) errors.push('Need action without a task.');
    }
    if (pawn.haul) {
      const haul = pawn.haul;
      if (pawn.priorities[haulingWork(haul.destination)] === 0) errors.push('Pawn hauling with disabled work.');
      if (haul.sourcePileId >= world.nextId) errors.push('Invalid source identity.');
      const pile = pileById.get(haul.phase === 'pickup' ? haul.sourcePileId : haul.carryPileId!);
      if (haul.phase === 'pickup') {
        if (haul.carryPileId !== null || !pile || pile.owner.type !== 'ground' || reservedSource(world, pile.id) > pile.quantity) errors.push('Invalid source quantity reservation.');
      } else if (!pile || pile.owner.type !== 'pawn' || pile.owner.pawnId !== pawn.id || pile.quantity !== haul.quantity || owned[0]?.id !== haul.carryPileId) errors.push('Invalid carried quantity.');
      if (haul.destination.type === 'job') {
        const job = jobById.get(haul.destination.jobId);
        if (!job || pile?.kind !== 'wood' || deliveredStock(world, job.id).wood + reservedDestination(world, haul.destination) > JOB_WOOD_COST[job.kind]) errors.push('Invalid construction delivery reservation.');
      } else if (haul.destination.type === 'aside') {
        if (!pile || asideCapacity(world, haul.destination, pile.item, pawn.id) < haul.quantity
          || (pile.owner.type === 'ground' && cellKey(pile.owner) === cellKey(haul.destination))) errors.push('Invalid clearing destination reservation.');
      } else {
        const zone = world.stockpiles.find(item => haul.destination.type === 'stockpile' && item.id === haul.destination.stockpileId);
        if (!zone || !pile || !zone.filters[pile.kind] || (version>=6 ? storageCapacity(world,zone,pile.item,pawn.id)<haul.quantity : groundQuantity(world, zone) + reservedDestination(world, haul.destination) > zone.capacity)) errors.push('Invalid storage capacity reservation.');
        if (zone && pile?.owner.type === 'ground' && cellKey(zone) === cellKey(pile.owner)) errors.push('Haul source is its own destination.');
      }
    }
  }
  for (const job of world.jobs) {
    if (job.progress >= jobDuration(world, job)) errors.push('Completed job left in queue.');
    if ((job.status === 'active') !== (job.reservedBy !== null)) errors.push('Job reservation/status mismatch.');
    if (job.reservedBy !== null && pawnById.get(job.reservedBy)?.jobId !== job.id) errors.push('Job references missing or mismatched pawn.');
    const delivered = deliveredStock(world, job.id);
    if (job.escrow.wood !== delivered.wood || job.escrow.food !== delivered.food || delivered.food !== 0 || delivered.wood > JOB_WOOD_COST[job.kind]) errors.push('Invalid delivered material view.');
    // Version 1 could refund escrow on interruption while retaining progress. Such plans
    // keep that progress, but may only acquire a builder after physical delivery again.
    if (job.reservedBy !== null && delivered.wood !== JOB_WOOD_COST[job.kind]) errors.push('Construction work started before delivery.');
    const resource = resourceCells.get(cellKey(job));
    if (job.kind === 'chop' || job.kind === 'harvest' || job.kind === 'cut') { if (!resource || !(job.kind === 'chop' ? resource.kind === 'tree' : isPlant(resource))) errors.push('Gather job has no matching resource.'); else if (version >= 7 && job.kind === 'harvest' && !(version === 7 ? legacyPlantGrowth(world,resource) > .65 : harvestable(world,resource))) errors.push('Harvest job targets an immature plant.'); }
    else for (const cell of footprintCells(job)) if (resourceCells.has(cellKey(cell)) || structureCells.has(cellKey(cell))) errors.push('Construction overlaps existing content.');
  }
  const available = { wood: 0, food: 0 };
  for (const pile of world.piles) {
    const owner = pile.owner;
    if (owner.type === 'ground') {
      if (version>=6 && groundPile(world,owner)?.id!==pile.id) errors.push('Several item stacks occupy one floor cell.');
      if (isImpassable(owner) || structureCells.get(cellKey(owner))?.kind === 'wall' || jobCells.get(cellKey(owner))?.kind === 'wall') errors.push('Pile on impassable cell.');
      available[pile.kind] += pile.quantity;
    } else if (owner.type === 'pawn') { if (!pawnById.has(owner.pawnId)) errors.push('Pile references missing carrier.'); available[pile.kind] += pile.quantity; }
    else if (!jobById.has(owner.jobId)) errors.push('Pile references missing construction.');
  }
  if (world.stock.wood !== available.wood || world.stock.food !== available.food) errors.push('Derived stock differs from physical piles.');
  return errors;
}

export function serializeWorld(world: World): string {
  const errors = validateWorld(world); if (errors.length) throw new Error(`Cannot save invalid world: ${errors.join(' ')}`);
  const serialized = JSON.stringify(world); if (serialized.length > 16_000_000) throw new Error('Save exceeds supported size.'); return serialized;
}
export function deserializeWorld(serialized: string): World {
  if (typeof serialized !== 'string' || serialized.length > 16_000_000) throw new Error('Invalid or oversized save.');
  let input: unknown = JSON.parse(serialized);
  if (record(input) && input.schemaVersion === 1) input = migrateLegacy(input);
  if (record(input) && input.schemaVersion === 2) {
    const errors = validateSchema(input, 2);
    if (errors.length) throw new Error(`Invalid version 2 save: ${errors.join(' ')}`);
    input.schemaVersion = 4;
    initializeNeeds(input as unknown as World);
    initializeDining(input as unknown as World);
  }
  if (record(input) && input.schemaVersion === 3) {
    const errors = validateSchema(input, 3);
    if (errors.length) throw new Error(`Invalid version 3 save: ${errors.join(' ')}`);
    input.schemaVersion = 4;
    initializeDining(input as unknown as World);
  }
  if (record(input) && input.schemaVersion === 4) {
    const errors = validateSchema(input, 4);
    if (errors.length) throw new Error(`Invalid version 4 save: ${errors.join(' ')}`);
    initializeFood(input as unknown as World);
  }
  if (record(input) && input.schemaVersion === 5) {
    const errors=validateSchema(input,5);if(errors.length) throw new Error(`Invalid version 5 save: ${errors.join(' ')}`);
    initializeSpatial(input as unknown as World);
  }
  if (record(input) && input.schemaVersion === 6) {
    const errors=validateSchema(input,6); if(errors.length) throw new Error(`Invalid version 6 save: ${errors.join(' ')}`);
    initializePlants(input as unknown as World);
  }
  if (record(input) && input.schemaVersion === 7) {
    const errors=validateSchema(input,7); if(errors.length) throw new Error(`Invalid version 7 save: ${errors.join(' ')}`);
    initializeFarming(input as unknown as World);
  }
  if (record(input) && input.schemaVersion === 8) {
    const errors = validateSchema(input, 8); if (errors.length) throw new Error(`Invalid version 8 save: ${errors.join(' ')}`);
    // Existing paths, reservations and meals continue; only future decisions change.
    input.schemaVersion = 9;
  }
  const errors = validateWorld(input); if (errors.length) throw new Error(`Invalid save: ${errors.join(' ')}`); return input as World;
}
/** Deterministic diagnostic fingerprint, not a cryptographic digest. */
export function hashWorld(world: World): string {
  const serialized = JSON.stringify(world); let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index++) { hash ^= serialized.charCodeAt(index); hash = Math.imul(hash, 0x01000193); }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
