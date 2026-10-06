import { expect, test } from 'vitest';
import { createWorld } from '../src/sim/index.ts';
import type { Resource, World } from '../src/sim/types.ts';
import { SnapshotDecoder, SnapshotEncoder, type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { readSnapshotChanges, readSnapshotResourceStructure } from '../src/bridge/snapshot-changes.ts';
import * as facade from '../src/bridge/snapshot-changes.ts';

// The historical A/B decoder oracle remains in the qualified private V233
// corpus. These product cases use captured producer values and explicit verdicts.
type Delta = Extract<SnapshotMessage, { kind: 'delta' }>;
function fixture(): World {
  const world = createWorld(911, 16, 16);
  world.tick = 2000;
  world.resources = [0, 1, 2].map<Resource>(index => ({ id: world.nextId++, kind: 'berries',
    x: index + 2, z: 2, amount: 10, growth: .3 + index / 10, growthTick: 1900 }));
  for (const index of [0, 2, 7]) world.tiles[index] = { terrain: 'soil' };
  return world;
}
function harness() {
  const world = fixture(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const oldFrames: World[] = [];
  const packetWorlds = new WeakMap<SnapshotMessage, World>();
  const packet = (checkpoint = false) => {
    const result = structuredClone(encoder.encode(world, 0, 6, checkpoint));
    // A packet may be accepted after the producer has already advanced to D.
    packetWorlds.set(result, structuredClone(world));
    return result;
  };
  const accept = (original: SnapshotMessage) => {
    const input = structuredClone(original), copy = structuredClone(input);
    const held = oldFrames.map(value => structuredClone(value));
    const result = decoder.adopt(input);
    expect(input).toStrictEqual(copy);
    oldFrames.forEach((value, index) => expect(value).toStrictEqual(held[index]));
    if (result.status !== 'applied') return { result };
    const expectedWorld = packetWorlds.get(original);
    if (!expectedWorld) throw Error('Applied fixture packet has no captured producer World.');
    expect(result.world).toStrictEqual(expectedWorld);
    oldFrames.push(result.world);
    return { result, world: result.world };
  };
  const send = (checkpoint = false): World => {
    const accepted = accept(packet(checkpoint));
    expect(accepted.result.status).toBe('applied');
    if (!accepted.world) throw Error(JSON.stringify(accepted.result));
    return accepted.world;
  };
  return { world, packet, accept, send };
}
function asDelta(packet: SnapshotMessage): Delta {
  if (packet.kind !== 'delta') throw Error('Expected ordinary delta.');
  return packet;
}

test('readonly facade has no publisher and copies cannot create the private structural witness', () => {
  expect(Object.keys(facade).sort()).toEqual(['readSnapshotChanges', 'readSnapshotResourceStructure', 'sameSnapshotChangeDomain'].sort());
  const { world, send } = harness(), a = send();
  expect(readSnapshotResourceStructure(a, a)).toEqual({ edges: [], tileIndices: [] });
  expect(readSnapshotResourceStructure(world, a)).toBeUndefined();
  expect(readSnapshotResourceStructure(a, structuredClone(a))).toBeUndefined();
  const foreign = harness().send();
  expect(readSnapshotResourceStructure(a, foreign)).toBeUndefined();
});

test('removal plus append and sparse growth expose chronological owned metadata to an older C', () => {
  const { world, packet, accept, send } = harness(), a = send();
  const [id0, id1, id2] = a.resources.map(resource => resource.id);
  world.resources.splice(1, 1);
  const id3 = world.nextId++;
  world.resources.push({ id: id3, kind: 'berries', x: 5, z: 2, amount: 10 });
  const p1 = asDelta(packet()), b = accept(p1).world!;
  expect(p1.resources!.order).toBeUndefined();
  expect(readSnapshotChanges(a, b)).toBeUndefined(); // Historical conservative contract stays intact.
  world.resources.splice(0, 1); world.resources[0]!.amount++;
  const id4 = world.nextId++;
  world.resources.push({ id: id4, kind: 'berries', x: 6, z: 2, amount: 10 });
  world.tiles[2]!.floor = 'wood-planks';
  const c = send();
  world.resources[0]!.growth = .6; world.resources[0]!.growthTick = 1999;
  const d = send();
  const suffix = readSnapshotResourceStructure(a, c)!;
  expect(suffix).toEqual({ edges: [
    { parentRevision: 1, revision: 2, beforeCount: 3, afterCount: 3,
      removed: [{ id: id1, beforeOrdinal: 1 }], added: [{ id: id3, afterOrdinal: 2 }], updated: [] },
    { parentRevision: 2, revision: 3, beforeCount: 3, afterCount: 3,
      removed: [{ id: id0, beforeOrdinal: 0 }], added: [{ id: id4, afterOrdinal: 2 }],
      updated: [{ id: id2, afterOrdinal: 0 }] },
  ], tileIndices: [2] });
  expect(readSnapshotResourceStructure(c, d)!.edges[0]!.updated).toEqual([{ id: id2, afterOrdinal: 0 }]);
  expect(readSnapshotChanges(c, d)).toEqual({ resourceIndices: [0], tileIndices: [] });
  expect(Object.isFrozen(suffix)).toBe(true); expect(Object.isFrozen(suffix.edges)).toBe(true);
  expect(Object.isFrozen(suffix.edges[0]!.removed[0])).toBe(true);
  p1.resources!.removed[0] = 999999; // Deliberate packet metadata mutation after ownership assertion.
  expect(readSnapshotResourceStructure(a, c)).toEqual(suffix);
  expect(readSnapshotResourceStructure(c, a)).toBeUndefined();
});

test('skipped birth then death and same-ID reintroduction are metadata, never intermediate presentation', () => {
  const { world, send } = harness(), a = send(), oldId = a.resources[1]!.id;
  const temporary = world.nextId++;
  world.resources.push({ id: temporary, kind: 'berries', x: 5, z: 2, amount: 10 });
  const b = send();
  world.resources = world.resources.filter(resource => resource.id !== temporary && resource.id !== oldId);
  const c = send();
  world.resources.push({ id: oldId, kind: 'berries', x: 8, z: 3, amount: 17 });
  const d = send(), edges = readSnapshotResourceStructure(a, d)!.edges;
  expect(edges).toHaveLength(3);
  expect(edges[0]!.added).toEqual([{ id: temporary, afterOrdinal: 3 }]);
  expect(edges[1]!.removed).toEqual([{ id: oldId, beforeOrdinal: 1 }, { id: temporary, beforeOrdinal: 3 }]);
  expect(edges[2]!.added).toEqual([{ id: oldId, afterOrdinal: 2 }]);
  expect(readSnapshotResourceStructure(b, c)!.edges[0]!.afterCount).toBe(2);
  expect(d.resources[2]!.amount).toBe(17);
});

test('late refusal and stale do not publish metadata; same-revision recovery does', () => {
  const { world, packet, accept, send } = harness(), a = send();
  world.resources.splice(1, 1); const good = packet(), bad = structuredClone(good);
  bad.world.relationships = { links: [], unexpected: true } as never;
  const refused = accept(bad);
  expect(refused.result).toEqual({ status: 'resync', reason: 'Liens, annonce ou souvenirs relationnels incohérents.' });
  expect(readSnapshotResourceStructure(a, bad.world as World)).toBeUndefined();
  expect(readSnapshotResourceStructure(a, a)).toEqual({ edges: [], tileIndices: [] });
  const b = accept(good).world!, before = readSnapshotResourceStructure(a, b);
  expect(before!.edges[0]!.removed).toHaveLength(1);
  expect(accept(good).result).toEqual({ status: 'stale' });
  expect(readSnapshotResourceStructure(a, b)).toEqual(before);
});

test('explicit order and mutated previous membership decline metadata while preserving historical reconstruction', () => {
  const h = harness(), a = h.send();
  h.world.resources.reverse(); const b = h.send();
  expect(readSnapshotResourceStructure(a, b)).toBeUndefined();
  h.world.resources[0]!.amount++; const c = h.send();
  expect(readSnapshotResourceStructure(b, c)!.edges[0]!.updated).toEqual([{ id: c.resources[0]!.id, afterOrdinal: 0 }]);
  // This deliberate external mutation establishes a new input boundary. The
  // legacy reconstruction reads that array and preserves its surviving order.
  const encoder = new SnapshotEncoder(), world = fixture(), decoder = new SnapshotDecoder();
  const initial = decoder.adopt(structuredClone(encoder.encode(world, 0, 6)));
  if (initial.status !== 'applied') throw Error(JSON.stringify(initial));
  const ids = initial.world.resources.map(resource => resource.id);
  initial.world.resources.reverse();
  const prior = structuredClone(initial.world);
  world.resources.splice(1, 1);
  const patch = asDelta(structuredClone(encoder.encode(world, 0, 6))), input = structuredClone(patch);
  expect(patch.resources).toEqual({ removed: [ids[1]], upserted: [] });
  const expected = structuredClone(world); expected.resources.reverse();
  const admitted = decoder.adopt(input);
  expect(input).toStrictEqual(patch);
  expect(initial.world).toStrictEqual(prior);
  expect(admitted.status).toBe('applied');
  if (admitted.status !== 'applied') throw Error(JSON.stringify(admitted));
  expect(admitted.world).toStrictEqual(expected);
  expect(admitted.world.resources.map(resource => resource.id)).toEqual([ids[2], ids[0]]);
  expect(readSnapshotResourceStructure(initial.world, admitted.world)).toBeUndefined();
});

test('checkpoint, gap, 64-edge eviction and primitive budget remain bounded conservative fallbacks', () => {
  const h = harness(), frames = [h.send()];
  for (let i = 0; i < 64; i++) { h.world.resources[0]!.amount++; frames.push(h.send()); }
  expect(readSnapshotResourceStructure(frames[0]!, frames[64]!)!.edges).toHaveLength(64);
  h.world.resources[0]!.amount++; const next = h.send();
  expect(readSnapshotResourceStructure(frames[0]!, next)).toBeUndefined();
  expect(readSnapshotResourceStructure(frames[1]!, next)!.edges).toHaveLength(64);
  const checkpoint = h.send(true);
  expect(readSnapshotResourceStructure(next, checkpoint)).toBeUndefined();
  const g = harness(), a = g.send(); g.world.resources[0]!.amount++; const missed = g.packet();
  g.world.resources[1]!.amount++; const ahead = g.packet();
  expect(g.accept(ahead).result).toEqual({ status: 'resync', reason: 'Snapshot intermédiaire manquant.' });
  const b = g.accept(missed).world!, c = g.accept(ahead).world!;
  expect(readSnapshotResourceStructure(a, c)!.edges).toHaveLength(2);
  expect(readSnapshotResourceStructure(b, c)!.edges).toHaveLength(1);
  const budget = harness(), base = budget.send();
  for (let i = 0; i < 512; i++) budget.world.resources.push({ id: budget.world.nextId++, kind: 'berries', x: i % 16, z: 2, amount: 10 });
  const huge = budget.send();
  expect(readSnapshotResourceStructure(base, huge)).toBeUndefined();
  budget.world.resources[0]!.amount++; const after = budget.send();
  expect(readSnapshotResourceStructure(huge, after)!.edges).toHaveLength(1);
});

test('resource id accessors/proxies retain the historical checkpoint trace without introspection traps', () => {
  const raw = fixture(), checkpoint = new SnapshotEncoder().encode(raw, 0, 6);
  if (checkpoint.kind !== 'checkpoint') throw Error('Expected initial checkpoint.');
  const input = structuredClone(checkpoint), events: string[] = [];
  const leaf = input.world.resources[0]!, id = leaf.id;
  Object.defineProperty(leaf, 'id', { enumerable: true, configurable: true, get() { events.push('get'); return id; } });
  input.world.resources[0] = new Proxy(leaf, { getOwnPropertyDescriptor(target, key) {
    if (key === 'id') { events.push('descriptor'); target.amount++; throw Error('An optimization must not query this descriptor.'); }
    return Reflect.getOwnPropertyDescriptor(target, key);
  } });
  const result = new SnapshotDecoder().adopt(input);
  // This fixture has no relationship/projectile/mechanical namespace. The two
  // historical reads are the vegetation guard and final resource reindex.
  expect(events).toEqual(['get', 'get']);
  expect(result.status).toBe('applied');
  if (result.status !== 'applied') throw Error(JSON.stringify(result));
  expect(result.world.resources.map(resource => resource.id)).toEqual(raw.resources.map(resource => resource.id));
  expect(result.world.resources[0]!.amount).toBe(raw.resources[0]!.amount);
});
