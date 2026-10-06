// Real transport publications and prepared geometry queries, separate from
// strict saved colonies and played simulation campaigns.
import { expect, test } from 'vitest';
import type { BufferAttribute } from 'three/webgpu';
import { SnapshotDecoder, SnapshotEncoder, readSnapshotChanges } from '../src/bridge/snapshots';
import { sameSnapshotChangeDomain } from '../src/bridge/snapshot-changes';
import { createWorld } from '../src/sim/engine';
import type { Resource, World } from '../src/sim/types';
import { GpuGroundGrassLayer, groundGrassPixels } from '../src/render/GpuGroundGrassLayer';
import { SceneResourceIndex, readSceneResourceFrame, type RockCoverEdit, type SceneResourceFrame } from '../src/render/scene-resource-index';

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
  const encoder = new SnapshotEncoder({ structureDelta: true }), decoder = new SnapshotDecoder();
  const history: Array<{ world: World; before: World; input: object; inputBefore: object }> = [];
  const send = (checkpoint = false): World => {
    const input = structuredClone(encoder.encode(producer, 0, 6, checkpoint)), inputBefore = structuredClone(input);
    const result = decoder.adopt(input); expect(result.status).toBe('applied');
    if (result.status !== 'applied') throw Error(JSON.stringify(result));
    expect(result.world).toStrictEqual(producer); expect(input).toStrictEqual(inputBefore);
    history.push({ world: result.world, before: structuredClone(result.world), input, inputBefore });
    return result.world;
  };
  return { send, verify: () => { for (const h of history) {
    expect(h.world).toStrictEqual(h.before); expect(h.input).toStrictEqual(h.inputBefore);
  } } };
}
function appearance(layer: GpuGroundGrassLayer) {
  const attribute = (name: string) => {
    const a = layer.mesh.geometry.getAttribute(name) as BufferAttribute;
    return { data: a.array, itemSize: a.itemSize, count: a.count, normalized: a.normalized,
      version: a.version, usage: a.usage, ranges: a.updateRanges.map(r => ({ ...r })) };
  };
  return {
    pixels: layer.map.image.data, width: layer.map.image.width, height: layer.map.image.height,
    mapVersion: layer.map.version, blood: layer.bloodMap.image.data, bloodVersion: layer.bloodMap.version,
    bloodWidth: layer.bloodMap.image.width, bloodHeight: layer.bloodMap.image.height,
    counts: layer['coverCounts'], blocked: layer['previousBlocked'], dirtyFlags: layer['dirtyFlags'], dirtyCells: layer['dirtyCells'],
    bloodCells: [...layer['blood'].cells], position: attribute('position'), normal: attribute('normal'), uv: attribute('uv'),
    index: layer.mesh.geometry.index!.array, indexVersion: layer.mesh.geometry.index!.version,
    drawRange: { ...layer.mesh.geometry.drawRange }, instances: layer.mesh.geometry.instanceCount,
    visible: layer.mesh.visible, bounds: layer.mesh.geometry.boundingSphere,
  };
}
function compare(candidate: GpuGroundGrassLayer, reference: GpuGroundGrassLayer, world: World) {
  expect(appearance(candidate)).toStrictEqual(appearance(reference));
  expect(candidate.map.image.data).toStrictEqual(groundGrassPixels(world));
}
function balances(width: number, before: readonly Resource[], after: readonly Resource[]) {
  const cells = new Map<number, number>();
  const add = (cell: number, delta: number) => cells.set(cell, (cells.get(cell) ?? 0) + delta);
  for (const r of before) if (r.kind === 'rock') add(r.z * width + r.x, -1);
  for (const r of after) if (r.kind === 'rock') add(r.z * width + r.x, 1);
  return [...cells].filter(([, value]) => value !== 0).sort(([a], [b]) => a - b);
}
function editBalances(edits: readonly RockCoverEdit[]) {
  const cells = new Map<number, number>();
  for (const edit of edits) {
    if (edit.before !== undefined) cells.set(edit.before, (cells.get(edit.before) ?? 0) - 1);
    if (edit.after !== undefined) cells.set(edit.after, (cells.get(edit.after) ?? 0) + 1);
  }
  return [...cells].filter(([, value]) => value !== 0).sort(([a], [b]) => a - b);
}

