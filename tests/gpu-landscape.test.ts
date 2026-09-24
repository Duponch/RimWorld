import { describe, expect, test } from 'vitest';
import { createWorld } from '../src/sim/engine';
import type { Job, Resource } from '../src/sim/types';
import { appendFlora, isClusterPlantSpecies, type FloraParts } from '../src/render/flora-presentation';
import { createPlantClusterGeometry, PlantClusterLayer, plantClusterPresentation } from '../src/render/PlantClusterLayer';
import { designationIconInstances, isIconDesignationKind } from '../src/render/DesignationIconLayer';
import { material } from '../src/render/primitives';
import { NaturalResourcePresentation } from '../src/render/NaturalResourcePresentation';
import * as THREE from 'three/webgpu';

const resource = (world: ReturnType<typeof createWorld>, id: number, x: number, z: number, species: Resource['species']): Resource => ({
  id, x, z, species, kind: species === 'berry-bush' ? 'berries' : species === 'oak' ? 'tree' : 'wild-plant',
  amount: 1, growth: 1, growthTick: world.tick,
});
const job = (id: number, kind: Job['kind'], x: number): Job => ({
  id, kind, x, z: 2, orientation: 0, footprint: 'standard', status: id % 2 ? 'pending' : 'active',
  reservedBy: null, progress: 0, escrow: { wood: 0, food: 0 },
});

