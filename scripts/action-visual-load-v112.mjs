import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

/**
 * Two frozen, independently built sites: committed V111 and the working V112
 * tree captured at invocation. Nothing in src/ or public/ is modified here.
 * Run only after edits have stopped, then inspect artifacts/action-visual-load-v112.json.
 */
const root = process.cwd(), baselineCommit = 'a3b6e8b';
const nodeModules = resolve('node_modules'), vite = resolve('node_modules/vite/bin/vite.js');
assert.ok(existsSync(nodeModules) && existsSync(vite), 'Install the project dependencies first.');
mkdirSync(resolve('tmp'), { recursive: true }); mkdirSync(resolve('artifacts'), { recursive: true });
const work = mkdtempSync(resolve('tmp/action-visual-v112-'));
const baseline = join(work, 'baseline'), candidate = join(work, 'candidate');
mkdirSync(baseline); mkdirSync(candidate);
const frozenPaths = ['src', 'public', 'index.html', 'navigation.html', 'package.json', 'vite.config.ts'];

const archive = spawnSync('git', ['archive', '--format=tar', baselineCommit, ...frozenPaths],
  { cwd: root, maxBuffer: 64 * 1024 * 1024 });
if (archive.status !== 0) throw new Error(`Cannot archive ${baselineCommit}: ${archive.stderr?.toString()}`);
const tarPath = join(work, 'baseline.tar'); writeFileSync(tarPath, archive.stdout);
execFileSync('tar', ['-xf', tarPath, '-C', baseline], { stdio: 'inherit' });
for (const path of frozenPaths) cpSync(resolve(path), join(candidate, path), { recursive: true });
for (const dir of [baseline, candidate]) symlinkSync(nodeModules, join(dir, 'node_modules'), 'junction');

const probe = `
window.__v112Load={view:null,active:false,frames:[],intervals:[],lags:[],calls:[],previous:null};
const measuredFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
  const b=window.__v112Load;b.view=this;const start=performance.now();
  const result=measuredFrame.call(this,now);
  if(b.active&&!this.preparing){
    b.frames.push(performance.now()-start);
    if(b.previous!==null)b.intervals.push(now-b.previous);
    b.previous=now;b.lags.push(this.received.world.tick-this.timeline.tick);
    b.calls.push(this.stats.drawCalls);
  }
  return result;
};
`;
for (const dir of [baseline, candidate]) {
  const main = join(dir, 'src/main.ts');
  writeFileSync(main, probe + readFileSync(main, 'utf8'));
  execFileSync(process.execPath, [vite, 'build'], { cwd: dir, stdio: 'inherit', maxBuffer: 8 * 1024 * 1024 });
}
const candidateDigest = createHash('sha256').update(readFileSync(join(candidate, 'src/render/PawnLayer.ts')))
  .update(readFileSync(join(candidate, 'src/render/WildlifeLayer.ts')))
  .update(readFileSync(join(candidate, 'src/ui/pawn-portrait.ts'))).digest('hex');

