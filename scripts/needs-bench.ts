/** CPU simulation only. The previous remote-eating engine has different outcomes,
 * so it is deliberately not used as a performance-equivalent control. */
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { createWorld, stepWorld, validateWorld, addGroundMaterial, refreshStock } from '../src/sim/index.ts';
const percentile = (samples: number[], p: number) => [...samples].sort((a, b) => a - b)[Math.ceil(samples.length * p) - 1];
function fixture(size: number, count: number) {
  const world = createWorld(42, size, size), template = world.pawns[0]!;
  world.tiles = world.tiles.map(() => ({ terrain: 'grass' })); world.resources = []; world.piles = []; world.stockpiles = [];
  world.pawns = Array.from({ length: count }, (_, index) => ({ ...structuredClone(template), id: world.nextId++, x: 3 + (index % 10) * 5, z: 3 + Math.floor(index / 10) * 5, hunger: 20, rest: 19 }));
  for (const pawn of world.pawns) {
    addGroundMaterial(world, 'food', 1, { x: pawn.x + 2, z: pawn.z });
    pawn.bedId = world.nextId++;
    world.structures.push({ id: pawn.bedId, kind: 'bed', x: pawn.x, z: pawn.z + 2, orientation: 0, footprint: 'standard' });
  }
  refreshStock(world); return world;
}
const rows = [];
for (const size of [64, 250]) for (const count of [3, 100]) {
  const phases: Record<string, number[]> = { decisionsAndTravel: [], sleeping: [] };
  for (let repeat = -1; repeat < 3; repeat++) {
    const world = fixture(size, count);
    for (let tick = 0; tick < 400; tick++) {
      const start = performance.now(); stepWorld(world); const ms = performance.now() - start;
      if (repeat >= 0) phases[tick < 200 ? 'decisionsAndTravel' : 'sleeping']!.push(ms);
    }
    const errors = validateWorld(world);
    if (errors.length || world.stock.food !== 0 || world.pawns.some(pawn => pawn.state !== 'sleeping' || pawn.need?.kind !== 'sleep' || pawn.need.bedId !== pawn.bedId)) throw new Error(JSON.stringify({ size, count, errors, stock: world.stock, pawns: world.pawns }));
  }
  rows.push({ size, count, meals: count, occupiedBeds: count, phases: Object.fromEntries(Object.entries(phases).map(([name, samples]) => [name, { samples: samples.length, medianMs: percentile(samples, 0.5), p95Ms: percentile(samples, 0.95), maxMs: Math.max(...samples) }])) });
}
const result = { timestamp: new Date().toISOString(), node: process.version, cpu: cpus()[0]?.model, schema: 3, scenario: 'Open terrain, individual food portions and assigned beds; 400 ticks, 1 warmup and 3 measured runs. No renderer or worker messaging.', rows };
writeFileSync('artifacts/needs-benchmark.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
