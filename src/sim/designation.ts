import { isRoofArea, isRoofJob } from './roof-rules.ts';
import { occupancyOf } from './occupancy.ts';
import { isPlant, harvestable } from './plants.ts';
import { isCookingOrder } from './order-types.ts';
import { MAX_STACK, footprintCells } from './definitions.ts';
import { inBounds } from './pathfinding.ts';
import type { AreaAction, AreaCommand, Cell, CommandResult, StorageSettings, World } from './types.ts';

const TREE = 1, BERRIES = 2, FIXED = 4, JOB = 8, STORAGE = 16, BLOCKED = 32, RIPE = 64, GROWING = 128, ZONE_BLOCKED = 256, GROW_BLOCKED = 512, DECONSTRUCTIBLE = 1024, ROCK = 2048, CHUNK = 4096;
export const isAreaAction = (value: unknown): value is AreaAction => ['home','remove-home','build-roof', 'remove-roof', 'ignore-roof', 'mine', 'haul-chunks', 'deconstruct', 'chop', 'harvest', 'cut', 'cancel', 'stockpile', 'remove-stockpile', 'growing', 'remove-growing'].includes(value as string);
export interface AreaBounds { minX: number; maxX: number; minZ: number; maxZ: number }
export interface AreaIndex { flags: Uint16Array }
export type AreaQuery = { ok: false; reason: string; code: CommandResult['code'] }
  | { ok: true; bounds: AreaBounds; cells: number[]; selected: number; skipped: number };

export function validStorageSettings(settings: StorageSettings): boolean {
  return (settings.filters === undefined || (!!settings.filters && typeof settings.filters.wood === 'boolean' && typeof settings.filters.food === 'boolean' && (settings.filters.apparel===undefined||typeof settings.filters.apparel==='boolean') && (settings.filters.weapon===undefined||typeof settings.filters.weapon==='boolean') && (settings.filters.medicine===undefined||typeof settings.filters.medicine==='boolean') && (settings.filters.component===undefined||typeof settings.filters.component==='boolean') && (settings.filters.blocks===undefined||typeof settings.filters.blocks==='boolean') && (settings.filters.steel===undefined||typeof settings.filters.steel==='boolean') && (settings.filters.chunk===undefined||typeof settings.filters.chunk==='boolean') && (settings.filters.furniture===undefined||typeof settings.filters.furniture==='boolean')))
    && (settings.priority === undefined || (Number.isInteger(settings.priority) && settings.priority >= 1 && settings.priority <= 4))
    && (settings.capacity === undefined || (Number.isInteger(settings.capacity) && settings.capacity >= 1 && settings.capacity <= MAX_STACK));
}

/** Rebuilt on demand from one snapshot. No persistent cache or gameplay authority. */
export function buildAreaIndex(world: World): AreaIndex {
  const flags = new Uint16Array(world.width * world.height);
  const index = (cell: Cell) => cell.z * world.width + cell.x;
  for (let i = 0; i < flags.length; i++) if (world.tiles[i]!.terrain === 'water' || world.tiles[i]!.terrain === 'rock') flags[i] = BLOCKED | (world.tiles[i]!.terrain==='rock'?ROCK:0);
  for(let i=0;i<flags.length;i++)if(world.tiles[i]!.terrain==='rough-stone')flags[i]!|=GROW_BLOCKED;
  for(const pile of world.piles)if(pile.kind==='chunk'&&pile.owner.type==='ground'&&!pile.haulRequested)flags[index(pile.owner)]!|=CHUNK;
  for (const resource of world.resources) flags[index(resource)]! |= ZONE_BLOCKED | FIXED | (resource.kind === 'tree' ? TREE : isPlant(resource) ? BERRIES | (harvestable(world, resource) ? RIPE : 0) : 0);
  for (const structure of world.structures) for (const cell of footprintCells(structure)) flags[index(cell)]! |= DECONSTRUCTIBLE | FIXED | (occupancyOf(structure.kind)?.zones?0:ZONE_BLOCKED | GROW_BLOCKED);
  for(const job of world.jobs)if(job.furniture){const source=world.structures.find(s=>s.id===job.furniture!.structureId);if(source)for(const c of footprintCells(source))flags[index(c)]!|=JOB;}
  // Repair is automatic maintenance, not a cancellable designation. Its existing
  // barrier already supplies occupancy; it must not prevent deconstruction.
  for (const job of world.jobs.filter(j=>!isRoofJob(j)&&j.kind!=='repair')) for (const cell of footprintCells(job)) flags[index(cell)]! |= JOB | (job.kind==='deconstruct'||job.kind==='uninstall'||occupancyOf(job.furniture?.kind??job.kind)?.zones?0:ZONE_BLOCKED) | (occupancyOf(job.furniture?.kind??job.kind)?.zones===false?GROW_BLOCKED:0);
  for(const pack of world.packed??[])if(pack.owner.type==='ground'&&world.jobs.some(j=>j.furniture?.structureId===pack.building.id))flags[index(pack.owner)]!|=JOB;
  for (const storage of world.stockpiles) flags[index(storage)]! |= STORAGE;
  for (const pawn of world.pawns) {
    if(pawn.haul?.destination.type==='aside')flags[index(pawn.haul.destination)]!|=BLOCKED;
    if(pawn.cooking){flags[index(pawn.cooking.spot)]!|=BLOCKED;for(const i of pawn.cooking.ingredients)if(i.stage!=='placed')flags[index(i.cell)]!|=BLOCKED;}
    for(const order of pawn.orders?.queue??[])if(isCookingOrder(order)){flags[index(order.cooking.spot)]!|=BLOCKED;for(const i of order.cooking.ingredients)if(i.stage!=='placed')flags[index(i.cell)]!|=BLOCKED;}
  }
  for (const zone of world.growingZones) for (const cell of zone.cells) flags[cell]! |= GROWING;
  return { flags };
}

