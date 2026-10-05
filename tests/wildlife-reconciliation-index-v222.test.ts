import { expect, test } from 'vitest';
import { preparePredationDemo } from '../scripts/create-test-save-predation-v190.ts';
import { adultAgeTicks, animalLifeStage } from '../src/sim/animal-life.ts';
import { applyCommand, createWorld } from '../src/sim/engine.ts';
import { addGroundMaterial, refreshStock } from '../src/sim/materials.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import type { Resource, World } from '../src/sim/types.ts';
import { animalMealTarget } from '../src/sim/wildlife-food.ts';
import { cancelAnimalExit, exitSuppressed } from '../src/sim/wildlife-exit.ts';
import { animalNavigation, moveAnimal } from '../src/sim/wildlife-navigation.ts';
import { reconcileAnimalPredation } from '../src/sim/wildlife-predation.ts';
import { enableWildlife, reconcileWildlife } from '../src/sim/wildlife.ts';
import { HARE, type WildAnimal } from '../src/sim/wildlife-state.ts';

/** Frozen reconcileWildlife from V221 415e3472, wildlife.ts:114–129.
 * The unchanged domain predicates remain live. In particular no competing
 * meal index may replace the order-dependent cancellation in this loop. */
function scalarReconcileWildlife(world:World,resourcesById?:ReadonlyMap<number,Resource>,workCells?:ReadonlySet<number>):void {
  const animals=world.wildlife?.animals??[];
  const mates=animals.some(a=>a.mating)?new Map(animals.map(a=>[a.id,a])):undefined;
  for(const a of animals){
    if(a.predation)reconcileAnimalPredation(world,a);
    if(a.exiting&&exitSuppressed(a))cancelAnimalExit(world,a);
    if(a.meal&&!animalMealTarget(world,a,resourcesById,workCells)){delete a.meal;a.path=[];a.state=a.motion&&a.motion.end>world.tick?'moving':'idle';a.nextDecision=world.tick;}
    if(a.mating){
      const female=mates?.get(a.mating.femaleId);
      if(a.state==='dead'||!a.domestic||animalLifeStage(a)!=='adult'||!female||female.state==='dead'||!female.domestic
        ||animalLifeStage(female)!=='adult'||female.species!==a.species||female.sex!=='female'||female.pregnancy){
        delete a.mating;a.path=[];a.nextDecision=world.tick;
      }
    }
  }
}

type Capture = readonly [ReadonlyMap<number, Resource> | undefined, ReadonlySet<number> | undefined];
const streams = (w: World) => ({ world: w.rng, wildlife: w.wildlife?.rng, fire: w.fires?.rng });
function compareWithScalar(w: World, capture: (world: World) => Capture = () => [undefined, undefined]): void {
  const reference = structuredClone(w), before = streams(w);
  scalarReconcileWildlife(reference, ...capture(reference));
  reconcileWildlife(w, ...capture(w));
  expect(w).toStrictEqual(reference);
  expect(streams(w)).toEqual(before);
  expect(streams(reference)).toEqual(before);
}

/** Prepared ordinary berries and adult hares; no physiology, tick, ingestion
 * or product is advanced. Each unmodified fixture is a valid complete World. */
function appendPlantMeals(w: World, count: number): WildAnimal[] {
  const added: WildAnimal[] = [];
  for (let i = 0; i < count; i++) {
    const x = 3 + i % 20, z = 3 + Math.floor(i / 20);
    const plant: Resource = { id: w.nextId++, kind: 'berries', x, z, amount: 10, growth: 1, growthTick: w.tick };
    w.resources.push(plant);
    const animal: WildAnimal = { id: w.nextId++, species: 'hare', sex: i % 2 ? 'female' : 'male',
      ageTicks: adultAgeTicks('hare'), x, z, food: HARE.nutrition * .2, rest: .5,
      state: 'eating', path: [], nextDecision: w.tick,
      meal: { kind: 'plant', id: plant.id, quantity: 1, progress: 0 } };
    w.wildlife!.animals.push(animal); added.push(animal);
  }
  return added;
}
function fixture(meals: number): World {
  const w = createWorld(222, 32, 32);
  w.tiles = w.tiles.map(() => ({ terrain: 'grass' }));
  w.resources = []; w.jobs = []; w.structures = []; w.piles = []; w.packed = [];
  enableWildlife(w, 0); appendPlantMeals(w, meals); refreshStock(w);
  return w;
}

test.each([0, 1, 15, 16, 100])('reconciliation matches the scalar World and every retained RNG with %i active plant meals', meals => {
  const w = fixture(meals), initial = structuredClone(w);
  expect(validateWorld(w)).toEqual([]);
  compareWithScalar(w);
  expect(w).toStrictEqual(initial);
  expect(validateWorld(w)).toEqual([]);
});

