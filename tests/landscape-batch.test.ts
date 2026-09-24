import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { LandscapeBatch } from '../src/render/LandscapeBatch';

test('landscape refresh captures new transforms and invalidates retained draws without changing geometry', () => {
  const batch = new LandscapeBatch();
  const region = new THREE.Group();
  region.position.set(3, 0, 4);
  const geometry = new THREE.BoxGeometry(1, 2, 1);
  const material = new THREE.MeshBasicNodeMaterial();
  const first = new THREE.Mesh(geometry, material);
  first.position.set(2, 1, 0);
  region.add(first);
  batch.add(region);

  const initialVersion = batch.version;
  batch.refresh();
  batch.updateMatrixWorld(true);
  expect(batch.version).toBe(initialVersion + 1);
  expect(first.getWorldPosition(new THREE.Vector3()).toArray()).toEqual([5, 1, 4]);
  expect(first.matrixAutoUpdate).toBe(false);
  expect(first.frustumCulled).toBe(false);

  // Existing explicit matrices stay authoritative; a refresh only captures
  // transforms for newly added children before rebuilding the render bundle.
  first.matrix.makeTranslation(7, 1, 0);
  const second = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), material);
  second.position.set(-1, 2, 0);
  region.add(second);
  batch.refresh();
  batch.updateMatrixWorld(true);
  expect(batch.version).toBe(initialVersion + 2);
  expect(first.matrix.elements[12]).toBe(7);
  expect(second.getWorldPosition(new THREE.Vector3()).toArray()).toEqual([2, 2, 4]);
  expect(second.matrixAutoUpdate).toBe(false);
  expect(first.geometry).toBe(geometry);

  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  positions.setX(0, positions.getX(0) + .25);
  positions.needsUpdate = true;
  second.visible = false;
  batch.refresh();
  expect(batch.version).toBe(initialVersion + 3);
  expect(first.geometry).toBe(geometry);
  expect(second.visible).toBe(false);
  expect(positions.version).toBe(1);

  // Close views restore each object's original culling contract. The same
  // objects become conservative retained draws again when zooming out.
  batch.setRetained(false);
  expect(batch.isBundleGroup).toBe(false);
  expect(first.frustumCulled).toBe(true);
  const culledVersion=batch.version;
  batch.setRetained(false);
  expect(batch.version).toBe(culledVersion);
  batch.setRetained(true);
  expect(first.frustumCulled).toBe(false);
  expect(first.geometry).toBe(geometry);

  second.geometry.dispose();
  geometry.dispose();
  material.dispose();
});