const servers = [];
const serve = (dir, port) => {
  const child = spawn(process.execPath, [vite, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = ''; child.stdout.on('data', chunk => { output += chunk.toString(); });
  child.stderr.on('data', chunk => { output += chunk.toString(); });
  servers.push(child); return { url: `http://127.0.0.1:${port}`, output: () => output };
};
const sites = { V111: serve(baseline, 5181), V112: serve(candidate, 5182) };
const ready = async site => {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(site.url)).ok) return; } catch { /* preview is starting */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Preview did not start at ${site.url}: ${site.output()}`);
};
const stats = values => {
  const sorted = [...values].sort((a, b) => a - b), at = q => sorted.length ? +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))].toFixed(3) : null;
  return { count: sorted.length, p50: at(.5), p95: at(.95), max: at(1) };
};
const errors = [], reports = [];
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('playwright');
let browser;
try {
  await Promise.all([ready(sites.V111), ready(sites.V112)]);
  browser = await chromium.launch({ channel: 'chromium', headless: false });
  for (const version of ['V111', 'V112', 'V112', 'V111']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', error => errors.push(`${version}: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error' || /GPUValidationError|invalid pipeline/i.test(message.text())) errors.push(`${version}: ${message.text()}`);
    });
    try {
      await page.addInitScript(() => {
        window.__v112Pipelines = 0;
        if (!globalThis.GPUDevice) return;
        for (const key of ['createRenderPipeline', 'createRenderPipelineAsync']) {
          const original = GPUDevice.prototype[key];
          GPUDevice.prototype[key] = function (...args) { window.__v112Pipelines++; return original.apply(this, args); };
        }
      });
      await page.goto(sites[version].url + '/?e2e');
      await page.evaluate(async () => localStorage.setItem('lisiere.save.v1', await (await fetch('/test-saves/v98/mixed-100.json')).text()));
      await page.locator('.front-menu').getByRole('button', { name: /^Charger/ }).click();
      await page.locator('input[name="front-save"][value="lisiere.save.v1"]').check();
      await page.locator('.front-menu').getByRole('button', { name: 'Charger', exact: true }).click();
      await page.waitForFunction(() => window.__v112Load?.view?.world?.pawns.length === 104 && !window.__v112Load.view.preparing,
        undefined, { timeout: 60_000 });
      await page.mouse.move(750, 400); await page.mouse.wheel(0, 5800); await page.waitForTimeout(750);
      await page.evaluate(() => {
        const v = window.__v112Load.view;
        v.controls.enableDamping = false;
        v.camera.zoom = (v.camera.top - v.camera.bottom) / 375.5533905932738;
        v.camera.updateProjectionMatrix(); v.controls.update();
      });
      const windows = [];
      for (const speed of [0, 6]) {
        await page.locator(`[data-speed="${speed}"]`).click(); await page.waitForTimeout(1000);
        const start = await page.evaluate(() => {
          const b = window.__v112Load;
          b.frames = []; b.intervals = []; b.lags = []; b.calls = []; b.previous = null; b.active = true;
          return { tick: b.view.received.world.tick, time: performance.now(), pipelines: window.__v112Pipelines };
        });
        await page.waitForTimeout(6000);
        const data = await page.evaluate(() => {
          const b = window.__v112Load; b.active = false;
          const v = b.view, g = v.pawns.pawnMesh.geometry;
          const shaderEntries = Object.entries(g.attributes).filter(([name]) => name !== 'aFire');
          const info = v.renderer.getContext().getConfiguration().device.adapterInfo;
          return { frames: b.frames, intervals: b.intervals, lags: b.lags, calls: b.calls,
            time: performance.now(), tick: v.received.world.tick, span: v.rig.span, backend: v.backend,
            pipelines: window.__v112Pipelines, geometry: { instances: g.instanceCount,
              attributes: Object.keys(g.attributes).length, shaderAttributes: shaderEntries.length,
              shaderBuffers: new Set(shaderEntries.map(([, a]) => a.data ?? a)).size },
            adapter: { vendor: info.vendor, architecture: info.architecture, description: info.description } };
        });
        assert.equal(data.backend, 'WebGPU'); assert.ok(data.frames.length > 100);
        assert.ok(Math.abs(data.span - 375.5533905932738) < .001);
        assert.equal(data.geometry.instances, 104);
        assert.ok(data.geometry.shaderBuffers <= 7 && data.geometry.shaderAttributes <= 16);
        windows.push({ speed, span: data.span, adapter: data.adapter, geometry: data.geometry,
          frameCpu: stats(data.frames), imageInterval: stats(data.intervals), drawCalls: stats(data.calls),
          presentationLagTicks: stats(data.lags), newPipelines: data.pipelines - start.pipelines,
          actualSpeed: (data.tick - start.tick) / ((data.time - start.time) / 1000) / 6 });
      }
      await page.locator('[data-speed="0"]').click();
      const final = await page.evaluate(() => ({ pawns: window.__v112Load.view.received.world.pawns.length,
        tick: window.__v112Load.view.received.world.tick,
        schema: window.__v112Load.view.received.world.schemaVersion }));
      assert.equal(final.pawns, 104); assert.ok(final.tick > 0);
      reports.push({ version, windows });
      console.log(JSON.stringify(reports.at(-1)));
    } finally { await page.close(); }
  }
  assert.deepEqual(errors, []);
  const averages = Object.fromEntries([0, 6].map(speed => {
    const average = (version, field) => reports.filter(r => r.version === version)
      .reduce((sum, r) => sum + r.windows.find(w => w.speed === speed)[field].p95, 0) / 2;
    const baselineCpu = average('V111', 'frameCpu'), candidateCpu = average('V112', 'frameCpu');
    const baselineImage = average('V111', 'imageInterval'), candidateImage = average('V112', 'imageInterval');
    return [speed, { frameCpuP95Ratio: +(candidateCpu / baselineCpu).toFixed(3),
      imageIntervalP95Ratio: +(candidateImage / baselineImage).toFixed(3),
      baselineFrameCpuP95: +baselineCpu.toFixed(3), candidateFrameCpuP95: +candidateCpu.toFixed(3),
      baselineImageP95: +baselineImage.toFixed(3), candidateImageP95: +candidateImage.toFixed(3) }];
  }));
  const report = { date: new Date().toISOString(), baselineCommit, candidateDigest, work,
    protocol: 'Two frozen independent Vite production builds, native Chromium WebGPU 1440×1000, immutable mixed-100 save, all-map 375.553-cell view, V111/V112/V112/V111 sequential windows. Each pass samples pause and requested 6× for six seconds after one second settling. RAF interval and render CPU are separate; neither is a GPU execution timer. Adapter, pipeline creation, draw calls, resident buffers and actual simulation speed are recorded. Ratios compare this paired run only, not a universal no-regression guarantee.',
    reports, comparison: averages, errors };
  writeFileSync(resolve('artifacts/action-visual-load-v112.json'), JSON.stringify(report, null, 2) + '\n');
} finally {
  if (browser) await browser.close();
  for (const child of servers) child.kill();
}
