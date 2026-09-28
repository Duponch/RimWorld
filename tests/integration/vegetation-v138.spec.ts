import { writeTestFile } from '../test-output.ts';
import { expect, test } from '@playwright/test';

import { observeErrors, startPaused } from './helpers';

test('V138: the arid drago canopy joins its trunk and sways in the resident tree batch', async ({ playwright }) => {
  test.setTimeout(90_000);
  const browser = await playwright.chromium.launch({ channel: 'chromium', headless: false, args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page);
  try {
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `const originalWindFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){window.__windView=this;return originalWindFrame.call(this,now);};\n` + await response.text() });
    });
    await startPaused(page);
    await page.waitForFunction(() => Boolean((window as any).__windView?.world));
    const before = await page.evaluate(() => {
      const view = (window as any).__windView, world = structuredClone(view.world);
      world.resources = [
        { id: world.nextId++, kind: 'tree', species: 'drago', x: 15, z: 15, amount: 30, growth: 1 },
        { id: world.nextId++, kind: 'tree', species: 'saguaro', x: 18, z: 15, amount: 30, growth: 1 },
      ];
      world.pawns = [];
      world.piles = [];
      world.packed = [];
      view.hasTracks = false;
      view.setWorld(world, true, 0);
      view.rig.setMode('orthographic');
      view.controls.enableDamping = false;
      view.controls.target.set(16, 0, 15);
      view.camera.position.set(26, 19, 36);
      view.camera.zoom = 3;
      view.camera.updateProjectionMatrix();
      view.controls.update();
      const trees = view.resources;
      trees.setWind(.8, 1, 0);
      trees.setWind = () => {};
      trees.presentWind = () => {};
      trees.windTick.value = 0;
      const meshes: any[] = [];
      trees.group.traverse((object: any) => { if (object.isMesh && object.geometry.hasAttribute('windRoot')) meshes.push(object); });
      return meshes.map(mesh => ({
        position: mesh.geometry.getAttribute('position').version,
        root: mesh.geometry.getAttribute('windRoot').version,
      }));
    });
    expect(before.length).toBeGreaterThan(0);
    const canvas = page.locator('#viewport canvas');
    await page.waitForTimeout(300);
    const still = await canvas.screenshot();
    if (process.env.V138_CAPTURE === '1') await writeTestFile('tmp/vegetation-v138.png', still);
    await test.info().attach('drago-parasol', { body: still, contentType: 'image/png' });
    await page.evaluate(() => { (window as any).__windView.resources.windTick.value = 12; });
    await page.waitForTimeout(200);
    const swaying = await canvas.screenshot();
    if (process.env.V138_CAPTURE === '1') await writeTestFile('tmp/vegetation-wind-v138.png', swaying);
    expect(still.equals(swaying)).toBe(false);
    expect(await page.evaluate(() => {
      const meshes: any[] = [];
      (window as any).__windView.resources.group.traverse((object: any) => {
        if (object.isMesh && object.geometry.hasAttribute('windRoot')) meshes.push(object);
      });
      return meshes.map(mesh => ({
        position: mesh.geometry.getAttribute('position').version,
        root: mesh.geometry.getAttribute('windRoot').version,
      }));
    })).toEqual(before);
    await page.evaluate(() => {
      const view = (window as any).__windView, world = structuredClone(view.world);
      world.resources[0].growth = .65;
      world.resources[1].growth = .65;
      view.setWorld(world, true, 0);
      view.controls.target.set(16, 0, 15);
      view.camera.position.set(36, 18, 10);
      view.camera.updateProjectionMatrix();
      view.controls.update();
      view.resources.windTick.value = 12;
    });
    await page.waitForTimeout(300);
    if (process.env.V138_CAPTURE === '1') await writeTestFile('tmp/vegetation-young-v138.png', await canvas.screenshot());
    const grassMap = await page.evaluate(() => {
      const view = (window as any).__windView, grass = view.grass;
      view.resources.group.traverse((object: any) => { if (object.isMesh) object.visible = false; });
      grass.setWind(.8, 1, 0);
      grass.setWind = () => {};
      grass.presentWind = () => {};
      grass.windTick.value = 0;
      return grass.map.version;
    });
    await page.waitForTimeout(200);
    const grassPatch = { x: 100, y: 350, width: 400, height: 300 };
    const grassStill = await page.screenshot({ clip: grassPatch });
    if (process.env.V138_CAPTURE === '1') await writeTestFile('tmp/vegetation-grass-v138.png', grassStill);
    await page.evaluate(() => { (window as any).__windView.grass.windTick.value = 4.5; });
    await page.waitForTimeout(200);
    expect(grassStill.equals(await page.screenshot({ clip: grassPatch }))).toBe(false);
    expect(await page.evaluate(() => (window as any).__windView.grass.map.version)).toBe(grassMap);
    expect(errors).toEqual([]);
  } finally { await browser.close(); }
});
