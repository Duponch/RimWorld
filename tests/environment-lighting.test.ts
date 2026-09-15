import { test, expect } from 'vitest';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { EnvironmentLighting } from '../src/render/EnvironmentLighting';
import { workplaceCamp, fixtureFire } from './scenarios/work-environment';
import { createWorld, serializeWorld } from '../src/sim/index';

test('lighting presentation preserves the world and GPU resources through fuel, roofs, barriers and checkpoint sizes', () => {
  const w = workplaceCamp(), fire = fixtureFire(w), layer = new EnvironmentLighting();
  const first = serializeWorld(w), mat = new MeshStandardNodeMaterial();
  layer.configure(mat); const node = mat.outputNode, map = layer.map;
  layer.update(w); expect(serializeWorld(w)).toBe(first);
  const data = layer.field.data, version = map.version, revision = layer.field.revision;
  const at = (x: number, z: number, channel = 0) => layer.field.data[(z * w.width + x) * 4 + channel]!;
  expect(at(6, 4)).toBe(255); expect(at(6, 4, 1)).toBe(255);
  expect(at(8, 4)).toBe(0); expect(at(7, 4, 2)).toBe(255);
  const b = layer.field.bounds;
  for (let i = 0; i < w.tiles.length; i++) if (data[i*4] || data[i*4+1]) {
    expect(b.minX).toBeLessThanOrEqual(i % w.width - 1);
    expect(b.maxX).toBeGreaterThanOrEqual(i % w.width + 1);
    expect(b.minZ).toBeLessThanOrEqual(Math.floor(i / w.width) - 1);
    expect(b.maxZ).toBeGreaterThanOrEqual(Math.floor(i / w.width) + 1);
  }
  for (let i = 0; i < 20; i++) { w.tick++; fire.fuel!.ticks--; layer.update(w); }
  expect(map.version).toBe(version); expect(layer.field.revision).toBe(revision);
  const door = w.structures.find(s => s.kind === 'door')!;
  door.door!.open = true; layer.update(w); expect(layer.field.revision).toBe(revision);
  w.tiles[30*w.width+30]!.terrain='rock';layer.update(w);
  expect(at(30,30,2)).toBe(255);expect(at(6,4)).toBe(255);
  w.tiles[30*w.width+30]!.terrain='grass';layer.update(w);expect(at(30,30,2)).toBe(0);
  fire.fuel!.ticks = 0; layer.update(w); expect(at(6, 4)).toBe(0);
  expect(layer.field.data).toBe(data); expect(layer.map).toBe(map);
  fire.fuel!.ticks = 100; w.structures = w.structures.filter(s => !(s.x === 7 && s.z === 4));
  layer.update(w); expect(at(8, 4)).toBeGreaterThan(0);
  w.roofing!.constructed.splice(w.roofing!.constructed.indexOf(4 * w.width + 6), 1);
  layer.update(w); expect(at(6, 4, 1)).toBe(0);
  const restored = workplaceCamp(); layer.update(restored); expect(at(8, 4)).toBe(0); expect(at(6, 4, 1)).toBe(255);
  let disposals = 0; map.addEventListener('dispose', () => disposals++);
  for (const [width, height] of [[64, 32], [32, 64], [32, 32]]) {
    layer.update(createWorld(77, width!, height!));
    expect(map.image.width).toBe(width); expect(map.image.height).toBe(height);
    expect(layer.map).toBe(map); expect(map.image.data!.length).toBe(width! * height! * 4);
    expect(layer.field.bounds.minX).toBeGreaterThan(layer.field.bounds.maxX);
  }
  expect(disposals).toBe(3); layer.configure(mat); expect(mat.outputNode).toBe(node);
  layer.dispose(); mat.dispose(); expect(disposals).toBe(4);
});
