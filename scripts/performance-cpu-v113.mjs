import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { decodeStoredSave } from '../src/ui/save-storage-codec.ts';
import { deserializeWorld, serializeWorld, stepWorld } from '../src/sim/index.ts';
import { MotionRecorder } from '../src/bridge/motion-tracks.ts';
import { PresentationChanges } from '../src/bridge/presentation-changes.ts';
import { SnapshotDecoder, SnapshotEncoder } from '../src/bridge/snapshots.ts';

const label = process.argv[2] ?? 'before';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid report label');
const warmupTicks = 40;
const measuredTicks = 120;
const world = deserializeWorld(await decodeStoredSave(readFileSync('public/test-saves/v98/mixed-100.json', 'utf8')));
for (let i = 0; i < warmupTicks; i++) stepWorld(world);
const startSave = serializeWorld(world);
const encoder = new SnapshotEncoder();
const decoder = new SnapshotDecoder();
const phase = new PresentationChanges();
const motion = new MotionRecorder();
const samples = Object.fromEntries(['tick', 'phase', 'motion', 'phaseRepeat', 'motionRepeat', 'encode', 'clone', 'decode'].map(key => [key, []]));
const time = (key, action) => {
  const start = performance.now();
  const value = action();
  samples[key].push(performance.now() - start);
  return value;
};
let phaseChanges = 0;
phase.capture(world); motion.capture(world);
const first = structuredClone({ ...encoder.encode(world, 0, 6), motion: motion.snapshot() });
assert.equal(decoder.adopt(first).status, 'applied');
for (let i = 0; i < measuredTicks; i++) {
  time('tick', () => stepWorld(world));
  time('motion', () => motion.capture(world));
  if (time('phase', () => phase.capture(world))) phaseChanges++;
  time('phaseRepeat', () => phase.capture(world));
  time('motionRepeat', () => motion.capture(world));
  const packet = time('encode', () => ({ ...encoder.encode(world, 0, 6), motion: motion.snapshot() }));
  const cloned = time('clone', () => structuredClone(packet));
  assert.equal(time('decode', () => decoder.adopt(cloned)).status, 'applied');
}
const finalSave = serializeWorld(world);
const continuation = deserializeWorld(startSave);
stepWorld(continuation, measuredTicks);
assert.equal(serializeWorld(continuation), finalSave, 'Transport observer must not change simulation decisions');
const stats = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return { n: values.length, total: values.reduce((a, b) => a + b, 0), p50: sorted[Math.floor(sorted.length * .5)], p95: sorted[Math.ceil(sorted.length * .95) - 1], max: sorted.at(-1) };
};
const report = {
  label,
  fixture: 'public/test-saves/v98/mixed-100.json',
  protocol: 'Node CPU only; 40 warmup ticks, 120 measured ticks; one worker-like publish per tick with current repeat phase/motion captures; structuredClone approximates postMessage clone. Exact continuation compared from the same post-warmup save. No browser, GPU, or real-time 6x throughput claim.',
  world: { width: world.width, height: world.height, pawns: world.pawns.length, animals: world.wildlife?.animals.length ?? 0, resources: world.resources.length, piles: world.piles.length },
  warmupTicks, measuredTicks, phaseChanges,
  stages: Object.fromEntries(Object.entries(samples).map(([key, values]) => [key, stats(values)])),
  finalTick: world.tick, finalRng: world.rng,
  finalSaveSha256: createHash('sha256').update(finalSave).digest('hex'),
};
writeFileSync(`artifacts/performance-cpu-v113-${label}.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
