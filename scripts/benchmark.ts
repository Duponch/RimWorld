import { performance } from 'node:perf_hooks';
import { cpus, totalmem } from 'node:os';
import { addGroundMaterial, applyCommand, createWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import type { World } from '../src/sim/index.ts';

function fixture(count: number, withWork: boolean): World {
  const world = createWorld(42, 64, 64);
  world.tiles = world.tiles.map(() => ({ terrain: 'grass' }));
  world.resources = [];
  world.piles = []; world.stockpiles = [];
  world.pawns = Array.from({ length: count }, (_, index) => ({
    id: world.nextId++, name: `Bench ${index + 1}`, x: 1 + (index % 30) * 2, z: 1 + Math.floor(index / 30) * 2,
    hunger: 100, rest: 100, mood: 100, comfort: 50, memories: [], jobId: null, haul: null, cooking: null, need: null, bedId: null, needCooldown: 0, state: 'idle' as const,
    priorities: { gather: 2, build: 2, haul: 3, grow: 0 , cook: 0 }, path: [], moveCooldown: 0, planCooldown: 0,
  }));
  addGroundMaterial(world, 'food', count * 10, { x: 61, z: 61 });
  if (withWork) {
    for (let index = 0; index < Math.ceil(count * 12 / 75); index++) {
      const result = applyCommand(world, { type: 'stockpile', x: index + 1, z: 27, enabled: true, filters: { wood: true, food: false }, capacity: 75, priority: 4 });
      if (!result.ok) throw new Error(result.reason);
    }
    for (let index = 0; index < count; index++) {
      const x = 1 + (index % 30) * 2;
      const z = 35 + Math.floor(index / 30) * 2;
      world.resources.push({ id: world.nextId++, kind: 'tree', x, z, amount: 12 });
      const result = applyCommand(world, { type: 'designate', kind: 'chop', x, z });
      if (!result.ok) throw new Error(result.reason);
    }
  }
  return world;
}

function percentile(values: number[], proportion: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * proportion))]!;
}
const rounded = (value: number): number => Math.round(value * 1000) / 1000;

// Warm up the actual systems before collecting wall-clock timing. No renderer is involved.
for (let warmup = 0; warmup < 3; warmup++) stepWorld(fixture(30, true), 201);
const rows = [];
for (const count of [3, 30, 100, 300]) {
  const dispatch: number[] = [];
  const activeTick: number[] = [];
  const idleTick: number[] = [];
  let activeObservations = 0;
  let observations = 0;
  let completed = 0;
  let finalCompleted = 0;
  let stockpiledWood = 0;
  for (let sample = 0; sample < 5; sample++) {
    const working = fixture(count, true);
    let start = performance.now(); stepWorld(working); dispatch.push(performance.now() - start);
    for (let chunk = 0; chunk < 10; chunk++) {
      activeObservations += working.pawns.filter(pawn => pawn.jobId !== null || pawn.haul !== null).length;
      observations += count;
      start = performance.now(); stepWorld(working, 20); activeTick.push((performance.now() - start) / 20);
    }
    completed += count - working.jobs.length;
    stepWorld(working, 800);
    finalCompleted += count - working.jobs.length;
    stockpiledWood += working.piles.reduce((sum, pile) => sum + (pile.kind === 'wood' && pile.owner.type === 'ground'
      && working.stockpiles.some(zone => pile.owner.type === 'ground' && zone.x === pile.owner.x && zone.z === pile.owner.z) ? pile.quantity : 0), 0);
    const material = working.piles.reduce((sum, pile) => sum + (pile.kind === 'wood' ? pile.quantity : 0), 0)
      + working.resources.reduce((sum, resource) => sum + (resource.kind === 'tree' ? resource.amount : 0), 0);
    if (material !== count * 12) throw new Error(`Material loss at count=${count}: ${material}`);
    const idle = fixture(count, false);
    start = performance.now(); stepWorld(idle, 600); idleTick.push((performance.now() - start) / 600);
    for (const world of [working, idle]) {
      const errors = validateWorld(world);
      if (errors.length > 0) throw new Error(errors.join(' '));
    }
  }
  rows.push({ pawns: count, map: '64x64', initialJobs: count,
    dispatchMedianMs: rounded(percentile(dispatch, 0.5)), dispatchMaxMs: rounded(Math.max(...dispatch)),
    busyTickMedianMs: rounded(percentile(activeTick, 0.5)), busyTickP95Ms: rounded(percentile(activeTick, 0.95)),
    idleTickMedianMs: rounded(percentile(idleTick, 0.5)), activeObservationPercent: rounded(100 * activeObservations / observations),
    meanJobsCompletedAtTick201: completed / 5,
    meanJobsCompletedAtTick1001: finalCompleted / 5,
    meanWoodStoredAtTick1001: stockpiledWood / 5,
  });
}
console.log(JSON.stringify({
  timestamp: new Date().toISOString(), runtime: process.version, platform: process.platform, arch: process.arch,
  cpuModel: cpus()[0]?.model ?? 'unknown', logicalCPUCount: cpus().length, memoryBytes: totalmem(),
  method: 'Schema 2; five fresh worlds/count; first tick timed separately, 200 further ticks in 20-tick batches, then 800 untimed ticks to check gathering, physical haul outcomes and material conservation; independent 600-tick idle world. Stockpile capacity covers all wood; carrier limit 10. BFS, movement, work and haul included; no GPU, browser, renderer, persistence or DOM. p95 concerns batch mean ms/tick, not individual-tick tails. Functionality differs from the former schema-1 benchmark: timings are not a controlled A/B optimization comparison.',
  rows,
}, null, 2));
