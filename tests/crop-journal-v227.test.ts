import { expect, test } from 'vitest';
import { SnapshotDecoder, SnapshotEncoder } from '../src/bridge/snapshots';
import { CropPresentationPartition } from '../src/render/crop-presentation-partition';
import { createWorld } from '../src/sim/index';
import { RESIDENT_CROP_KINDS } from '../src/render/flora-presentation';
import type { World } from '../src/sim/types';
import { MeshStandardNodeMaterial, type InstancedMesh } from 'three/webgpu';
import { CropLayer } from '../src/render/CropLayer';
import { CropLayer as ReferenceCropLayer } from './scenarios/crop-layer-baseline-v224';

test('crop membership and current references match ordered full filters across confirmed and unknown suffixes', () => {
  const producer = createWorld(227, 32, 32);
  producer.resources = [];
  for (let row = 0; row < 4; row++) for (const [column, kind] of [...RESIDENT_CROP_KINDS, 'tree' as const].entries()) {
    producer.resources.push({ id: producer.nextId++, kind, x: 5 + column, z: 5 + row, amount: 8 });
  }
  const encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder(), partition = new CropPresentationPartition();
  const send = (checkpoint = false) => {
    const result = decoder.adopt(structuredClone(encoder.encode(producer, 0, 6, checkpoint)));
    if (result.status !== 'applied') throw Error(JSON.stringify(result));
    expect(result.world).toStrictEqual(producer);
    return result.world;
  };
  const check = (world: World, reset = false, immutable = true) => {
    const before = structuredClone(world), result = partition.read(world, reset, immutable);
    for (const kind of RESIDENT_CROP_KINDS) {
      const expected = world.resources.filter(resource => resource.kind === kind);
      expect(result[kind]).toStrictEqual(expected);
      for (let index = 0; index < expected.length; index++) expect(result[kind][index]).toBe(expected[index]);
    }
    expect(world).toStrictEqual(before);
  };
  const first = send(); check(first, true); check(first);
  producer.resources[2]!.amount++; send();
  producer.resources[1]!.x++; const changed = send(); check(changed);
  producer.resources[4]!.amount++; check(send());
  producer.resources[0]!.kind = 'corn'; check(send());
  producer.resources[4]!.kind = 'rice'; check(send());
  producer.resources[4]!.kind = 'tree'; check(send());
  producer.resources.reverse(); check(send());
  producer.resources.splice(3, 1); check(send());
  check(send(true));
  for (let tick = 0; tick < 66; tick++) send();
  producer.resources[1]!.amount++; check(send());
  const mutable = structuredClone(producer); check(mutable, false, false);
  mutable.resources[0]!.kind = 'potato'; check(mutable, false, false);
  mutable.resources.reverse(); check(mutable, false, false);
  // An unconfirmed identity with a public boolean still takes the full path.
  check(mutable); mutable.resources[0]!.kind = 'cotton'; check(mutable);
  check(send()); check(send(true), true);
  expect(first.resources[2]!.amount).toBe(8);
});

test('confirmed crop partition preserves resident matrices, colors, slots, uploads and bounds', () => {
  const world = createWorld(228, 16, 16);
  world.tiles = world.tiles.map(() => ({ terrain: 'grass' })); world.resources = [];
  for (const [index, kind] of RESIDENT_CROP_KINDS.entries()) {
    world.resources.push({ id: world.nextId++, kind, x: 5 + index, z: 5, amount: 8, growth: .2, growthTick: 0 });
  }
  const encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const material = new MeshStandardNodeMaterial(), candidate = new CropLayer(material), reference = new ReferenceCropLayer(material);
  const observe = (layer: CropLayer | ReferenceCropLayer) => {
    const batches = (layer as unknown as { batches: { slots: Map<number, number>; free: number[]; used: number; mesh: InstancedMesh }[] }).batches;
    return batches.map(({ slots, free, used, mesh }) => ({
      slots: [...slots], free: free.slice(), used, count: mesh.count,
      matrix: Array.from(mesh.instanceMatrix.array), color: Array.from(mesh.instanceColor!.array),
      matrixVersion: mesh.instanceMatrix.version, colorVersion: mesh.instanceColor!.version,
      matrixRanges: mesh.instanceMatrix.updateRanges, colorRanges: mesh.instanceColor!.updateRanges,
      bounds: mesh.boundingSphere ? { center: mesh.boundingSphere.center.toArray(), radius: mesh.boundingSphere.radius } : null,
    }));
  };
  const update = (reset = false) => {
    const result = decoder.adopt(structuredClone(encoder.encode(world, 0, 6, reset)));
    if (result.status !== 'applied') throw Error(JSON.stringify(result));
    candidate.update(result.world, reset, true); reference.update(result.world, reset);
    expect(observe(candidate)).toStrictEqual(observe(reference));
  };
  try {
    update(true); world.tick = 1600; update(); world.resources[0]!.amount++; update();
    world.resources[1]!.kind = 'cotton'; update(); world.resources.reverse(); update();
    world.resources.pop(); update(); world.tick = 4800; update();
    world.resources = []; update(); update(true);
  } finally { candidate.dispose(); reference.dispose(); material.dispose(); }
});
