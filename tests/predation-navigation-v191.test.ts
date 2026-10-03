import { expect, test, vi } from 'vitest';
import { createWorld } from '../src/sim/engine.ts';
import { animalNavigation } from '../src/sim/wildlife-navigation.ts';
import { WeightedSearch } from '../src/sim/weighted-search.ts';
import { captureStandability, navigationCosts } from '../src/sim/furniture-travel.ts';
import { doorCorners, doorOpenness, isPassageDoor, newDoorState } from '../src/sim/door-rules.ts';
import { footprintCells } from '../src/sim/definitions.ts';
import { jobBlocksTransit } from '../src/sim/construction-rules.ts';
import { scaleNavigationCosts } from '../src/sim/navigation-costs.ts';
import { hasReachableCell, routeToCell } from '../src/sim/pathfinding.ts';
import { adultAgeTicks } from '../src/sim/animal-life.ts';
import { addGroundMaterial, refreshStock } from '../src/sim/materials.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import type { Cell, Structure, World } from '../src/sim/types.ts';

type Prey = Cell & { id: number };
type Route = { kind: 'food' | 'prey' | 'exit'; path: Cell[]; targetId?: number };
interface Query { from: Cell; food: Cell[]; prey: Prey[]; fallback?: boolean; fences?: boolean }
const contacts = (p: Cell): Cell[] => [p, { x: p.x - 1, z: p.z }, { x: p.x + 1, z: p.z }, { x: p.x, z: p.z - 1 }, { x: p.x, z: p.z + 1 }];
const index = (w: World, c: Cell) => c.z * w.width + c.x;
const edges = (w: World): Cell[] => {
  const cells: Cell[] = [];
  for (let x = 0; x < w.width; x++) cells.push({ x, z: 0 }, { x, z: w.height - 1 });
  for (let z = 1; z < w.height - 1; z++) cells.push({ x: 0, z }, { x: w.width - 1, z });
  return cells;
};

/** Independently captured V190 factory from c4d69e5 (wildlife-navigation.ts
 * blob e5973f60b8ee08ab81d60dacfb60cf3c02d881e8). Production's optimized
 * foodPreyOrExitRoute is never called here. Common topology/cost definitions
 * remain shared inputs; the exhaustive query and its contact order are frozen. */
function exhaustiveV190(w: World, fencePassable = false) {
  const solids = new Set<number>(), corners = doorCorners(w), stand = captureStandability(w);
  for (const s of w.structures) {
    if (s.kind === 'wall' || s.kind === 'cooler' || s.kind === 'fence' && !fencePassable || w.schemaVersion < 22 && s.kind === 'table')
      for (const c of footprintCells(s)) solids.add(index(w, c));
    if (isPassageDoor(s.kind) && (s.door?.forbidden || !s.door?.open || doorOpenness(s, w.tick) < 1 - 1e-9)) solids.add(index(w, s));
  }
  for (const j of w.jobs) if (jobBlocksTransit(w, j)) for (const c of footprintCells(j)) solids.add(index(w, c));
  const blocked = new Uint8Array(w.tiles.length);
  for (let i = 0; i < blocked.length; i++) if (solids.has(i) || ['water', 'rock'].includes(w.tiles[i]!.terrain)) blocked[i] = 1;
  const free = (c: Cell) => stand(c) && !blocked[index(w, c)];
  return (q: Query): Route | undefined => {
    const cells = q.food.filter(free), goals = new Set(cells.map(c => index(w, c)));
    if (!goals.size && !q.prey.length && !q.fallback) return;
    const n = navigationCosts(w);
    const search = new WeightedSearch(w.width, w.height, index(w, q.from), blocked, scaleNavigationCosts(n.costs, 3), n.repeaters, scaleNavigationCosts(n.floors, 3), corners);
    if (goals.size) {
      const reach = search.advance(goals), food = cells.filter(c => hasReachableCell(reach, index(w, c)))
        .sort((a, b) => reach.costs[index(w, a)]! - reach.costs[index(w, b)]!)[0];
      if (food) { const path = routeToCell(w, food, search.finish(goals)); return path ? { kind: 'food', path } : undefined; }
    }
    const reach = search.finish();
    for (const p of q.prey) {
      const target = contacts(p).filter(c => free(c) && hasReachableCell(reach, index(w, c)))
        .sort((a, b) => reach.costs[index(w, a)]! - reach.costs[index(w, b)]!)[0];
      const path = target && routeToCell(w, target, reach); if (path) return { kind: 'prey', path, targetId: p.id };
    }
    if (!q.fallback) return;
    const target = edges(w).filter(c => free(c) && hasReachableCell(reach, index(w, c)))
      .sort((a, b) => reach.costs[index(w, a)]! - reach.costs[index(w, b)]!)[0];
    const path = target && routeToCell(w, target, reach); return path ? { kind: 'exit', path } : undefined;
  };
}

