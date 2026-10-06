import { expect, test } from 'vitest';
import * as facade from '../src/bridge/snapshot-changes.ts';
import * as snapshots from '../src/bridge/snapshots.ts';
import { readSnapshotChanges } from '../src/bridge/snapshot-changes.ts';
import { SnapshotDecoder, SnapshotEncoder, type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { createWorld } from '../src/sim/index.ts';
import type { World } from '../src/sim/types.ts';

type Delta = Extract<SnapshotMessage, { kind: 'delta' }>;
function fixture(): World {
  const world = createWorld(911, 16, 16);
  world.tick = 2000;
  world.resources = [0, 1, 2].map<World['resources'][number]>(index => ({ id: world.nextId++, kind: 'berries',
    x: index + 2, z: 2, amount: 10, growth: .3 + index / 10, growthTick: 1900 }));
  for (const index of [0, 2, 7]) world.tiles[index] = { terrain: 'soil' };
  return world;
}
function adopt(decoder: SnapshotDecoder, packet: SnapshotMessage): World {
  const result = decoder.adopt(packet);
  expect(result.status).toBe('applied');
  if (result.status !== 'applied') throw Error(JSON.stringify(result));
  return result.world;
}
function delta(packet: SnapshotMessage): Delta {
  expect(packet.kind).toBe('delta');
  if (packet.kind !== 'delta') throw Error('Expected delta.');
  return packet;
}
function harness() {
  const world = fixture(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const packet = (checkpoint = false) => structuredClone(encoder.encode(world, 0, 6, checkpoint));
  const send = (checkpoint = false) => {
    const accepted = adopt(decoder, packet(checkpoint));
    expect(accepted).toStrictEqual(world);
    return accepted;
  };
  return { world, encoder, decoder, packet, send };
}

test('read-only exports cannot manufacture an accepted World witness', () => {
  expect(Object.keys(facade)).toEqual(['readSnapshotChanges', 'sameSnapshotChangeDomain']);
  expect('SnapshotChangeJournal' in snapshots).toBe(false);
  const { world, decoder, send } = harness(), initial = send();
  expect('snapshotChanges' in decoder).toBe(false); // The capability is a runtime private field.
  expect(readSnapshotChanges(initial, initial)).toEqual({ resourceIndices: [], tileIndices: [] });
  expect(readSnapshotChanges(world, initial)).toBeUndefined();
  expect(readSnapshotChanges(initial, structuredClone(initial))).toBeUndefined();
  expect(readSnapshotChanges(structuredClone(initial), structuredClone(initial))).toBeUndefined();
  expect(facade.sameSnapshotChangeDomain(initial, initial)).toBe(true);
  expect(facade.sameSnapshotChangeDomain(world, initial)).toBe(false);
  expect(facade.sameSnapshotChangeDomain(initial, structuredClone(initial))).toBe(false);
  expect(readSnapshotChanges(world, world)).toBeUndefined(); // Neither reader creates a witness.
  const foreign = adopt(new SnapshotDecoder(), structuredClone(new SnapshotEncoder().encode(world, 0, 6)));
  expect(readSnapshotChanges(initial, foreign)).toBeUndefined();
  expect(facade.sameSnapshotChangeDomain(initial, foreign)).toBe(false);
});

test('packed growth and source upserts expose sorted private slots and preserve old frames', () => {
  const { world, decoder, packet, send } = harness(), initial = send(), before = structuredClone(initial);
  world.resources[2]!.amount++;
  world.resources[0]!.growth = .3123456789012345;
  world.resources[0]!.growthTick = 1999;
  world.tiles[7]!.floor = 'wood-planks';
  world.tiles[0]!.floor = 'wood-planks';
  const patch = delta(packet());
  expect(patch.resources!.upserted.map(resource => resource.id)).toEqual([world.resources[2]!.id]);
  expect(patch.resources!.growth).toBeInstanceOf(Float64Array);
  const next = adopt(decoder, patch), hints = readSnapshotChanges(initial, next)!;
  expect(hints).toEqual({ resourceIndices: [0, 2], tileIndices: [0, 7] });
  expect(Object.isFrozen(hints)).toBe(true);
  expect(Object.isFrozen(hints.resourceIndices)).toBe(true);
  expect(Object.isFrozen(hints.tileIndices)).toBe(true);
  expect(() => (hints.resourceIndices as number[]).push(99)).toThrow();
  expect(next).toStrictEqual(world);
  expect(initial).toStrictEqual(before);
  expect(readSnapshotChanges(initial, next)).toEqual(hints);
  // The ring owns copies of indices, not the source transport tuples/buffer.
  patch.tiles![0]![0] = 200;
  patch.resources!.growth![0] = 999999;
  expect(readSnapshotChanges(initial, next)).toEqual(hints);
  expect(initial).toStrictEqual(before);
});

test('the complete accepted suffix composes skipped presentations with unique source order', () => {
  const { world, send } = harness(), a = send();
  world.resources[2]!.amount++; world.tiles[7]!.floor = 'wood-planks';
  const b = send();
  world.resources[0]!.amount++; world.resources[2]!.amount++;
  world.tiles[2]!.floor = 'wood-planks'; world.tiles[7]!.floor = 'burned-wood';
  const c = send(), unchanged = send();
  expect(readSnapshotChanges(a, c)).toEqual({ resourceIndices: [0, 2], tileIndices: [2, 7] });
  expect(readSnapshotChanges(b, c)).toEqual({ resourceIndices: [0, 2], tileIndices: [2, 7] });
  expect(readSnapshotChanges(c, unchanged)).toEqual({ resourceIndices: [], tileIndices: [] });
  expect(readSnapshotChanges(a, unchanged)).toEqual(readSnapshotChanges(a, c));
  expect(readSnapshotChanges(c, a)).toBeUndefined();
  expect(a.tick).toBe(c.tick); // Same-tick commands still produce real revisions.
});

test.each([false, true])('late relationship refusal and stale packets publish nothing (checkpoint=%s)', checkpoint => {
  const { world, decoder, packet, send } = harness(), a = send();
  world.resources[1]!.amount++; const b = send();
  const priorHints = readSnapshotChanges(a, b);
  world.resources[0]!.amount++; world.tiles[2]!.floor = 'wood-planks';
  const good = packet(checkpoint), bad = structuredClone(good);
  // This final guard runs after terrain/resource reconstruction and planet preparation.
  bad.world.relationships = { links: [], unexpected: true } as never;
  expect(decoder.adopt(bad)).toEqual({ status: 'resync', reason: 'Liens, annonce ou souvenirs relationnels incohérents.' });
  expect(readSnapshotChanges(b, bad.world as World)).toBeUndefined();
  expect(readSnapshotChanges(a, b)).toEqual(priorHints);
  const c = adopt(decoder, good);
  expect(c).toStrictEqual(world);
  if (checkpoint) expect(readSnapshotChanges(a, c)).toBeUndefined();
  else expect(readSnapshotChanges(a, c)).toEqual({ resourceIndices: [0, 1], tileIndices: [2] });
  const acceptedHints = readSnapshotChanges(c, c);
  expect(decoder.adopt(good)).toEqual({ status: 'stale' });
  expect(readSnapshotChanges(c, c)).toEqual(acceptedHints);
});

test.each(['reorder', 'remove', 'add'] as const)('resource %s forces full read, then the next stable suffix starts afresh', operation => {
  const { world, send } = harness(), a = send();
  if (operation === 'reorder') world.resources.reverse();
  else if (operation === 'remove') world.resources.splice(1, 1);
  else world.resources.push({ id: world.nextId++, kind: 'berries', x: 5, z: 2, amount: 10 });
  world.tiles[0]!.floor = 'wood-planks';
  const b = send();
  expect(readSnapshotChanges(a, b)).toBeUndefined();
  world.resources[0]!.amount++; world.tiles[2]!.floor = 'wood-planks';
  const c = send();
  expect(readSnapshotChanges(a, c)).toBeUndefined();
  expect(readSnapshotChanges(b, c)).toEqual({ resourceIndices: [0], tileIndices: [2] });
});

test('an explicit order stays conservative even when its values happen to be unchanged', () => {
  const { world, decoder, packet, send } = harness(), a = send();
  world.resources[2]!.amount++;
  const patch = delta(packet());
  patch.resources!.order = world.resources.map(resource => resource.id);
  const b = adopt(decoder, patch);
  expect(b).toStrictEqual(world);
  expect(readSnapshotChanges(a, b)).toBeUndefined();
  world.resources[1]!.amount++;
  expect(readSnapshotChanges(b, send())).toEqual({ resourceIndices: [1], tileIndices: [] });
});

test('same-epoch checkpoint and replacement invalidate old anchors without altering Worlds', () => {
  const { world, encoder, decoder, send } = harness(), a = send(), frozen = structuredClone(a);
  world.resources[0]!.amount++; const b = send(), checkpoint = send(true);
  expect(readSnapshotChanges(a, b)).toBeUndefined();
  expect(readSnapshotChanges(b, checkpoint)).toBeUndefined();
  world.resources[1]!.amount++; const after = send();
  expect(readSnapshotChanges(checkpoint, after)).toEqual({ resourceIndices: [1], tileIndices: [] });
  const replacement = createWorld(912, 32, 32);
  const loaded = adopt(decoder, structuredClone(encoder.encode(replacement, 0, 6)));
  expect(readSnapshotChanges(after, loaded)).toBeUndefined();
  expect(readSnapshotChanges(checkpoint, after)).toBeUndefined();
  expect(a).toStrictEqual(frozen);
});

test('missing deltas never create a partial suffix and checkpoint recovery remains strict', () => {
  const { world, decoder, packet, send } = harness(), a = send();
  world.resources[0]!.amount++; const missed = packet();
  world.resources[1]!.amount++; const ahead = packet();
  expect(decoder.adopt(ahead)).toEqual({ status: 'resync', reason: 'Snapshot intermédiaire manquant.' });
  expect(readSnapshotChanges(a, ahead.world as World)).toBeUndefined();
  const b = adopt(decoder, missed), c = adopt(decoder, ahead);
  expect(readSnapshotChanges(a, c)).toEqual({ resourceIndices: [0, 1], tileIndices: [] });
  expect(readSnapshotChanges(b, c)).toEqual({ resourceIndices: [1], tileIndices: [] });
  const recovered = send(true);
  expect(readSnapshotChanges(a, recovered)).toBeUndefined();
});

test('exactly 64 retained edges compose, eviction falls back and refusal consumes no slot', () => {
  const { world, decoder, packet, send } = harness(), frames = [send()];
  for (let index = 0; index < 64; index++) {
    world.resources[0]!.amount = index % 2 ? 10 : 11;
    frames.push(send());
  }
  expect(readSnapshotChanges(frames[0]!, frames[64]!)).toEqual({ resourceIndices: [0], tileIndices: [] });
  world.resources[0]!.amount = 11;
  const good = packet(), bad = structuredClone(good);
  bad.world.relationships = { links: [], unexpected: true } as never;
  expect(decoder.adopt(bad).status).toBe('resync');
  expect(readSnapshotChanges(frames[0]!, frames[64]!)).toBeDefined();
  frames.push(adopt(decoder, good));
  expect(readSnapshotChanges(frames[0]!, frames[65]!)).toBeUndefined();
  expect(readSnapshotChanges(frames[1]!, frames[65]!)).toEqual({ resourceIndices: [0], tileIndices: [] });
  expect(readSnapshotChanges(frames[64]!, frames[65]!)).toEqual({ resourceIndices: [0], tileIndices: [] });
});
