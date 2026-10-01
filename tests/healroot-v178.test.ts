import { expect, test } from 'vitest';
import { applyCommand, deserializeWorld, serializeWorld, stepWorld } from '../src/sim/index';
import { createScenarioWorld } from '../src/sim/new-game';
import { FLORA_DEFINITIONS, weightedSpecies } from '../src/sim/biome-flora';
import { gatherResource } from '../src/sim/gathering';
import { ITEM_DEFINITIONS } from '../src/sim/items';
import { addMaterial, refreshStock } from '../src/sim/materials';
import { createPlantLife } from '../src/sim/plant-life';
import { berryYield, harvestable, harvestRoll, plantGrowth } from '../src/sim/plants';
import { generateSiteWorld } from '../src/sim/site-generation';
import { resolveSite } from '../src/sim/site';
import { advanceWildFlora, validateWildFlora } from '../src/sim/wild-flora';
import { animalFoods, animalMealTarget } from '../src/sim/wildlife-food';
import type { Resource, World } from '../src/sim/types';
import type { WildAnimal } from '../src/sim/wildlife-state';

const newWorld = (biome: 'temperate-forest' | 'boreal-forest' | 'arid-shrubland') =>
  createScenarioWorld(42, 64, 'crashlanded', { hilliness: 'small-hills', biome });

function preparedHarvest(): { world: World; plant: Resource } {
  const world = newWorld('temperate-forest');
  const plant = world.resources.find(resource => resource.species === 'healroot-wild');
  if (!plant) throw new Error('Seed 42 must contain naturally generated wild healroot.');
  world.tiles = world.tiles.map(() => ({ terrain: 'grass' }));
  world.resources = [plant];
  Object.assign(plant, { x: 4, z: 3, growth: 1, growthTick: world.tick });
  const pawn = world.pawns[0]!;
  Object.assign(pawn, { x: 3, z: 3, hunger: 100, rest: 100, jobId: null, haul: null, need: null, state: 'idle', path: [], planCooldown: 0 });
  for (const colonist of world.pawns) {
    colonist.schedule.fill('work');
    for (const key in colonist.priorities) colonist.priorities[key as keyof typeof colonist.priorities] = 0;
  }
  pawn.priorities.gather = 1;
  if (world.wildlife) world.wildlife.animals = [];
  world.jobs = [];
  world.structures = [];
  world.piles = [];
  refreshStock(world);
  return { world, plant };
}

function blockOutput(world: World, plant: Resource): void {
  for (let z = 0; z < world.height; z++) for (let x = 0; x < world.width; x++) {
    if (Math.abs(x - plant.x) + Math.abs(z - plant.z) <= 12) addMaterial(world, 'wood', 75, { type: 'ground', x, z });
  }
}

test('wild healroot is generated only in eligible local biomes and rejected by V166 validation', () => {
  const temperate = newWorld('temperate-forest');
  const boreal = newWorld('boreal-forest');
  const arid = newWorld('arid-shrubland');
  for (const world of [temperate, boreal]) {
    const roots = world.resources.filter(resource => resource.species === 'healroot-wild');
    expect(roots.length).toBeGreaterThan(0);
    expect(roots.every(root => root.kind === 'wild-plant' && root.amount === 1 && root.plantLife !== undefined)).toBe(true);
    expect(validateWildFlora(world, 167)).toBe(true);
    expect(validateWildFlora(world, 166)).toBe(false);
  }
  expect(arid.resources.some(resource => resource.species === 'healroot-wild')).toBe(false);
  expect(weightedSpecies('temperate-forest', 1)).toBe('healroot-wild');
  expect(weightedSpecies('boreal-forest', 1)).toBe('healroot-wild');
  expect(FLORA_DEFINITIONS['healroot-wild'].product).toBe('herbal-medicine');
  expect(ITEM_DEFINITIONS['herbal-medicine']).toMatchObject({ kind: 'medicine', nutrition: 0, stackLimit: 25 });
});

