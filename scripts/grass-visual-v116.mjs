import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deconstructionCamp } from '../tests/scenarios/deconstruction.ts';
import { serializeWorld, validateWorld } from '../src/sim/index.ts';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('@playwright/test');
const world = deconstructionCamp(1, 40);
world.tick = 3000;
world.tiles = world.tiles.map((_, i) => {
  const x = i % world.width, z = Math.floor(i / world.width);
  const terrain = x < 10 ? 'grass' : x < 20 ? 'soil' : x < 30 ? 'rich-soil' : 'gravel';
  return { terrain: z >= 30 ? 'rock' : terrain,
    ...(z >= 13 && z <= 17 && x >= 13 && x <= 17 ? { floor: 'wood-planks' } : {}) };
});
world.structures.push({ id: world.nextId++, kind: 'wall', x: 25, z: 16, orientation: 0, footprint: 'standard', material: 'wood' });
assert.deepEqual(validateWorld(world), []);

const report = { date: new Date().toISOString(), errors: [], views: [], backend: null, adapter: null };
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
  await page.addInitScript(save => localStorage.setItem('lisiere.save.v1', save), serializeWorld(world));
  await page.goto('http://127.0.0.1:5174/?scenario=camp&size=40&e2e');
  await page.waitForFunction(() => window.__lisiere && window.__grassView, undefined, { timeout: 60_000 });
  await page.locator('[data-speed="0"]').click();
  await page.locator('[data-panel="menu"]').click(); await page.locator('#load').click();
  await page.waitForFunction(() => window.__grassView.world?.width === 40 && !window.__grassView.preparing, undefined, { timeout: 60_000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);

  report.backend = await page.evaluate(() => window.__grassView.backend);
  assert.equal(report.backend, 'WebGPU');
  report.adapter = await page.evaluate(() => window.__grassView.renderer.getContext().getConfiguration?.().device.adapterInfo ?? null);
  const map = await page.evaluate(() => {
    const view = window.__grassView, bytes = view.grass.map.image.data, width = view.world.width;
    const pixel = (x, z) => Array.from(bytes.slice((z * width + x) * 4, (z * width + x) * 4 + 4));
    return { size: [view.grass.map.image.width, view.grass.map.image.height],
      grass: pixel(5, 15), soil: pixel(15, 12), rich: pixel(25, 15),
      gravel: pixel(35, 15), rock: pixel(5, 35), floor: pixel(15, 15), wall: pixel(25, 16) };
  });
  assert.deepEqual(map.size, [40, 40]);
  for (const key of ['grass', 'soil', 'rich']) assert.equal(map[key][3], 255, key);
  for (const key of ['gravel', 'rock', 'floor', 'wall']) assert.equal(map[key][3], 0, key);
  assert.notDeepEqual(map.grass, map.soil);
  assert.notDeepEqual(map.soil, map.rich);
  report.map = map;

  const inspect = async (name, x, z, zoom, offset = [8, 15, 12]) => {
    await page.evaluate(({ x, z, zoom, offset }) => {
      const view = window.__grassView;
      view.controls.enableDamping = false; view.rig.setMode('orthographic');
      view.controls.target.set(x, 0, z);
      view.camera.position.set(x + offset[0], offset[1], z + offset[2]);
      view.camera.zoom = zoom; view.camera.updateProjectionMatrix(); view.controls.update();
    }, { x, z, zoom, offset });
    await page.waitForTimeout(900);
    const data = await page.evaluate(() => {
      const view = window.__grassView;
      return { visible: view.grass.mesh.visible, blades: view.grass.mesh.geometry.instanceCount,
        pixelsPerCell: view.rig.pixelsPerCell(view.host.clientHeight), distant: view.overview.group.visible,
        mapVersion: view.grass.map.version,
        gridOrigin: view.grass.gridOrigin.value.toArray(), gridWidth: view.grass.gridWidth.value,
        slotsPerCell: view.grass.slotsPerCell.value,
        drawCalls: view.stats.drawCalls,
        triangles: view.stats.triangles };
    });
    const file = `artifacts/grass-v116-final-${name}.png`;
    await page.locator('[data-testid="world-canvas"]').screenshot({ path: file });
    report.views.push({ name, file, ...data });
    return data;
  };
  const soil = await inspect('soil-close', 15, 20, 3.7);
  const gravel = await inspect('gravel-close', 34, 20, 3.7);
  const floor = await inspect('floor-close', 15, 15, 4.2);
  const mid = await inspect('mid', 20, 20, 1.3);
  const distant = await inspect('distant', 20, 20, .18);
  assert.equal(soil.visible, true); assert.ok(soil.blades > 1000);
  assert.ok(soil.slotsPerCell >= 150 && soil.blades <= 120_000);
  assert.equal(gravel.visible, true); assert.equal(floor.visible, true);
  assert.ok(mid.blades > 1000 && mid.blades <= 120_000);
  assert.equal(distant.visible, false); assert.equal(distant.blades, 0);
  const orbitA = await inspect('iso-a', 15, 20, 2.6, [8, 15, 12]);
  const orbitB = await inspect('iso-b', 15, 20, 2.6, [-12, 19, 8]);
  const orbitReturn = await inspect('iso-a-return', 15, 20, 2.6, [8, 15, 12]);
  assert.equal(orbitA.mapVersion, orbitB.mapVersion);
  assert.equal(orbitA.mapVersion, orbitReturn.mapVersion);
  assert.ok(orbitA.blades > 0 && orbitB.blades > 0 && orbitReturn.blades > 0);
  const anchor = { x: 15, z: 20, slot: 3 };
  const decodeAnchor = view => {
    const [ox, oz] = view.gridOrigin, columns = view.gridWidth, slots = view.slotsPerCell;
    const rows = view.blades / (columns * slots);
    assert.ok(Number.isInteger(rows) && rows > 0);
    assert.ok(anchor.x >= ox && anchor.x < ox + columns);
    assert.ok(anchor.z >= oz && anchor.z < oz + rows);
    assert.ok(anchor.slot < slots);
    const index = ((anchor.z - oz) * columns + anchor.x - ox) * slots + anchor.slot;
    assert.ok(index >= 0 && index < view.blades);
    const cell = Math.floor(index / slots);
    return { index, cell: [ox + cell % columns, oz + Math.floor(cell / columns)], slot: index % slots };
  };
  const anchors = [orbitA, orbitB, orbitReturn].map(decodeAnchor);
  for (const decoded of anchors) assert.deepEqual({ cell: decoded.cell, slot: decoded.slot },
    { cell: [anchor.x, anchor.z], slot: anchor.slot });
  report.rotation = { sameAtlasVersion: true, views: ['iso-a', 'iso-b', 'iso-a-return'],
    anchor: { cell: [anchor.x, anchor.z], slot: anchor.slot, indices: anchors.map(({ index }) => index) } };
  await page.locator('[data-panel="menu"]').click();
  await page.locator('#ground-grass-enabled').uncheck();
  assert.equal(await page.evaluate(() => window.__grassView.grass), null);
  assert.equal(await page.evaluate(() => localStorage.getItem('lisiere.presentation.ground-grass.v1')), 'false');
  await page.locator('#ground-grass-enabled').check();
  await page.waitForFunction(() => window.__grassView.grass?.map.image.width === 40);
  const rebuilt = await page.evaluate(() => ({ mapVersion: window.__grassView.grass.map.version,
    pixels: Array.from(window.__grassView.grass.map.image.data.slice((15 * 40 + 15) * 4, (15 * 40 + 15) * 4 + 4)) }));
  assert.equal(rebuilt.pixels[3], 0);
  await page.locator('#ground-grass-enabled').uncheck();
  assert.equal(await page.evaluate(() => window.__grassView.grass), null);
  await page.locator('#ground-grass-enabled').check();
  await page.waitForFunction(() => window.__grassView.grass?.map.image.width === 40);
  report.toggle = { disabledOwnsNoLayer: true, rebuilt };
  await page.locator('[data-panel="menu"]').click();
  await page.locator('#menu-panel').waitFor({ state: 'hidden' });

  // A real seeded 250×250 departure, generated by the actual game constructor.
  // The prepared 40×40 mask oracle above remains a separate controlled view.
  await page.evaluate(async () => {
    const { createWorld } = await import('/src/sim/index.ts');
    const world = createWorld(42, 250, 250);
    window.__grassView.setWorld(world, true, 0);
  });
  await page.waitForFunction(() => window.__grassView.world?.width === 250 && !window.__grassView.preparing,
    undefined, { timeout: 60_000 });
  const landing = await page.evaluate(() => window.__grassView.world.scenario?.landing ?? { x: 125, z: 125 });
  const real = await inspect('real-250-forest', landing.x, landing.z, 1.55);
  assert.equal(real.visible, true);
  assert.ok(real.blades > 1000 && real.blades <= 120_000);
  const realCloseA = await inspect('real-250-close-a', landing.x, landing.z, 3.7, [8, 15, 12]);
  const realCloseB = await inspect('real-250-close-b', landing.x, landing.z, 3.7, [-12, 19, 8]);
  const realCloseReturn = await inspect('real-250-close-return', landing.x, landing.z, 3.7, [8, 15, 12]);
  assert.equal(realCloseA.mapVersion, realCloseB.mapVersion);
  assert.equal(realCloseA.mapVersion, realCloseReturn.mapVersion);
  assert.equal(realCloseA.slotsPerCell, realCloseB.slotsPerCell);
  assert.equal(realCloseA.slotsPerCell, realCloseReturn.slotsPerCell);
  for (const view of [realCloseA, realCloseB, realCloseReturn])
    assert.ok(view.blades > 0 && view.blades <= 120_000);
  report.largeRotation = { sameSlots: true,
    blades: [realCloseA.blades, realCloseB.blades, realCloseReturn.blades],
    slotsPerCell: realCloseA.slotsPerCell };
  report.realMap = await page.evaluate(() => ({ width: window.__grassView.world.width,
    height: window.__grassView.world.height,
    biome: window.__grassView.world.site?.biome,
    resources: window.__grassView.world.resources.length,
    grassCells: Array.from(window.__grassView.grass.map.image.data).filter((_, i) => i % 4 === 3 && window.__grassView.grass.map.image.data[i] > 0).length }));
  assert.deepEqual(report.errors, []);
  await page.close();
} finally {
  await browser.close();
  writeFileSync('artifacts/grass-visual-v116-final.json', JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report));
