import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { decodeStoredSave } from '../src/ui/save-storage-codec.ts';
import { deserializeWorld, stepWorld } from '../src/sim/index.ts';
import { animalFoods, animalMealTarget } from '../src/sim/wildlife-food.ts';
import { animalSpecies } from '../src/sim/animal-species.ts';
import { isPlant, plantGrowth } from '../src/sim/plants.ts';
import { plantLeafless } from '../src/sim/plant-life.ts';
import { plantNutrition } from '../src/sim/biome-flora.ts';
import { reservedSource } from '../src/sim/materials.ts';
import { ITEM_DEFINITIONS } from '../src/sim/items.ts';

// The pre-V113 implementation is retained here as an oracle for the identical
// saved world, not as another gameplay implementation.
const herbivoreFoods = new Set(['berries','rice','potato','corn','agave-fruit','simple-meal','survival-meal','legacy-portion']);
function previousFoods(world, animal) {
  const result = [], definition = animalSpecies(animal.species);
  for (const resource of world.resources) if (isPlant(resource) && !plantLeafless(world,resource)) {
    const growth = plantGrowth(world,resource);
    if (growth >= .1 && plantNutrition(resource,growth) > 0
      && !world.wildlife?.animals.some(other => other.id !== animal.id && other.meal?.kind === 'plant' && other.meal.id === resource.id)
      && !world.jobs.some(job => job.reservedBy !== null && job.x === resource.x && job.z === resource.z && ['harvest','cut','sow'].includes(job.kind))) {
      result.push({id:resource.id,kind:'plant',x:resource.x,z:resource.z,quantity:1});
    }
  }
  for (const pile of world.piles) if (pile.kind === 'food' && herbivoreFoods.has(pile.item) && pile.owner.type === 'ground') {
    const available = pile.quantity - reservedSource(world,pile.id,animal.id), nutrition = ITEM_DEFINITIONS[pile.item].nutrition/100;
    if (available > 0 && nutrition > 0) result.push({id:pile.id,kind:'pile',x:pile.owner.x,z:pile.owner.z,quantity:Math.min(available,Math.max(1,Math.ceil((definition.nutrition-animal.food)/nutrition)))});
  }
  return result;
}

const world = deserializeWorld(await decodeStoredSave(readFileSync('public/test-saves/v98/mixed-100.json','utf8')));
for (let i = 0; i < 40; i++) stepWorld(world);
const animal = world.wildlife.animals[0];
assert.deepEqual(animalFoods(world,animal), previousFoods(world,animal));
for (let i = 0; i < 5; i++) { previousFoods(world,animal); animalFoods(world,animal); }
const durations = { previous: [], current: [] };
let checksum = 0;
for (let round = 0; round < 12; round++) {
  for (const implementation of round % 2 ? ['current','previous','previous','current'] : ['previous','current','current','previous']) {
    const start = performance.now();
    for (let i = 0; i < 4; i++) checksum += (implementation === 'previous' ? previousFoods : animalFoods)(world,animal).length;
    durations[implementation].push((performance.now() - start) / 4);
  }
}
const summary = values => {
  const sorted = [...values].sort((a,b) => a-b);
  return { samples: values.length, median: sorted[Math.floor(sorted.length/2)], p95: sorted[Math.ceil(sorted.length*.95)-1], total: values.reduce((a,b)=>a+b,0) };
};
const resourcePositions = new Map(world.resources.map((resource,index) => [resource.id,index]));
const plantMeals = world.wildlife.animals.filter(candidate => candidate.meal?.kind === 'plant')
  .sort((left,right) => resourcePositions.get(left.meal.id)-resourcePositions.get(right.meal.id));
assert(plantMeals.length >= 39,'The mixed-100 fixture must contain at least 39 active plant meals at this tick');
const mealTargets = {};
for (const count of [1,4,8,16,39]) {
  // Sample the available target IDs across the resource array, because the
  // baseline linear search cost depends on where each target appears.
  const subset = Array.from({length:count},(_,i) => plantMeals[Math.floor((i+.5)*plantMeals.length/count)]);
  const previousMealTargets = () => subset.map(candidate => animalMealTarget(world,candidate));
  const indexedMealTargets = () => {
    const resourcesById = new Map();
    for (const resource of world.resources) resourcesById.set(resource.id,resource);
    return subset.map(candidate => animalMealTarget(world,candidate,resourcesById));
  };
  assert.deepEqual(indexedMealTargets(),previousMealTargets());
  const targetDurations = { previous: [], current: [] };
  for (let i = 0; i < 5; i++) { previousMealTargets(); indexedMealTargets(); }
  for (let round = 0; round < 12; round++) {
    for (const implementation of round % 2 ? ['current','previous','previous','current'] : ['previous','current','current','previous']) {
      const start = performance.now();
      for (let i = 0; i < 4; i++) checksum += (implementation === 'previous' ? previousMealTargets : indexedMealTargets)().length;
      targetDurations[implementation].push((performance.now() - start) / 4);
    }
  }
  mealTargets[count] = {resourcePositions:subset.map(candidate => resourcePositions.get(candidate.meal.id)),previous:summary(targetDurations.previous),current:summary(targetDurations.current)};
}
const report = {fixture:'public/test-saves/v98/mixed-100.json',tick:world.tick,resources:world.resources.length,animals:world.wildlife.animals.length,foods:animalFoods(world,animal).length,plantMeals:plantMeals.length,checksum,protocol:'Interleaved ABBA blocks, 4 calls/block, 12 rounds, one immutable world after 40 warmup ticks; exact candidate arrays and meal targets compared first. Target IDs are sampled across resource-array positions.',food:{previous:summary(durations.previous),current:summary(durations.current)},mealTargets};
writeFileSync('artifacts/performance-wildlife-food-v113.json',`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify(report));
