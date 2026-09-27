import { expect, test } from '@playwright/test';
import { observeErrors, startPaused } from './helpers';

test('V137: world-space clouds cross the low perspective sky and fade over the isometric map', async ({ playwright }) => {
  test.setTimeout(90_000);
  const browser = await playwright.chromium.launch({ channel: 'chromium', headless: false, args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page);
  try {
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `const originalCloudFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){window.__cloudView=this;return originalCloudFrame.call(this,now);};\n` + await response.text() });
    });
    await startPaused(page);
    await page.waitForFunction(() => Boolean((window as any).__cloudView?.world));
    await page.evaluate(() => {
      const view = (window as any).__cloudView, world = structuredClone(view.world);
      world.weather ??= { revision: 1, originTick: world.tick, lastCoreTick: world.tick * 10,
        rng: 1, current: 'clear', previous: 'clear', ageCore: 0, durationCore: 10000,
        fireWatchCore: world.tick * 10, largeFire: false, lightningCount: 0 };
      world.weather.previous = 'rainy-thunderstorm';
      world.weather.current = 'rainy-thunderstorm';
      world.weather.ageCore = 4000;
      view.hasTracks = false;
      view.setWorld(world, true, 0);
      view.rig.setMode('perspective');
      view.controls.enableDamping = false;
      view.controls.target.set(15.5, 0, 15.5);
      view.camera.position.set(15.5, 4, 35.5);
      view.controls.update();
    });
    await expect.poll(() => page.evaluate(() => (window as any).__cloudView.clouds.mesh.visible)).toBe(true);
    await page.waitForTimeout(400);
    const low = await page.evaluate(() => {
      const view = (window as any).__cloudView;
      return { backend: view.backend, mode: view.rig.mode, count: view.clouds.mesh.count,
        opacity: view.clouds.mesh.material.opacity, castsShadow: view.clouds.mesh.castShadow,
        drawCalls: view.stats.drawCalls };
    });
    expect(low.backend).toBe('WebGPU');
    expect(low.mode).toBe('perspective');
    expect(low.count).toBe(64);
    expect(low.opacity).toBeGreaterThan(.5);
    expect(low.castsShadow).toBe(false);
    const vegetation = await page.evaluate(() => {
      const view = (window as any).__cloudView;
      const canopy = view.resources.group.getObjectByName('tree-canopy');
      return { canopy: Boolean(canopy), windShader: Boolean(canopy?.material?.positionNode),
        textured: Boolean(canopy?.material?.map) };
    });
    expect(vegetation).toEqual({ canopy: true, windShader: true, textured: true });
    await page.evaluate(() => (window as any).__cloudView.setTexturesEnabled(false));
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => {
      const canopy = (window as any).__cloudView.resources.group.getObjectByName('tree-canopy');
      return { windShader: Boolean(canopy?.material?.positionNode), textured: Boolean(canopy?.material?.map) };
    })).toEqual({ windShader: true, textured: false });
    await page.evaluate(() => (window as any).__cloudView.setTexturesEnabled(true));
    await page.waitForTimeout(150);
    const canvas = page.locator('#viewport canvas').first();
    const withClouds = await canvas.screenshot({ path: test.info().outputPath('weather-cloud-v137-low.png') });
    await page.evaluate(() => {
      const clouds = (window as any).__cloudView.clouds;
      (window as any).__cloudPresent = clouds.present.bind(clouds);
      clouds.present = () => { clouds.mesh.visible = false; };
    });
    await page.waitForTimeout(300);
    const withoutClouds = await canvas.screenshot({ path: test.info().outputPath('weather-cloud-v137-low-no-clouds.png') });
    expect(withClouds.equals(withoutClouds)).toBe(false);
    const worldMatrices = await page.evaluate(() => Array.from((window as any).__cloudView.clouds.mesh.instanceMatrix.array));
    await page.evaluate(() => {
      const view = (window as any).__cloudView;
      view.clouds.present = (window as any).__cloudPresent;
      view.rig.setMode('orthographic');
      view.controls.target.set(15.5, 0, 15.5);
      view.camera.position.set(37.5, 50, 38.5);
      view.camera.zoom = 1;
      view.camera.updateProjectionMatrix();
      view.controls.update();
    });
    await page.waitForTimeout(300);
    const iso = await page.evaluate(() => {
      const cloud = (window as any).__cloudView.clouds.mesh;
      return { visible: cloud.visible, opacity: cloud.material.opacity, matrices: Array.from(cloud.instanceMatrix.array) };
    });
    expect(iso.visible).toBe(false);
    expect(iso.matrices).toEqual(worldMatrices); // orbit/projection cannot move world-space instances
    await canvas.screenshot({ path: test.info().outputPath('weather-cloud-v137-iso.png') });
    expect(errors).toEqual([]);
  } finally { await browser.close(); }
});
