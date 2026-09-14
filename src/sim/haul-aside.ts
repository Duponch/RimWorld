import { footprintCells } from './definitions.ts';
import { groundCapacity, storageCapacity } from './ground-placement.ts';
import { growingZoneAt, resourceAt } from './farming.ts';
import { cellIndex, inBounds } from './pathfinding.ts';
import type { ItemId } from './items.ts';
import type { Cell, HaulDestination, World } from './types.ts';

/** Clearing is part of the grower's work, even with ordinary hauling disabled. */
export const haulingWork = (destination: HaulDestination) => destination.type==='job'&&destination.forConstruction || destination.type==='aside'&&destination.forConstruction ? 'build' : destination.type === 'aside' ? destination.constructionId===undefined?'grow':'haul' : destination.type==='fuel'&&destination.forCooking ? 'cook' : 'haul';
const same = (a: Cell, b: Cell) => a.x === b.x && a.z === b.z;
export function asideCapacity(world: World, cell: Cell, item: ItemId, exceptPawn?: number): number {
  if (!inBounds(world, cell.x, cell.z) || ['water', 'rock'].includes(world.tiles[cellIndex(world, cell.x, cell.z)]!.terrain)
    || growingZoneAt(world, cellIndex(world, cell.x, cell.z))
    || resourceAt(world, cellIndex(world, cell.x, cell.z))
    || [...world.structures, ...world.jobs].some(j => footprintCells(j).some(c => same(c, cell)))) return 0;
  const zone = world.stockpiles.find(z => same(z, cell));
  return zone ? storageCapacity(world, zone, item, exceptPawn) : groundCapacity(world, cell, item, exceptPawn);
}

/** The reachable source connects this local flood to the actor's component.
 * Structural connectivity is exact; transient pawn occupancy is handled during
 * travel. Reuse the static grid and shared budget, not a second global search. */
export function findAsideDestination(world: World, source: Cell, item: ItemId, quantity: number, blocked: Uint8Array, budget: { pairs: number }): (Cell & { type: 'aside' }) | null {
  const queue: Cell[] = [{ x: source.x, z: source.z }], seen = new Set([cellIndex(world, source.x, source.z)]);
  for (let i = 0; i < queue.length && budget.pairs > 0; i++) {
    const cell = queue[i]!; budget.pairs--;
    if (i > 0 && !world.pawns.some(p => same(p, cell)) && asideCapacity(world, cell, item) >= quantity) return { type: 'aside', ...cell };
    for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const x = cell.x + dx!, z = cell.z + dz!, key = cellIndex(world, x, z);
      if (inBounds(world, x, z) && !blocked[key] && !seen.has(key)) { seen.add(key); queue.push({ x, z }); }
    }
  }
  return null;
}
