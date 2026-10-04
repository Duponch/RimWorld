/** Frozen-source local diagnostic, not a throughput/GPU benchmark.
 *
 * node --experimental-strip-types scripts/profile-consolidation-v209.ts
 * Optional: --warmup=20 --ticks=60 --sampling-us=1000
 *
 * First runs the existing worker-stage profiler sequentially (unchanged stage
 * cadence), then samples only a separate stepWorld 20+60 continuation through
 * Node inspector. Migration, validation, serialization and oracle continuation
 * occur outside the inspector window. No renderer/native worker is involved.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { Session, type Protocol } from 'node:inspector';
import { cpus } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { gunzipSync } from 'node:zlib';

const SAVE_PATH = 'public/test-saves/v98/mixed-100.json';
const OUTPUT_DIRECTORY = 'tmp/consolidation-v209';
const REPORT_PATH = `${OUTPUT_DIRECTORY}/profile.json`;
const STAGES_PATH = `${OUTPUT_DIRECTORY}/worker-stages.json`;
const CPU_PROFILE_PATH = `${OUTPUT_DIRECTORY}/stepWorld.cpuprofile`;
const SOURCE_MANIFEST_PATH = `${OUTPUT_DIRECTORY}/profile-sources.json`;
const SOURCE_PROTOCOL_PATH = 'scripts/profile-consolidation-v209.ts';
const WORKER_PROTOCOL_PATH = 'scripts/profile-worker-v146.ts';
const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

function integerOption(name: string, fallback: number, minimum: number, maximum: number): number {
  const matching = process.argv.slice(2).filter(value => value.startsWith(`--${name}=`));
  if (matching.length > 1) throw new Error(`Duplicate option --${name}.`);
  const raw = matching[0]?.slice(name.length + 3);
  if (raw === undefined) return fallback;
  if (!/^(0|[1-9]\d*)$/.test(raw)) throw new Error(`Invalid --${name}.`);
  const number = Number(raw);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) throw new Error(`--${name} must be ${minimum}..${maximum}.`);
  return number;
}
for (const argument of process.argv.slice(2)) if (!/^--(?:warmup|ticks|sampling-us)=/.test(argument)) throw new Error(`Unknown option ${argument}.`);
const warmup = integerOption('warmup', 20, 0, 500);
const ticks = integerOption('ticks', 60, 1, 500);
const samplingUs = integerOption('sampling-us', 1000, 100, 10_000);

function sourceManifest(): Record<string, string> {
  const paths: string[] = [SOURCE_PROTOCOL_PATH, WORKER_PROTOCOL_PATH, 'package.json', 'package-lock.json', SAVE_PATH];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path); else paths.push(path);
    }
  };
  visit('src');
  return Object.fromEntries(paths.map(path => relative(process.cwd(), resolve(path)).replaceAll('\\', '/')).sort()
    .map(path => [path, sha256(readFileSync(path))]));
}
const sourcesBefore = sourceManifest();
const sourceFingerprint = sha256(JSON.stringify(sourcesBefore));
const assertFrozenSources = (): void => {
  if (JSON.stringify(sourceManifest()) !== JSON.stringify(sourcesBefore)) throw new Error('Sources changed during profiling; timings are invalid.');
};
mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
writeFileSync(SOURCE_MANIFEST_PATH, `${JSON.stringify({ sourceFingerprint, files: sourcesBefore }, null, 2)}\n`);
const { deserializeWorld, serializeWorld, stepWorld, validateWorld } = await import('../src/sim/index.ts');
assertFrozenSources();

// Reuse the existing complete worker-stage implementation. Its uninstrumented
// timings belong to a separate sequential process and must not be mixed with
// inspector overhead or mistaken for actual event-driven worker publications.
execFileSync(process.execPath, ['--experimental-strip-types', WORKER_PROTOCOL_PATH,
  `--warmup=${warmup}`, `--ticks=${ticks}`, `--output=${STAGES_PATH}`], { stdio: 'inherit' });
assertFrozenSources();
const stages = JSON.parse(readFileSync(STAGES_PATH, 'utf8')) as {
  fixture: { sha256: string; migratedSchema: number; initialTick: number };
  measuredRange: { firstTick: number; lastTick: number };
  millisecondsPerTick: Record<string, { n: number; mean: number; p50: number; p95: number; max: number }>;
  protocol: unknown;
};

const stored = readFileSync(SAVE_PATH, 'utf8'), envelope = JSON.parse(stored);
const raw = envelope?.format === 'lisiere-save' && envelope.codec === 'gzip-base64'
  ? gunzipSync(Buffer.from(envelope.payload, 'base64')).toString('utf8') : stored;
const world = deserializeWorld(raw), initialTick = world.tick;
if (stages.fixture.sha256 !== sha256(stored) || stages.fixture.migratedSchema !== world.schemaVersion)
  throw new Error('Worker-stage profile and inspector profile differ in fixture/schema.');
const initialErrors = validateWorld(world);
if (initialErrors.length) throw new Error(`Invalid migrated input: ${initialErrors.join(' ')}`);
for (let index = 0; index < warmup; index++) stepWorld(world);
const warmedErrors = validateWorld(world);
if (warmedErrors.length) throw new Error(`Invalid warmed input: ${warmedErrors.join(' ')}`);
const measuredStart = serializeWorld(world);
const warmedRoundtrip = deserializeWorld(measuredStart);
if (serializeWorld(warmedRoundtrip) !== measuredStart) throw new Error('Warm checkpoint roundtrip changed the authoritative World.');

const inspector = new Session(); inspector.connect();
const post = <T = unknown>(method: string, parameters: Record<string, unknown> = {}): Promise<T> =>
  new Promise((resolveResult, reject) => inspector.post(method, parameters,
    (error, result) => error ? reject(error) : resolveResult(result as T)));
const milliseconds: number[] = [];
let profile: Protocol.Profiler.Profile;
try {
  await post('Profiler.enable');
  await post('Profiler.setSamplingInterval', { interval: samplingUs });
  await post('Profiler.start');
  // Deliberately no snapshot encode, serialization, validation or logging here.
  for (let index = 0; index < ticks; index++) {
    const started = performance.now(); stepWorld(world); milliseconds.push(performance.now() - started);
  }
  profile = (await post<Protocol.Profiler.StopReturnType>('Profiler.stop')).profile;
} finally { inspector.disconnect(); }
writeFileSync(CPU_PROFILE_PATH, `${JSON.stringify(profile)}\n`);
assertFrozenSources();

const measuredEnd = serializeWorld(world), finalErrors = validateWorld(world);
if (finalErrors.length) throw new Error(`Invalid profiled output: ${finalErrors.join(' ')}`);
const resumed = deserializeWorld(measuredEnd);
if (serializeWorld(resumed) !== measuredEnd) throw new Error('Final checkpoint roundtrip changed the authoritative World.');
// Compare the SAME measured World with its saved/restored copy. This extra tick
// is outside the profile; never replace it with a freshly generated colony.
stepWorld(world); stepWorld(resumed);
const continued = serializeWorld(world), resumedContinued = serializeWorld(resumed);
if (continued !== resumedContinued) throw new Error('One-tick continuation/PRNG differs after the measured checkpoint.');
if (validateWorld(world).length || validateWorld(resumed).length) throw new Error('Oracle continuation produced an invalid World.');
assertFrozenSources();

const byId = new Map(profile.nodes.map(node => [node.id, node]));
const parents = new Map<number, number>();
for (const node of profile.nodes) for (const child of node.children ?? []) parents.set(child, node.id);
const rootIds = new Set(profile.nodes.filter(node => node.callFrame.functionName === 'stepWorld'
  && /(?:^|\/)src\/sim\/engine\.ts$/.test(node.callFrame.url.replaceAll('\\', '/'))).map(node => node.id));
if (!rootIds.size) throw new Error('Inspector could not locate the actual stepWorld frame; attribution is invalid.');
interface FunctionRow { function: string; file: string; line: number; column: number; selfSamples: number; selfMs: number; inclusiveMs: number }
const functions = new Map<string, FunctionRow>();
const record = (id: number): FunctionRow => {
  const frame = byId.get(id)!.callFrame, file = frame.url.replaceAll('\\', '/');
  const key = `${file}:${frame.lineNumber}:${frame.columnNumber}:${frame.functionName}`;
  let row = functions.get(key);
  if (!row) {
    row = { function: frame.functionName || '(anonymous)', file, line: frame.lineNumber + 1,
      column: frame.columnNumber + 1, selfSamples: 0, selfMs: 0, inclusiveMs: 0 };
    functions.set(key, row);
  }
  return row;
};
let attributableSamples = 0, attributableMs = 0, otherSamples = 0, otherMs = 0, garbageCollectorMs = 0;
const samples = profile.samples ?? [], deltas = profile.timeDeltas ?? [];
for (let index = 0; index < samples.length; index++) {
  const id = samples[index]!, elapsed = (deltas[index] ?? samplingUs) / 1000;
  const stack: number[] = [];
  let current: number | undefined = id;
  while (current !== undefined) { stack.push(current); current = parents.get(current); }
  const root = stack.findIndex(nodeId => rootIds.has(nodeId));
  if (root < 0) {
    otherSamples++; otherMs += elapsed;
    if (byId.get(id)?.callFrame.functionName === '(garbage collector)') garbageCollectorMs += elapsed;
    continue;
  }
  attributableSamples++; attributableMs += elapsed;
  const leaf = record(id); leaf.selfSamples++; leaf.selfMs += elapsed;
  // Recursion may represent a function repeatedly on one stack. Attribute its
  // inclusive time once per sample instead of adding each recursive occurrence.
  const seen = new Set<FunctionRow>();
  for (const nodeId of stack.slice(0, root + 1)) {
    const row = record(nodeId); if (!seen.has(row)) { row.inclusiveMs += elapsed; seen.add(row); }
  }
}
const rows = [...functions.values()].map(row => ({ ...row,
  selfPercent: attributableMs ? row.selfMs / attributableMs * 100 : 0,
  inclusivePercent: attributableMs ? row.inclusiveMs / attributableMs * 100 : 0,
  selfMsPerMeasuredTick: row.selfMs / ticks, inclusiveMsPerMeasuredTick: row.inclusiveMs / ticks }));
const selfRanking = [...rows].sort((a, b) => b.selfMs - a.selfMs || a.file.localeCompare(b.file));
const inclusiveRanking = [...rows].sort((a, b) => b.inclusiveMs - a.inclusiveMs || a.file.localeCompare(b.file));
const summarize = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (fraction: number) => sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]!;
  return { n: values.length, mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    p50: percentile(.5), p95: percentile(.95), max: sorted.at(-1)! };
};
const stageMean = stages.millisecondsPerTick.total.mean;
const normalizedStages = Object.entries(stages.millisecondsPerTick).map(([stage, statistics]) => ({ stage, ...statistics,
  meanPercentOfLocalStageTotal: statistics.mean / stageMean * 100 }));
let commit: string | null = null;
try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch {}
const report = {
  timestamp: new Date().toISOString(), commit, runtime: process.version, platform: process.platform, arch: process.arch,
  cpuModel: cpus()[0]?.model ?? 'unknown', sourceFingerprint,
  fixture: { path: SAVE_PATH, sha256: sha256(stored), originalSchema: JSON.parse(raw).schemaVersion,
    migratedSchema: world.schemaVersion, initialTick, width: world.width, height: world.height,
    pawns: world.pawns.length, animals: world.wildlife?.animals.length ?? 0 },
  protocol: { warmupTicks: warmup, measuredTicks: ticks, samplingIntervalMicroseconds: samplingUs,
    inspector: 'Only consecutive stepWorld calls. Imports, migration, warmup, validation, serialization, observers and continuation oracle are outside the sampled window.',
    workerStages: { path: STAGES_PATH, reusedScript: WORKER_PROTOCOL_PATH, ...{ details: stages.protocol } },
    caveats: 'Sampling is approximate and inspector adds overhead. GC and samples without a stepWorld ancestor are reported separately. Worker-stage timings use a different sequential run with one publication per tick and Node structuredClone proxy; no browser postMessage queue, adoption, frame/RAF or GPU is measured. No gain or general throughput follows from this diagnostic.' },
  measuredRange: { firstTick: initialTick + warmup + 1, lastTick: initialTick + warmup + ticks },
  oracle: { exactWarmRoundtrip: true, exactFinalRoundtrip: true, exactOneTickContinuation: true,
    warmedCheckpointSha256: sha256(measuredStart), finalCheckpointSha256: sha256(measuredEnd), continuedCheckpointSha256: sha256(continued) },
  millisecondsPerTickWithInspector: summarize(milliseconds), workerStagesNormalized: normalizedStages,
  sampling: { samples: samples.length, attributableSamples, attributableMs, otherSamples, otherMs, garbageCollectorMs },
  topFunctionsBySelf: selfRanking.slice(0, 40), topFunctionsByInclusive: inclusiveRanking.slice(0, 40), functions: rows,
  outputs: { report: REPORT_PATH, cpuProfile: CPU_PROFILE_PATH, sources: SOURCE_MANIFEST_PATH, workerStages: STAGES_PATH },
};
writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.table(report.topFunctionsBySelf.slice(0, 20).map(row => ({ function: row.function,
  location: `${row.file.replace(/^.*\/src\//, 'src/')}:${row.line}`,
  selfPercent: row.selfPercent.toFixed(2), inclusivePercent: row.inclusivePercent.toFixed(2), selfMs: row.selfMs.toFixed(2) })));
console.log(JSON.stringify({ output: REPORT_PATH, sourceFingerprint, oracle: report.oracle,
  millisecondsPerTickWithInspector: report.millisecondsPerTickWithInspector, workerStagesNormalized: normalizedStages }, null, 2));