/** Independent bounded fixture model: no production topology, cost capture,
 * WeightedSearch, PathFrontier, reachability or path reconstruction helpers. */
function oracle(w: World, q: Query) {
  const size = w.tiles.length, blocked = new Uint8Array(size), stops = new Uint8Array(size), corners = new Set<number>(), repeated = new Set<number>();
  const costs = new Float64Array(size), floors = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    const t = w.tiles[i]!;
    blocked[i] = ['water', 'rock'].includes(t.terrain) ? 1 : 0;
    floors[i] = t.floor ? t.floor === 'burned-wood' ? 33 : 0 : ['rough-stone', 'rich-soil', 'gravel'].includes(t.terrain) ? 67 : 0;
    costs[i] = floors[i]!;
  }
  expect(w.jobs).toEqual([]); expect(w.site).toBeUndefined();
  for (const s of w.structures) {
    // Fixtures use single-cell pieces and one orientation-zero 1×2 table.
    // Spell out its second cell without importing footprintCells.
    const i = s.z * w.width + s.x;
    if (s.kind === 'wall') { blocked[i] = 1; stops[i] = 1; }
    else if (s.kind === 'door' || s.kind === 'fence-gate') {
      corners.add(i);
      if (!s.door!.open || s.door!.forbidden) blocked[i] = 1;
      // Only fully open or fully closed manual wooden leaves are prepared.
      if (s.kind === 'door' && !s.door!.open) costs[i] = costs[i]! + 1267;
    } else if (s.kind === 'fence') {
      costs[i] = Math.max(costs[i]!, 667); if (!q.fences) blocked[i] = 1;
    } else if (s.kind === 'stool' || s.kind === 'table') {
      costs[i] = Math.max(costs[i]!, s.kind === 'stool' ? 1000 : 1400); repeated.add(i);
      if (s.kind === 'table') { stops[i] = 1; costs[i + w.width] = Math.max(costs[i + w.width]!, 1400); repeated.add(i + w.width); stops[i + w.width] = 1; }
    } else throw Error(`Unsupported independent fixture piece: ${s.kind}`);
  }
  for (const p of w.piles) if (p.owner.type === 'ground') {
    expect(p.item).toBe('steel'); const i = p.owner.z * w.width + p.owner.x;
    floors[i] = Math.max(floors[i]!, 467); costs[i] = Math.max(costs[i]!, 467);
  }
  const free = (c: Cell) => Number.isInteger(c.x) && Number.isInteger(c.z) && c.x >= 0 && c.z >= 0 && c.x < w.width && c.z < w.height && !blocked[index(w, c)] && !stops[index(w, c)];
  const distances = new Float64Array(size).fill(Infinity), parents = new Int32Array(size).fill(-2), settled = new Uint8Array(size), insertion = new Int32Array(size);
  const start = index(w, q.from); let serial = 0; distances[start] = 0; parents[start] = -1;
  const offsets = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]] as const;
  const edgeExtra = (a: number, b: number) => (repeated.has(a) && repeated.has(b) ? floors[b]! : costs[b]!) * 3;
  for (;;) {
    let a = -1;
    for (let i = 0; i < size; i++) if (!settled[i] && Number.isFinite(distances[i]) && (a < 0 || distances[i]! < distances[a]! || distances[i] === distances[a] && insertion[i]! > insertion[a]!)) a = i;
    if (a < 0) break; settled[a] = 1;
    for (const [dx, dz] of offsets) {
      const x = a % w.width + dx, z = Math.floor(a / w.width) + dz, b = z * w.width + x;
      if (x < 0 || z < 0 || x >= w.width || z >= w.height || blocked[b] || settled[b]) continue;
      if (dx && dz && (blocked[a + dx] || blocked[a + dz * w.width] || corners.has(a + dx) || corners.has(a + dz * w.width))) continue;
      const cost = distances[a]! + (dx && dz ? 1414 : 1000) + edgeExtra(a, b);
      if (cost < distances[b]!) { distances[b] = cost; parents[b] = a; insertion[b] = ++serial; }
    }
  }
  function nearest(candidates: Cell[]): Cell | undefined {
    let best: Cell | undefined;
    for (const c of candidates) if (free(c) && Number.isFinite(distances[index(w, c)]) && (!best || distances[index(w, c)]! < distances[index(w, best)]!)) best = c;
    return best;
  }
  function path(to: Cell): Cell[] {
    const result: Cell[] = []; let cursor = index(w, to);
    while (cursor !== start) { result.push({ x: cursor % w.width, z: Math.floor(cursor / w.width) }); cursor = parents[cursor]!; }
    return result.reverse();
  }
  let result: Route | undefined;
  const food = nearest(q.food);
  if (food) result = { kind: 'food', path: path(food) };
  else for (const p of q.prey) {
    const c = nearest([{ x: p.x, z: p.z }, { x: p.x - 1, z: p.z }, { x: p.x + 1, z: p.z }, { x: p.x, z: p.z - 1 }, { x: p.x, z: p.z + 1 }]);
    if (c) { result = { kind: 'prey', path: path(c), targetId: p.id }; break; }
  }
  if (!result && q.fallback) { const edge = nearest(edges(w)); if (edge) result = { kind: 'exit', path: path(edge) }; }
  return { result, distances, parents, blocked, free, edgeExtra, reachable: settled.reduce((n, b) => n + b, 0) };
}

