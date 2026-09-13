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
    if (structure.kind === 'wall' || structure.kind === 'table') for (const cell of footprintCells(structure)) blocked[cellIndex(world, cell.x, cell.z)] = 1;
  }
  for (const job of world.jobs) {
    if (job.kind === 'wall' || job.kind === 'table') for (const cell of footprintCells(job)) blocked[cellIndex(world, cell.x, cell.z)] = 1;
  }
  return blocked;
}

export interface Reachability { parents: Int32Array; start: number }

/** Occupy a destination cell (beds), unlike interaction from a neighbouring cell. */
export function routeToCell(world: World, target: Cell, reachable: Reachability): Cell[] | null {
  if (!inBounds(world, target.x, target.z)) return null;
  let cursor = cellIndex(world, target.x, target.z);
  if (reachable.parents[cursor] === -2) return null;
  const path: Cell[] = [];
  while (cursor !== reachable.start) {
    path.push({ x: cursor % world.width, z: Math.floor(cursor / world.width) });
    cursor = reachable.parents[cursor]!;
  }
  return path.reverse();
}

/** Full flood by default. With goals, the map is partial beyond the first goal
 * layer and may only be used for nearest-goal selection (or that single target).
 * No reached goal means a complete flood, so remaining candidates are knowable. */
export function reachableCells(world: World, start: Cell, blocked: Uint8Array, occupied: Set<number>, goals?: ReadonlySet<number>): Reachability {
  const size = world.width * world.height;
  const parents = new Int32Array(size).fill(-2);
  const queue = new Int32Array(size);
  const startIndex = cellIndex(world, start.x, start.z);
  parents[startIndex] = -1;
  queue[0] = startIndex;
  let head = 0;
  let tail = 1;
  let frontier = 1, reachedGoal = false;
  while (head < tail) {
    const index = queue[head++]!;
    if (goals?.has(index)) reachedGoal = true;
    const x = index % world.width;
    // Keep exact N,E,S,W discovery order without allocating one array per visited cell.
    let next = index - world.width;
    if (next >= 0 && parents[next] === -2 && !blocked[next] && !occupied.has(next)) { parents[next] = index; queue[tail++] = next; }
    next = index + 1;
    if (x + 1 < world.width && parents[next] === -2 && !blocked[next] && !occupied.has(next)) { parents[next] = index; queue[tail++] = next; }
    next = index + world.width;
    if (next < size && parents[next] === -2 && !blocked[next] && !occupied.has(next)) { parents[next] = index; queue[tail++] = next; }
    next = index - 1;
    if (x > 0 && parents[next] === -2 && !blocked[next] && !occupied.has(next)) { parents[next] = index; queue[tail++] = next; }
    // Finish the entire first goal layer: all equal-length routes keep the same
    // N/E/S/W parents and remain eligible for the caller's stable ID tie-break.
    if (head === frontier) { if (reachedGoal) break; frontier = tail; }
  }
  return { parents, start: startIndex };
}

export function routeToJob(world: World, target: Cell & { kind?: string; orientation?: 0 | 1 | 2 | 3; footprint?: 'standard' | 'legacy-single' }, reachable: Reachability, allowTarget = false): Cell[] | null {
  const cells = target.kind === 'bed' || target.kind === 'table' ? footprintCells({ ...target, kind: target.kind }) : [target];
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

/** Same interaction cells as routeToJob(..., true) for single-cell food piles. */
export function foodInteractionGoals(world: World, cells: Cell[]): Set<number> {
  const goals = new Set<number>();
  for (const cell of cells) {
    const index = cellIndex(world, cell.x, cell.z); goals.add(index);
    if (cell.z > 0) goals.add(index - world.width);
    if (cell.x + 1 < world.width) goals.add(index + 1);
    if (cell.z + 1 < world.height) goals.add(index + world.width);
    if (cell.x > 0) goals.add(index - 1);
  }
  return goals;
}
