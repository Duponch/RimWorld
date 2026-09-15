import { expect, test } from 'vitest';
import { RoomTopologyCache } from '../src/sim/room-topology';
import { applyCommand, stepWorld } from '../src/sim/engine';
import { addGroundMaterial } from '../src/sim/materials';
import { serializeWorld, deserializeWorld, validateWorld } from '../src/sim/serialization';
import type { World } from '../src/sim/types';
import { roomCamp } from './scenarios/rooms';

// Independent union oracle: compare every pair's Manhattan distance, with no
// production mask, flood queue, neighbour helpers or pathfinding involved.
function oracle(w: Pick<World, 'width' | 'height' | 'tiles' | 'structures'>) {
  const walls = new Set(w.structures.filter(s => s.kind === 'wall').map(s => s.z * w.width + s.x));
  const doors = new Set(w.structures.filter(s => s.kind === 'door').map(s => s.z * w.width + s.x));
  const cells = w.tiles.map((t, i) => ({ x: i % w.width, z: Math.floor(i / w.width),
    type: doors.has(i) ? 'doorway' : walls.has(i) || t.terrain === 'rock' ? 'solid' : 'space' }));
  const parents = cells.map((_, i) => i);
  const root = (i: number): number => parents[i] === i ? i : root(parents[i]!);
  for (let a = 0; a < cells.length; a++) for (let b = a + 1; b < cells.length; b++) {
    const c = cells[a]!, d = cells[b]!;
    if (c.type === 'space' && d.type === 'space' && Math.abs(c.x - d.x) + Math.abs(c.z - d.z) === 1) {
      const ra = root(a), rb = root(b); parents[Math.max(ra, rb)] = Math.min(ra, rb);
    }
  }
  return cells.map((c, i) => {
    if (c.type !== 'space') return { kind: c.type };
    const connected = cells.filter((_, j) => root(j) === root(i));
    return { kind: 'space', id: root(i) + 1, cellCount: connected.length,
      touchesMapEdge: connected.some(d => d.x === 0 || d.z === 0 || d.x === w.width - 1 || d.z === w.height - 1) };
  });
}

test('enclosures agree with an independent oracle across rectangles, in-place edits, replacement and unchanged snapshots', () => {
  let seed = 73491;
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed >>> 8; };
  const cache = new RoomTopologyCache();
  for (let sample = 0; sample < 80; sample++) {
    const width = 3 + rand() % 13, height = 3 + rand() % 11;
    const w: Pick<World, 'width' | 'height' | 'tiles' | 'structures'> = { width, height, structures: [],
      tiles: Array.from({ length: width * height }, () => ({ terrain: (['grass', 'water', 'rock', 'soil'] as const)[rand() % 4]! })) };
    for (let i = 0; i < 8; i++) {
      const index = rand() % w.tiles.length;
      if (w.structures.some(s => s.z * width + s.x === index)) continue;
      w.tiles[index]!.terrain = 'grass';
      w.structures.push({ id: i + 1, kind: (['wall', 'door', 'bed', 'table'] as const)[rand() % 4]!, x: index % width, z: Math.floor(index / width), orientation: 0, footprint: 'standard' });
    }
    const before = structuredClone(w), topology = cache.read(w), expected = oracle(w);
    expect(w).toEqual(before);
    for (let i = 0; i < w.tiles.length; i++) expect(topology.at(i % width, Math.floor(i / width)), `sample ${sample} cell ${i}`).toEqual(expected[i]);
    expect(cache.read(structuredClone(w))).toBe(topology);
    for (const [x, z] of [[-1, 0], [width, 0], [0, height], [0, -1], [.5, 1], [NaN, 0]]) expect(topology.at(x!, z!)).toBeUndefined();
    // In-place terrain and structure changes at an unchanged tick must rebuild.
    w.structures = []; w.tiles[0]!.terrain = w.tiles[0]!.terrain === 'rock' ? 'water' : 'rock';
    const updated = cache.read(w), changed = oracle(w);
    expect(updated).not.toBe(topology);
    for (let i = 0; i < w.tiles.length; i++) {
      expect(updated.at(i % width, Math.floor(i / width))).toEqual(changed[i]);
      expect(topology.at(i % width, Math.floor(i / width))).toEqual(expected[i]);
    }
    // Same area but different dimensions must not reuse the old connectivity.
    [w.width, w.height] = [w.height, w.width]; const resized = cache.read(w), resizedExpected = oracle(w);
    for (let i = 0; i < w.tiles.length; i++) expect(resized.at(i % w.width, Math.floor(i / w.width))).toEqual(resizedExpected[i]);
  }
});

