import { reservedServiceCells } from './service-reservations.ts';
import { footprintCells, MATERIAL_DEFINITIONS } from './definitions.ts';
import { adjacent, inBounds, routeToCell } from './pathfinding.ts';
import type { NeedContext } from './needs.ts';
import type { Cell, DiningPlace, Pawn, World } from './types.ts';

const same = (a: Cell, b: Cell): boolean => a.x === b.x && a.z === b.z;
const distance = (a: Cell, b: Cell): number => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
const neighbors = (cell: Cell): Cell[] => [
  { x: cell.x, z: cell.z - 1 }, { x: cell.x + 1, z: cell.z },
  { x: cell.x, z: cell.z + 1 }, { x: cell.x - 1, z: cell.z },
];

/** Any cardinal eating surface works; a stool's orientation is not a rule. */
export function adjacentTable(world: World, cell: Cell): { id: number; cell: Cell } | null {
  for (const neighbor of neighbors(cell)) {
    const table = world.structures.find(item => item.kind === 'table' && footprintCells(item).some(part => same(part, neighbor)));
    if (table) return { id: table.id, cell: neighbor };
  }
  return null;
}

export function validDiningPlace(world: World, place: DiningPlace): boolean {
  if (place.seatId !== null && !world.structures.some(item => item.kind === 'stool' && item.id === place.seatId && same(item, place.target))) return false;
  return place.tableId === null || world.structures.some(item => item.id === place.tableId && item.kind === 'table' && footprintCells(item).some(cell => adjacent(cell, place.target)));
}

/** Runs only after pickup, not at the original hunger decision. Candidate radius
 * is geometric; reachability still follows the real obstacles. A single shared
 * search is deferred until there is a candidate requiring a route.
 */
export function chooseDiningPlace(world: World, pawn: Pawn, context: NeedContext): { place: DiningPlace; path: Cell[] } | null {
  const key = (cell: Cell): number => cell.z * world.width + cell.x;
  const reserved = reservedServiceCells(world,pawn.id);
  // Index surfaces once per decision, rather than rescanning all furniture per seat.
  const surfaces = new Map<number, number>();
  const fixed = new Set<number>();
  for (const item of world.structures) for (const cell of footprintCells(item)) {
    if (item.kind === 'table') surfaces.set(key(cell), item.id);
    if (item.kind !== 'stool') fixed.add(key(cell));
  }
  for (const item of world.jobs) if (item.kind === 'wall' || item.kind === 'table') for (const cell of footprintCells(item)) fixed.add(key(cell));
  const candidates: DiningPlace[] = [];
  for (const seat of world.structures) {
    if (seat.kind !== 'stool' || reserved.has(key(seat)) || distance(pawn, seat) > MATERIAL_DEFINITIONS.food.chairSearchRadius ** 2) continue;
    const surface = neighbors(seat).find(cell => inBounds(world, cell.x, cell.z) && surfaces.has(key(cell)));
    if (surface) candidates.push({ target: { x: seat.x, z: seat.z }, seatId: seat.id, tableId: surfaces.get(key(surface))! });
  }
  candidates.sort((a, b) => distance(pawn, a.target) - distance(pawn, b.target) || a.seatId! - b.seatId!);
  let reach: ReturnType<NeedContext['search']> | undefined;
  for (const place of candidates) {
    reach ??= context.search( new Set([key(candidates[0]!.target)]));
    if (!reach) return null; // Search budget is not proof that seats are unreachable.
    const path = routeToCell(world, place.target, reach);
    if (path) return { place, path };
  }
  // With no available seat, chew standing nearby. Current cell first; deterministic
  // local fallback replaces the reference region/random tie-break (documented).
  const standing: Cell[] = [];
  for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
    const cell = { x: pawn.x + dx, z: pawn.z + dz };
    if (dx * dx + dz * dz > 16 || !inBounds(world, cell.x, cell.z) || reserved.has(key(cell)) || fixed.has(key(cell)) || ['water', 'rock'].includes(world.tiles[key(cell)]!.terrain)) continue;
    standing.push(cell);
  }
  standing.sort((a, b) => distance(pawn, a) - distance(pawn, b) || key(a) - key(b));
  for (const target of standing) {
    if (!same(pawn, target)) { reach ??= context.search(); if (!reach) return null; }
    const path = same(pawn, target) ? [] : routeToCell(world, target, reach!);
    if (path) return { place: { target, seatId: null, tableId: adjacentTable(world, target)?.id ?? null }, path };
  }
  return null;
}
