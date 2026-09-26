import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { mergedInstances } from '../src/render/StaticGeometry';
import { PATTERN_SPAN } from '../src/render/texture-variation';

function bakedUv(keys: readonly number[]): number[][] {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true });
  const mesh = mergedInstances(group, [{
    geometry: new THREE.BoxGeometry(1, 1, 1),
    items: keys.map((key) => ({ key, x: 4, y: 0.5, z: 4 })),
  }], material, true, true)!;
  const uv = mesh.geometry.getAttribute('uv');
  const perItem = uv.count / keys.length;
  const result = keys.map((_, index) => Array.from({ length: perItem * 2 }, (_, component) =>
    (uv.array as Float32Array)[index * perItem * 2 + component]!));
  mesh.geometry.dispose(); material.dispose();
  return result;
}

test('different resource identities sample different stable regions without another texture coordinate buffer', () => {
  const forward = bakedUv([17, 18]);
  const reverse = bakedUv([18, 17]);
  expect(forward[0]).not.toEqual(forward[1]);
  expect(forward[0]).toEqual(reverse[1]);
  expect(forward[1]).toEqual(reverse[0]);
  for (const coordinates of forward) for (const value of coordinates) {
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  }
  expect(PATTERN_SPAN).toBeGreaterThan(0.5);
});
