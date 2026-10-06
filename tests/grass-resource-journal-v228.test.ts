import { expect, test } from 'vitest';
import { SnapshotDecoder, SnapshotEncoder } from '../src/bridge/snapshots';
import { createWorld } from '../src/sim/engine';
import type { World } from '../src/sim/types';
import { GpuGroundGrassLayer, groundGrassPixels } from '../src/render/GpuGroundGrassLayer';
import { SceneResourceIndex, type SceneResourceFrame } from '../src/render/scene-resource-index';

function camp(): World {
  const world = createWorld(228, 16, 16);
  world.tiles = world.tiles.map(() => ({ terrain: 'soil' }));
  world.structures = []; world.piles = []; world.packed = []; world.jobs = [];
  world.resources = [
    { id: world.nextId++, kind: 'rock', x: 2, z: 3, amount: 20 },
    { id: world.nextId++, kind: 'rock', x: 2, z: 3, amount: 20 },
    { id: world.nextId++, kind: 'tree', x: 4, z: 3, amount: 20 },
  ];
  world.filth = { rng: 17, items: [], cleaned: 0 };
  return world;
}

function publisher(producer: World) {
  const encoder = new SnapshotEncoder({ structureDelta: true, minimumStructures: 0 });
  const decoder = new SnapshotDecoder();
  const history: Array<{ world: World; before: World }> = [];
  const send = (checkpoint = false): World => {
    const packet = structuredClone(encoder.encode(producer, 0, 6, checkpoint));
    const packetBefore = structuredClone(packet), result = decoder.adopt(packet);
    expect(result.status).toBe('applied');
    if (result.status !== 'applied') throw Error(JSON.stringify(result));
    expect(result.world).toStrictEqual(producer); expect(packet).toStrictEqual(packetBefore);
    history.push({ world: result.world, before: structuredClone(result.world) });
    return result.world;
  };
  return { send, verifyHistory: () => { for (const entry of history) expect(entry.world).toStrictEqual(entry.before); } };
}

function appearance(layer: GpuGroundGrassLayer) {
  return {
    pixels: layer.map.image.data, width: layer.map.image.width, height: layer.map.image.height,
    mapVersion: layer.map.version, bloodVersion: layer.bloodMap.version, blood: layer.bloodMap.image.data,
    counts: layer['coverCounts'], blocked: layer['previousBlocked'], dirtyFlags: layer['dirtyFlags'],
    dirtyCells: layer['dirtyCells'], bloodCells: [...layer['blood'].cells],
    positions: layer.mesh.geometry.getAttribute('position').array,
    normals: layer.mesh.geometry.getAttribute('normal').array,
    index: layer.mesh.geometry.index!.array, count: layer.mesh.geometry.instanceCount,
    visible: layer.mesh.visible, bounds: layer.mesh.geometry.boundingSphere,
  };
}

function compare(candidate: GpuGroundGrassLayer, reference: GpuGroundGrassLayer, world: World) {
  expect(appearance(candidate)).toStrictEqual(appearance(reference));
  expect(candidate.map.image.data).toStrictEqual(groundGrassPixels(world));
}

test('confirmed rock contributions preserve overlaps, surface and blood updates at the same tick', () => {
  const producer = camp(), { send, verifyHistory } = publisher(producer);
  producer.structures.push({ id: producer.nextId++, kind: 'wall', x: 2, z: 3, orientation: 0, footprint: 'standard' });
  producer.piles.push({ id: producer.nextId++, kind: 'wood', item: 'wood', quantity: 1, owner: { type: 'ground', x: 2, z: 3 } });
  producer.packed.push({ building: { id: producer.nextId++, kind: 'stool', x: 2, z: 3, orientation: 0, footprint: 'standard' },
    owner: { type: 'ground', x: 2, z: 3 } });
  const index = new SceneResourceIndex(), candidate = new GpuGroundGrassLayer(), reference = new GpuGroundGrassLayer();
  const map = candidate.map, bloodMap = candidate.bloodMap, mesh = candidate.mesh;
  const apply = (reset = false, tiles?: readonly number[]) => {
    const world = send(reset), before = structuredClone(world), frame = index.adopt(world, reset);
    candidate.update(world, reset, tiles, frame); reference.update(world, reset, tiles);
    compare(candidate, reference, world); expect(world).toStrictEqual(before);
    expect(candidate.map).toBe(map); expect(candidate.bloodMap).toBe(bloodMap); expect(candidate.mesh).toBe(mesh);
    return world;
  };
  try {
    apply(true); const cell = 3 * producer.width + 2;
    expect(candidate['coverCounts'][cell]).toBe(5);
    producer.resources[0]!.amount--; apply();
    producer.resources[0]!.x = 5; apply();
    expect(candidate['coverCounts'][cell]).toBe(4);
    producer.resources[1]!.kind = 'tree'; apply();
    expect(candidate['coverCounts'][cell]).toBe(3);
    producer.structures = []; apply(); producer.piles = []; apply();
    expect((candidate.map.image.data as Uint8Array)[cell * 4 + 3]).toBe(0);
    producer.packed = []; apply();
    expect((candidate.map.image.data as Uint8Array)[cell * 4 + 3]).toBe(255);
    producer.resources[2]!.kind = 'rock'; apply();
    producer.filth!.items.push({ id: producer.nextId++, x: 2, z: 3, kind: 'blood', thickness: 3,
      grownCore: 0, expiresAfterCore: 1_000_000, nextCheckCore: 100 });
    apply(); const stained = Uint32Array.from(candidate.bloodMap.image.data as Uint32Array);
    expect(stained.some(word => word !== 0)).toBe(true);
    producer.tiles[cell] = { terrain: 'soil', floor: 'wood-planks' }; apply(false, [cell]);
    expect(candidate.bloodMap.image.data).toStrictEqual(stained);
    producer.tiles[cell] = { terrain: 'soil' }; apply(false, [cell]);
    producer.filth!.items[0]!.thickness = 1; apply(); producer.filth!.items = []; apply();
    expect(Array.from(candidate.bloodMap.image.data as Uint32Array).every(word => word === 0)).toBe(true);
    expect(producer.tick).toBe(0); verifyHistory();
  } finally { candidate.dispose(); reference.dispose(); }
});

