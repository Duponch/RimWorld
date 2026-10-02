/** V183 CPU microbench: advanceQuests only, on the saved 250 x 250 quest scene.
 * Run after sources and other measurements are frozen:
 * node --experimental-strip-types scripts/quest-bench-v183.ts
 * Output remains under tmp/test-runs/quest-v183-cpu/. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { advanceQuests } from '../src/sim/quests.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import type { JoinerQuest } from '../src/sim/quest-state.ts';
import type { World } from '../src/sim/types.ts';

type Variant = 'absent' | 'empty' | 'offer-not-due' | 'closed-history-32';
type Sample = { pass: number; slot: number; variant: Variant; milliseconds: number; microsecondsPerCall: number };
const fixturePath = fileURLToPath(new URL('../public/test-saves/v183/asile-et-poursuite.json', import.meta.url));
const sourcePath = fileURLToPath(new URL('../src/sim/quests.ts', import.meta.url));
const outputPath = fileURLToPath(new URL('../tmp/test-runs/quest-v183-cpu/advance-quests.json', import.meta.url));
const calls = 200_000, warmupCalls = 20_000;
const variants: readonly Variant[] = ['absent', 'empty', 'offer-not-due', 'closed-history-32'];
const order: readonly (readonly Variant[])[] = [
  variants, [...variants].reverse(), [...variants].reverse(), variants,
];

const sha256 = (data: string): string => createHash('sha256').update(data).digest('hex');
function assertValid(world: World, label: string): void {
  const errors = validateWorld(world);
  assert.deepEqual(errors, [], `${label}: invalid World: ${errors.join(' ')}`);
}
function makeVariants(fixture: World): Record<Variant, World> {
  assert.equal(fixture.width, 250);
  assert.equal(fixture.height, 250);
  const calendar = fixture.quests;
  assert.ok(calendar);
  assert.equal(calendar.entries.length, 1);
  assert.equal(calendar.entries[0]?.status, 'offered');
  assert.ok(calendar.nextCheck > fixture.tick);
  const worlds = Object.fromEntries(variants.map(variant => [variant, structuredClone(fixture)])) as Record<Variant, World>;

  delete worlds.absent.quests;
  worlds.empty.quests!.serial = 0;
  worlds.empty.quests!.entries = [];

  const offer = worlds['offer-not-due'].quests!.entries[0]!;
  assert.ok(worlds['offer-not-due'].tick < offer.expiresAt, 'Offer must not expire during the batch.');

  const history = worlds['closed-history-32'], template = history.quests!.entries[0]!;
  const records: JoinerQuest[] = Array.from({ length: 32 }, (_, index) => {
    const offeredAt = 1000 * (index + 1);
    return { id: index + 1, offeredAt, expiresAt: offeredAt + 1800,
      name: template.name, profile: template.profile, joinDelay: template.joinDelay,
      raidDelay: template.raidDelay, status: 'refused', endedAt: offeredAt + 1 };
  });
  assert.ok(records.at(-1)!.expiresAt < history.tick, 'Closed history must have past dates.');
  history.quests!.entries = records;
  history.quests!.serial = 32;

  for (const variant of variants) {
    const world = worlds[variant];
    assert.ok(!world.quests || world.quests.nextCheck > world.tick, `${variant}: not before next check.`);
    assertValid(world, `${variant} preparation`);
  }
  return worlds;
}
function oracle(world: World): { serialized: string; worldRng: number; raidRng: number | undefined; questRng: number | undefined } {
  return { serialized: serializeWorld(world), worldRng: world.rng,
    raidRng: world.raids?.rng, questRng: world.quests?.rng };
}
function checkOracle(world: World, before: ReturnType<typeof oracle>, label: string): void {
  assertValid(world, label);
  assert.deepEqual(oracle(world), before, `${label}: World or a PRNG changed on a not-due path.`);
}
function summarize(samples: Sample[]) {
  const values = samples.map(sample => sample.microsecondsPerCall).sort((a, b) => a - b);
  return { callsPerPass: calls, passes: values.length,
    medianMicrosecondsPerCall: (values[1]! + values[2]!) / 2,
    p95MicrosecondsPerCall: values[Math.ceil(values.length * .95) - 1]!,
    minMicrosecondsPerCall: values[0]!, maxMicrosecondsPerCall: values.at(-1)! };
}
function main(): void {
  const cache = fileURLToPath(new URL('../tmp/host-cache/', import.meta.url));
  mkdirSync(resolve(cache, 'temp'), { recursive: true });
  mkdirSync(resolve(cache, 'npm-cache'), { recursive: true });
  process.env.TEMP = resolve(cache, 'temp');
  process.env.TMP = process.env.TEMP;
  process.env.NPM_CONFIG_CACHE = resolve(cache, 'npm-cache');

  const fixtureRaw = readFileSync(fixturePath, 'utf8');
  const sourceRaw = readFileSync(sourcePath, 'utf8');
  const fixture = deserializeWorld(fixtureRaw);
  assertValid(fixture, '250 x 250 source fixture');
  const worlds = makeVariants(fixture);
  const before = Object.fromEntries(variants.map(variant => [variant, oracle(worlds[variant])])) as Record<Variant, ReturnType<typeof oracle>>;

  for (const variant of variants) {
    const world = worlds[variant];
    for (let index = 0; index < warmupCalls; index++) advanceQuests(world);
    checkOracle(world, before[variant], `${variant} after warmup`);
  }

  const samples: Sample[] = [];
  for (const [passIndex, sequence] of order.entries()) {
    for (const [slotIndex, variant] of sequence.entries()) {
      const world = worlds[variant], start = performance.now();
      for (let index = 0; index < calls; index++) advanceQuests(world);
      const milliseconds = performance.now() - start;
      samples.push({ pass: passIndex + 1, slot: slotIndex + 1, variant,
        milliseconds, microsecondsPerCall: milliseconds * 1000 / calls });
      checkOracle(world, before[variant], `${variant} pass ${passIndex + 1}`);
    }
  }
  assert.equal(readFileSync(fixturePath, 'utf8'), fixtureRaw, 'Fixture changed during measurement.');
  assert.equal(readFileSync(sourcePath, 'utf8'), sourceRaw, 'Quest source changed during measurement.');

  const result = {
    timestamp: new Date().toISOString(), node: process.version, platform: process.platform,
    cpu: { model: cpus()[0]?.model ?? 'unknown', logicalCores: cpus().length },
    source: { fixturePath, fixtureSha256: sha256(fixtureRaw), sourcePath, sourceSha256: sha256(sourceRaw) },
    protocol: { fixture: 'V183 saved crashlanded/Cassandra scene', map: '250x250',
      function: 'advanceQuests(World)', callsPerPass: calls, warmupCallsPerVariant: warmupCalls,
      passes: order.length, order, preparation: 'All variants are cloned and validated before timing.',
      oracle: 'Full serialized World and all present PRNG states unchanged after warmup and every pass; validateWorld before and after.',
      pathExpectation: 'All four paths are before nextCheck; no entry search, standability capture, raid spawn or connectivity scan should run. This is inferred from branch conditions, not instrumented.',
      scope: 'Node CPU calls only. No full tick, worker, renderer, browser, GPU, FPS or general performance claim.' },
    variants: Object.fromEntries(variants.map(variant => [variant, summarize(samples.filter(sample => sample.variant === variant))])),
    samples,
  };
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ outputPath, variants: result.variants }) + '\n');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