/** Inclusive rectangle in stable row-major order; occupied/incompatible cells are skipped.
 * Endpoints and policy are validated before any index allocation or mutation.
 */
export function queryArea(world: World, command: AreaCommand, index?: AreaIndex): AreaQuery {
  if (!command || !isAreaAction(command.action)) return { ok: false, code: 'invalid-command', reason: 'Outil de rectangle inconnu.' };
  if (!command.from || !command.to || !inBounds(world, command.from.x, command.from.z) || !inBounds(world, command.to.x, command.to.z)) {
    return { ok: false, code: 'out-of-bounds', reason: 'Rectangle hors de la carte.' };
  }
  if (command.action === 'stockpile' && !validStorageSettings(command)) return { ok: false, code: 'invalid-storage', reason: 'Filtres, priorité (1–4) ou capacité (1–75) invalides.' };
  const bounds = { minX: Math.min(command.from.x, command.to.x), maxX: Math.max(command.from.x, command.to.x), minZ: Math.min(command.from.z, command.to.z), maxZ: Math.max(command.from.z, command.to.z) };
  const selected = (bounds.maxX - bounds.minX + 1) * (bounds.maxZ - bounds.minZ + 1);
  const flags = (index ?? buildAreaIndex(world)).flags;
  const cells: number[] = [],home=new Set(world.home);
  for (let z = bounds.minZ; z <= bounds.maxZ; z++) for (let x = bounds.minX; x <= bounds.maxX; x++) {
    const i = z * world.width + x, value = flags[i]!;
    const eligible = command.action==='home'?!home.has(i):command.action==='remove-home'?home.has(i):isRoofArea(command.action) ? true : command.action === 'mine' ? (value & ROCK) && !(value & JOB)
      : command.action === 'haul-chunks' ? value & CHUNK
      : command.action === 'deconstruct' ? (value & DECONSTRUCTIBLE) && !(value & JOB)
      : command.action === 'chop' ? (value & TREE) && !(value & JOB)
      : command.action === 'cut' ? (value & BERRIES) && !(value & JOB)
      : command.action === 'harvest' ? (value & RIPE) && !(value & JOB)
        : command.action === 'cancel' ? value & JOB
          : command.action === 'remove-growing' ? value & GROWING
          : command.action === 'growing' ? !(value & (BLOCKED | STORAGE | GROWING | GROW_BLOCKED))
          : command.action === 'remove-stockpile' ? value & STORAGE
            : !(value & (BLOCKED | ZONE_BLOCKED | STORAGE | GROWING));
    if (eligible) cells.push(i);
  }
  return { ok: true, bounds, cells, selected, skipped: selected - cells.length };
}
