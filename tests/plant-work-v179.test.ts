import { expect, test } from 'vitest';
import { applyCommand, createWorld, deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index';
import { gatherResource } from '../src/sim/gathering';
import { addMaterial, refreshStock } from '../src/sim/materials';
import { harvestRoll } from '../src/sim/plants';
import { xpRequired } from '../src/sim/skills';
import { resetWork, workProgress } from '../src/sim/work-progress';
import type { Pawn, Resource, World } from '../src/sim/types';

/** Deliberately prepared 32-cell fixture; all measured work still runs through the engine. */
function camp(work: 'grow' | 'gather' | 'build' = 'gather'): { world: World; pawn: Pawn } {
  const world = createWorld(42, 32, 32);
  world.tiles = world.tiles.map(() => ({ terrain: 'grass' }));
  world.resources = []; world.piles = []; world.jobs = []; world.structures = [];
  world.pawns = world.pawns.slice(0, 1);
  const pawn = world.pawns[0]!;
  Object.assign(pawn, { x: 8, z: 10, hunger: 100, rest: 100, recreation: { ...pawn.recreation, level: 100 }, jobId: null, haul: null, need: null, state: 'idle', path: [], planCooldown: 0 });
  pawn.schedule.fill('work');
  for (const key in pawn.priorities) pawn.priorities[key as keyof typeof pawn.priorities] = 0;
  pawn.priorities[work] = 1;
  pawn.skills.plants = { level: 8, xp: 0, dailyXp: 0, passion: 1 };
  refreshStock(world);
  return { world, pawn };
}

function until(world: World, predicate: () => boolean, limit = 600): number {
  let steps = 0;
  while (steps < limit && !predicate()) { stepWorld(world); steps++; }
  expect(predicate(), `tick ${world.tick}; jobs ${JSON.stringify(world.jobs)}`).toBe(true);
  return steps;
}

function plant(world: World, kind: Resource['kind'], x = 12, z = 10, amount = 1, species?: Resource['species']): Resource {
  const resource: Resource = { id: world.nextId++, kind, x, z, amount };
  if (kind !== 'tree' || species) { resource.growth = 1; resource.growthTick = world.tick; }
  if (species) resource.species = species;
  world.resources.push(resource);
  return resource;
}

/** Independent unsigned 32-bit oracle, expressed with BigInt rather than JS bitwise numbers. */
function draws(seed: number, count: number): { values: number[]; state: number } {
  const mask = 0xffffffffn;
  let state = BigInt(seed >>> 0);
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    state = (state ^ ((state << 13n) & mask)) & mask;
    state = (state ^ (state >> 17n)) & mask;
    state = (state ^ ((state << 5n) & mask)) & mask;
    values.push(Number(state) / 0x100000000);
  }
  return { values, state: Number(state) };
}

test('designated distant harvest earns Plants XP only after physical contact; cancellation keeps XP but creates no food', () => {
  const { world, pawn } = camp();
  const bush = plant(world, 'berries', 12, 10, 10);
  expect(applyCommand(world, { type: 'designate', kind: 'harvest', x: bush.x, z: bush.z }).ok).toBe(true);
  const job = world.jobs.find(candidate => candidate.kind === 'harvest')!;
  expect(applyCommand(world, { type: 'order-job', pawnId: pawn.id, jobId: job.id, queue: false }).ok).toBe(true);
  let traveled = false;
  for (let i = 0; i < 100 && workProgress(job) === 0; i++) {
    if (Math.abs(pawn.x - bush.x) + Math.abs(pawn.z - bush.z) > 1) {
      traveled = true;
      expect(pawn.skills.plants!.xp).toBe(0);
    }
    stepWorld(world);
  }
  expect(traveled).toBe(true);
  expect(workProgress(job)).toBeGreaterThan(0);
  expect(pawn.skills.plants!.xp).toBeGreaterThan(0);
  const earned = pawn.skills.plants!.xp;
  expect(applyCommand(world, { type: 'cancel', x: bush.x, z: bush.z }).ok).toBe(true);
  expect(world.resources).toContain(bush);
  expect(world.piles).toEqual([]);
  expect(pawn.skills.plants!.xp).toBe(earned);
  expect(validateWorld(world)).toEqual([]);
});

test('real sowing uses the new level on the leveling tick and resumes exactly during work', () => {
  const { world, pawn } = camp('grow');
  pawn.x = 11; pawn.z = 10;
  expect(applyCommand(world, { type: 'area', action: 'growing', from: { x: 12, z: 10 }, to: { x: 12, z: 10 } }).ok).toBe(true);
  until(world, () => world.jobs.some(job => job.kind === 'sow' && workProgress(job) > 0), 80);
  const sow = world.jobs.find(job => job.kind === 'sow')!;
  // Hold the real, reached work phase fixed; only the learned skill differs.
  resetWork(sow);
  pawn.skills.plants = { level: 7, xp: xpRequired(7) - 1, dailyXp: 0, passion: 1 };
  const control = deserializeWorld(serializeWorld(world));
  control.pawns[0]!.skills.plants!.xp = 0;
  stepWorld(world); stepWorld(control);
  expect(pawn.skills.plants!.level).toBe(8);
  expect(control.pawns[0]!.skills.plants!.level).toBe(7);
  expect(workProgress(world.jobs.find(job => job.id === sow.id)!)).toBeGreaterThan(workProgress(control.jobs.find(job => job.id === sow.id)!));
  const resumed = deserializeWorld(serializeWorld(world));
  until(world, () => world.resources.some(resource => resource.kind === 'rice'), 100);
  stepWorld(resumed, world.tick - resumed.tick);
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));
  expect(world.resources.some(resource => resource.kind === 'rice')).toBe(true);
  expect(validateWorld(world)).toEqual([]);
});

