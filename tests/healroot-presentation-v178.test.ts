import { expect, test } from 'vitest';
import { createWorld } from '../src/sim/engine';
import type { Resource } from '../src/sim/types';
import { appendFlora, floraColor, isClusterPlantSpecies, type FloraParts } from '../src/render/flora-presentation';
import { plantInspection } from '../src/ui/plant-inspection';

const emptyParts = (): FloraParts => ({ trunks: [], crowns: [], cones: [], bushes: [], blades: [], cacti: [], fruit: [] });

test('wild healroot is a small leafy medicinal plant in the existing shrub batch', () => {
  const world = createWorld(178, 8, 8);
  const plant: Resource = { id: 71, kind: 'wild-plant', species: 'healroot-wild', x: 3, z: 4, amount: 1, growth: 1, growthTick: world.tick };
  const parts = emptyParts();
  appendFlora(parts, world, plant, .4);

  expect(isClusterPlantSpecies(plant.species)).toBe(false);
  expect(floraColor(plant)).toBe(0x829b74);
  expect(parts.bushes).toHaveLength(5);
  expect(parts.bushes.filter(part => part.key === -plant.id * 2)).toHaveLength(4);
  // A leafless living plant retains its rosette rather than vanishing entirely.
  expect(parts.bushes.filter(part => part.key === plant.id)).toHaveLength(1);
  expect(parts.bushes.some(part => part.color === 0xb7a5b9)).toBe(true);
  expect(parts.bushes.some(part => part.color === 0xa6b896)).toBe(true);
  expect(Math.max(...parts.bushes.map(part => part.y + (part.sy ?? 1)))).toBeLessThan(.7);
  expect(parts.trunks).toHaveLength(0);
  expect(parts.crowns).toHaveLength(0);
  expect(parts.cones).toHaveLength(0);
  expect(parts.blades).toHaveLength(0);
  expect(parts.cacti).toHaveLength(0);
  expect(parts.fruit).toHaveLength(0);
});

test('inspection shows growth and the physical herbal medicine harvest only when ready', () => {
  const world = createWorld(179, 8, 8);
  const plant: Resource = { id: 72, kind: 'wild-plant', species: 'healroot-wild', x: 3, z: 4, amount: 1, growth: 0, growthTick: world.tick };
  world.resources = [plant];
  world.tiles[plant.z * world.width + plant.x] = { terrain: 'grass' };

  const immature = plantInspection(world, plant);
  expect(immature).toContain('Croissance 0 %');
  expect(immature).toContain('Pas encore récoltable');
  plant.growth = 1;
  const mature = plantInspection(world, plant);
  expect(mature).toContain('Croissance 100 %');
  expect(mature).toMatch(/Récolte : environ 1 .*médic/i);
});
