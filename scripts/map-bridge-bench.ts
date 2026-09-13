import { performance } from 'node:perf_hooks';
import { cpus } from 'node:os';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { createWorld } from '../src/sim/index.ts';
import type { World } from '../src/sim/types.ts';
import { MAP_SIZE_PRESETS } from '../src/sim/map-config.ts';
import { SnapshotEncoder, SnapshotDecoder, type SnapshotAdoption, type SnapshotMessage } from '../src/bridge/snapshots.ts';

// This measures Node structuredClone, not browser IPC, simulation ticks, DOM or GPU frames.
// Example: node --experimental-strip-types scripts/map-bridge-bench.ts --sizes=64,250 --samples=60
const options = new Map<string, string>();
for (const argument of process.argv.slice(2)) {
  if (argument === '--help') {
    console.log('Options: --sizes=64,128,200,250 --seed=42 --samples=60 --warmup=20 --output=artifacts/map-bridge-benchmark.json');
    process.exit(0);
  }
  const match = /^--(sizes|seed|samples|warmup|output)=(.+)$/.exec(argument);
  if (!match || options.has(match[1]!)) throw new Error(`Unknown, missing or duplicated argument: ${argument}`);
  options.set(match[1]!, match[2]!);
}
function integerOption(name: string, fallback: number, min: number, max: number): number {
  const text = options.get(name);
  if (text === undefined) return fallback;
  const value = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`--${name} must be an integer between ${min} and ${max}.`);
  }
  return value;
}
const sizes = (options.get('sizes') ?? MAP_SIZE_PRESETS.join(',')).split(',').map(text => {
  const value = Number(text);
  if (!/^\d+$/.test(text) || !(MAP_SIZE_PRESETS as readonly number[]).includes(value)) {
    throw new Error(`--sizes accepts the playable presets: ${MAP_SIZE_PRESETS.join(',')}.`);
  }
  return value;
});
if (new Set(sizes).size !== sizes.length) throw new Error('--sizes must not contain duplicates.');
const seed = integerOption('seed', 42, 0, 0xffffffff);
const samples = integerOption('samples', 60, 10, 500);
const warmup = integerOption('warmup', 20, 0, 200);
const output = resolve(options.get('output') ?? 'artifacts/map-bridge-benchmark.json');

function summary(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return { median: sorted[Math.floor(sorted.length / 2)]!, p95: sorted[Math.ceil(sorted.length * 0.95) - 1]!, max: sorted.at(-1)! };
}
function assertEquivalent(result: SnapshotAdoption, world: World, stage: string): void {
  if (result.status !== 'applied' || !isDeepStrictEqual(result.world, world)) {
    throw new Error(`${stage} reconstruction differs from the source world.`);
  }
}

const rows = [];
for (const size of sizes) {
  const world = createWorld(seed, size, size);
  const encoder = new SnapshotEncoder(); const decoder = new SnapshotDecoder();
  const checkpoint = encoder.encode(world, 0.1, 1);
  decoder.adopt(structuredClone(checkpoint));
  const fullTimes: number[] = []; const deltaTimes: number[] = [];
  const encodeTimes: number[] = []; const cloneTimes: number[] = []; const adoptTimes: number[] = [];
  let packet: SnapshotMessage = checkpoint;
  let received: SnapshotAdoption = { status: 'stale' };

  for (let sample = -warmup; sample < samples; sample++) {
    // Only a dynamic scalar changes. Full and delta receive the exact same state.
    world.tick++;
    const full = () => {
      const started = performance.now();
      structuredClone({ type: 'snapshot', world, stepMs: 0.1, speed: 1 });
      if (sample >= 0) fullTimes.push(performance.now() - started);
    };
    const delta = () => {
      const started = performance.now();
      packet = encoder.encode(world, 0.1, 1);
      const encoded = performance.now();
      const transported = structuredClone(packet);
      const cloned = performance.now();
      received = decoder.adopt(transported);
      const adopted = performance.now();
      if (sample >= 0) {
        deltaTimes.push(adopted - started); encodeTimes.push(encoded - started);
        cloneTimes.push(cloned - encoded); adoptTimes.push(adopted - cloned);
      }
    };
    // Alternate order to reduce drift from always measuring one candidate first.
    if (sample % 2) { full(); delta(); } else { delta(); full(); }
  }
  assertEquivalent(received, world, 'Delta');
  const unchangedBytes = Buffer.byteLength(JSON.stringify(packet));

  // One illustrative edit; it is intentionally not reported as a percentile distribution.
  world.resources.splice(Math.floor(world.resources.length / 2), 1);
  const started = performance.now();
  const harvestPacket = encoder.encode(world, 0.1, 1);
  const harvested = decoder.adopt(structuredClone(harvestPacket));
  const harvestMs = performance.now() - started;
  assertEquivalent(harvested, world, 'Resource removal');
  rows.push({
    size, tiles: world.tiles.length, resourcesBeforeHarvest: world.resources.length + 1,
    // The reference checkpoint owns a live world reference; its JSON is sampled after removal.
    jsonBytes: { full: Buffer.byteLength(JSON.stringify(checkpoint)), unchangedDelta: unchangedBytes,
      removeOneDelta: Buffer.byteLength(JSON.stringify(harvestPacket)) },
    timingsMs: { fullStructuredClone: summary(fullTimes), deltaEncodeCloneAdopt: summary(deltaTimes),
      encode: summary(encodeTimes), clone: summary(cloneTimes), adopt: summary(adoptTimes), removeOneEncodeCloneAdopt: harvestMs },
  });
}

const result = {
  capturedAt: new Date().toISOString(), node: process.version, cpu: cpus()[0]?.model,
  platform: process.platform, architecture: process.arch, configuration: { seed, sizes, samples, warmup },
  conditions: `Node structuredClone microbenchmark, single process; seed ${seed}, 3 pawns, generated terrain/resources. `
    + `${warmup} warm-up and ${samples} paired samples per size with alternating order. `
    + 'Full snapshot clone compared with delta encode + clone + adopt of exactly the same world. '
    + 'JSON byte counts describe serialization size, not browser postMessage bandwidth; full JSON is sampled after the illustrative removal. '
    + 'Generation and initial checkpoint preparation are excluded. No DOM, GPU, IPC scheduling or frame-time measurement. '
    + 'Removal is a single illustrative sample, not a distribution.',
  rows,
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
