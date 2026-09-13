import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { hashWorld, stepWorld, validateWorld, SCHEMA_VERSION } from '../src/sim/index.ts';
import { diningFixture } from './fixtures/dining.ts';

const percentile = (samples: number[], p: number) => [...samples].sort((a, b) => a - b)[Math.ceil(samples.length * p) - 1];
const rows = [];
for (const size of [64, 250]) for (const count of [3, 100]) {
  const phases: Record<string, number[]> = { mealsAndTravel: [], sleeping: [] };
  const hashes = new Set<string>(); let seated = 0;
  for (let repeat = -1; repeat < 3; repeat++) {
    const world = diningFixture(size, count); const diners = new Set<number>();
    for (let tick = 0; tick < 400; tick++) {
      const start = performance.now(); stepWorld(world); const ms = performance.now() - start;
      if (repeat >= 0) phases[tick < 200 ? 'mealsAndTravel' : 'sleeping']!.push(ms);
      for (const pawn of world.pawns) if (pawn.state === 'eating' && pawn.need?.kind === 'eat' && pawn.need.dining?.seatId !== null) diners.add(pawn.id);
    }
    const errors = validateWorld(world); seated = diners.size;
    if (errors.length || world.stock.food !== 0 || seated !== count || world.pawns.some(pawn => pawn.state !== 'sleeping' || pawn.need?.kind !== 'sleep' || pawn.need.bedId !== pawn.bedId || pawn.memories.length > 0)) throw new Error(JSON.stringify({ size, count, errors, seated, stock: world.stock, pawns: world.pawns }));
    hashes.add(hashWorld(world));
  }
  if (hashes.size !== 1) throw new Error('Non-deterministic audit outcomes');
  rows.push({ size, count, seated, mealsConsumed: count, occupiedBeds: count, hash: [...hashes][0], phases: Object.fromEntries(Object.entries(phases).map(([name, samples]) => [name, { samples: samples.length, medianMs: percentile(samples, 0.5), p95Ms: percentile(samples, 0.95), maxMs: Math.max(...samples) }])) });
}
const control = existsSync('artifacts/dining-benchmark-before.json') ? JSON.parse(readFileSync('artifacts/dining-benchmark-before.json', 'utf8')) : null;
const comparison = control ? { control: 'artifacts/dining-benchmark-before.json', sameFinalStates: rows.every(row => control.rows.some((before: typeof row) => before.size === row.size && before.count === row.count && before.hash === row.hash)), note: 'Timing comparison only valid if final states match; no comparison with schema 3 gameplay.' } : null;
const result = { navigation: 'Nearest-goal BFS layers for food, preferred dining seat and owned bed; full flood for general work.', comparison, timestamp: new Date().toISOString(), node: process.version, cpu: cpus()[0]?.model, schema: SCHEMA_VERSION, scenario: '400 ticks, 1 warmup + 3 measured runs. Open terrain, individual portions, tables/stools and owned beds. CPU only, no IPC/rendering; not a congestion test. Different outcomes from pre-dining benchmark; no speedup claim.', rows };
writeFileSync('artifacts/dining-benchmark.json', JSON.stringify(result, null, 2) + '\n');
writeFileSync('tmp/dining-render-fixture.json', JSON.stringify(diningFixture(250, 100, true)));
console.log(JSON.stringify(result, null, 2));