test('resource deltas cannot be borrowed from a predecessor the grass layer did not apply', () => {
  const producer = camp(), { send, verifyHistory } = publisher(producer);
  const index = new SceneResourceIndex(), candidate = new GpuGroundGrassLayer(), reference = new GpuGroundGrassLayer();
  try {
    const a = send(), frameA = index.adopt(a, true);
    candidate.update(a, true, undefined, frameA); reference.update(a, true);
    producer.resources[0]!.x = 7; const b = send(); index.adopt(b);
    // The index sees B, but this grass layer still owns A's coverage counts.
    producer.resources[1]!.amount--; const c = send(), frameC = index.adopt(c);
    candidate.update(c, false, undefined, frameC); reference.update(c);
    compare(candidate, reference, c);
    expect(candidate['coverCounts'][3 * producer.width + 7]).toBe(1);
    expect(candidate['coverCounts'][3 * producer.width + 2]).toBe(1);
    // A no-op resource publication may take the early return; the accepted
    // World must still become this layer's next contribution predecessor.
    producer.tick++; const d = send(), frameD = index.adopt(d);
    candidate.update(d, false, undefined, frameD); reference.update(d); compare(candidate, reference, d);
    producer.resources[0]!.z = 8; const e = send(), frameE = index.adopt(e);
    candidate.update(e, false, undefined, frameE); reference.update(e); compare(candidate, reference, e);
    candidate.update(e, false, undefined, frameE); reference.update(e); compare(candidate, reference, e);
    verifyHistory();
  } finally { candidate.dispose(); reference.dispose(); }
});

test('unknown membership, checkpoints, mutable and forged contexts retain full coverage recovery', () => {
  const producer = camp(), { send, verifyHistory } = publisher(producer);
  const index = new SceneResourceIndex(), candidate = new GpuGroundGrassLayer(), reference = new GpuGroundGrassLayer();
  const apply = (checkpoint = false) => {
    const world = send(checkpoint), frame = index.adopt(world);
    candidate.update(world, false, undefined, frame); reference.update(world); compare(candidate, reference, world);
    return world;
  };
  try {
    apply(); producer.resources.reverse(); apply();
    producer.resources.splice(1, 1); apply();
    producer.resources.push({ id: producer.nextId++, kind: 'rock', x: 8, z: 8, amount: 3 }); apply();
    const confirmed = apply(true), mutable = structuredClone(confirmed);
    candidate.update(mutable, false, undefined, index.adopt(mutable)); reference.update(mutable, true);
    compare(candidate, reference, mutable);
    mutable.resources.find(r => r.kind === 'rock')!.x = 11;
    const before = structuredClone(mutable);
    candidate.update(mutable, false, undefined, index.adopt(mutable)); reference.update(mutable, true);
    compare(candidate, reference, mutable); expect(mutable).toStrictEqual(before);
    mutable.resources.find(r => r.kind === 'rock')!.z = 10;
    candidate.update(mutable, false, undefined, {} as SceneResourceFrame); reference.update(mutable, true);
    compare(candidate, reference, mutable);
    // A duplicate raw owner remains a query fixture, not a strict-save claim.
    // Neither an absent publication witness nor a forged context may certify it.
    mutable.resources.push({ ...mutable.resources.find(r => r.kind === 'rock')!, x: 12 });
    candidate.update(mutable, false, undefined, index.adopt(mutable)); reference.update(mutable, true);
    compare(candidate, reference, mutable); verifyHistory();
  } finally { candidate.dispose(); reference.dispose(); }
});

test('expired contexts recover cover and keep the device guard ahead of every collection read', async () => {
  const producer = camp(), { send } = publisher(producer);
  const index = new SceneResourceIndex(), candidate = new GpuGroundGrassLayer(), reference = new GpuGroundGrassLayer();
  const limited = new GpuGroundGrassLayer(undefined, 2048);
  try {
    const a = send(), frameA = index.adopt(a, true);
    candidate.update(a, true, undefined, frameA); reference.update(a, true);
    producer.resources[0]!.x = 9; const b = send(), frameB = index.adopt(b);
    await Promise.resolve();
    candidate.update(b, false, undefined, frameB); reference.update(b); compare(candidate, reference, b);
    const image = limited.bloodMap.image, version = limited.bloodMap.version;
    limited.update({ width: 250, height: 250 } as World, false, undefined, {} as SceneResourceFrame);
    expect(limited.bloodMap.image).toBe(image); expect(limited.bloodMap.version).toBe(version);
    expect(limited.mesh.visible).toBe(false); expect(limited.mesh.geometry.instanceCount).toBe(0);
  } finally { candidate.dispose(); reference.dispose(); limited.dispose(); }
});