test('full admitted membership captures preserve exact rock multisets and overlapping occupants', () => {
  const producer = camp(), published = publisher(producer), index = new SceneResourceIndex();
  producer.structures.push({ id: producer.nextId++, kind: 'wall', x: 2, z: 3, orientation: 0, footprint: 'standard' });
  producer.piles.push({ id: producer.nextId++, kind: 'wood', item: 'wood', quantity: 1, owner: { type: 'ground', x: 2, z: 3 } });
  producer.packed.push({ building: { id: producer.nextId++, kind: 'stool', x: 2, z: 3, orientation: 0, footprint: 'standard' },
    owner: { type: 'ground', x: 2, z: 3 } });
  const candidate = new GpuGroundGrassLayer(), reference = new GpuGroundGrassLayer();
  const map = candidate.map, bloodMap = candidate.bloodMap, mesh = candidate.mesh, geometry = candidate.mesh.geometry;
  const held: Array<{ edits: readonly RockCoverEdit[]; before: readonly RockCoverEdit[] }> = [];
  let previous: World | undefined;
  const apply = (full = false, empty = false) => {
    const world = published.send(), frame = index.adopt(world), access = readSceneResourceFrame(frame, world, previous);
    if (!previous) expect(access?.rockCoverEdits).toBeUndefined();
    else {
      expect(sameSnapshotChangeDomain(previous, world)).toBe(true);
      if (full) expect(readSnapshotChanges(previous, world)).toBeUndefined();
      const edits = access?.rockCoverEdits; expect(edits).toBeDefined();
      if (!edits) throw Error('Full capture did not provide an admitted balance');
      expect(editBalances(edits)).toStrictEqual(balances(world.width, previous.resources, world.resources));
      if (empty) expect(edits).toStrictEqual([]);
      held.push({ edits, before: structuredClone(edits) });
    }
    candidate.update(world, false, undefined, frame); reference.update(world); compare(candidate, reference, world);
    expect(candidate.map).toBe(map); expect(candidate.bloodMap).toBe(bloodMap);
    expect(candidate.mesh).toBe(mesh); expect(candidate.mesh.geometry).toBe(geometry);
    previous = world; return world;
  };
  try {
    apply(); const cell = 3 * producer.width + 2;
    expect(candidate['coverCounts'][cell]).toBe(5);
    const stableVersion = candidate.map.version;
    producer.resources.push({ id: producer.nextId++, kind: 'tree', x: 9, z: 9, amount: 30 }); apply(true, true);
    producer.resources.reverse(); apply(true, true); expect(candidate.map.version).toBe(stableVersion);
    const rocks = producer.resources.filter(r => r.kind === 'rock');
    producer.resources = producer.resources.filter(r => r.id !== rocks[0]!.id); apply(true);
    expect(candidate['coverCounts'][cell]).toBe(4); expect(candidate.map.version).toBe(stableVersion);
    producer.resources.find(r => r.id === rocks[1]!.id)!.x = 8; apply();
    expect(candidate['coverCounts'][cell]).toBe(3); expect(candidate['coverCounts'][3 * producer.width + 8]).toBe(1);
    producer.resources.find(r => r.id === rocks[1]!.id)!.kind = 'tree'; apply();
    expect(candidate['coverCounts'][3 * producer.width + 8]).toBe(0);
    producer.resources.push({ id: producer.nextId++, kind: 'rock', x: 2, z: 3, amount: 20 }); apply(true);
    expect(candidate['coverCounts'][cell]).toBe(4);
    // Replacement identity and reorder both force a full capture, while the
    // occupied-cell multiset is unchanged; no phantom remove/add is needed.
    const replacement = producer.resources.find(r => r.kind === 'rock')!;
    producer.resources = producer.resources.filter(r => r.id !== replacement.id);
    producer.resources.unshift({ ...replacement, id: producer.nextId++ }); apply(true, true);
    producer.structures = []; apply(); producer.piles = []; apply(); producer.packed = []; apply();
    expect(candidate['coverCounts'][cell]).toBe(1);
    producer.resources = producer.resources.filter(r => r.kind !== 'rock'); apply(true);
    expect(candidate['coverCounts'][cell]).toBe(0);
    expect((candidate.map.image.data as Uint8Array)[cell * 4 + 3]).toBe(255);
    for (const h of held) expect(h.edits).toStrictEqual(h.before);
    expect(producer.tick).toBe(0); published.verify();
  } finally { candidate.dispose(); reference.dispose(); }
});