function camp() {
  const w = createWorld(191, 16, 16);
  w.tiles = w.tiles.map(() => ({ terrain: 'grass' })); w.structures = []; w.resources = []; w.jobs = []; w.piles = []; w.packed = []; w.stockpiles = []; w.growingZones = [];
  delete w.wildlife; delete w.site;
  for (const [i, p] of w.pawns.entries()) { p.x = 2 + i; p.z = 2; }
  return w;
}
function prey(w: World, cells: Cell[]): Prey[] {
  const targets = cells.map(c => ({ ...c, id: w.nextId++ }));
  w.wildlife = { profile: 'temperate-hares-v1', rng: 191, eatenPlants: 0, eatenItems: 0, eatenNutrition: 0,
    animals: targets.map(p => ({ ...p, species: 'hare', sex: 'female', ageTicks: adultAgeTicks('hare'), food: .2, rest: 1, state: 'idle', path: [], nextDecision: w.tick })) };
  return targets;
}
function structure(w: World, kind: 'wall' | 'door' | 'fence-gate' | 'fence' | 'stool' | 'table', x: number, z: number, open = true, forbidden = false) {
  const s: Structure = { id: w.nextId++, kind, x, z, orientation: 0, footprint: 'standard', material: 'wood', ...(kind === 'table' || kind === 'stool' ? { quality: 'normal' as const } : {}) };
  if (kind === 'door' || kind === 'fence-gate') s.door = { ...newDoorState(w.tick), open, from: open ? 1 : 0, holdOpen: open, forbidden };
  w.structures.push(s); return s;
}
function compare(w: World, q: Query) {
  refreshStock(w); expect(validateWorld(w)).toEqual([]);
  const before = serializeWorld(w), expected = exhaustiveV190(w, q.fences)(q), independent = oracle(w, q);
  expect(expected).toEqual(independent.result);
  const advance = vi.spyOn(WeightedSearch.prototype, 'advance'), finish = vi.spyOn(WeightedSearch.prototype, 'finish');
  let visited = 0, searches = 0, pendingWitness = false;
  try {
    const actual = animalNavigation(w, false, q.fences).foodPreyOrExitRoute(q.from, q.food, q.prey, q.fallback);
    expect(actual).toEqual(expected);
    const instances = new Set(advance.mock.contexts as WeightedSearch[]); searches = instances.size;
    expect(searches).toBeLessThanOrEqual(1);
    visited = [...instances][0]?.field.visited ?? 0;
    if (actual?.kind === 'prey') {
      expect(finish).not.toHaveBeenCalled(); expect(searches).toBe(1);
      const field = [...instances][0]!.field;
      const endpoint = actual.path.at(-1) ?? q.from;
      expect(field.settled![index(w, endpoint)]).toBe(1);
      for (let cursor = index(w, endpoint); cursor >= 0; cursor = field.parents[cursor]!) expect(field.settled![cursor]).toBe(1);
      const pending = field.parents.findIndex((parent, i) => parent !== -2 && Number.isFinite(field.costs[i]) && !field.settled![i]);
      if (pending >= 0) { pendingWitness = true; expect(hasReachableCell(field, pending)).toBe(false); }
    }
    if (actual) {
      const endpoint = actual.path.at(-1) ?? q.from;
      let cost = 0, previous = q.from;
      for (const c of actual.path) { cost += (c.x !== previous.x && c.z !== previous.z ? 1414 : 1000) + independent.edgeExtra(index(w, previous), index(w, c)); previous = c; }
      expect(cost).toBe(independent.distances[index(w, endpoint)]);
      expect(independent.free(endpoint)).toBe(true);
    }
    if (actual?.kind === 'exit') expect(finish).toHaveBeenCalledTimes(1);
  } finally { advance.mockRestore(); finish.mockRestore(); }
  expect(serializeWorld(w)).toBe(before);
  expect(animalNavigation(w, false, q.fences).foodPreyOrExitRoute(q.from, q.food, q.prey, q.fallback)).toEqual(expected);
  const restored = deserializeWorld(before);
  expect(animalNavigation(restored, false, q.fences).foodPreyOrExitRoute(q.from, q.food, q.prey, q.fallback)).toEqual(expected);
  expect(serializeWorld(w)).toBe(before); expect(restored).toEqual(w);
  return { result: expected, visited, searches, independent, pendingWitness };
}

