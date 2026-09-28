/** Local worker-path profile on one migrated, mixed 250x250 save.
 *
 * Run with: node --experimental-strip-types scripts/profile-worker-v146.ts
 * Optional: --warmup=20 --ticks=60
 * This deliberately publishes one snapshot per tick. It is not the native
 * worker's event/clock-driven publication frequency or a browser benchmark.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { gunzipSync } from 'node:zlib';
import { MotionRecorder } from '../src/bridge/motion-tracks.ts';
import { PresentationChanges } from '../src/bridge/presentation-changes.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { deserializeWorld, stepWorld } from '../src/sim/index.ts';

const SAVE_PATH = 'public/test-saves/v98/mixed-100.json';
const OUTPUT_PATH = 'tmp/profile-worker-v146.json';
const STAGES = [
  'stepWorld', 'motionCapture', 'presentationChangesCapture',
  'snapshotEncode', 'motionSnapshot', 'structuredCloneProxy', 'total',
] as const;
type Stage = typeof STAGES[number];
type Row = Record<Stage, number> & { tick: number; kind: 'checkpoint' | 'delta' };

function integerOption(name: string, fallback: number, minimum: number, maximum: number): number {
  const prefix = `--${name}=`;
  const matches = process.argv.slice(2).filter(arg => arg.startsWith(prefix));
  if (matches.length > 1) throw new Error(`--${name} may be supplied only once.`);
  const raw = matches[0]?.slice(prefix.length);
  if (raw === undefined) return fallback;
  if (!/^(0|[1-9]\d*)$/.test(raw)) throw new Error(`--${name} must be an integer from ${minimum} to ${maximum}.`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
    throw new Error(`--${name} must be an integer from ${minimum} to ${maximum}.`);
  return value;
}
for (const arg of process.argv.slice(2)) {
  if (!/^--(?:warmup|ticks)=/.test(arg)) throw new Error(`Unknown option: ${arg}`);
}
const warmup = integerOption('warmup', 20, 0, 500);
const ticks = integerOption('ticks', 60, 1, 500);

const stored = readFileSync(SAVE_PATH, 'utf8');
const envelope = JSON.parse(stored);
const rawWorld = envelope?.format === 'lisiere-save' && envelope.codec === 'gzip-base64'
  ? gunzipSync(Buffer.from(envelope.payload, 'base64')).toString('utf8') : stored;
// Migration and strict save validation happen before any timed tick.
const world = deserializeWorld(rawWorld);
const initialTick = world.tick;
const originalSchema = JSON.parse(rawWorld).schemaVersion;
const motion = new MotionRecorder();
const presentationChanges = new PresentationChanges();
const snapshots = new SnapshotEncoder();

function sample(): Row {
  const totalStart = performance.now();
  const row = { tick: 0, kind: 'delta' as 'checkpoint' | 'delta',
    stepWorld: 0, motionCapture: 0, presentationChangesCapture: 0,
    snapshotEncode: 0, motionSnapshot: 0, structuredCloneProxy: 0, total: 0 };
  let start = performance.now();
  stepWorld(world);
  row.stepWorld += performance.now() - start;

  start = performance.now();
  motion.capture(world);
  row.motionCapture += performance.now() - start;
  start = performance.now();
  presentationChanges.capture(world);
  row.presentationChangesCapture += performance.now() - start;

  start = performance.now();
  const encoded = snapshots.encode(world, row.stepWorld, 6);
  row.snapshotEncode += performance.now() - start;
  start = performance.now();
  const tracks = motion.snapshot();
  row.motionSnapshot += performance.now() - start;
  const message = { ...encoded, motion: tracks };
  start = performance.now();
  const cloned = structuredClone(message);
  row.structuredCloneProxy += performance.now() - start;
  if (cloned.revision !== encoded.revision || cloned.world.tick !== world.tick)
    throw new Error('Snapshot clone did not preserve the published tick and revision.');
  row.tick = world.tick;
  row.kind = encoded.kind;
  row.total = performance.now() - totalStart;
  return row;
}

for (let index = 0; index < warmup; index++) sample();
const measured = Array.from({ length: ticks }, () => sample());

function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (fraction: number) => sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]!;
  return { n: sorted.length, mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    p50: at(0.5), p95: at(0.95), max: sorted.at(-1)! };
}
let commit: string | null = null;
try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
catch { /* The file hash still identifies the input when Git is unavailable. */ }
const report = {
  timestamp: new Date().toISOString(), commit,
  runtime: process.version, platform: process.platform, arch: process.arch,
  cpuModel: cpus()[0]?.model ?? 'unknown',
  fixture: { path: SAVE_PATH, sha256: createHash('sha256').update(stored).digest('hex'),
    originalSchema, migratedSchema: world.schemaVersion, initialTick,
    width: world.width, height: world.height, pawns: world.pawns.length,
    animals: world.wildlife?.animals.length ?? 0 },
  protocol: {
    warmupTicks: warmup, measuredTicks: ticks, publication: 'one snapshot per tick in this local profile',
    captureCallsPerTick: { motion: 1, presentationChanges: 1 },
    structuredCloneProxy: 'Node structuredClone of the complete snapshot message; a proxy for synchronous postMessage cloning, not measured worker postMessage, transfer, queueing, main-thread adoption, rendering, or GPU time',
    caveat: 'No FixedClock, 20 ms worker timer, speed pacing, event-driven publication, browser, or concurrent main thread. Percentiles describe individual consecutive ticks after warmup on this evolving world.',
  },
  measuredRange: { firstTick: measured[0]!.tick, lastTick: measured.at(-1)!.tick,
    checkpoints: measured.filter(row => row.kind === 'checkpoint').length,
    deltas: measured.filter(row => row.kind === 'delta').length },
  millisecondsPerTick: Object.fromEntries(STAGES.map(stage => [stage, summarize(measured.map(row => row[stage]))])),
};
mkdirSync('tmp', { recursive: true });
writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: OUTPUT_PATH, measuredRange: report.measuredRange,
  millisecondsPerTick: report.millisecondsPerTick }, null, 2));
