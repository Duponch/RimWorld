import { cpus, platform, release } from 'node:os';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { applyCommand, buildAreaIndex, createWorld, queryArea, validateWorld } from '../src/sim/index.ts';
import type { AreaCommand, World } from '../src/sim/types.ts';

const base = createWorld(42, 250, 250);
const summarize = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return { median: sorted[Math.floor(sorted.length / 2)], min: sorted[0], max: sorted[sorted.length - 1], samples: sorted.length };
};
const equivalent = (world: World) => JSON.stringify({ ...world, events: [] });
const rows = [];
for (const side of [8, 32, 250]) {
  const start = Math.floor((250 - side) / 2);
  const command: AreaCommand = { type: 'area', action: 'chop', from: { x: start, z: start }, to: { x: start + side - 1, z: start + side - 1 } };
  const freshQuery: number[] = [], cachedQuery: number[] = [], bulk: number[] = [], singles: number[] = [];
  const index = buildAreaIndex(base), selected = queryArea(base, command, index);
  if (!selected.ok) throw new Error(selected.reason);
  for (let repetition = -2; repetition < 10; repetition++) {
    let started = performance.now(); queryArea(base, command); const fresh = performance.now() - started;
    started = performance.now(); queryArea(base, command, index); const cached = performance.now() - started;
    if (repetition >= 0) { freshQuery.push(fresh); cachedQuery.push(cached); }
  }
  // Compare ordinary selections with the prior single-cell command API. The full
  // map stress case measures the batch only, without claiming a counterfactual gain.
  for (let repetition = -1; repetition < 5; repetition++) {
    const batchWorld = structuredClone(base), singleWorld = side < 250 ? structuredClone(base) : null;
    let batchMs = 0, singleMs = 0;
    const batch = () => { const started = performance.now(); const result = applyCommand(batchWorld, command); batchMs = performance.now() - started; if (!result.ok || result.affected !== selected.cells.length) throw new Error('Batch selection mismatch.'); };
    const single = () => {
      if (!singleWorld) return;
      const started = performance.now();
      for (const cell of selected.cells) if (!applyCommand(singleWorld, { type: 'designate', kind: 'chop', x: cell % 250, z: Math.floor(cell / 250) }).ok) throw new Error('Single command refused.');
      singleMs = performance.now() - started;
    };
    if (repetition % 2) { batch(); single(); } else { single(); batch(); }
    if (validateWorld(batchWorld).length) throw new Error('Invalid batch result.');
    if (singleWorld && equivalent(batchWorld) !== equivalent(singleWorld)) throw new Error('Gameplay differs from single-cell commands.');
    if (repetition >= 0) { bulk.push(batchMs); if (singleWorld) singles.push(singleMs); }
  }
  rows.push({ side, selectedCells: side * side, designatedTrees: selected.cells.length, queryIncludingIndexMs: summarize(freshQuery), queryReusingIndexMs: summarize(cachedQuery), applyBatchMs: summarize(bulk), applySinglesMs: singles.length ? summarize(singles) : null });
}
const report = { timestamp: new Date().toISOString(), node: process.version, cpu: cpus()[0]?.model, platform: platform(), osRelease: release(), map: { size: 250, seed: 42, resources: base.resources.length, pawns: base.pawns.length }, conditions: 'Node CPU only; query two warmups/10 samples, commands one warmup/five paired samples with alternating order. Fixtures/clones/validation outside timings. Single-cell controls receive exactly the eligible cells, so their timings exclude selection discovery. Complete resulting worlds compared outside timing except events (one summary versus individual logs). No IPC, browser, simulation ticks or GPU. Full-map batch has no single-cell timing control.', rows };
await writeFile('artifacts/area-designation-benchmark.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
