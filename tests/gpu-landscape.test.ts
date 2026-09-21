import { describe, expect, test } from 'vitest';
import { createWorld } from '../src/sim/engine';
import type { Job, Resource, World } from '../src/sim/types';
import { appendFlora, isGpuGrassSpecies, type FloraParts } from '../src/render/flora-presentation';
import { buildGrassMask, grassBladeCount, isGpuGrassResource } from '../src/render/GpuGrassLayer';
import { designationIconInstances, isIconDesignationKind } from '../src/render/DesignationIconLayer';

const offset = (world: World, x: number, z: number): number => (z * world.width + x) * 4;
const resource = (world: World, id: number, x: number, z: number, species: Resource['species']): Resource => ({
  id, x, z, species, kind: species === 'berry-bush' ? 'berries' : species === 'oak' ? 'tree' : 'wild-plant',
  amount: 1, growth: 1, growthTick: world.tick,
});
const job = (id: number, kind: Job['kind'], x: number): Job => ({
  id, kind, x, z: 2, orientation: 0, footprint: 'standard', status: id % 2 ? 'pending' : 'active',
  reservedBy: null, progress: 0, escrow: { wood: 0, food: 0 },
});

describe('V92 GPU landscape presentation contracts', () => {
  test('terrain, gameplay plants and constructed footprints produce one explicit grass mask', () => {
    const world = createWorld(92, 8, 8);
    world.tiles = world.tiles.map(() => ({ terrain: 'grass' }));
    world.resources = [
      resource(world, 101, 1, 1, 'grass'),
      resource(world, 102, 2, 1, 'tall-grass'),
      resource(world, 103, 3, 1, 'oak'),
      resource(world, 104, 4, 1, 'agave'),
    ];
    world.structures = [{ id: 201, kind: 'wall', x: 5, z: 1, orientation: 0, footprint: 'standard', material: 'wood' }];
    world.tiles[0] = { terrain: 'grass', floor: 'wood-planks' };
    world.tiles[6] = { terrain: 'water' };
    world.tiles[7] = { terrain: 'rock', stone: 'granite' };
    const mask = buildGrassMask(world);
    expect([...mask.slice(offset(world, 0, 1), offset(world, 0, 1) + 4)]).toEqual([255, 0, 0, 255]);
    expect([...mask.slice(offset(world, 1, 1), offset(world, 1, 1) + 4)]).toEqual([0, 255, 0, 255]);
    expect([...mask.slice(offset(world, 2, 1), offset(world, 2, 1) + 4)]).toEqual([0, 0, 255, 255]);
    for (const [x, z] of [[0, 0], [3, 1], [4, 1], [5, 1], [6, 0], [7, 0]])
      expect([...mask.slice(offset(world, x, z), offset(world, x, z) + 4)]).toEqual([0, 0, 0, 0]);
  });

  test('grass species leave the old CPU flora batches while agave keeps its physical model', () => {
    const world = createWorld(92, 8, 8);
    const empty = (): FloraParts => ({ trunks: [], crowns: [], cones: [], bushes: [], blades: [], cacti: [], fruit: [] });
    const parts = empty();
    const grass = resource(world, 1, 2, 2, 'grass'), tall = resource(world, 2, 3, 2, 'tall-grass');
    appendFlora(parts, world, grass, 0); appendFlora(parts, world, tall, 0);
    expect(parts.blades).toHaveLength(0);
    appendFlora(parts, world, resource(world, 3, 4, 2, 'agave'), 0);
    expect(parts.blades).toHaveLength(6);
    expect(isGpuGrassSpecies(grass.species)).toBe(true);
    expect(isGpuGrassResource(tall)).toBe(true);
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

  test('camera height and overview only change the draw count, never build CPU blades', () => {
    expect(grassBladeCount(8, false)).toBeGreaterThan(grassBladeCount(80, false));
    expect(grassBladeCount(80, false)).toBe(grassBladeCount(8, true));
    expect(grassBladeCount(8, false)).toBeLessThanOrEqual(120_000);
  });
});
