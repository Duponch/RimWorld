import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/index';
import { BoxBatches } from '../src/render/BoxBatches';
import { buildFurniture } from '../src/render/FurnitureLayer';
import { TimberCladdingLayer } from '../src/render/TimberCladdingLayer';
import type { BoxMesh } from '../src/render/BoxMesh';

test('wood walls move to the timber batch without duplicate furniture boxes; other materials remain', () => {
  const world = createWorld(14, 16, 16);
  world.structures = [
    { id: 1, kind: 'wall', x: 3, z: 4, orientation: 0, footprint: 'standard', material: 'wood' },
    { id: 2, kind: 'wall', x: 5, z: 4, orientation: 0, footprint: 'standard', material: 'steel' },
  ];
  const group = new THREE.Group();
  const boxes = new BoxBatches();
  const timber = new TimberCladdingLayer();
  try {
    buildFurniture(world, group, false, boxes);
    timber.update(world, false);
    expect((group.getObjectByName('furniture') as BoxMesh).activeCount).toBe(2);
    expect(timber.wallMesh.count).toBe(1);
    expect(timber.eaveMesh.count).toBeGreaterThan(0);

    world.structures[0]!.material = 'steel';
    buildFurniture(world, group, false, boxes);
    timber.update(world, false);
    expect((group.getObjectByName('furniture') as BoxMesh).activeCount).toBe(4);
    expect(timber.wallMesh.count).toBe(0);
  } finally {
    timber.dispose();
    boxes.dispose();
  }
});
