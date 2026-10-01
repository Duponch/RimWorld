/** V177 local snapshot benchmark. Run only after the baseline file is frozen.
 *
 * node --experimental-strip-types scripts/snapshot-encode-bench-v177.ts --baseline=tmp/snapshot-encoder-v177-baseline.ts --warmup=20 --ticks=60 --scan-warmup=200 --scan-samples=200
 *
 * The baseline must match ac1f067:src/bridge/snapshots.ts, with at most the
 * ../sim/ to ../src/sim/ import relocation needed under tmp/.
 * This local script is run explicitly; it starts no browser.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { SnapshotDecoder, SnapshotEncoder, type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { TileSnapshotCache, type TileDelta } from '../src/bridge/tile-snapshot-cache.ts';
import { MotionRecorder } from '../src/bridge/motion-tracks.ts';
import { AudioCueRecorder } from '../src/bridge/audio-cues.ts';
import { PresentationChanges } from '../src/bridge/presentation-changes.ts';
import { applyCommand, deserializeWorld, stepWorld } from '../src/sim/index.ts';
import type { Tile, World } from '../src/sim/types.ts';

const REFERENCE = 'ac1f067';
const SAVE_PATH = 'public/test-saves/v98/mixed-100.json';
const OUTPUT_PATH = 'tmp/snapshot-encode-bench-v177.json';
const options = new Map<string, string>();
const oracleOnly = process.argv.includes('--oracle-only');
for (const arg of process.argv.slice(2)) {
  if (arg === '--oracle-only') continue;
  const match = /^--(baseline|warmup|ticks|scan-warmup|scan-samples)=(.+)$/.exec(arg);
  if (!match || options.has(match[1]!)) throw Error(`Unknown or repeated option: ${arg}`);
  options.set(match[1]!, match[2]!);
}
const baselinePath = options.get('baseline');
if (!baselinePath) throw Error('Supply --baseline=tmp/<frozen HEAD snapshots.ts>.');
function count(name: 'warmup' | 'ticks' | 'scan-warmup' | 'scan-samples', fallback: number, minimum: number, maximum: number): number {
  const raw = options.get(name);
  if (raw === undefined) return fallback;
  if (!/^(0|[1-9]\d*)$/.test(raw)) throw Error(`Invalid --${name}.`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw Error(`Invalid --${name}.`);
  return value;
}
const warmup = count('warmup', 20, 0, 500), ticks = count('ticks', 60, 1, 500);
const scanWarmup = count('scan-warmup', 200, 200, 5000);
const scanSamples = count('scan-samples', 200, 200, 5000);
const sha256 = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
const frozen = readFileSync(baselinePath);
// Oracle-only diagnostics can run in sandboxes that forbid child Git processes;
// the measured protocol always verifies the committed source below.
const committed = oracleOnly ? frozen : execFileSync('git', ['show', `${REFERENCE}:src/bridge/snapshots.ts`]);
// The only permitted transformation is the import relocation required by a
// baseline module placed in tmp, plus PowerShell's newline conversion and one
// appended terminal newline. Compare every other source byte.
const adapted = committed.toString('utf8').replaceAll("'../sim/", "'../src/sim/");
const normalizeEol = (source: string): string => source.replaceAll('\r\n', '\n');
const actualSource = normalizeEol(frozen.toString('utf8'));
const exactSource = normalizeEol(committed.toString('utf8'));
const adaptedSource = normalizeEol(adapted);
assert.ok([exactSource, `${exactSource}\n`, adaptedSource, `${adaptedSource}\n`].includes(actualSource),
  'Baseline is not the exact ac1f067 source (or its import-relocated copy).');
mkdirSync('tmp', { recursive: true });
const modulePath = resolve('tmp/v177-snapshot-baseline-loaded.ts');
writeFileSync(modulePath, adapted);
const { SnapshotEncoder: BaselineEncoder } = await import(pathToFileURL(modulePath).href) as typeof import('../src/bridge/snapshots.ts');

const stored = readFileSync(SAVE_PATH, 'utf8');
const envelope = JSON.parse(stored);
const rawWorld = envelope?.format === 'lisiere-save' && envelope.codec === 'gzip-base64'
  ? gunzipSync(Buffer.from(envelope.payload, 'base64')).toString('utf8') : stored;
const migrated = deserializeWorld(rawWorld);
assert.equal(migrated.width, 250); assert.equal(migrated.height, 250);
const originalSchema = JSON.parse(rawWorld).schemaVersion;

// The oracle uses independent mutable Worlds and clones each packet before
// another edit can alter the packet's dynamic-world reference. Decoded frames
// are compared to independent frozen expected Worlds, including all PRNG data.
function oracle(): { publications: number; cases: string[] } {
  let a: World = structuredClone(migrated), b: World = structuredClone(migrated);
  const ea = new BaselineEncoder(), eb = new SnapshotEncoder();
  const da = new SnapshotDecoder(), db = new SnapshotDecoder();
  const cases: string[] = [];
  const priorFrames: Array<{ actualA: World; actualB: World; frozenA: World; frozenB: World }> = [];
  let publications = 0;
  function pair(label: string, checkpoint = false, adopt = true): void {
    assert.deepStrictEqual(a, b, `Source Worlds diverged: ${label}`);
    assert.equal(a.rng, b.rng, `PRNG diverged: ${label}`);
    const expectedA = structuredClone(a), expectedB = structuredClone(b);
    const ma = structuredClone(ea.encode(a, 0, 6, checkpoint));
    const mb = structuredClone(eb.encode(b, 0, 6, checkpoint));
    assert.deepStrictEqual(ma, mb, `Messages diverged: ${label}`);
    assert.equal(JSON.stringify(ma), JSON.stringify(mb), `Message serialization diverged: ${label}`);
    publications++;
    if (!adopt) return;
    const ra = da.adopt(ma), rb = db.adopt(mb);
    assert.equal(ra.status, 'applied', `Baseline decode refused: ${label} (${ra.status === 'resync' ? ra.reason : ra.status})`);
    assert.equal(rb.status, 'applied', `Candidate decode refused: ${label} (${rb.status === 'resync' ? rb.reason : rb.status})`);
    if (ra.status !== 'applied' || rb.status !== 'applied') throw Error(`Decode refused: ${label}`);
    assert.deepStrictEqual(ra.world, expectedA, `Baseline World lost data: ${label}`);
    assert.deepStrictEqual(rb.world, expectedB, `Candidate World lost data: ${label}`);
    assert.deepStrictEqual(ra.world, rb.world, `Decoded Worlds diverged: ${label}`);
    for (const frame of priorFrames) {
      assert.deepStrictEqual(frame.actualA, frame.frozenA, `Earlier baseline frame changed: ${label}`);
      assert.deepStrictEqual(frame.actualB, frame.frozenB, `Earlier candidate frame changed: ${label}`);
    }
    priorFrames.push({ actualA: ra.world, actualB: rb.world,
      frozenA: structuredClone(ra.world), frozenB: structuredClone(rb.world) });
    if (priorFrames.length > 2) priorFrames.shift();
    cases.push(label);
  }
  const tileIndex = migrated.tiles.findIndex(t => (t.terrain === 'soil' || t.terrain === 'grass') && t.floor === undefined);
  const rockIndex = migrated.tiles.findIndex(t => t.terrain === 'rock' && t.stone !== undefined && t.ore === undefined && t.miningDamage === undefined);
  const otherRock = migrated.tiles.findIndex((t, i) => i !== rockIndex && t.terrain === 'rock' && t.stone !== undefined && t.ore === undefined && t.miningDamage === undefined);
  assert.ok(tileIndex >= 0 && rockIndex >= 0 && otherRock >= 0 && migrated.resources.length > 2 && migrated.piles.length > 1);
  const edit = (fn: (w: World) => void): void => { fn(a); fn(b); assert.deepStrictEqual(a, b); };
  pair('initial checkpoint');
  for (let i = 0; i < 3; i++) {
    edit(w => { stepWorld(w); });
    pair(`natural tick ${i + 1}`);
  }
  pair('unchanged same tick');
  edit(w => { const p = w.pawns[0]!, value = p.priorities.gather === 0 ? 1 : 0; assert.equal(applyCommand(w, { type: 'priority', pawnId: p.id, work: 'gather', value }).ok, true); });
  pair('command publication, same tick');
  edit(w => { const rock = w.tiles[rockIndex]!; rock.stone = rock.stone === 'marble' ? 'slate' : 'marble'; });
  pair('in-place stone only, same tick');
  edit(w => { w.tiles[tileIndex]!.floor = 'wood-planks'; w.tiles[rockIndex]!.miningDamage = 80; });
  pair('in-place floor and miningDamage, same tick');
  edit(w => { delete w.tiles[tileIndex]!.floor; delete w.tiles[rockIndex]!.miningDamage; w.tiles[otherRock]!.ore = 'steel'; });
  pair('floor and damage removal, ore addition, same tick');
  edit(w => { delete w.tiles[otherRock]!.ore; w.tiles[tileIndex] = { terrain: w.tiles[tileIndex]!.terrain === 'soil' ? 'grass' : 'soil' }; });
  pair('terrain replacement and ore removal, same tick');
  edit(w => { w.resources[0]!.amount += 1; w.resources.reverse(); });
  pair('resource value and ordering, same tick');
  edit(w => { w.resources.splice(1, 1); w.resources.push({ id: w.nextId++, kind: 'rock', x: 5, z: 5, amount: 1, stone: 'slate' }); });
  pair('resource removal and addition, same tick');
  edit(w => { w.resources[0] = { ...w.resources[0]!, amount: w.resources[0]!.amount + 1 }; });
  pair('resource object replacement, same tick');
  const pileId = a.nextId;
  edit(w => { w.piles.push({ id: w.nextId++, kind: 'wood', item: 'wood', quantity: 1,
    owner: { type: 'ground', x: tileIndex % w.width, z: Math.floor(tileIndex / w.width) } }); });
  pair('plain ground pile addition, same tick');
  edit(w => { w.piles.find(item => item.id === pileId)!.quantity = 2; });
  pair('in-place pile value, same tick');
  edit(w => { w.piles.reverse(); w.piles.splice(1, 1); });
  pair('pile reorder and removal, same tick');
  pair('same-epoch explicit checkpoint', true);
  edit(w => { w.tick++; }); pair('missed delta', false, false);
  edit(w => { w.tick++; }); pair('delta after missing revision', false, false);
  // Both consumers must reject the gap atomically and recover at this revision.
  const missedA = structuredClone(ea.encode(a, 0, 6));
  const missedB = structuredClone(eb.encode(b, 0, 6));
  assert.deepStrictEqual(missedA, missedB);
  assert.equal(da.adopt(missedA).status, 'resync');
  assert.equal(db.adopt(missedB).status, 'resync');
  pair('same-epoch recovery checkpoint', true);
  a = structuredClone(migrated); b = structuredClone(migrated);
  a.tiles[tileIndex] = { terrain: 'soil' }; b.tiles[tileIndex] = { terrain: 'soil' };
  pair('replacement World, new epoch');
  return { publications, cases };
}
const checked = oracle();
if (oracleOnly) { console.log(JSON.stringify({ oracle: checked, baselineSha256: sha256(frozen) }, null, 2)); process.exit(0); }

type Constructor = new () => SnapshotEncoder;
type Stage = 'stepWorld' | 'capture' | 'encode' | 'cloneProxy' | 'localWorkerTotal';
type Row = Record<Stage, number> & { tick: number; kind: SnapshotMessage['kind'] };
const stageNames: Stage[] = ['stepWorld', 'capture', 'encode', 'cloneProxy', 'localWorkerTotal'];
function summary(values: number[]) {
  const sorted = [...values].sort((x, y) => x - y);
  const at = (q: number) => sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)]!;
  return { n: values.length, mean: values.reduce((x, y) => x + y, 0) / values.length,
    p50: at(.5), p95: at(.95), max: sorted.at(-1)! };
}
function pass(which: 'A' | 'B', Encoder: Constructor) {
  const world = structuredClone(migrated), encoder = new Encoder();
  const motion = new MotionRecorder(), audio = new AudioCueRecorder(), phases = new PresentationChanges();
  motion.capture(world); audio.capture(world); phases.capture(world);
  structuredClone(encoder.encode(world, 0, 6)); // initial checkpoint outside timing
  const rows: Row[] = [];
  for (let i = 0; i < warmup + ticks; i++) {
    const totalStart = performance.now();
    let start = totalStart;
    stepWorld(world);
    const stepMs = performance.now() - start;
    start = performance.now();
    motion.capture(world); audio.capture(world); phases.capture(world);
    const cues = audio.drain(), tracks = motion.snapshot();
    const captureMs = performance.now() - start;
    start = performance.now();
    const encoded = encoder.encode(world, stepMs, 6);
    const encodeMs = performance.now() - start;
    start = performance.now();
    const cloned = structuredClone({ ...encoded, motion: tracks, ...(cues.length ? { audioCues: cues } : {}) });
    const cloneMs = performance.now() - start;
    const totalMs = performance.now() - totalStart;
    if (i >= warmup) rows.push({ tick: world.tick, kind: cloned.kind,
      stepWorld: stepMs, capture: captureMs, encode: encodeMs,
      cloneProxy: cloneMs, localWorkerTotal: totalMs });
  }
  return { which, finalWorld: world, rows,
    stages: Object.fromEntries(stageNames.map(name => [name, summary(rows.map(row => row[name]))])),
    packetKinds: { checkpoints: rows.filter(row => row.kind === 'checkpoint').length,
      deltas: rows.filter(row => row.kind === 'delta').length } };
}

// A/B/B/A, each pass starts at the same independently cloned migrated World.
// No oracle, serialization or hashing runs inside the timed intervals.
const passes = [pass('A', BaselineEncoder), pass('B', SnapshotEncoder),
  pass('B', SnapshotEncoder), pass('A', BaselineEncoder)];
for (const p of passes.slice(1)) {
  assert.deepStrictEqual(p.finalWorld, passes[0]!.finalWorld, 'Natural World diverged between passes.');
  assert.equal(p.finalWorld.rng, passes[0]!.finalWorld.rng, 'Natural PRNG diverged between passes.');
}

// The historical five-array loop is reproduced literally for an isolated tile
// scan. The extracted candidate diff is compared tuple-for-tuple before timing.
// Neither probe includes dynamic World encoding, postMessage proxy or decoder.
class BaselineTileScan {
  private terrain: Tile['terrain'][] = [];
  private stones: Tile['stone'][] = [];
  private damage: Tile['miningDamage'][] = [];
  private ores: Tile['ore'][] = [];
  private floors: Tile['floor'][] = [];
  reset(tiles: readonly Tile[]): void {
    this.terrain = tiles.map(tile => tile.terrain);
    this.stones = tiles.map(tile => tile.stone);
    this.damage = tiles.map(tile => tile.miningDamage);
    this.ores = tiles.map(tile => tile.ore);
    this.floors = tiles.map(tile => tile.floor);
  }
  diff(worldTiles: readonly Tile[]): TileDelta[] {
    const tiles: TileDelta[] = [];
    for (let index = 0; index < worldTiles.length; index++) {
      const { terrain, stone, miningDamage: damage, ore, floor } = worldTiles[index]!;
      if (this.terrain[index] !== terrain || this.stones[index] !== stone || this.damage[index] !== damage
        || this.ores[index] !== ore || this.floors[index] !== floor) {
        tiles.push(floor !== undefined ? [index, terrain, stone, damage, ore, floor]
          : ore !== undefined ? [index, terrain, stone, damage, ore]
          : damage !== undefined ? [index, terrain, stone, damage]
          : stone === undefined ? [index, terrain] : [index, terrain, stone]);
        this.terrain[index] = terrain; this.stones[index] = stone; this.damage[index] = damage;
        this.ores[index] = ore; this.floors[index] = floor;
      }
    }
    return tiles;
  }
}
const floorCell = migrated.tiles.findIndex(t => (t.terrain === 'soil' || t.terrain === 'grass') && t.floor === undefined);
const oreCell = migrated.tiles.findIndex(t => t.terrain === 'rock' && t.stone !== undefined && t.ore === undefined && t.miningDamage === undefined);
assert.ok(floorCell >= 0 && oreCell >= 0);
function scanEdit(tiles: Tile[], index: number): void {
  if (index % 4 === 0) tiles[floorCell]!.floor = tiles[floorCell]!.floor === undefined ? 'wood-planks' : undefined;
  if (index % 5 === 0) tiles[oreCell]!.miningDamage = tiles[oreCell]!.miningDamage === undefined ? 80 : undefined;
  if (index % 9 === 0) tiles[oreCell]!.ore = tiles[oreCell]!.ore === undefined ? 'steel' : undefined;
}
const scanA = new BaselineTileScan(), scanB = new TileSnapshotCache();
const scanOracleTiles = structuredClone(migrated.tiles);
scanA.reset(scanOracleTiles); scanB.reset(scanOracleTiles);
for (let i = 0; i < scanWarmup + scanSamples; i++) {
  scanEdit(scanOracleTiles, i);
  assert.deepStrictEqual(scanA.diff(scanOracleTiles), scanB.diff(scanOracleTiles), `Tile tuples diverged at sample ${i}`);
}
function scanPass(which: 'A' | 'B') {
  const tiles = structuredClone(migrated.tiles);
  const scanner = which === 'A' ? new BaselineTileScan() : new TileSnapshotCache();
  scanner.reset(tiles);
  const samples: number[] = [];
  let changedTiles = 0;
  for (let i = 0; i < scanWarmup + scanSamples; i++) {
    scanEdit(tiles, i);
    const at = performance.now();
    const changed = scanner.diff(tiles);
    const elapsed = performance.now() - at;
    if (i >= scanWarmup) { samples.push(elapsed); changedTiles += changed.length; }
  }
  return { which, changedTiles, duration: summary(samples) };
}
const terrainScan = [scanPass('A'), scanPass('B'), scanPass('B'), scanPass('A')];
assert.ok(terrainScan.every(p => p.changedTiles === terrainScan[0]!.changedTiles));
// Reset/checkpoint cache preparation is a different one-off cost. The full
// checkpoint message remains outside the timed worker passes above.
function resetPass(which: 'A' | 'B') {
  const scanner = which === 'A' ? new BaselineTileScan() : new TileSnapshotCache();
  const samples: number[] = [];
  for (let i = 0; i < warmup + ticks; i++) {
    const at = performance.now();
    scanner.reset(migrated.tiles);
    const elapsed = performance.now() - at;
    if (i >= warmup) samples.push(elapsed);
  }
  return { which, duration: summary(samples) };
}
const terrainReset = [resetPass('A'), resetPass('B'), resetPass('B'), resetPass('A')];
const report = {
  timestamp: new Date().toISOString(), reference: REFERENCE,
  baselineSha256: sha256(frozen), candidateSha256: sha256(readFileSync('src/bridge/snapshots.ts')),
  candidateTileCacheSha256: sha256(readFileSync('src/bridge/tile-snapshot-cache.ts')),
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  runtime: process.version, platform: process.platform, arch: process.arch, cpu: cpus()[0]?.model ?? 'unknown',
  fixture: { path: SAVE_PATH, sha256: sha256(stored), originalSchema, migratedSchema: migrated.schemaVersion,
    tick: migrated.tick, width: migrated.width, height: migrated.height, pawns: migrated.pawns.length,
    animals: migrated.wildlife?.animals.length ?? 0, resources: migrated.resources.length, piles: migrated.piles.length },
  oracle: checked,
  protocol: { order: 'A/B/B/A', warmupTicksPerPass: warmup, measuredTicksPerPass: ticks,
    scanWarmupCallsPerPass: scanWarmup, scanMeasuredCallsPerPass: scanSamples,
    resetWarmupCallsPerPass: warmup, resetMeasuredCallsPerPass: ticks,
    publication: 'one snapshot per natural tick, local Node path',
    exactness: 'independent source Worlds, cloned messages and decoded Worlds, PRNG, previous frames, same-tick edits, gap and epoch recovery checked before measurement',
    caveat: 'Node structuredClone is only a postMessage proxy; no real worker timer, event-driven publication, browser adoption, rendering, RAF or GPU. Terrain scan is a standalone diagnostic, not an extracted encoder stage. Do not infer a general throughput or FPS gain.' },
  terrainScan: { scope: 'isolated five-field tile diff only, A/B/B/A; excludes dynamic World and message encoding',
    warmupCallsPerPass: scanWarmup, measuredCallsPerPass: scanSamples,
    tupleChecks: scanWarmup + scanSamples, passes: terrainScan },
  terrainReset: { scope: 'isolated tile cache reset only, A/B/B/A; full checkpoint message is not timed',
    warmupCallsPerPass: warmup, measuredCallsPerPass: ticks,
    passes: terrainReset },
  passes: passes.map(({ which, rows, stages, packetKinds }) => ({ which,
    measuredRange: { firstTick: rows[0]!.tick, lastTick: rows.at(-1)!.tick }, packetKinds, stages })),
};
writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: OUTPUT_PATH, oracle: checked, terrainScan: report.terrainScan,
  terrainReset: report.terrainReset, passes: report.passes }, null, 2));
