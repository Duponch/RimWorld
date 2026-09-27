import { expect, test } from '@playwright/test';
import { observeErrors, startPaused } from './helpers';

test('V137: medium wind visibly bends a batched tree with and without painted texture', async ({ playwright }) => {
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
    await page.evaluate(() => {
      const view = (window as any).__windView, world = structuredClone(view.world);
      world.resources = [{ id: world.nextId++, kind: 'tree', species: 'oak', x: 15, z: 15, amount: 30, growth: 1 }];
      view.hasTracks = false;
      view.setWorld(world, true, 0);
      view.rig.setMode('orthographic');
      view.controls.enableDamping = false;
      view.controls.target.set(15, 0, 15);
      view.camera.position.set(34, 30, 34);
      view.camera.zoom = 3;
      view.camera.updateProjectionMatrix();
      view.controls.update();
      const trees = view.resources;
      trees.setWind(.7, 1, 0);
      trees.setWind = () => {};
      trees.presentWind = () => {};
      trees.windTick.value = 0;
    });
    const canvas = page.locator('#viewport canvas');
    await page.waitForTimeout(300);
    const first = await canvas.screenshot();
    await page.evaluate(() => { (window as any).__windView.resources.windTick.value = 22.5; });
    await page.waitForTimeout(200);
    const second = await canvas.screenshot();
    expect(first.equals(second)).toBe(false);
    const textured = await page.evaluate(() => {
      const tree = (window as any).__windView.resources.group.getObjectByName('tree-canopy');
      return { shader: Boolean(tree?.material?.positionNode), map: Boolean(tree?.material?.map) };
    });
    expect(textured).toEqual({ shader: true, map: true });
    await page.evaluate(() => { (window as any).__windView.setTexturesEnabled(false); });
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => {
      const tree = (window as any).__windView.resources.group.getObjectByName('tree-canopy');
      return { shader: Boolean(tree?.material?.positionNode), map: Boolean(tree?.material?.map) };
    })).toEqual({ shader: true, map: false });
    expect(errors).toEqual([]);
  } finally { await browser.close(); }
});