describe('V94 resident 3D plant presentation contracts', () => {
  test('the shared tuft is upright and consists of several narrow three-dimensional stems', () => {
    const geometry = createPlantClusterGeometry();
    const bounds = geometry.boundingBox!;
    const width = bounds.max.x - bounds.min.x;
    const depth = bounds.max.z - bounds.min.z;
    const height = bounds.max.y - bounds.min.y;
    expect(geometry.getAttribute('position').count).toBeGreaterThan(30);
    expect(geometry.index!.count / 3).toBeLessThanOrEqual(28);
    expect(height).toBeGreaterThan(width * 1.8);
    expect(height).toBeGreaterThan(depth * 1.8);
    expect(bounds.min.y).toBeGreaterThan(-.03);
    geometry.dispose();
  });

  test('physical short and tall grasses have stable distinct 3D presentations in one resident batch', () => {
    const world = createWorld(92, 8, 8);
    world.resources = [
      resource(world, 101, 1, 1, 'grass'),
      resource(world, 102, 2, 1, 'tall-grass'),
      resource(world, 103, 3, 1, 'oak'),
      resource(world, 104, 4, 1, 'agave'),
    ];
    const short = plantClusterPresentation(world, world.resources[0]!);
    const repeated = plantClusterPresentation(world, world.resources[0]!);
    const tall = plantClusterPresentation(world, world.resources[1]!);
    expect(repeated).toEqual(short);
    expect(tall.scaleY).toBeGreaterThan(short.scaleY);
    expect(tall.color).not.toBe(short.color);
    const shared = material(0xffffff, { vertexColors: true });
    shared.userData.rendererOwned = true;
    const layer = new PlantClusterLayer(shared);
    layer.update(world, true);
    expect(layer.instanceCount()).toBe(2);
    world.resources = world.resources.filter(item => item.id !== 101);
    layer.update(world, false);
    expect(layer.instanceCount()).toBe(2); // stable high-water draw range, removed slot is zero-scaled
    layer.dispose(); shared.dispose();
  });

  test('unrelated flora edits keep tuft buffers untouched, while growth and reuse match a fresh batch', () => {
    const world = createWorld(92, 8, 8);
    world.resources = [resource(world, 101, 1, 1, 'grass'), resource(world, 102, 2, 1, 'tall-grass'), resource(world, 103, 3, 1, 'oak')];
    const shared = material(0xffffff, { vertexColors: true });
    shared.userData.rendererOwned = true;
    const layer = new PlantClusterLayer(shared);
    const state = new NaturalResourcePresentation();
    layer.update(state.read(world, true)!, true, state.changes);
    const mesh = layer.group.children[0] as THREE.InstancedMesh;
    const matrices = Array.from(mesh.instanceMatrix.array), colors = Array.from(mesh.instanceColor!.array);
    const matrixVersion = mesh.instanceMatrix.version, colorVersion = mesh.instanceColor!.version;
    world.resources[2]!.x = 4;
    layer.update(state.read(world)!, false, state.changes);
    expect(Array.from(mesh.instanceMatrix.array)).toEqual(matrices);
    expect(Array.from(mesh.instanceColor!.array)).toEqual(colors);
    expect(mesh.instanceMatrix.version).toBe(matrixVersion);
    expect(mesh.instanceColor!.version).toBe(colorVersion);

    world.resources[0]!.growth = .2;
    layer.update(state.read(world)!, false, state.changes);
    expect(mesh.instanceMatrix.version).toBe(matrixVersion + 1);
    expect(mesh.instanceColor!.version).toBe(colorVersion + 1);
    expect(mesh.instanceMatrix.updateRanges).toEqual([{ start: 0, count: 16 }]);
    expect(mesh.instanceColor!.updateRanges).toEqual([{ start: 0, count: 3 }]);
    const reference = new PlantClusterLayer(shared);
    reference.update(world, true);
    const expected = reference.group.children[0] as THREE.InstancedMesh;
    expect(Array.from(mesh.instanceMatrix.array).slice(0, 32)).toEqual(Array.from(expected.instanceMatrix.array).slice(0, 32));
    expect(Array.from(mesh.instanceColor!.array).slice(0, 6)).toEqual(Array.from(expected.instanceColor!.array).slice(0, 6));

    const removed = world.resources[0]!;
    world.resources = world.resources.filter(item => item.id !== removed.id);
    layer.update(state.read(world)!, false, state.changes);
    world.resources = [removed, ...world.resources];
    layer.update(state.read(world)!, false, state.changes);
    expect(Array.from(mesh.instanceMatrix.array).slice(0, 32)).toEqual(Array.from(expected.instanceMatrix.array).slice(0, 32));
    expect(Array.from(mesh.instanceColor!.array).slice(0, 6)).toEqual(Array.from(expected.instanceColor!.array).slice(0, 6));
    reference.dispose(); layer.dispose(); shared.dispose();
  });

  test('cluster species leave chunk geometry while agave keeps its own physical model', () => {
    const world = createWorld(92, 8, 8);
    const empty = (): FloraParts => ({ trunks: [], crowns: [], cones: [], bushes: [], blades: [], cacti: [], fruit: [] });
    const parts = empty();
    const grass = resource(world, 1, 2, 2, 'grass'), tall = resource(world, 2, 3, 2, 'tall-grass');
    appendFlora(parts, world, grass, 0); appendFlora(parts, world, tall, 0);
    expect(parts.blades).toHaveLength(0);
    appendFlora(parts, world, resource(world, 3, 4, 2, 'agave'), 0);
    expect(parts.blades).toHaveLength(6);
    expect(isClusterPlantSpecies(grass.species)).toBe(true);
    expect(isClusterPlantSpecies(tall.species)).toBe(true);
  });

  test('mine, chop, harvest and cut share the atlas row and exclude other jobs', () => {
    const world = createWorld(92, 8, 8);
    world.jobs = [job(1, 'mine', 1), job(2, 'chop', 2), job(3, 'harvest', 3), job(4, 'cut', 4), job(5, 'sow', 5)];
    expect(designationIconInstances(world)).toEqual([
      { x: 1, y: 3.2, z: 2, icon: 0 }, { x: 2, y: 7.55, z: 2, icon: 1 },
      { x: 3, y: 1.08, z: 2, icon: 2 }, { x: 4, y: 1.08, z: 2, icon: 3 },
    ]);
    expect(isIconDesignationKind('sow')).toBe(false);
  });
});
