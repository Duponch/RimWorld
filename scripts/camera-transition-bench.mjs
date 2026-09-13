import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('@playwright/test');
const browser = await chromium.launch({ channel: 'chromium' });
const report = { timestamp: new Date().toISOString(), cpu: os.cpus()[0].model,
  protocol: 'First camera transitions after the real loading screen, 250² seed 42, 1440×1000, hardware Chromium, paused. 60 frames per transition, including the first RAF interval and submission CPU; no discarded slow frame. Camera zoom distances injected only for reproducibility. Sky uses the actual paused world tick.', phases: [], errors: [] };
const stats = a => { const s = [...a].sort((x, y) => x - y); return { mean: a.reduce((x, y) => x + y, 0) / a.length, p95: s[Math.ceil(s.length * .95) - 1], max: s.at(-1), count: s.length }; };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' || /GPUValidationError|invalid pipeline/i.test(m.text())) report.errors.push(m.text()); });
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `window.__cameraProbe={frames:[],previous:0};const beforeCameraFrame=ColonyRenderer.prototype.frame,beforePrepare=ColonyRenderer.prototype.preparePresentation;ColonyRenderer.prototype.preparePresentation=async function(){const t=performance.now();await beforePrepare.call(this);window.__cameraProbe.preparationMs=performance.now()-t;};ColonyRenderer.prototype.frame=function(now){const b=window.__cameraProbe;b.view=this;const t=performance.now(),r=beforeCameraFrame.call(this,now);if(b.active){b.frames.push({interval:now-b.previous,cpu:performance.now()-t});if(b.frames.length===60){b.active=false;b.resolve(b.frames);}}b.previous=now;return r;};\n` + await response.text() });
  });
  await page.goto('http://127.0.0.1:5173/?e2e&size=250&seed=42');
  await page.locator('#loading').waitFor({ state: 'detached' }); await page.locator('[data-speed="0"]').click();
  Object.assign(report, await page.evaluate(() => { const b = window.__cameraProbe, i = b.view.renderer.getContext().getConfiguration().device.adapterInfo; return { preparationMs: b.preparationMs, adapter: { vendor: i.vendor, architecture: i.architecture } }; }));
  for (const name of ['first-overview', 'first-perspective', 'perspective-local', 'return-iso']) {
    const frames = await page.evaluate(name => new Promise(resolve => {
      const b = window.__cameraProbe, v = b.view;
      Object.assign(b, { active: true, frames: [], resolve });
      if (name === 'first-overview') { v.camera.zoom = v.controls.minZoom; v.camera.updateProjectionMatrix(); }
      if (name === 'first-perspective' || name === 'return-iso') document.querySelector('#camera-mode').click();
      if (name === 'perspective-local') { v.camera.position.sub(v.controls.target).setLength(32 * .53 / Math.tan(Math.PI / 8)).add(v.controls.target); v.controls.update(); }
    }), name);
    const phase = { name, frameMs: stats(frames.map(f => f.interval)), cpuMs: stats(frames.map(f => f.cpu)) };
    report.phases.push(phase); console.log(`${name}: max ${phase.frameMs.max.toFixed(1)} ms, CPU max ${phase.cpuMs.max.toFixed(1)} ms`);
  }
  // Actual saved clock and real Load button for delivery pictures. The camera
  // pose alone is set reproducibly, equivalent to orbiting with the mouse.
  await page.locator('[data-panel="menu"]').click(); await page.locator('#save').click();
  await page.waitForFunction(() => !document.querySelector('#load').disabled);
  await page.locator('[data-panel="menu"]').click();
  for (const [name, hour, side] of [['dawn', 6.4, -1], ['noon', 12, 1], ['night', 0, 1]]) {
    await page.evaluate(async hour => { const { createWorld, serializeWorld } = await import('/src/sim/index.ts'); const w = createWorld(42, 250, 250); w.tick = Math.round(hour * 250); localStorage.setItem('lisiere.save.v1', serializeWorld(w)); }, hour);
    await page.locator('[data-panel="menu"]').click(); await page.locator('#load').click();
    if (await page.locator('#camera-mode').getAttribute('aria-pressed') !== 'true') await page.locator('#camera-mode').click();
    await page.evaluate(side => { const v = window.__cameraProbe.view; v.camera.position.set(v.controls.target.x + 48 * side, 15, v.controls.target.z + 9); v.controls.update(); }, side);
    await page.waitForTimeout(2200); await page.screenshot({ path: `artifacts/daylight-${name}.png` });
  }
  if (report.errors.length) throw Error(`${report.errors.length} browser errors; see report`);
  report.completed = true;
} finally { await browser.close(); await writeFile('artifacts/camera-transitions.json', JSON.stringify(report, null, 2) + '\n'); }
