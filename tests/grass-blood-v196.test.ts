import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import { GpuGroundGrassLayer, groundGrassPixels } from '../src/render/GpuGroundGrassLayer';
import { GroundBlood } from '../src/render/ground-blood';
import type { FilthRecord } from '../src/sim/filth-rules';

const stain = (id: number, x: number, z: number, thickness = 1, kind: FilthRecord['kind'] = 'blood'): FilthRecord =>
  ({ id, x, z, thickness, kind, grownCore: 0, expiresAfterCore: 1_000_000, nextCheckCore: 100 });
function scene(size = 8) {
  const w = createWorld(196, size, size);
  w.tiles = w.tiles.map(() => ({ terrain: 'soil' }));
  w.structures = []; w.resources = []; w.piles = []; w.packed = [];
  w.filth = { rng: 17, items: [], cleaned: 0 };
  return w;
}
const pixels = (l: GpuGroundGrassLayer) => Uint8Array.from(l.map.image.data as Uint8Array);

test('blood tint is local to stained cells, increases with thickness and never changes coverage or the World', () => {
  const w = scene(), clean = groundGrassPixels(w), layer = new GpuGroundGrassLayer();
  w.filth!.items = [stain(1, 2, 3), stain(2, 4, 3, 5), stain(3, 6, 3, 5, 'dirt')];
  const before = structuredClone(w); layer.update(w);
  const data = pixels(layer), i = (3 * w.width + 2) * 4, j = (3 * w.width + 4) * 4;
  expect(data[i + 1]).toBeLessThan(clean[i + 1]!); // red-brown pigment replaces soil green
  expect(data[j + 1]).toBeLessThan(data[i + 1]!);
  for (let n = 0; n < w.tiles.length; n++) {
    expect(data[n * 4 + 3]).toBe(clean[n * 4 + 3]);
    if (n !== i / 4 && n !== j / 4) expect(data.slice(n * 4, n * 4 + 4)).toEqual(clean.slice(n * 4, n * 4 + 4));
  }
  expect(w).toEqual(before); expect(data).toEqual(groundGrassPixels(w)); layer.dispose();
});

test('same-tick additions, thinning, movement and cleaning match a fresh rebuild without changing rendering objects', () => {
  const w = scene(), layer = new GpuGroundGrassLayer(); layer.update(w);
  const map = layer.map, data = map.image.data, mesh = layer.mesh, geometry = mesh.geometry;
  const material = mesh.material, position = material.positionNode, colour = material.colorNode;
  const clean = pixels(layer), tick = w.tick;
  const edits = [
    () => { w.filth!.items.push(stain(1, 2, 3, 5)); },
    () => { w.filth!.items[0]!.thickness = 2; }, // same mutable object must still be observed
    () => { w.filth!.items[0]!.x = 4; },
    () => { w.filth!.items = []; },
  ];
  for (const edit of edits) {
    const version = map.version; edit(); layer.update(w);
    expect(w.tick).toBe(tick); expect(map.version).toBe(version + 1);
    expect(pixels(layer)).toEqual(groundGrassPixels(w));
    expect(map.image.data).toBe(data); expect(layer.mesh).toBe(mesh); expect(mesh.geometry).toBe(geometry);
    expect(mesh.material).toBe(material); expect(material.positionNode).toBe(position); expect(material.colorNode).toBe(colour);
  }
  expect(pixels(layer)).toEqual(clean);
  expect(map.image.width * map.image.height * 4).toBe(w.width * w.height * 4);
  expect(geometry.getAttribute('position').count).toBe(4); expect(geometry.index!.count).toBe(6);
  expect(map.colorSpace).toBe(THREE.SRGBColorSpace); layer.dispose();
});

test('unchanged snapshots, ordering and nonblood filth do not upload or reread the terrain', () => {
  const w = scene(64), layer = new GpuGroundGrassLayer();
  w.filth!.items = [stain(1, 2, 3, 5), stain(2, 4, 3, 2)]; layer.update(w);
  let reads = 0;
  w.tiles = new Proxy(w.tiles, { get(target, key, receiver) {
    if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
    return Reflect.get(target, key, receiver);
  } });
  layer.update(w, false, []); reads = 0; const version = layer.map.version;
  layer.update(w); w.filth!.items = structuredClone(w.filth!.items).reverse(); layer.update(w);
  w.filth!.items.push(stain(3, 8, 8, 3, 'ash')); layer.update(w);
  expect(reads).toBe(0); expect(layer.map.version).toBe(version);
  w.filth!.items.find(f => f.id === 2)!.thickness = 3; layer.update(w);
  expect(reads).toBe(2); // coverage check + colour write for the one changed cell
  expect(layer.map.version).toBe(version + 1);
  layer.dispose();
});

test('blood survives covered-cell changes and new-map adoption; removed blood restores original soil', () => {
  const w = scene(), layer = new GpuGroundGrassLayer(); w.filth!.items = [stain(1, 2, 3, 5)];
  layer.update(w); const painted = pixels(layer);
  w.structures = [{ id: 100, kind: 'wall', x: 2, z: 3, orientation: 0, footprint: 'standard' }]; layer.update(w);
  expect(pixels(layer)[(3 * w.width + 2) * 4 + 3]).toBe(0);
  w.structures = []; layer.update(w); expect(pixels(layer)).toEqual(painted);
  const resized = scene(16); resized.filth!.items = [stain(1, 4, 5, 2)]; layer.update(resized);
  expect(pixels(layer)).toEqual(groundGrassPixels(resized));
  resized.filth!.items = []; resized.seed++; layer.update(resized);
  expect(pixels(layer)).toEqual(groundGrassPixels(resized));
  layer.update(w, true); expect(pixels(layer)).toEqual(painted); layer.dispose();
});

test('sparse tint cache marks actual cell changes, including removal, instead of every existing stain', () => {
  const cache = new GroundBlood(), items = [stain(1, 2, 3, 5), stain(2, 4, 3, 1)];
  expect(cache.adopt(items, 250, 250).sort()).toEqual([752, 754]);
  expect(cache.adopt(items, 250, 250)).toEqual([]);
  items[1]!.thickness = 2; expect(cache.adopt(items, 250, 250)).toEqual([754]);
  expect(cache.adopt(items.slice(1), 250, 250)).toEqual([752]);
  expect(cache.adopt([], 250, 250)).toEqual([754]);
  expect(cache.cells.size).toBe(0);
});