test.each([false, true])('competing plant intentions are rechecked after each cancellation, reversed=%s', reversed => {
  const w = fixture(16), [first, second] = w.wildlife!.animals;
  expect(validateWorld(w)).toEqual([]);
  // This transient double claim is deliberately not a loadable checkpoint.
  // In either order, the first claimant loses and releases the last claimant.
  second!.meal!.id = first!.meal!.id;
  if (reversed) w.wildlife!.animals.reverse();
  const claimants = w.wildlife!.animals.filter(a => a.id === first!.id || a.id === second!.id);
  compareWithScalar(w);
  expect(claimants[0]!.meal).toBeUndefined();
  expect(claimants[1]!.meal?.id).toBe(w.resources[0]!.id);
  expect(validateWorld(w)).toEqual([]);
});

test('a malformed duplicate resource identity still keeps the scalar first-match verdict', () => {
  const w = fixture(16), first = w.resources[0]!;
  expect(validateWorld(w)).toEqual([]);
  // Predicate-only corruption, deliberately not a loadable World. The later
  // ripe duplicate must not conceal the first exhausted resource from .find.
  w.resources.push({ ...first, growth: 1 }); first.growth = 0;
  compareWithScalar(w);
  expect(w.wildlife!.animals[0]!.meal).toBeUndefined();
  expect(w.resources).toHaveLength(17);
});

test('fresh reconciliation observes resource replacement, removal and job claims between calls at the same tick', () => {
  const w = fixture(16), a = w.wildlife!.animals[0]!, plant = w.resources[0]!, worker = w.pawns[0]!;
  const meal = structuredClone(a.meal!), tick = w.tick;
  expect(validateWorld(w)).toEqual([]); compareWithScalar(w);
  w.resources[0] = { ...plant, growth: 0 };
  compareWithScalar(w); expect(a.meal).toBeUndefined();
  expect(validateWorld(w)).toEqual([]);
  w.resources[0] = { ...plant }; a.meal = structuredClone(meal); a.state = 'eating';
  compareWithScalar(w); expect(a.meal).toEqual(meal);
  w.resources = w.resources.filter(r => r.id !== plant.id);
  compareWithScalar(w); expect(a.meal).toBeUndefined();
  expect(validateWorld(w)).toEqual([]);
  w.resources.unshift({ ...plant }); a.meal = structuredClone(meal); a.state = 'eating';
  const job = { id: w.nextId++, kind: 'harvest' as const, x: plant.x, z: plant.z,
    orientation: 0 as const, footprint: 'standard' as const, status: 'active' as const,
    reservedBy: worker.id, progress: 0, escrow: { wood: 0, food: 0 } };
  worker.x = plant.x - 1; worker.z = plant.z; worker.jobId = job.id; worker.state = 'working';
  w.jobs.push(job);
  compareWithScalar(w); expect(a.meal).toBeUndefined();
  expect(validateWorld(w)).toEqual([]);
  w.jobs = []; worker.jobId = null; worker.state = 'idle';
  a.meal = structuredClone(meal); a.state = 'eating';
  compareWithScalar(w); expect(a.meal).toEqual(meal);
  expect(w.tick).toBe(tick); expect(validateWorld(w)).toEqual([]);
});

test('a cancelled plant intention retains its actual committed edge and body position', () => {
  const w = fixture(16), a = w.wildlife!.animals[0]!, plantId = a.meal!.id;
  a.x--; a.path = [{ x: a.x + 1, z: a.z }, { x: a.x + 2, z: a.z }]; a.state = 'moving';
  expect(moveAnimal(w, a, animalNavigation(w).step)).toBe(true);
  const motion = structuredClone(a.motion), position = { x: a.x, z: a.z }, food = a.food;
  expect(validateWorld(w)).toEqual([]);
  w.resources = w.resources.filter(r => r.id !== plantId);
  compareWithScalar(w);
  expect(a.meal).toBeUndefined(); expect(a.path).toEqual([]);
  expect(a.motion).toEqual(motion); expect({ x: a.x, z: a.z }).toEqual(position);
  expect(a.state).toBe('moving'); expect(a.food).toBe(food);
  expect(validateWorld(w)).toEqual([]);
});

