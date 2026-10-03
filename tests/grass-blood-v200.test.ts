import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import type { FilthRecord } from '../src/sim/filth-rules';
import { GpuGroundGrassLayer, groundGrassPixels } from '../src/render/GpuGroundGrassLayer';
import { GrassBloodMask, grassRoot, bloodDecalAlpha, GRASS_BLOOD_SLOTS, GRASS_BLOOD_WORDS } from '../src/render/grass-blood-mask';
import { filthDecal, createFilthAtlas, FILTH_ATLAS } from '../src/render/filth-appearance';

const stain = (id: number, x: number, z: number, thickness = 1, kind: FilthRecord['kind'] = 'blood'): FilthRecord =>
  ({ id, x, z, thickness, kind, grownCore: 0, expiresAfterCore: 1_000_000, nextCheckCore: 100 });
function scene(size = 8) {
  const world = createWorld(196, size, size);
  world.tiles = world.tiles.map(() => ({ terrain: 'soil' }));
  world.structures = []; world.resources = []; world.piles = []; world.packed = [];
  world.filth = { rng: 17, items: [], cleaned: 0 };
  return world;
}
const pigment = (cache: GrassBloodMask, i: number, slot: number) =>
  (cache.words[i * GRASS_BLOOD_WORDS + (slot >>> 4)]! >>> ((slot & 15) * 2)) & 3;

test('individual blade roots follow transformed ground silhouettes, including spills outside the source cell', () => {
  const world = scene(), record = stain(1, 2, 3, 3), cache = new GrassBloodMask();
  cache.adopt([record], world.width, world.height);
  let cleanInside = 0, redInside = 0, spill = 0;
  for (let z = 0; z < world.height; z++) for (let x = 0; x < world.width; x++) for (let slot = 0; slot < GRASS_BLOOD_SLOTS; slot++) {
    const root = grassRoot(x, z, slot), actual = pigment(cache, z * world.width + x, slot);
    const alpha = Array.from({ length: record.thickness }, (_, layer) => bloodDecalAlpha(filthDecal(record, layer), ...root));
    if (!alpha.some(a => a > 0)) expect(actual).toBe(0);
    else expect(actual).toBeGreaterThan(0);
    if (x === 2 && z === 3) { if (actual) redInside++; else cleanInside++; }
    else if (actual) spill++;
  }
  expect(cleanInside).toBeGreaterThan(20); expect(redInside).toBeGreaterThan(20); expect(spill).toBeGreaterThan(0);
});

test('alpha lookup shares the real atlas, rotated quad and flip rather than inventing a spatial mask', () => {
  const atlas = createFilthAtlas(), f = stain(1, 2, 3);
  for (let layer = 0; layer < 5; layer++) {
    const decal = filthDecal(f, layer), size = FILTH_ATLAS.tileSize;
    // Start at atlas texel centres and project forward through the GPU quad.
    // The product does the inverse projection and a bilinear read.
    for (const [px, pz] of [[0, 0], [34, 59], [61, 71], [81, 82], [127, 127]]) {
      const uvx = (px! + .5) / size, uvz = (pz! + .5) / size;
      const local = new THREE.Vector2(((decal.flip ? 1 - uvx : uvx) - .5) * Math.fround(decal.width), (uvz - .5) * Math.fround(decal.height));
      local.rotateAround(new THREE.Vector2(), Math.fround(decal.rotation));
      const expected = atlas.data[((Math.floor(decal.tile / FILTH_ATLAS.columns) * size + pz!) * atlas.width + decal.tile % FILTH_ATLAS.columns * size + px!) * 4 + 3]! / 255;
      expect(bloodDecalAlpha(decal, local.x + Math.fround(decal.x), local.y + Math.fround(decal.z))).toBeCloseTo(expected, 8);
    }
  }
});

