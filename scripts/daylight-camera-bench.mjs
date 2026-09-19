import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('@playwright/test');
const browser = await chromium.launch({ channel: 'chromium' });
const report = { timestamp: new Date().toISOString(), cpu: os.cpus()[0].model,
  protocol: '250² seed 42; hardware Chromium; 1440×1000; paused simulation. Presentation-only locked hour. Legacy control uses previous constant background and lights on the same geometry/camera. Each phase: first 45 transition frames, then 90 warmup frames, then >=300 frames and 8 s. Submission CPU is not GPU time; RAF includes scheduling. No claim about weather or gameplay light.', phases: [], errors: [] };
const stats = a => { const s = [...a].sort((x, y) => x - y); return { mean: a.reduce((x, y) => x + y, 0) / a.length, p95: s[Math.ceil(s.length * .95) - 1], max: s.at(-1), count: s.length }; };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' || /GPUValidationError|invalid pipeline/i.test(m.text())) report.errors.push(m.text()); });
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `window.__skyBench={view:null,frames:[],active:false};const skyOriginalFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const b=window.__skyBench;b.view=this;const start=performance.now();const result=skyOriginalFrame.call(this,now);if(b.transition>0){b.transition--;b.transitionFrames.push({time:now,cpu:performance.now()-start});}else if(b.warm>0){b.warm--;}else if(b.active){b.frames.push({time:now,cpu:performance.now()-start,calls:this.stats.drawCalls,triangles:this.stats.triangles});if(b.frames.length>=300&&now-b.frames[0].time>=8000){b.active=false;b.complete({frames:b.frames,transition:b.transitionFrames});}}return result;};\n` + await response.text() });
  });
  await page.goto('http://127.0.0.1:5173/?scenario=camp&e2e&size=250&seed=42');
  await page.waitForFunction(() => !!window.__skyBench.view?.world); await page.locator('[data-speed="0"]').click();
  report.adapter = await page.evaluate(() => { const i = window.__skyBench.view.renderer.getContext().getConfiguration().device.adapterInfo; return { vendor: i.vendor, architecture: i.architecture, device: i.device, description: i.description }; });
  const phases = [
    ['legacy-local', 'orthographic', false, 12, true], ['day-local', 'orthographic', false, 12, false],
    ['day-without-sky', 'orthographic', false, 12, false],
    ['night-local', 'orthographic', false, 0, false], ['legacy-overview', 'orthographic', true, 12, true],
    ['day-overview', 'orthographic', true, 12, false], ['perspective-local', 'perspective', false, 12, false],
    ['perspective-overview', 'perspective', true, 12, false],
  ];
  for (const [name, mode, far, hour, legacy] of phases) {
    const result = await page.evaluate(({ name, mode, far, hour, legacy }) => new Promise(resolve => {
      const b = window.__skyBench, v = b.view;
      b.update ??= v.daylight.update.bind(v.daylight); b.sky ??= v.scene.backgroundNode;
      v.rig.setMode(mode); v.rig.configureMap(250, 250); v.resize();
      if (far && mode === 'orthographic') v.camera.zoom = v.controls.minZoom;
      if (far && mode === 'perspective') v.camera.position.sub(v.controls.target).setLength(v.controls.maxDistance).add(v.controls.target);
      v.camera.updateProjectionMatrix(); v.controls.update();
      v.scene.backgroundNode = legacy || name === 'day-without-sky' ? null : b.sky;
      v.scene.background = v.daylight.ambient.color.clone().setHex(0xd4d7c5);
      v.daylight.update = legacy ? (_, target) => {
        v.daylight.light.position.set(target.x - 24, 45, target.z + 25); v.daylight.light.target.position.copy(target);
        v.daylight.light.color.setHex(0xffe1b2); v.daylight.light.intensity = 3.2;
        v.daylight.ambient.color.setHex(0xfff3d9); v.daylight.ambient.groundColor.setHex(0x748474); v.daylight.ambient.intensity = 2.1;
      } : (_, target) => b.update(hour * 250, target);
      Object.assign(b, { transition: 45, transitionFrames: [], warm: 90, active: true, frames: [], complete: resolve });
    }), { name, mode, far, hour, legacy });
    const { frames, transition } = result;
    const entry = { name, frameMs: stats(frames.slice(1).map((v, i) => v.time - frames[i].time)), cpuMs: stats(frames.map(v => v.cpu)), calls: stats(frames.map(v => v.calls)), triangles: stats(frames.map(v => v.triangles)), transitionFrameMs: stats(transition.slice(1).map((v, i) => v.time - transition[i].time)), transitionCpuMs: stats(transition.map(v => v.cpu)) };
    report.phases.push(entry); console.log(`${name}: p95 ${entry.frameMs.p95.toFixed(2)} ms, ${entry.calls.mean} calls, CPU p95 ${entry.cpuMs.p95.toFixed(2)} ms`);
    await page.screenshot({ path: `artifacts/sky-${name}.png` });
  }
  for (const [name, hour, side] of [['dawn', 6.4, -1], ['dusk', 17.6, 1], ['night', 0, 1]]) {
    await page.evaluate(({ hour, side }) => {
      const b = window.__skyBench, v = b.view; v.rig.setMode('perspective'); v.rig.configureMap(250, 250);
      v.camera.position.set(v.controls.target.x + 48 * side, 15, v.controls.target.z + 9); v.controls.update();
      v.daylight.update = (_, target) => b.update(hour * 250, target);
    }, { hour, side });
    await page.waitForTimeout(2200); await page.screenshot({ path: `artifacts/sky-${name}.png` });
  }
  if (report.errors.length) throw Error(report.errors.join('\n'));
} finally { await browser.close(); await writeFile('artifacts/daylight-camera-benchmark.json', JSON.stringify(report, null, 2) + '\n'); }
console.log('Saved artifacts/daylight-camera-benchmark.json');
