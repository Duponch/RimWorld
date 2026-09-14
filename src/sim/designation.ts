import { isPlant, harvestable } from './plants.ts';
import { MAX_STACK, footprintCells } from './definitions.ts';
import { inBounds } from './pathfinding.ts';
import type { AreaAction, AreaCommand, Cell, CommandResult, StorageSettings, World } from './types.ts';

const TREE = 1, BERRIES = 2, FIXED = 4, JOB = 8, STORAGE = 16, BLOCKED = 32, RIPE = 64, GROWING = 128;
export const isAreaAction = (value: unknown): value is AreaAction => ['chop', 'harvest', 'cut', 'cancel', 'stockpile', 'remove-stockpile', 'growing', 'remove-growing'].includes(value as string);
export interface AreaBounds { minX: number; maxX: number; minZ: number; maxZ: number }
export interface AreaIndex { flags: Uint8Array }
export type AreaQuery = { ok: false; reason: string; code: CommandResult['code'] }
  | { ok: true; bounds: AreaBounds; cells: number[]; selected: number; skipped: number };

export function validStorageSettings(settings: StorageSettings): boolean {
  return (settings.filters === undefined || (!!settings.filters && typeof settings.filters.wood === 'boolean' && typeof settings.filters.food === 'boolean'))
    && (settings.priority === undefined || (Number.isInteger(settings.priority) && settings.priority >= 1 && settings.priority <= 4))
    && (settings.capacity === undefined || (Number.isInteger(settings.capacity) && settings.capacity >= 1 && settings.capacity <= MAX_STACK));
}

/** Rebuilt on demand from one snapshot. No persistent cache or gameplay authority. */
export function buildAreaIndex(world: World): AreaIndex {
  const flags = new Uint8Array(world.width * world.height);
  const index = (cell: Cell) => cell.z * world.width + cell.x;
  for (let i = 0; i < flags.length; i++) if (world.tiles[i]!.terrain === 'water' || world.tiles[i]!.terrain === 'rock') flags[i] = BLOCKED;
  for (const resource of world.resources) flags[index(resource)]! |= FIXED | (resource.kind === 'tree' ? TREE : isPlant(resource) ? BERRIES | (harvestable(world, resource) ? RIPE : 0) : 0);
  for (const structure of world.structures) for (const cell of footprintCells(structure)) flags[index(cell)]! |= FIXED;
  for (const job of world.jobs) for (const cell of footprintCells(job)) flags[index(cell)]! |= JOB;
  for (const storage of world.stockpiles) flags[index(storage)]! |= STORAGE;
  for (const pawn of world.pawns) {
    if(pawn.haul?.destination.type==='aside')flags[index(pawn.haul.destination)]!|=BLOCKED;
    if(pawn.cooking){flags[index(pawn.cooking.spot)]!|=BLOCKED;for(const i of pawn.cooking.ingredients)if(i.stage!=='placed')flags[index(i.cell)]!|=BLOCKED;}
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
  const cells: number[] = [];
  for (let z = bounds.minZ; z <= bounds.maxZ; z++) for (let x = bounds.minX; x <= bounds.maxX; x++) {
    const i = z * world.width + x, value = flags[i]!;
    const eligible = command.action === 'chop' ? (value & TREE) && !(value & JOB)
      : command.action === 'cut' ? (value & BERRIES) && !(value & JOB)
      : command.action === 'harvest' ? (value & RIPE) && !(value & JOB)
        : command.action === 'cancel' ? value & JOB
          : command.action === 'remove-growing' ? value & GROWING
          : command.action === 'growing' ? !(value & (BLOCKED | STORAGE | GROWING))
          : command.action === 'remove-stockpile' ? value & STORAGE
            : !(value & (BLOCKED | FIXED | JOB | STORAGE | GROWING));
    if (eligible) cells.push(i);
  }
  return { ok: true, bounds, cells, selected, skipped: selected - cells.length };
}