test('same-tick thinning, mutable movement and removal preserve root ownership and match a fresh rebuild', () => {
  const world = scene(), layer = new GpuGroundGrassLayer(); layer.update(world);
  const clean = Uint8Array.from(layer.map.image.data as Uint8Array), mesh = layer.mesh, map = layer.map, bloodMap = layer.bloodMap;
  const edits = [
    () => { world.filth!.items.push(stain(1, 2, 3, 5)); },
    () => { world.filth!.items[0]!.thickness = 2; },
    () => { world.filth!.items[0]!.x = 4; },
    () => { world.filth!.items = []; },
  ];
  for (const edit of edits) {
    const version = bloodMap.version; edit(); const before = structuredClone(world); layer.update(world);
    const fresh = new GrassBloodMask(); fresh.adopt(world.filth!.items, world.width, world.height);
    expect(bloodMap.image.data).toEqual(fresh.words); expect(bloodMap.version).toBe(version + 1);
    expect(map.image.data).toEqual(groundGrassPixels(world)); expect(layer.mesh).toBe(mesh);
    expect(layer.map).toBe(map); expect(layer.bloodMap).toBe(bloodMap); expect(world).toEqual(before); expect(world.tick).toBe(0);
    const data = map.image.data as Uint8Array;
    for (let i = 0; i < world.tiles.length; i++) expect(Array.from(data.slice(i * 4, i * 4 + 3))).toEqual(Array.from(clean.slice(i * 4, i * 4 + 3)));
  }
  expect(map.image.data).toEqual(clean); expect(Array.from(bloodMap.image.data as Uint32Array).every(v => v === 0)).toBe(true);
  layer.dispose();
});

test('same geometry, ordering, identity and nonblood edits do not upload or walk terrain', () => {
  const world = scene(64), layer = new GpuGroundGrassLayer();
  world.filth!.items = [stain(1, 2, 3, 5), stain(2, 4, 3, 2)]; layer.update(world);
  let reads = 0;
  world.tiles = new Proxy(world.tiles, { get(target, key, receiver) {
    if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
    return Reflect.get(target, key, receiver);
  } });
  layer.update(world, false, []); reads = 0;
  const versions = [layer.map.version, layer.bloodMap.version];
  layer.update(world); world.filth!.items.reverse(); layer.update(world);
  world.filth!.items[0]!.id++; world.filth!.items.push(stain(3, 8, 8, 3, 'ash')); layer.update(world);
  expect(reads).toBe(0); expect([layer.map.version, layer.bloodMap.version]).toEqual(versions);
  layer.dispose();
});

test('covers, reset, map resizing and texture toggle preserve resident buffers and the clean coverage contract', () => {
  const world = scene(), layer = new GpuGroundGrassLayer(); world.filth!.items = [stain(1, 2, 3, 5)]; layer.update(world);
  const painted = Uint32Array.from(layer.bloodMap.image.data as Uint32Array), version = layer.bloodMap.version;
  world.structures = [{ id: 100, kind: 'wall', x: 2, z: 3, orientation: 0, footprint: 'standard' }]; layer.update(world);
  expect((layer.map.image.data as Uint8Array)[(3 * world.width + 2) * 4 + 3]).toBe(0);
  world.structures = []; layer.update(world);
  expect((layer.map.image.data as Uint8Array)[(3 * world.width + 2) * 4 + 3]).toBe(254);
  expect(layer.bloodMap.version).toBe(version); expect(layer.bloodMap.image.data).toEqual(painted);
  layer.setTexturesEnabled(false); expect(layer['texturesEnabled'].value).toBe(0);
  layer.setTexturesEnabled(true); expect(layer['texturesEnabled'].value).toBe(1);
  expect(layer.bloodMap.version).toBe(version);
  const resized = scene(16); resized.filth!.items = [stain(1, 4, 5, 2)]; layer.update(resized);
  expect(layer.bloodMap.image.width).toBe(resized.width * GRASS_BLOOD_WORDS);
  expect(layer.bloodMap.image.height).toBe(resized.height);
  expect(layer.map.image.data).toEqual(groundGrassPixels(resized));
  layer.update(world, true); expect(layer.bloodMap.image.data).toEqual(painted);
  expect(layer.mesh.geometry.getAttribute('position').count).toBe(4); expect(layer.mesh.geometry.index!.count).toBe(6);
  expect(layer.bloodMap.format).toBe(THREE.RedIntegerFormat); expect(layer.bloodMap.type).toBe(THREE.UnsignedIntType);
  layer.dispose();
});

test('250² packed storage is exactly 3,500,000 bytes, and additions dirty neighbouring cell flags only as required', () => {
  const cache = new GrassBloodMask(); cache.adopt([], 250, 250);
  expect(cache.words.byteLength).toBe(3_500_000);
  const first = cache.adopt([stain(1, 2, 3)], 250, 250);
  expect(first.cells.length).toBeGreaterThan(0); expect(first.cells.length).toBeLessThanOrEqual(9);
  expect(cache.adopt([stain(2, 2, 3)], 250, 250).changed).toBe(false);
  const removed = cache.adopt([], 250, 250);
  expect(removed.cells.sort()).toEqual(first.cells.sort()); expect(cache.cells.size).toBe(0);
});