test('animals graze wild healroot from 65% growth while other plants retain their 10% threshold', () => {
  const { world, plant } = preparedHarvest();
  const grass: Resource = { id: world.nextId++, x: 6, z: 3, kind: 'wild-plant', species: 'grass', amount: 0, growth: .1, growthTick: world.tick };
  grass.plantLife = createPlantLife(world, grass);
  world.resources.push(grass);
  const animal: WildAnimal = { id: world.nextId++, species: 'hare', sex: 'female', ageTicks: 6000, x: 3, z: 3, food: 0, rest: 80, state: 'idle', path: [], nextDecision: world.tick };
  world.wildlife!.animals = [animal];
  addMaterial(world, 'medicine', 1, { type: 'ground', x: 8, z: 3 }, 'herbal-medicine');
  const dose = world.piles.find(pile => pile.item === 'herbal-medicine')!;

  plant.growth = .64;
  expect(animalFoods(world, animal).filter(food => food.kind === 'plant').map(food => food.id)).toEqual([grass.id]);
  animal.meal = { kind: 'plant', id: plant.id, quantity: 1, progress: 0 };
  expect(animalMealTarget(world, animal)).toBeUndefined();
  plant.growth = .65;
  expect(animalFoods(world, animal).some(food => food.id === plant.id)).toBe(true);
  expect(animalMealTarget(world, animal)).toMatchObject({ x: plant.x, z: plant.z });
  expect(animalFoods(world, animal).some(food => food.id === dose.id)).toBe(false);
});

test('maturity gates a physical one-dose harvest; a saved work phase resumes exactly', () => {
  const { world, plant } = preparedHarvest();
  plant.growth = .65;
  expect(harvestable(world, plant)).toBe(false);
  expect(applyCommand(world, { type: 'designate', kind: 'harvest', x: plant.x, z: plant.z }).ok).toBe(false);
  plant.growth = 1;
  expect(harvestable(world, plant)).toBe(true);
  expect(applyCommand(world, { type: 'designate', kind: 'harvest', x: plant.x, z: plant.z }).ok).toBe(true);
  let working = false;
  for (let i = 0; i < 30; i++) {
    stepWorld(world);
    if (world.jobs.some(job => job.kind === 'harvest' && job.progress > 0)) { working = true; break; }
  }
  expect(working).toBe(true);
  expect(world.jobs.find(job => job.kind === 'harvest')?.reservedBy).toBe(world.pawns[0]!.id);
  expect(Math.abs(world.pawns[0]!.x - plant.x) + Math.abs(world.pawns[0]!.z - plant.z)).toBeLessThanOrEqual(1);
  expect(world.piles.some(pile => pile.item === 'herbal-medicine')).toBe(false);
  const resumed = deserializeWorld(serializeWorld(world));
  for (let i = 0; i < 200 && (world.jobs.length || resumed.jobs.length); i++) {
    stepWorld(world); stepWorld(resumed);
  }
  expect(world.jobs).toEqual([]);
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));
  expect(world.resources.some(resource => resource.id === plant.id)).toBe(false);
  expect(world.piles.filter(pile => pile.item === 'herbal-medicine').reduce((sum, pile) => sum + pile.quantity, 0)).toBe(1);
  expect(world.piles.find(pile => pile.item === 'herbal-medicine')?.owner.type).toBe('ground');
});

test('a saturated output area preserves the plant and RNG; cancellation creates no dose', () => {
  const { world, plant } = preparedHarvest();
  blockOutput(world, plant);
  const before = serializeWorld(world);
  expect(gatherResource(world, plant, 'harvest')).toBeNull();
  expect(serializeWorld(world)).toBe(before);
  expect(world.resources).toContain(plant);

  world.piles = [];
  refreshStock(world);
  expect(applyCommand(world, { type: 'designate', kind: 'harvest', x: plant.x, z: plant.z }).ok).toBe(true);
  for (let i = 0; i < 30 && world.jobs[0]!.progress === 0; i++) stepWorld(world);
  expect(world.jobs[0]!.progress).toBeGreaterThan(0);
  expect(applyCommand(world, { type: 'cancel', x: plant.x, z: plant.z }).ok).toBe(true);
  expect(world.piles.some(pile => pile.item === 'herbal-medicine')).toBe(false);
  expect(world.resources).toContain(plant);
});