test('real removal, frame, construction, mining and save/reload merge and split rooms without confusing doors, water or furniture', () => {
  const w = roomCamp(), cache = new RoomTopologyCache(), door = w.structures.find(s => s.kind === 'door')!;
  const room = (x: number, z: number) => cache.read(w).at(x, z);
  const closed = cache.read(w);
  expect(room(12, 15)).toMatchObject({ kind: 'space', cellCount: 36, touchesMapEdge: false });
  expect(room(17, 15)).toMatchObject({ kind: 'space', cellCount: 36, touchesMapEdge: false });
  expect(room(15, 15)).toEqual({ kind: 'doorway' });
  expect(room(10, 10)).toMatchObject({ touchesMapEdge: true }); // Missing diagonal corner is harmless.
  door.door!.open = true; door.door!.holdOpen = true; door.door!.forbidden = true;
  expect(cache.read(w)).toBe(closed);
  door.door!.forbidden = false;
  w.tiles[15 * 32 + 13]!.terrain = 'water';
  expect(cache.read(w)).toBe(closed); // Impassable water still exchanges air.
  w.structures.push({ id: w.nextId++, kind: 'table', x: 12, z: 17, orientation: 1, footprint: 'standard' });
  expect(cache.read(w)).toBe(closed);
  const until = (predicate: () => boolean, max = 3500) => {
    for (let i = 0; i < max && !predicate(); i++) { stepWorld(w); if (i % 50 === 0) expect(validateWorld(w)).toEqual([]); }
    expect(predicate(), JSON.stringify({ tick: w.tick, jobs: w.jobs, pawn: w.pawns[0] })).toBe(true);
  };
  expect(applyCommand(w, { type: 'designate', kind: 'deconstruct', x: 15, z: 14 }).ok).toBe(true);
  expect(cache.read(w)).toBe(closed); // A designation does not remove a wall.
  until(() => !w.structures.some(s => s.x === 15 && s.z === 14));
  const merged = cache.read(w);
  expect(room(12, 15)).toMatchObject({ cellCount: 73, touchesMapEdge: false });
  expect(room(12, 15)).toBe(room(17, 15));
  addGroundMaterial(w, 'wood', 5, { x: 17, z: 17 }, 'wood');
  expect(applyCommand(w, { type: 'designate', kind: 'wall', material: 'wood', x: 15, z: 14 }).ok).toBe(true);
  expect(cache.read(w)).toBe(merged);
  until(() => w.jobs.some(j => j.kind === 'wall' && j.construction === 'frame'));
  expect(cache.read(w)).toBe(merged); // A frame also leaves the room open.
  const saved = deserializeWorld(serializeWorld(w)), replay = new RoomTopologyCache();
  expect(replay.read(saved).at(12, 15)).toEqual(room(12, 15));
  until(() => w.structures.some(s => s.kind === 'wall' && s.x === 15 && s.z === 14));
  stepWorld(saved, w.tick - saved.tick); expect(saved).toEqual(w);
  expect(room(12, 15)).toMatchObject({ cellCount: 36, touchesMapEdge: false });
  expect(closed.at(12, 15)).toEqual(room(12, 15));
  // Replace one outer wall with natural rock, then open a real mined breach.
  w.structures = w.structures.filter(s => s.x !== 11 || s.z !== 10);
  w.tiles[10 * 32 + 11] = { terrain: 'rock', stone: 'granite' };
  expect(room(12, 15)).toMatchObject({ touchesMapEdge: false });
  expect(applyCommand(w, { type: 'designate', kind: 'mine', x: 11, z: 10 }).ok).toBe(true);
  until(() => w.tiles[10 * 32 + 11]!.terrain !== 'rock');
  expect(room(12, 15)).toMatchObject({ touchesMapEdge: true });
  expect(room(17, 15)).toMatchObject({ touchesMapEdge: false });
  w.tiles[10 * 32 + 11] = { terrain: 'water' };
  expect(room(12, 15)).toMatchObject({ touchesMapEdge: true }); // Water in the only breach cannot seal it.
  expect(validateWorld(w)).toEqual([]);
});
