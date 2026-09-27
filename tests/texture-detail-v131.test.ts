import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createStylizedSurfaceTexture } from '../src/render/stylized-surfaces';
import { TimberCladdingLayer } from '../src/render/TimberCladdingLayer';
import { RoofLayer } from '../src/render/RoofLayer';

function textureDetail(map: THREE.DataTexture): { fine: number; fineAmplitude: number; broad: number; across: number; along: number } {
  const size = map.image.width as number, data = map.image.data as Uint8Array;
  const value = (x: number, y: number) => data[(y * size + x) * 4]!;
  let fine = 0, fineAmplitude = 0, across = 0, along = 0, count = 0;
  for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
    const center = value(x, y), right = value(x + 1, y), below = value(x, y + 1);
    const local = (value(x - 1, y) + right + value(x, y - 1) + below) / 4;
    const residual = Math.abs(center - local);
    if (residual >= 2) fine++;
    fineAmplitude += residual;
    across += Math.abs(center - right); along += Math.abs(center - below); count++;
  }
  const blocks: number[] = [];
  const side = size / 8;
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    let sum = 0;
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) sum += value(col * side + x, row * side + y);
    blocks.push(sum / (side * side));
  }
  return { fine: fine / count, fineAmplitude: fineAmplitude / count,
    broad: Math.max(...blocks) - Math.min(...blocks), across: across / count, along: along / count };
}

test('chalk and foliage detail is baked beneath the original broad pigment fields', () => {
  const surface = createStylizedSurfaceTexture(), vegetation = createStylizedSurfaceTexture('vegetation');
  const stone = createStylizedSurfaceTexture('stone');
  try {
    expect([surface.image.width, vegetation.image.width, stone.image.width]).toEqual([64, 64, 256]);
    const neutral = textureDetail(surface), leaves = textureDetail(vegetation), rock = textureDetail(stone);
    expect(neutral.broad).toBeGreaterThan(35);
    expect(leaves.broad).toBeGreaterThan(75);
    expect(rock.broad).toBeGreaterThan(75);
    expect(neutral.fine).toBeGreaterThan(.45);
    expect(leaves.fine).toBeGreaterThan(.5);
    expect(rock.fine).toBeGreaterThan(.5);
    expect(neutral.fineAmplitude).toBeGreaterThan(3.5);
    expect(leaves.fineAmplitude).toBeGreaterThan(8);
    expect(rock.fineAmplitude).toBeGreaterThan(4);
  } finally { surface.dispose(); vegetation.dispose(); stone.dispose(); }
});

test('wood fibres occupy the existing cladding and roof maps while plain materials stay texture free', () => {
  const timber = new TimberCladdingLayer(), roof = new RoofLayer();
  try {
    expect([timber.grain.image.width, roof.paint.image.width]).toEqual([64, 128]);
    const boards = textureDetail(timber.grain), slab = textureDetail(roof.paint);
    expect(boards.broad).toBeGreaterThan(35);
    expect(slab.broad).toBeGreaterThan(35);
    expect(boards.across).toBeGreaterThan(boards.along);
    expect(slab.across).toBeGreaterThan(slab.along);
    expect(timber.grain.minFilter).toBe(THREE.LinearMipmapLinearFilter);
    expect(roof.paint.minFilter).toBe(THREE.LinearMipmapLinearFilter);
    const wallGeometry = timber.wallMesh.geometry, eaveGeometry = timber.eaveMesh.geometry;
    const roofGeometry = roof.mesh.geometry;
    timber.setTexturesEnabled(false); roof.setTexturesEnabled(false);
    expect(timber.wallMesh.material).toBe(timber.plainMaterial);
    expect(timber.eaveMesh.material).toBe(timber.plainMaterial);
    expect(timber.plainMaterial.map).toBeNull();
    expect(timber.plainMaterial.colorNode).toBeNull();
    expect(roof.mesh.material).toBe(roof.plain);
    expect(roof.plain.map).toBeNull();
    expect(timber.wallMesh.geometry).toBe(wallGeometry);
    expect(timber.eaveMesh.geometry).toBe(eaveGeometry);
    expect(roof.mesh.geometry).toBe(roofGeometry);
    expect(timber.group.children).toHaveLength(2);
    expect(roof.surface.children).toHaveLength(1);
  } finally { timber.dispose(); roof.dispose(); }
});
