import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('@playwright/test');
const software = process.argv.includes('--software');
const browser = await chromium.launch({ headless: true, channel: 'chromium',
  args: software ? ['--enable-unsafe-webgpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error' || /GPUValidationError|invalid pipeline/i.test(message.text())) errors.push(message.text());
});
try {
  await page.route('**/__navigation_probe', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Navigation GPU test</title>' }));
  await page.goto('http://127.0.0.1:5173/__navigation_probe');
  const result = await page.evaluate(async ({ correctnessOnly }) => {
    const { GpuNavigator } = await import('/src/navigation-gpu/index.ts');
    const { solveCpuOracle, assertPathValid } = await import('/src/navigation-gpu/oracle.ts');
    const gpu = await GpuNavigator.create();
    let revision = 0;
    const validation = [];
    const fixtures = [
      { name: 'single-cell', width: 1, height: 1, values: [1], pairs: [[0, 0]] },
      { name: 'weighted-detour-edge-no-wrap', width: 5, height: 3, values: [1, 8, 8, 8, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1], pairs: [[0, 4], [4, 0], [4, 5], [0, 0]] },
      { name: 'disconnected-blocked-endpoint', width: 3, height: 3, values: [1, 0, 1, 1, 0, 1, 1, 0, 1], pairs: [[0, 2], [0, 1], [1, 1], [0, 6]] },
      { name: 'diagonal-gap-is-inaccessible', width: 2, height: 2, values: [1, 0, 0, 1], pairs: [[0, 3]] },
      { name: 'vertical-65-workgroup-boundary', width: 1, height: 65, values: Array(65).fill(1), pairs: [[0, 64], [64, 0]] },
      { name: 'horizontal-65-workgroup-boundary', width: 65, height: 1, values: Array(65).fill(1), pairs: [[0, 64], [64, 0]] },
    ];
    let randomState = 812891;
    const random = () => { randomState ^= randomState << 13; randomState ^= randomState >>> 17; randomState ^= randomState << 5; return randomState >>> 0; };
    for (let seed = 0; seed < 12; seed++) {
      fixtures.push({ name: `seeded-weighted-8x9-${seed}`, width: 8, height: 9,
        values: Array.from({ length: 72 }, () => random() % 7 === 0 ? 0 : 1 + random() % 12),
        pairs: Array.from({ length: 8 }, () => [random() % 72, random() % 72]),
      });
    }
    for (const fixture of fixtures) {
      const grid = { width: fixture.width, height: fixture.height, costs: new Uint32Array(fixture.values), revision: ++revision };
      const requests = fixture.pairs.map(([start, goal], id) => ({ id, start, goal }));
      gpu.setGrid(grid);
      const batch = await gpu.solve(requests, { maxIterations: grid.costs.length, maxPathLength: grid.costs.length });
      if (batch.stale) throw new Error(`${fixture.name}: unexpected stale result`);
      for (let index = 0; index < requests.length; index++) {
        const actual = batch.paths[index];
        const expected = solveCpuOracle(grid, requests[index]);
        assertPathValid(grid, requests[index], actual);
        if (actual.status !== expected.status || actual.totalCost !== expected.totalCost) {
          throw new Error(`${fixture.name} request ${index}: ${actual.status}/${actual.totalCost} != CPU ${expected.status}/${expected.totalCost}`);
        }
      }
      const repeated = await gpu.solve(requests, { maxIterations: grid.costs.length, maxPathLength: grid.costs.length });
      const encode = paths => JSON.stringify(paths.map(path => ({ ...path, cells: [...path.cells] })));
      if (encode(batch.paths) !== encode(repeated.paths)) throw new Error(`${fixture.name}: unstable GPU route tie-break`);
      validation.push({ name: fixture.name, requests: requests.length, passed: true });
    }
    const line = { width: 20, height: 1, costs: new Uint32Array(20).fill(1), revision: ++revision };
    gpu.setGrid(line);
    const request = [{ id: 0, start: 0, goal: 19 }];
    const incomplete = await gpu.solve(request, { maxIterations: 1 });
    if (incomplete.paths[0].status !== 'inconclusive') throw new Error('budget exhaustion incorrectly classified');
    const truncated = await gpu.solve(request, { maxIterations: 20, maxPathLength: 4 });
    if (truncated.paths[0].status !== 'capacity-exceeded' || truncated.paths[0].cells.length) throw new Error('route capacity incorrectly classified');
    const pending = gpu.solve(request, { maxIterations: 20 });
    let concurrentRejected = false;
    try { await gpu.solve(request); } catch { concurrentRejected = true; }
    if (!concurrentRejected) throw new Error('concurrent solve was accepted');
    const changed = { ...line, costs: new Uint32Array(line.costs), revision: ++revision };
    changed.costs[10] = 0;
    gpu.setGrid(changed);
    if (!(await pending).stale) throw new Error('old revision accepted as current');
    const rerouted = await gpu.solve(request, { maxIterations: 20 });
    if (rerouted.stale || rerouted.paths[0].status !== 'unreachable') throw new Error('obstacle revision did not invalidate old route');
    validation.push({ name: 'budget-capacity-concurrent-revision-invalidation', requests: 4, passed: true });

    const measurements = [];
    for (const [size, batchSize] of (correctnessOnly ? [] : [[32, 1], [32, 8], [250, 1], [250, 8]])) {
      const grid = { width: size, height: size, costs: new Uint32Array(size * size).fill(1), revision: ++revision };
      // A vertical fence with two believable door gaps and a slow ground strip.
      for (let z = 1; z < size - 1; z++) if (z !== Math.floor(size / 3) && z !== Math.floor(size * 2 / 3)) grid.costs[z * size + Math.floor(size / 2)] = 0;
      for (let x = 0; x < size; x++) if (grid.costs[Math.floor(size / 4) * size + x]) grid.costs[Math.floor(size / 4) * size + x] = 3;
      const requests = Array.from({ length: batchSize }, (_, id) => ({ id, start: id * size, goal: size * size - 1 - id * size }));
      gpu.setGrid(grid);
      const iterations = size * 3;
      await gpu.solve(requests, { maxIterations: iterations, maxPathLength: size * 4 });
      const samples = [];
      let last;
      for (let run = 0; run < 3; run++) {
        const cpuStart = performance.now();
        const expected = requests.map(request => solveCpuOracle(grid, request));
        const cpuMs = performance.now() - cpuStart;
        last = await gpu.solve(requests, { maxIterations: iterations, maxPathLength: size * 4 });
        for (let index = 0; index < requests.length; index++) {
          assertPathValid(grid, requests[index], last.paths[index]);
          if (last.paths[index].status !== expected[index].status || last.paths[index].totalCost !== expected[index].totalCost) throw new Error(`benchmark ${size}/${batchSize} differs from oracle`);
        }
        samples.push({ gpuEndToEndMs: last.metrics.endToEndMs, cpuOracleMs: cpuMs });
      }
      measurements.push({ size, batchSize, iterations, allocatedBytes: last.metrics.allocatedBytes, readbackBytes: last.metrics.readbackBytes, samples });
    }
    const adapter = gpu.adapter;
    gpu.dispose();
    return { adapter, userAgent: navigator.userAgent, validation, measurements };
  }, { correctnessOnly: process.argv.includes('--correctness-only') });
  const report = { timestamp: new Date().toISOString(), mode: software ? 'forced-software-correctness-only' : 'normal-chromium',
    host: { platform: os.platform(), release: os.release(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length },
    method: 'isolated page, no renderer; 1 warmup + 3 measured runs; GPU wall time includes upload/allocation/encode/readback; CPU independent Dijkstra including validation; no GPU timestamp-query',
    ...result, errors,
  };
  await mkdir('artifacts', { recursive: true });
  const output = `artifacts/gpu-navigation-${software ? 'software' : 'hardware'}.json`;
  await writeFile(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  await mkdir('artifacts', { recursive: true });
  const failure = { timestamp: new Date().toISOString(), mode: software ? 'forced-software-correctness-only' : 'normal-chromium',
    status: 'failed-or-unavailable', message: error instanceof Error ? error.message : String(error), errors };
  await writeFile(`artifacts/gpu-navigation-${software ? 'software' : 'hardware'}-failure.json`, JSON.stringify(failure, null, 2));
  throw error;
} finally { await browser.close(); }
