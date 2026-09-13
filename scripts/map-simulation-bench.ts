/** CPU-only paired comparison; run with node --experimental-strip-types. */
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus, platform, release } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import * as current from '../src/sim/index.ts';
import * as navigation from '../src/sim/pathfinding.ts';
import type { World } from '../src/sim/types.ts';

const baselineRoot = resolve(process.argv[2] ?? 'tmp/map-baseline');
const controlRoot = resolve('tmp/map-benchmark/bounds-only');
mkdirSync(controlRoot, { recursive: true });
cpSync(resolve(baselineRoot, 'src/sim'), controlRoot, { recursive: true });
// This control only relaxes generation and schema-2 size guards. The baseline tree stays intact.
for (const name of ['generation.ts', 'serialization.ts']) {
  const file = resolve(controlRoot, name);
  const source = readFileSync(file, 'utf8');
  writeFileSync(file, source.replaceAll('<= 128', '<= 250').replaceAll('8, 128)', '8, 250)').replaceAll('between 8 and 128', 'between 8 and 250'));
}
const baseline: typeof current = await import(pathToFileURL(resolve(controlRoot, 'index.ts')).href);
const baselineNavigation: typeof navigation = await import(pathToFileURL(resolve(controlRoot, 'pathfinding.ts')).href);
if (baseline.createWorld(42).schemaVersion !== current.createWorld(42).schemaVersion) throw new Error('Historical A/B requires matching rule schemas. For V3 physical needs use scripts/needs-bench.ts; do not compare different gameplay outcomes as equivalent.');
const samples = 3;
const percentile = (values: number[], ratio: number): number => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1)]!;
const stats = (values: number[]) => ({ medianMs: percentile(values, 0.5), p95Ms: percentile(values, 0.95), maxMs: Math.max(...values), samples: values.length });
function elapsed(operation: () => unknown): number { const started = performance.now(); operation(); return performance.now() - started; }

function fixture(size: number, population: number, active: boolean): World {
  const world = current.createWorld(42, size, size);
  const prototype = world.pawns[0]!;
  if (population > world.pawns.length) {
    const free = world.tiles.map((tile, index) => ({ tile, x: index % size, z: Math.floor(index / size), index }))
      .filter(cell => !['water', 'rock'].includes(cell.tile.terrain) && !world.pawns.some(pawn => pawn.x === cell.x && pawn.z === cell.z))
      .sort((a, b) => Math.abs(a.x - size / 2) + Math.abs(a.z - size / 2) - Math.abs(b.x - size / 2) - Math.abs(b.z - size / 2) || a.index - b.index);
    for (let i = world.pawns.length; i < population; i++) {
      const cell = free[i - 3]!;
      world.pawns.push({ ...structuredClone(prototype), id: world.nextId++, name: `Bench ${i}`, x: cell.x, z: cell.z });
    }
  }
  if (active) {
    const reachable = navigation.reachableCells(world, prototype, navigation.blockedCells(world), new Set());
    const targets = world.resources.filter(item => item.kind !== 'rock' && navigation.routeToJob(world, item, reachable) !== null)
      .sort((a, b) => Math.abs(a.x - size / 2) + Math.abs(a.z - size / 2) - Math.abs(b.x - size / 2) - Math.abs(b.z - size / 2) || a.id - b.id)
      .slice(0, population === 3 ? 8 : 100);
    for (const item of targets) {
      const result = current.applyCommand(world, { type: 'designate', kind: item.kind === 'tree' ? 'chop' : 'harvest', x: item.x, z: item.z });
      if (!result.ok) throw new Error(result.reason);
    }
  }
  const errors = current.validateWorld(world);
  if (errors.length) throw new Error(errors.join(' '));
  return world;
}

