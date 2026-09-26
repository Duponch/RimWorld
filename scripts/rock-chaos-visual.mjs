import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('@playwright/test');
const report = { date: new Date().toISOString(), errors: [], views: [] };
const browser = await chromium.launch({ channel: 'chromium', headless: false });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => report.errors.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error' || /GPUValidationError|invalid pipeline/i.test(message.text()))
      report.errors.push(message.text());
  });
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `const originalRockFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(...args){window.__rockView=this;return originalRockFrame.apply(this,args);};\n${await response.text()}` });
  });
  await page.goto('http://127.0.0.1:5174/?scenario=camp&size=40&e2e');
  await page.waitForFunction(() => window.__rockView && !window.__rockView.preparing, undefined, { timeout: 60_000 });
  await page.locator('[data-speed="0"]').click();
  await page.evaluate(async () => {
    const { createWorld } = await import('/src/sim/index.ts');
    const world = createWorld(42, 40, 40);
    world.tiles = world.tiles.map((tile, i) => {
      const x = i % world.width, z = Math.floor(i / world.width);
      if (x >= 5 && x <= 34 && z >= 5 && z <= 34)
        return { terrain: 'rock', stone: x < 16 ? 'sandstone' : x < 26 ? 'granite' : 'marble' };
      return { terrain: 'soil' };
    });
    world.resources = [];
    window.__rockView.setWorld(world, true, 0);
  });
  await page.waitForFunction(() => window.__rockView.world?.width === 40 && !window.__rockView.preparing, undefined, { timeout: 60_000 });
  report.backend = await page.evaluate(() => window.__rockView.backend);
  assert.equal(report.backend, 'WebGPU');
  const inspect = async (name, offset, zoom, textured) => {
    await page.evaluate(({ offset, zoom, textured }) => {
      const view = window.__rockView;
      view.rocks.setTexturesEnabled(textured);
      view.controls.enableDamping = false; view.rig.setMode('orthographic');
      view.controls.target.set(20, 0, 20);
      view.camera.position.set(20 + offset[0], offset[1], 20 + offset[2]);
      view.camera.zoom = zoom; view.camera.updateProjectionMatrix(); view.controls.update();
    }, { offset, zoom, textured });
    await page.waitForTimeout(1200);
    const data = await page.evaluate(() => {
      const view = window.__rockView;
      return { drawCalls: view.stats.drawCalls, triangles: view.stats.triangles,
        bufferBytes: view.rocks.stats.bufferBytes,
        geometryAttributes: Object.keys(view.rocks.mesh.geometry.attributes).sort(),
        paintSize: [view.rocks.stonePaint.image.width, view.rocks.stonePaint.image.height],
        material: view.rocks.mesh.material === view.rocks.texturedMaterial ? 'painted' : 'plain' };
    });
    const file = `artifacts/rock-chaos-${name}.png`;
    await page.locator('[data-testid="world-canvas"]').screenshot({ path: file });
    report.views.push({ name, file, ...data });
    return data;
  };
  const top = await inspect('top', [4, 32, 5], 1.4, true);
  const iso = await inspect('iso', [11, 18, 17], 1.4, true);
  const plain = await inspect('plain', [11, 18, 17], 1.4, false);
  assert.deepEqual(top.geometryAttributes, ['color', 'normal', 'position']);
  assert.deepEqual(top.paintSize, [256, 256]);
  assert.equal(top.bufferBytes, iso.bufferBytes);
  assert.equal(iso.bufferBytes, plain.bufferBytes);
  assert.equal(plain.material, 'plain');
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close();
  writeFileSync('artifacts/rock-chaos-visual.json', JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report));
