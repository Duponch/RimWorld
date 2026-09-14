import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import os from 'node:os';
import { generateWorld } from '../src/sim/generation.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';
import type { World } from '../src/sim/types.ts';

const baselineCommit = '870ddec';
await mkdir('tmp', { recursive: true });
const previous = execFileSync('git', ['show', `${baselineCommit}:src/sim/generation.ts`], { encoding: 'utf8', timeout: 10000 });
const path = resolve('tmp/geology-generation-v26.ts');
await writeFile(path, previous.replaceAll("from './", "from '../src/sim/"));
const baseline = (await import(pathToFileURL(path).href)).generateWorld as typeof generateWorld;
function shape(world: World): string {
  return JSON.stringify(world, (key, value) => key === 'stone' || key === 'schemaVersion' ? undefined : value);
}
const percentiles = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return { count: sorted.length, median: sorted[Math.ceil(sorted.length * .5) - 1], p95: sorted[Math.ceil(sorted.length * .95) - 1], max: sorted.at(-1) };
};
const cases = [];
for (const size of [32, 128, 250]) {
  const times = { baseline: [] as number[], typed: [] as number[] };
  // Alternate order so neither implementation exclusively owns the later warm cache.
  for (let run = -2; run < 12; run++) for (const name of (run % 2 ? ['typed', 'baseline'] : ['baseline', 'typed']) as Array<keyof typeof times>) {
    const start = performance.now(); (name === 'typed' ? generateWorld : baseline)(42, size, size);
    if (run >= 0) times[name].push(performance.now() - start);
  }
  const identities = [];
  for (const seed of [42, 93, 2048]) {
    const w = generateWorld(seed, size, size), old = baseline(seed, size, size), normalized = shape(w);
    if (normalized !== shape(old)) throw new Error(`Unexpected gameplay generation change at ${size}/${seed}.`);
    identities.push({ seed, normalizedSha256: createHash('sha256').update(normalized).digest('hex') });
  }
  const w = generateWorld(42, size, size), encoder = new SnapshotEncoder(); encoder.encode(w, 0, 0);
  const deltaTimes: number[] = []; let deltaBytes = 0;
  for (let i = -5; i < 50; i++) {
    const start = performance.now(), delta = encoder.encode(w, 0, 0);
    if (i >= 0) deltaTimes.push(performance.now() - start);
    if (delta.kind !== 'delta' || delta.tiles || delta.resources) throw new Error('Idle geology sent redundant changes.');
    deltaBytes = Buffer.byteLength(JSON.stringify(delta));
  }
  cases.push({ size, seed: 42, generationMs: { baseline: percentiles(times.baseline), typed: percentiles(times.typed) },
    idleSnapshotEncodeMs: percentiles(deltaTimes), idleDeltaBytes: deltaBytes, initialBytes: Buffer.byteLength(JSON.stringify(w)),
    baselineBytes: Buffer.byteLength(JSON.stringify(baseline(42, size, size))), identities });
}
const report = { timestamp: new Date().toISOString(), cpu: os.cpus()[0]!.model, platform: process.platform, node: process.version,
  baselineCommit, protocol: 'Paired generation, 2 warmups and 12 samples per implementation; exact normalized data on three seeds. Snapshot encoding only, 5 warmups/50 samples, no IPC or GPU. No actor-load claim.', cases };
await writeFile('artifacts/geology-cpu.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