const rows: object[] = [];
for (const size of [64, 128, 250]) {
  console.error(`CPU benchmark: ${size}x${size}`);
  const generation: Record<string, number[]> = { control: [], current: [] };
  const serialization: Record<string, number[]> = { control: [], current: [] };
  const deserialization: Record<string, number[]> = { control: [], current: [] };
  const flood: Record<string, number[]> = { control: [], current: [] };
  let serializedBytes = 0;
  for (let repeat = -2; repeat < samples; repeat++) {
    for (const [name, api, pathApi] of repeat % 2 === 0
      ? [['control', baseline, baselineNavigation], ['current', current, navigation]] as const
      : [['current', current, navigation], ['control', baseline, baselineNavigation]] as const) {
      let world: World;
      const generationMs = elapsed(() => { world = api.createWorld(42, size, size); });
      let serialized = '';
      const serializationMs = elapsed(() => { serialized = api.serializeWorld(world!); });
      const deserializationMs = elapsed(() => api.deserializeWorld(serialized));
      const blocked = pathApi.blockedCells(world!);
      const floodMs = elapsed(() => { for (let i = 0; i < 20; i++) pathApi.reachableCells(world!, world!.pawns[0]!, blocked, new Set()); }) / 20;
      serializedBytes = Buffer.byteLength(serialized);
      if (repeat >= 0) { generation[name]!.push(generationMs); serialization[name]!.push(serializationMs); deserialization[name]!.push(deserializationMs); flood[name]!.push(floodMs); }
    }
  }
  const generated = current.createWorld(42, size, size);
  if (JSON.stringify(generated) !== JSON.stringify(baseline.createWorld(42, size, size))) throw new Error(`Generation changed at ${size}`);
  rows.push({ size, phase: 'map-operations', serializedBytes, resourceCount: generated.resources.length,
    control: { generation: stats(generation.control!), serialize: stats(serialization.control!), deserialize: stats(deserialization.control!), flood: stats(flood.control!) },
    current: { generation: stats(generation.current!), serialize: stats(serialization.current!), deserialize: stats(deserialization.current!), flood: stats(flood.current!) } });
  for (const population of [3, 100]) for (const active of [false, true]) {
    const initial = fixture(size, population, active);
    const measurements: Record<string, number[]> = { control: [], current: [] };
    const totals: Record<string, number[]> = { control: [], current: [] };
    const ticks = active ? 400 : 1000;
    let jobsRemaining = 0; let exactContinuation = true;
    for (let repeat = -1; repeat < samples; repeat++) {
      const snapshots: string[] = [];
      for (const [name, api] of repeat % 2 === 0 ? [['control', baseline], ['current', current]] as const : [['current', current], ['control', baseline]] as const) {
        const world = structuredClone(initial); let totalMs = 0;
        for (let tick = 0; tick < ticks; tick += 20) {
          const batchMs = elapsed(() => api.stepWorld(world, 20)); totalMs += batchMs;
          if (repeat >= 0) measurements[name]!.push(batchMs / 20);
        }
        if (repeat >= 0) totals[name]!.push(totalMs);
        const errors = api.validateWorld(world); if (errors.length) throw new Error(`${size}/${population}: ${errors.join(' ')}`);
        snapshots.push(JSON.stringify(world)); jobsRemaining = world.jobs.length;
      }
      exactContinuation &&= snapshots[0] === snapshots[1];
    }
    if (!exactContinuation) throw new Error(`Simulation changed: ${size}/${population}/${active}`);
    rows.push({ size, population, phase: active ? 'active-gather' : 'idle', ticksPerSample: ticks, jobsInitially: initial.jobs.length, jobsRemaining, exactContinuation,
      control: { tickBatchMean: stats(measurements.control!), total: stats(totals.control!) },
      current: { tickBatchMean: stats(measurements.current!), total: stats(totals.current!) } });
  }
}
console.log(JSON.stringify({ measuredAt: new Date().toISOString(), environment: { node: process.version, os: `${platform()} ${release()}`, cpu: cpus()[0]?.model, logicalCpus: cpus().length },
  baseline: '5a27d9e; control copy only relaxes map generation and schema-2 validation bounds to250',
  method: 'Sequential CPU-only Node comparison; variant order alternates, two map warmups/one simulation warmup, three measured repetitions. Tick metrics are20-tick batch averages, not single-tick latency. No GPU/FPS claim. Each paired continuation and generated world must match exactly. Active fixtures gather nearby resources; congestion may leave jobs unfinished.', rows }, null, 2));