test('distant accessible food keeps V190 priority while nearby prey returns the same partial contact/path without finalization', () => {
  const w = camp(), targets = prey(w, [{ x: 4, z: 8 }]), from = { x: 2, z: 8 };
  const fed = compare(w, { from, food: [{ x: 13, z: 13 }], prey: targets });
  expect(fed.result?.kind).toBe('food'); expect(fed.result?.path.at(-1)).toEqual({ x: 13, z: 13 });
  const hunt = compare(w, { from, food: [], prey: targets });
  expect(hunt.result).toEqual({ kind: 'prey', path: [{ x: 3, z: 8 }], targetId: targets[0]!.id });
  expect(hunt.visited).toBeLessThan(hunt.independent.reachable);
  expect(hunt.pendingWitness).toBe(true);
});

test('biological order wins over travel distance, with equal-cost contacts and exact full-flood tie parents', () => {
  const w = camp(), targets = prey(w, [{ x: 12, z: 8 }, { x: 4, z: 8 }]);
  const ranked = compare(w, { from: { x: 2, z: 8 }, food: [], prey: targets });
  expect(ranked.result?.targetId).toBe(targets[0]!.id);
  const equal = compare(w, { from: { x: 10, z: 6 }, food: [], prey: targets.slice(0, 1) });
  expect(equal.independent.distances[8 * w.width + 11]).toBe(equal.independent.distances[7 * w.width + 12]);
  expect(equal.result?.path.at(-1)).toEqual({ x: 11, z: 8 }); // left precedes up at equal cost.
});