test('pile quantities and human claims stay live alongside sixteen plant meals', () => {
  const w = fixture(18), [first, second] = w.wildlife!.animals, sourceCell = { x: 3, z: 3 };
  w.resources = w.resources.slice(2);
  addGroundMaterial(w, 'food', 6, sourceCell, 'rice'); refreshStock(w);
  const pile = w.piles[0]!;
  for (const a of [first!, second!]) a.meal = { kind: 'pile', id: pile.id, quantity: 2, progress: 0 };
  expect(applyCommand(w, { type: 'stockpile', x: 25, z: 25, enabled: true, capacity: 75, filters: { wood: false, food: true } }).ok).toBe(true);
  expect(applyCommand(w, { type: 'order-haul', pawnId: w.pawns[0]!.id, target: { type: 'pile', pileId: pile.id }, queue: false }).ok).toBe(true);
  expect(w.pawns[0]!.haul?.quantity).toBe(2);
  expect(validateWorld(w)).toEqual([]); compareWithScalar(w);
  expect(first!.meal?.quantity).toBe(2); expect(second!.meal?.quantity).toBe(2);
  // A reduced source is a transient overreservation. Cancellation must free
  // the first animal's claim before the second animal is checked.
  pile.quantity = 5; refreshStock(w);
  const cargo = structuredClone(w.pawns[0]!.haul);
  compareWithScalar(w);
  expect(first!.meal).toBeUndefined(); expect(second!.meal?.quantity).toBe(2);
  expect(w.pawns[0]!.haul).toEqual(cargo); expect(pile.quantity).toBe(5);
  expect(validateWorld(w)).toEqual([]);
});

test('explicit caller captures remain authoritative, including an intentionally empty resource lookup', () => {
  const missing = fixture(16);
  compareWithScalar(missing, () => [new Map(), undefined]);
  expect(missing.wildlife!.animals.every(a => !a.meal)).toBe(true);
  expect(validateWorld(missing)).toEqual([]);
  const claimed = fixture(16), key = claimed.resources[0]!.z * claimed.width + claimed.resources[0]!.x;
  compareWithScalar(claimed, w => [new Map(w.resources.map(r => [r.id, r])), new Set([key])]);
  expect(claimed.wildlife!.animals[0]!.meal).toBeUndefined();
  expect(claimed.wildlife!.animals.slice(1).every(a => !!a.meal)).toBe(true);
  expect(validateWorld(claimed)).toEqual([]);
});

test('mating is retained for available adults and cancelled when the female becomes pregnant', () => {
  const w = fixture(18), male = w.wildlife!.animals[16]!, female = w.wildlife!.animals[17]!;
  for (const a of [male, female]) {
    delete a.meal; a.state = 'idle';
    a.domestic = { since: w.tick, care: 'none', tameness: 5, nextDecay: w.tick + 6000 };
  }
  male.sex = 'male'; female.sex = 'female';
  male.mating = { femaleId: female.id, progress: 12 };
  expect(validateWorld(w)).toEqual([]); compareWithScalar(w);
  expect(male.mating).toEqual({ femaleId: female.id, progress: 12 });
  female.pregnancy = { fatherId: male.id, progress: 0 };
  compareWithScalar(w); expect(male.mating).toBeUndefined(); expect(male.path).toEqual([]);
  expect(female.pregnancy).toEqual({ fatherId: male.id, progress: 0 });
  expect(validateWorld(w)).toEqual([]);
});

test('suppressed departure keeps the real edge while releasing its remaining exit path', () => {
  const w = fixture(17), a = w.wildlife!.animals[16]!;
  delete a.meal; a.x = 2; a.z = 25; a.food = 0; a.state = 'moving';
  a.path = [{ x: 1, z: 25 }, { x: 0, z: 25 }];
  a.exiting = { destination: { x: 0, z: 25 }, nextFoodCheck: w.tick + 100 };
  expect(moveAnimal(w, a, animalNavigation(w).step)).toBe(true);
  expect(validateWorld(w)).toEqual([]); compareWithScalar(w);
  expect(a.exiting).toBeDefined();
  const motion = structuredClone(a.motion), position = { x: a.x, z: a.z };
  a.food = .01;
  compareWithScalar(w);
  expect(a.exiting).toBeUndefined(); expect(a.path).toEqual([]);
  expect(a.motion).toEqual(motion); expect({ x: a.x, z: a.z }).toEqual(position);
  expect(a.state).toBe('moving'); expect(validateWorld(w)).toEqual([]);
});

test('predation remains live and a removed prey releases only its unstarted route', () => {
  const w = preparePredationDemo({ domesticPrey: false }), [fox, prey] = w.wildlife!.animals;
  appendPlantMeals(w, 16);
  fox!.predation = { targetId: prey!.id, startedAtCore: w.tick * 10, firstHit: true };
  fox!.path = [{ x: fox!.x + 1, z: fox!.z }]; fox!.state = 'moving';
  expect(validateWorld(w)).toEqual([]); compareWithScalar(w);
  expect(fox!.predation?.targetId).toBe(prey!.id);
  const position = { x: fox!.x, z: fox!.z };
  w.wildlife!.animals = w.wildlife!.animals.filter(a => a.id !== prey!.id);
  compareWithScalar(w);
  expect(fox!.predation).toBeUndefined(); expect(fox!.path).toEqual([]); expect(fox!.state).toBe('idle');
  expect({ x: fox!.x, z: fox!.z }).toEqual(position);
  expect(validateWorld(w)).toEqual([]);
});
