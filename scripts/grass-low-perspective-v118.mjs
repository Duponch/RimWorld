import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deconstructionCamp } from '../tests/scenarios/deconstruction.ts';
import { serializeWorld, validateWorld } from '../src/sim/index.ts';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('@playwright/test');
const world = deconstructionCamp(1, 250);
assert.deepEqual(validateWorld(world), []);
const appUrl = process.env.GRASS_URL ?? 'http://127.0.0.1:5178/';
const report = { date: new Date().toISOString(), backend: null, errors: [], views: [] };
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
    await route.fulfill({ response, body: `const originalGrassFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(...args){window.__grassView=this;return originalGrassFrame.apply(this,args);};\n${await response.text()}` });
  });
  await page.addInitScript(save => {
    localStorage.setItem('lisiere.presentation.ground-grass.v1', 'true');
    localStorage.setItem('lisiere.save.v1', save);
  }, serializeWorld(world));
  await page.goto(`${appUrl}?scenario=camp&size=250&e2e`);
  await page.waitForFunction(() => window.__lisiere && window.__grassView, undefined, { timeout: 60_000 });
  await page.locator('[data-speed="0"]').click();
  await page.locator('[data-panel="menu"]').click();
  await page.locator('#load').click();
  await page.waitForFunction(() => window.__grassView.world?.width === 250 &&
    window.__grassView.world.pawns?.[0]?.name === 'Bâtisseur 1' &&
    window.__grassView.world.resources.length === 0 && !window.__grassView.preparing,
    undefined, { timeout: 60_000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  report.backend = await page.evaluate(() => window.__grassView.backend);
  assert.equal(report.backend, 'WebGPU');

  const inspect = async (name, x, z, y, aimX, aimZ, mode = 'perspective') => {
    await page.evaluate(({ x, z, y, aimX, aimZ, mode }) => {
      const view = window.__grassView;
      view.controls.enableDamping = false;
      view.rig.setMode(mode);
      view.controls.target.set(aimX, 0, aimZ);
      view.camera.position.set(x, y, z);
      if (mode === 'orthographic') {
        view.camera.zoom = 3.7;
        view.camera.updateProjectionMatrix();
      }
      view.controls.update();
    }, { x, z, y, aimX, aimZ, mode });
    await page.waitForTimeout(600);
    const data = await page.evaluate(() => {
      const view = window.__grassView, grass = view.grass;
      return { blades: grass.mesh.geometry.instanceCount, visible: grass.mesh.visible,
        ppc: view.rig.pixelsPerCell(view.host.clientHeight),
        camera: view.camera.position.toArray(), target: view.controls.target.toArray(), mode: view.rig.mode,
        resources: view.world.resources.length,
        baseSlots: grass.slotsPerCell.value, midSlots: grass.nearSlotsPerCell.value,
        foregroundSlots: grass.foregroundSlotsPerCell.value,
        baseInstances: grass.baseInstances.value, midInstances: grass.nearInstances.value,
        origin: grass.gridOrigin.value.toArray(), midOrigin: grass.nearGridOrigin.value.toArray(),
        foregroundOrigin: grass.foregroundGridOrigin.value.toArray(),
        atlasVersion: grass.map.version, drawCalls: view.stats.drawCalls,
        sharedVertices: grass.mesh.geometry.getAttribute('position').count,
        sharedTriangles: grass.mesh.geometry.index.count / 3,
        grassAttributes: Object.keys(grass.mesh.geometry.attributes),
        mapBytes: grass.map.image.data.byteLength, fps: view.stats.fps };
    });
    const file = `artifacts/grass-v118-${name}.png`;
    await page.locator('[data-testid="world-canvas"]').screenshot({ path: file });
    report.views.push({ name, file, ...data });
    return data;
  };
  const lowA = await inspect('low-a', 125, 130, 5, 125, 105);
  const diagonal = 25 / Math.SQRT2;
  const lowB = await inspect('low-b', 125 + diagonal, 105 + diagonal, 5, 125, 105);
  const iso = await inspect('iso', 133, 117, 15, 125, 105, 'orthographic');
  assert.ok(lowA.baseSlots >= 1 && lowA.midSlots > 10 && lowA.foregroundSlots > 50);
  assert.equal(lowA.resources, 0);
  assert.equal(lowA.midSlots, lowB.midSlots);
  assert.equal(lowA.foregroundSlots, lowB.foregroundSlots);
  assert.equal(lowA.atlasVersion, lowB.atlasVersion);
  assert.ok(iso.visible && iso.blades > 1000);
  for (const view of report.views) assert.ok(view.blades <= 120_000);
  for (const view of report.views) {
    assert.equal(view.sharedVertices, 4);
    assert.equal(view.sharedTriangles, 2);
    assert.deepEqual(view.grassAttributes.sort(), ['normal', 'position', 'uv']);
    assert.equal(view.mapBytes, 250 * 250 * 4);
  }
  assert.deepEqual(report.errors, []);
  await page.close();
} finally {
  await browser.close();
  writeFileSync('artifacts/grass-low-perspective-v118.json', JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report));