test('an unreachable first prey or food exhausts only one field and still finds the next ranked accessible prey', () => {
  const w = camp(), targets = prey(w, [{ x: 10, z: 10 }, { x: 4, z: 8 }]);
  for (let z = 9; z <= 11; z++) for (let x = 9; x <= 11; x++) if (x !== 10 || z !== 10) structure(w, 'wall', x, z);
  for (const food of [[], [{ x: 10, z: 10 }]]) {
    const result = compare(w, { from: { x: 2, z: 8 }, food, prey: targets, fallback: true });
    expect(result.result?.kind).toBe('prey'); expect(result.result?.targetId).toBe(targets[1]!.id);
    expect(result.searches).toBe(1); expect(result.visited).toBe(result.independent.reachable);
  }
});

test('weighted directed furniture/floor routes, open/closed door corners and fence permission match two independent references', () => {
  for (const variant of [0, 1, 2, 3]) for (const fences of [false, true]) {
    const w = camp(), targets = prey(w, [{ x: 13, z: 10 }, { x: 4, z: 11 }]);
    for (let z = 4; z <= 13; z++) if (z !== 8) structure(w, 'wall', 8, z);
    structure(w, variant === 3 ? 'fence-gate' : 'door', 8, 8, variant !== 1, variant === 2);
    for (let z = 6; z <= 11; z++) structure(w, 'fence', 10, z);
    for (const x of [4, 5, 6]) structure(w, 'stool', x, 8);
    structure(w, 'table', 5, 9);
    for (let x = 3; x <= 13; x++) w.tiles[8 * w.width + x] = { terrain: 'gravel', ...(x % 2 ? { floor: 'burned-wood' as const } : {}) };
    addGroundMaterial(w, 'steel', 1, { x: 5, z: 8 }, 'steel');
    for (const from of [{ x: 2, z: 8 }, { x: 13, z: 8 }]) compare(w, { from, food: [], prey: targets, fences, fallback: true });
    const directed = oracle(w, { from: { x: 2, z: 8 }, food: [], prey: targets, fences });
    expect(directed.edgeExtra(8 * w.width + 4, 8 * w.width + 5)).toBe(1401); // steel remains between repeaters.
    expect(directed.edgeExtra(8 * w.width + 5, 8 * w.width + 4)).toBe(201); // opposite entry has only natural floor.
  }
});

test('empty origin contacts, absent prey, edge ties and sealed components retain exact result semantics', () => {
  const w = camp(), targets = prey(w, [{ x: 8, z: 8 }]);
  expect(compare(w, { from: { x: 8, z: 8 }, food: [], prey: targets }).result).toEqual({ kind: 'prey', path: [], targetId: targets[0]!.id });
  expect(compare(w, { from: { x: 8, z: 8 }, food: [{ x: 8, z: 8 }], prey: targets }).result).toEqual({ kind: 'food', path: [] });
  expect(compare(w, { from: { x: 8, z: 8 }, food: [], prey: [] }).searches).toBe(0);
  expect(compare(w, { from: { x: 8, z: 8 }, food: [], prey: [], fallback: true }).result?.kind).toBe('exit');
  expect(compare(w, { from: { x: 0, z: 8 }, food: [], prey: [], fallback: true }).result).toEqual({ kind: 'exit', path: [] });
  for (let z = 7; z <= 9; z++) for (let x = 7; x <= 9; x++) if (x !== 8 || z !== 8) structure(w, 'wall', x, z);
  expect(compare(w, { from: { x: 2, z: 8 }, food: [], prey: targets }).result).toBeUndefined();
  expect(compare(w, { from: { x: 8, z: 8 }, food: [], prey: [], fallback: true }).result).toBeUndefined();
});

test('fresh captures observe obstacle and floor edits at the same tick while preserving World and both PRNGs', () => {
  const w = camp(), targets = prey(w, [{ x: 7, z: 8 }]), q: Query = { from: { x: 2, z: 8 }, food: [], prey: targets };
  const original = compare(w, q).result;
  structure(w, 'wall', 4, 8); w.tiles[9 * w.width + 4] = { terrain: 'grass', floor: 'burned-wood' };
  const modified = compare(w, q).result;
  expect(modified).not.toEqual(original); expect(w.tick).toBe(0);
  w.structures = []; w.tiles[9 * w.width + 4] = { terrain: 'grass' };
  expect(compare(w, q).result).toEqual(original);
});