test('human harvest consumes failure, base-round and surplus-round draws in Core order; trees skip failure', () => {
  const examples = [
    { seed: 9728, level: 0, kind: 'wild-plant' as const, quantity: 0, count: 1 },
    { seed: 1, level: 0, kind: 'wild-plant' as const, quantity: 1, count: 2 },
    { seed: 11, level: 20, kind: 'wild-plant' as const, quantity: 2, count: 3 },
    { seed: 1, level: 0, kind: 'tree' as const, quantity: 1, count: 1 },
    { seed: 1, level: 20, kind: 'tree' as const, quantity: 2, count: 2 },
  ];
  for (const row of examples) {
    const { world, pawn } = camp();
    pawn.skills.plants = { level: row.level, xp: 0, dailyXp: 0, passion: 0 };
    const resource = plant(world, row.kind, 12, 10, 1, row.kind === 'tree' ? undefined : 'healroot-wild');
    world.rng = row.seed;
    const oracle = draws(row.seed, row.count);
    if (row.kind === 'tree') expect(oracle.values[0]).toBeLessThan(.6); // still no tree failure check
    else if (row.quantity === 0) expect(oracle.values[0]).toBeGreaterThan(.6);
    const preview = harvestRoll(world, resource, pawn);
    expect(preview).toEqual({ quantity: row.quantity, rng: oracle.state });
    expect(world.rng).toBe(row.seed); // preview is pure
    expect(gatherResource(world, resource, row.kind === 'tree' ? 'chop' : 'harvest', undefined, pawn)).toBe(row.quantity);
    expect(world.rng).toBe(oracle.state);
    expect(world.resources).not.toContain(resource);
    expect(world.piles.reduce((sum, pile) => sum + pile.quantity, 0)).toBe(row.quantity);
  }
});

test('productive tree chopping and sterile V91 cutting use Plants speed while only the tree earns XP', () => {
  const chop = camp();
  const tree = plant(chop.world, 'tree', 12, 10, 12);
  expect(applyCommand(chop.world, { type: 'designate', kind: 'chop', x: tree.x, z: tree.z }).ok).toBe(true);
  until(chop.world, () => !chop.world.resources.includes(tree), 250);
  expect(chop.pawn.skills.plants!.xp).toBeGreaterThan(0);
  expect(chop.pawn.skills.construction.xp).toBe(0);
  expect(chop.world.piles.some(pile => pile.item === 'wood')).toBe(true);

  const cutTime = (level: number): { ticks: number; xp: number; constructionXp: number } => {
    const { world, pawn } = camp();
    pawn.skills.plants!.level = level;
    const grass = plant(world, 'wild-plant', 12, 10, 0, 'grass');
    expect(applyCommand(world, { type: 'designate', kind: 'cut', x: grass.x, z: grass.z }).ok).toBe(true);
    const ticks = until(world, () => !world.resources.includes(grass), 1500);
    return { ticks, xp: pawn.skills.plants!.xp, constructionXp: pawn.skills.construction.xp };
  };
  const slow = cutTime(0), fast = cutTime(8);
  expect(fast.ticks).toBeLessThan(slow.ticks);
  expect([slow.xp, fast.xp, slow.constructionXp, fast.constructionXp]).toEqual([0, 0, 0, 0]);
});

test('a builder learns Plants from physical tree clearance, with exact mid-clearance save continuation', () => {
  const { world, pawn } = camp('build');
  const tree = plant(world, 'tree', 12, 10, 12);
  expect(applyCommand(world, { type: 'designate', kind: 'wall', x: tree.x, z: tree.z }).ok).toBe(true);
  until(world, () => world.jobs.some(job => (job.clearance?.progress ?? 0) > 0), 100);
  expect(pawn.skills.plants!.xp).toBeGreaterThan(0);
  expect(pawn.skills.construction.xp).toBe(0);
  const saved = deserializeWorld(serializeWorld(world));
  until(world, () => !world.resources.includes(tree), 250);
  stepWorld(saved, world.tick - saved.tick);
  expect(serializeWorld(saved)).toBe(serializeWorld(world));
  expect(pawn.skills.plants!.xp).toBeGreaterThan(0);
  expect(pawn.skills.construction.xp).toBe(0);
  expect(world.piles.some(pile => pile.item === 'wood')).toBe(true);
  expect(validateWorld(world)).toEqual([]);
});

test('full output area refuses a skilled bonus harvest without consuming plant, RNG, identity or material', () => {
  const { world, pawn } = camp();
  pawn.skills.plants!.level = 20;
  const root = plant(world, 'wild-plant', 12, 10, 1, 'healroot-wild');
  world.rng = 11;
  for (let z = 0; z < world.height; z++) for (let x = 0; x < world.width; x++) {
    if (Math.abs(x - root.x) + Math.abs(z - root.z) <= 12) addMaterial(world, 'wood', 75, { type: 'ground', x, z });
  }
  const before = JSON.stringify(world), nextId = world.nextId, rng = world.rng;
  expect(gatherResource(world, root, 'harvest', undefined, pawn)).toBeNull();
  expect(JSON.stringify(world)).toBe(before);
  expect(world.resources[0]).toBe(root);
  expect(world.rng).toBe(rng);
  expect(world.nextId).toBe(nextId);
  world.piles = []; refreshStock(world);
  expect(gatherResource(world, root, 'harvest', undefined, pawn)).toBe(2);
  expect(world.rng).toBe(draws(11, 3).state);
  expect(world.piles.filter(pile => pile.item === 'herbal-medicine').reduce((sum, pile) => sum + pile.quantity, 0)).toBe(2);
});
