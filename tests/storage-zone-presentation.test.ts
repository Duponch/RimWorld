import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { BoxBatches } from '../src/render/BoxBatches';
import { storageZonePlacements, storageZoneSignature } from '../src/render/storage-zone-presentation';

const stockpile = (x: number, z: number, wood = true, food = true) => ({
  id: z * 10 + x + 1, x, z, filters: { wood, food }, priority: 1, capacity: 75,
});

test('a stockpile area keeps a faint cell tint without submitting a perimeter', () => {
  const stockpiles = Array.from({ length: 30 }, (_, index) => stockpile(index % 6 + 2, Math.floor(index / 6) + 3));
  const { cells, borders } = storageZonePlacements(16, stockpiles);
  expect(cells).toHaveLength(30);
  expect(borders).toHaveLength(0);
  expect(cells.every(cell => cell.sy === 0.014 && cell.sx === 1 && cell.sz === 1)).toBe(true);

  const boxes = new BoxBatches(), group = new THREE.Group();
  try {
    boxes.set(group, 'storage-cells', cells, 'storage', false);
    boxes.set(group, 'storage-borders', borders, 'border', false);
    const tint = group.getObjectByName('storage-cells') as THREE.InstancedMesh;
    const outline = group.getObjectByName('storage-borders') as THREE.InstancedMesh;
    expect((tint.material as THREE.MeshBasicNodeMaterial).opacity).toBeCloseTo(0.055);
    expect((outline.geometry as THREE.InstancedBufferGeometry).instanceCount).toBe(0);
    expect((tint.material as THREE.MeshBasicNodeMaterial).depthWrite).toBe(false);
    expect((outline.material as THREE.MeshBasicNodeMaterial).opacity).toBeLessThan(0.5);
    expect(tint.castShadow).toBe(false);
    expect(outline.castShadow).toBe(false);
  } finally { boxes.dispose(); }
});

test('adjacent cells share a tint; different settings form separate areas without wrapping rows', () => {
  const connected = storageZonePlacements(4, [stockpile(1, 1), stockpile(2, 1)]);
  expect(connected.borders).toHaveLength(0);
  expect(connected.cells[0]!.color).toBe(connected.cells[1]!.color);
  const separateSettings = storageZonePlacements(4, [stockpile(1, 1), stockpile(2, 1, false, true)]);
  expect(separateSettings.borders).toHaveLength(0);
  expect(separateSettings.cells[0]!.color).not.toBe(separateSettings.cells[1]!.color);
  expect(storageZonePlacements(4, [stockpile(1, 1, false, false)]).cells[0]!.color)
    .toBe(storageZonePlacements(4, [stockpile(1, 1, true, true)]).cells[0]!.color);
  const separated = storageZonePlacements(4, [stockpile(3, 1), stockpile(0, 2)]);
  expect(separated.borders).toHaveLength(0);
  expect(separated.cells[0]!.color).not.toBe(separated.cells[1]!.color);
});

test('changing any storage setting invalidates the visual grouping without changing a cell identity', () => {
  const original = stockpile(1, 1), before = storageZoneSignature([original]);
  expect(storageZoneSignature([{ ...original, filters: { ...original.filters, medicine: true } }])).not.toBe(before);
  expect(storageZoneSignature([{ ...original, items: { wood: true } }])).not.toBe(before);
  expect(storageZoneSignature([{ ...original, capacity: 100 }])).not.toBe(before);
});