test('empty full rock balances still adopt same-tick blood and terrain with exact GPU versions', () => {
  const producer = camp(), published = publisher(producer), index = new SceneResourceIndex();
  const candidate = new GpuGroundGrassLayer(), reference = new GpuGroundGrassLayer();
  let previous: World | undefined;
  const apply = (tiles?: readonly number[]) => {
    const world = published.send(), frame = index.adopt(world), access = readSceneResourceFrame(frame, world, previous);
    if (previous) { expect(readSnapshotChanges(previous, world)).toBeUndefined(); expect(access?.rockCoverEdits).toStrictEqual([]); }
    candidate.update(world, false, tiles, frame); reference.update(world, false, tiles); compare(candidate, reference, world);
    previous = world;
  };
  const birth = () => producer.resources.push({ id: producer.nextId++, kind: 'tree', x: 1, z: 1, amount: 30 });
  try {
    apply(); const stableMap = candidate.map.version, stableBlood = candidate.bloodMap.version;
    const pixels = candidate.map.image.data, blood = candidate.bloodMap.image.data;
    birth(); apply(); expect(candidate.map.version).toBe(stableMap); expect(candidate.bloodMap.version).toBe(stableBlood);
    producer.filth!.items.push({ id: producer.nextId++, kind: 'blood', x: 12, z: 12, thickness: 3,
      grownCore: 0, expiresAfterCore: 1_000_000, nextCheckCore: 100 }); birth(); apply();
    const words = Uint32Array.from(candidate.bloodMap.image.data as Uint32Array);
    expect(words.some(word => word !== 0)).toBe(true);
    const cleanCell = 14 * producer.width + 6, oldRgb = (candidate.map.image.data as Uint8Array).slice(cleanCell * 4, cleanCell * 4 + 3);
    producer.tiles[cleanCell] = { terrain: 'rich-soil' }; birth(); apply([cleanCell]);
    expect((candidate.map.image.data as Uint8Array).slice(cleanCell * 4, cleanCell * 4 + 3)).not.toStrictEqual(oldRgb);
    expect(candidate['previousBlocked'][cleanCell]).toBe(0); expect(candidate.bloodMap.image.data).toStrictEqual(words);
    producer.tiles[cleanCell] = { terrain: 'rich-soil', floor: 'wood-planks' }; birth(); apply([cleanCell]);
    expect(candidate['previousBlocked'][cleanCell]).toBe(1);
    producer.tiles[cleanCell] = { terrain: 'rich-soil' }; birth(); apply([cleanCell]);
    producer.filth!.items[0]!.thickness = 1; birth(); apply(); producer.filth!.items = []; birth(); apply();
    expect(Array.from(candidate.bloodMap.image.data as Uint32Array).every(word => word === 0)).toBe(true);
    expect(candidate.map.image.data).toBe(pixels); expect(candidate.bloodMap.image.data).toBe(blood);
    expect(producer.tick).toBe(0); published.verify();
  } finally { candidate.dispose(); reference.dispose(); }
});