test('a damaged mature root uses remaining HP for rounded yield, with atomic refusal and exact continuation', () => {
  const { world, plant } = preparedHarvest();
  plant.damage = 30;
  world.rng = 1;
  expect(berryYield(world, plant)).toBe(.75);
  const roll = harvestRoll(world, plant);
  expect(roll.quantity).toBe(1);
  expect(roll.rng).not.toBe(world.rng);
  blockOutput(world, plant);
  const before = serializeWorld(world);
  expect(gatherResource(world, plant, 'harvest')).toBeNull();
  expect(serializeWorld(world)).toBe(before);
  const resumed = deserializeWorld(before);
  world.piles = []; resumed.piles = [];
  refreshStock(world); refreshStock(resumed);
  const resumedPlant = resumed.resources.find(resource => resource.id === plant.id)!;
  expect(gatherResource(world, plant, 'harvest')).toBe(1);
  expect(gatherResource(resumed, resumedPlant, 'harvest')).toBe(1);
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));
  expect(world.rng).toBe(roll.rng);
  expect(world.resources.some(resource => resource.id === plant.id)).toBe(false);
  expect(world.piles.filter(pile => pile.item === 'herbal-medicine').reduce((sum, pile) => sum + pile.quantity, 0)).toBe(1);

  const failed = preparedHarvest();
  failed.plant.damage = 30;
  failed.world.rng = 0x3fffffff;
  expect(harvestRoll(failed.world, failed.plant).quantity).toBe(0);
  expect(gatherResource(failed.world, failed.plant, 'harvest')).toBe(0);
  expect(failed.world.resources.some(resource => resource.id === failed.plant.id)).toBe(false);
  expect(failed.world.piles.some(pile => pile.item === 'herbal-medicine')).toBe(false);
});

test('growth follows local fertility and old sites do not adopt the new species', () => {
  const { world, plant } = preparedHarvest();
  plant.growth = 0;
  plant.growthTick = world.tick;
  world.tick += 6000;
  const grown = plantGrowth(world, plant);
  expect(grown).toBeGreaterThan(0);
  world.tiles[plant.z * world.width + plant.x] = { terrain: 'gravel' };
  expect(plantGrowth(world, plant)).toBeLessThan(grown);

  const legacy = generateSiteWorld(42, 32, 32, resolveSite(42, { hilliness: 'small-hills' }));
  const resources = serializeWorld(legacy);
  legacy.tick += 6000;
  advanceWildFlora(legacy);
  expect(legacy.flora).toBeUndefined();
  expect(legacy.resources.some(resource => resource.species === 'healroot-wild')).toBe(false);
  expect(validateWildFlora(legacy, 166)).toBe(true);
  expect(serializeWorld({ ...legacy, tick: 0 })).toBe(resources);
});

test('a prepared ecological vacancy can renew healroot prospectively and resume its private stream', () => {
  const world = newWorld('temperate-forest');
  world.resources = [];
  world.structures = [];
  world.jobs = [];
  world.piles = [];
  world.packed = [];
  world.growingZones = [];
  world.tiles = world.tiles.map(() => ({ terrain: 'grass' }));
  world.flora!.capacity = world.width * world.height;
  refreshStock(world);
  const resumed = deserializeWorld(serializeWorld(world));
  for (let i = 0; i < 200 && !world.resources.some(resource => resource.species === 'healroot-wild'); i++) {
    world.tick = world.flora!.nextCheck;
    resumed.tick = resumed.flora!.nextCheck;
    advanceWildFlora(world);
    advanceWildFlora(resumed);
  }
  expect(world.resources.some(resource => resource.species === 'healroot-wild')).toBe(true);
  expect(world.piles.some(pile => pile.item === 'herbal-medicine')).toBe(false);
  expect(resumed.resources).toEqual(world.resources);
  expect(resumed.flora).toEqual(world.flora);
  expect(validateWildFlora(world, 167)).toBe(true);
});
