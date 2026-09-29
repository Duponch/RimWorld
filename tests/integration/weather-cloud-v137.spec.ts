import { expect, test } from '@playwright/test';
import { observeErrors, startPaused } from './helpers';

test('world-space clouds cross the low perspective sky and remain subtle over the isometric map', async ({ playwright }) => {
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
      // This seed places a clear-weather cloud inside the small prepared map,
      // so both projections have an on-screen mass to compare.
      world.seed = 10;
      world.tick = 3000; // daylight makes the cloud silhouettes reviewable
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
      // Look across the whole confined 32² field at a low elevation. A near
      // ground camera cannot see its 18–29-unit cloud layer above the frustum.
      view.camera.position.set(15.5, 5, 100);
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
    expect(low.count).toBe(8);
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
      const view = (window as any).__cloudView, cloud = view.clouds.mesh;
      return { visible: cloud.visible, opacity: cloud.material.opacity,
        drawCalls: view.stats.drawCalls, triangles: view.stats.triangles,
        matrices: Array.from(cloud.instanceMatrix.array) };
    });
    expect(iso.visible).toBe(true);
    expect(iso.opacity).toBeGreaterThan(.05);
    expect(iso.opacity).toBeLessThan(low.opacity * .3);
    expect(iso.matrices).toEqual(worldMatrices); // orbit/projection cannot move world-space instances
    const isoRain = await canvas.screenshot({ path: test.info().outputPath('weather-cloud-iso-rain.png') });
    await page.evaluate(() => {
      const clouds = (window as any).__cloudView.clouds;
      clouds.present = () => { clouds.mesh.visible = false; };
    });
    await page.waitForTimeout(300);
    const isoRainWithoutClouds = await canvas.screenshot({ path: test.info().outputPath('weather-cloud-iso-rain-no-clouds.png') });
    expect(isoRain.equals(isoRainWithoutClouds)).toBe(false);
    const without = await page.evaluate(() => {
      const stats = (window as any).__cloudView.stats;
      return { drawCalls: stats.drawCalls, triangles: stats.triangles };
    });
    expect(iso.drawCalls - without.drawCalls).toBe(1);
    expect(iso.triangles - without.triangles).toBe(960);
    await page.evaluate(() => {
      const view = (window as any).__cloudView;
      view.clouds.present = (window as any).__cloudPresent;
      view.world.weather.previous = 'clear';
      view.world.weather.current = 'clear';
      view.world.weather.ageCore = 4000;
    });
    await page.waitForTimeout(300);
    const isoClear = await canvas.screenshot({ path: test.info().outputPath('weather-cloud-iso-clear.png') });
    const clearOpacity = await page.evaluate(() => (window as any).__cloudView.clouds.mesh.material.opacity);
    expect(clearOpacity).toBeGreaterThan(.05);
    expect(clearOpacity).toBeLessThan(iso.opacity);
    await page.evaluate(() => {
      const clouds = (window as any).__cloudView.clouds;
      clouds.present = () => { clouds.mesh.visible = false; };
    });
    await page.waitForTimeout(300);
    const isoClearWithoutClouds = await canvas.screenshot({ path: test.info().outputPath('weather-cloud-iso-clear-no-clouds.png') });
    expect(isoClear.equals(isoClearWithoutClouds)).toBe(false);
    expect(errors).toEqual([]);
  } finally { await browser.close(); }
});