test('full balances keep exact predecessor and publication ownership across fallback and recovery', () => {
  const producer = camp(), published = publisher(producer), index = new SceneResourceIndex();
  const candidate = new GpuGroundGrassLayer(), reference = new GpuGroundGrassLayer();
  const apply = (world: World, frame: SceneResourceFrame, forceReference = false) => {
    candidate.update(world, false, undefined, frame); reference.update(world, forceReference); compare(candidate, reference, world);
  };
  try {
    const a = published.send(), first = index.adopt(a); apply(a, first);
    producer.resources.push({ id: producer.nextId++, kind: 'tree', x: 9, z: 9, amount: 30 });
    const b = published.send(), frameB = index.adopt(b);
    expect(readSceneResourceFrame(frameB, b, a)?.rockCoverEdits).toStrictEqual([]); // Grass deliberately does not apply B.
    producer.resources = producer.resources.filter(r => r.id !== a.resources[0]!.id);
    const c = published.send(), frameC = index.adopt(c);
    expect(readSceneResourceFrame(frameC, c, a)).toBeUndefined();
    expect(readSceneResourceFrame(frameC, c, b)?.rockCoverEdits).toBeDefined(); apply(c, frameC);
    expect(candidate['coverCounts'][3 * producer.width + 2]).toBe(1);
    const checkpoint = published.send(true), checkpointFrame = index.adopt(checkpoint);
    expect(sameSnapshotChangeDomain(c, checkpoint)).toBe(false);
    expect(readSceneResourceFrame(checkpointFrame, checkpoint, c)?.rockCoverEdits).toBeUndefined(); apply(checkpoint, checkpointFrame);
    producer.resources.push({ id: producer.nextId++, kind: 'tree', x: 10, z: 9, amount: 30 });
    const recovered = published.send(), recoveredFrame = index.adopt(recovered);
    expect(readSceneResourceFrame(recoveredFrame, recovered, checkpoint)?.rockCoverEdits).toStrictEqual([]); apply(recovered, recoveredFrame);
    // Two independently admitted Worlds each have a self-witness. That does
    // not prove a common journal/generation, even with identical values/tick.
    const other = publisher(producer), foreign = other.send();
    expect(readSnapshotChanges(recovered, recovered)).toBeDefined(); expect(readSnapshotChanges(foreign, foreign)).toBeDefined();
    expect(readSnapshotChanges(recovered, foreign)).toBeUndefined();
    expect(sameSnapshotChangeDomain(recovered, foreign)).toBe(false);
    const foreignFrame = index.adopt(foreign);
    expect(readSceneResourceFrame(foreignFrame, foreign, recovered)?.rockCoverEdits).toBeUndefined(); apply(foreign, foreignFrame);
    const repeat = index.adopt(foreign);
    expect(readSceneResourceFrame(repeat, foreign, foreign)?.rockCoverEdits).toBeUndefined(); apply(foreign, repeat);
    const mutable = structuredClone(foreign); mutable.resources.find(r => r.kind === 'rock')!.x = 8;
    const mutableFrame = index.adopt(mutable);
    expect(readSnapshotChanges(mutable, mutable)).toBeUndefined();
    expect(readSceneResourceFrame(mutableFrame, mutable, foreign)?.rockCoverEdits).toBeUndefined(); apply(mutable, mutableFrame, true);
    mutable.resources.find(r => r.kind === 'rock')!.z = 8;
    const sameObject = index.adopt(mutable);
    expect(readSceneResourceFrame(sameObject, mutable, mutable)?.rockCoverEdits).toBeUndefined(); apply(mutable, sameObject, true);
    expect(readSceneResourceFrame({} as SceneResourceFrame, mutable, mutable)).toBeUndefined();
    apply(mutable, {} as SceneResourceFrame, true); published.verify(); other.verify();
  } finally { candidate.dispose(); reference.dispose(); }
});
