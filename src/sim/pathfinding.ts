import type { Cell, World } from './types.ts';
import { footprintCells } from './definitions.ts';

export const cellIndex = (world: World, x: number, z: number): number => z * world.width + x;
export const inBounds = (world: World, x: number, z: number): boolean =>
  Number.isInteger(x) && Number.isInteger(z) && x >= 0 && z >= 0 && x < world.width && z < world.height;
export const adjacent = (a: Cell, b: Cell): boolean => Math.abs(a.x - b.x) + Math.abs(a.z - b.z) === 1;

/** Walls under construction also exclude traffic, so completing one cannot entomb a pawn. */
export function blockedCells(world: World): Uint8Array {
  const blocked = new Uint8Array(world.width * world.height);
  for (let i = 0; i < world.tiles.length; i++) {
    const terrain = world.tiles[i]!.terrain;
    if (terrain === 'water' || terrain === 'rock') blocked[i] = 1;
  }
  for (const structure of world.structures) {
    if (structure.kind === 'wall') blocked[cellIndex(world, structure.x, structure.z)] = 1;
  }
  for (const job of world.jobs) {
    if (job.kind === 'wall') blocked[cellIndex(world, job.x, job.z)] = 1;
  }
  return blocked;
}

export interface Reachability { parents: Int32Array; start: number }

/** One bounded flood per planning pawn, reused for every candidate job. No per-frame search. */
export function reachableCells(world: World, start: Cell, blocked: Uint8Array, occupied: Set<number>): Reachability {
  const size = world.width * world.height;
  const parents = new Int32Array(size).fill(-2);
  const queue = new Int32Array(size);
  const startIndex = cellIndex(world, start.x, start.z);
  parents[startIndex] = -1;
  queue[0] = startIndex;
  let head = 0;
  let tail = 1;
  while (head < tail) {
    const index = queue[head++]!;
    const x = index % world.width;
    const z = Math.floor(index / world.width);
    // Stable N,E,S,W order is part of replay determinism.
    const neighbors = [z > 0 ? index - world.width : -1, x + 1 < world.width ? index + 1 : -1,
      z + 1 < world.height ? index + world.width : -1, x > 0 ? index - 1 : -1];
    for (const next of neighbors) {
      if (next < 0 || parents[next] !== -2 || blocked[next] || occupied.has(next)) continue;
      parents[next] = index;
      queue[tail++] = next;
    }
  }
  return { parents, start: startIndex };
}

export function routeToJob(world: World, target: Cell & { kind?: string; orientation?: 0 | 1 | 2 | 3; footprint?: 'standard' | 'legacy-single' }, reachable: Reachability, allowTarget = false): Cell[] | null {
  const cells = target.kind === 'bed' ? footprintCells({ ...target, kind: 'bed' }) : [target];
  const candidates: Cell[] = cells.flatMap(cell => [
    { x: cell.x, z: cell.z - 1 }, { x: cell.x + 1, z: cell.z },
    { x: cell.x, z: cell.z + 1 }, { x: cell.x - 1, z: cell.z },
  ]).filter(cell => allowTarget || !cells.some(occupied => occupied.x === cell.x && occupied.z === cell.z));
  if (allowTarget) candidates.unshift({ x: target.x, z: target.z });
  let best: Cell[] | null = null;
  for (const cell of candidates) {
    if (!inBounds(world, cell.x, cell.z)) continue;
    let cursor = cellIndex(world, cell.x, cell.z);
    if (reachable.parents[cursor] === -2) continue;
    const path: Cell[] = [];
    while (cursor !== reachable.start) {
      path.push({ x: cursor % world.width, z: Math.floor(cursor / world.width) });
      cursor = reachable.parents[cursor]!;
    }
    path.reverse();
    if (best === null || path.length < best.length) best = path;
  }
  return best;
}
