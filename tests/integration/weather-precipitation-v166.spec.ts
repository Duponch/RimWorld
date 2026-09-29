import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createWorld, deserializeWorld, serializeWorld } from '../../src/sim/index.ts';
import { newWeatherState } from '../../src/sim/weather.ts';
import type { WeatherKind } from '../../src/sim/weather-definitions.ts';
import { expectWorld, observeErrors, panel, saveKey } from './helpers.ts';

const output = resolve('tmp/weather-v166');

test('V166 : pluie, neige et orage préparés traversent le chargement réel et restent visibles en pause', async ({ playwright }) => {
  test.setTimeout(180_000);
  mkdirSync(output, { recursive: true });
  const browser = await playwright.chromium.launch({ channel: 'chromium', headless: false });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page);
  try {
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `const originalWeatherFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){window.__weatherView=this;return originalWeatherFrame.call(this,now);};\n` + await response.text() });
    });
    await page.goto('/?scenario=camp&size=32&seed=42&e2e');
    await expect(page.locator('#viewport canvas')).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.locator('#pause-banner')).toBeVisible();
    await page.waitForFunction(() => Boolean((window as any).__weatherView?.world));
    const base = createWorld(166, 32, 32);
    for (const [id, kind, expectedSnow] of [
      ['rain-prepared', 'rain', false],
      ['snow-hard-prepared', 'snow-hard', true],
      ['rainy-thunderstorm-prepared', 'rainy-thunderstorm', false],
    ] as const satisfies ReadonlyArray<readonly [string, WeatherKind, boolean]>) {
      const world = structuredClone(base);
      world.weather = newWeatherState(world.seed, world.tick);
      world.weather.current = world.weather.previous = kind;
      world.weather.durationCore = kind === 'rainy-thunderstorm' ? 20_000 : 40_000;
      const raw = serializeWorld(world);
      const expected = deserializeWorld(raw);
      await page.evaluate(({ key, data }) => localStorage.setItem(key, data), { key: saveKey, data: raw });
      await panel(page, 'menu');
      await page.locator('#load').click();
      await expectWorld(page, expected);
      await page.keyboard.press('Escape');
      await expect.poll(() => page.evaluate(() => (window as any).__weatherView.precipitation.mesh.count)).toBeGreaterThan(150);
      const state = await page.evaluate(() => {
        const view = (window as any).__weatherView, mesh = view.precipitation.mesh;
        return { backend: view.backend, weather: view.world.weather.current, visible: mesh.visible,
          count: mesh.count, shadows: mesh.castShadow || mesh.receiveShadow,
          geometry: mesh.geometry.uuid, material: mesh.material.uuid,
          poseVersion: mesh.instanceMatrix.version, color: Array.from(mesh.instanceColor.array.slice(0, 3)),
          tick: view.world.tick };
      });
      expect(['WebGPU', 'WebGL 2']).toContain(state.backend);
      expect(state.weather).toBe(kind);
      expect(state.visible).toBe(true);
      expect(state.shadows).toBe(false);
      expect(state.tick).toBe(0);
      expect(Number(state.color[0]) > .8).toBe(expectedSnow);
      const canvas = page.locator('#viewport canvas').first();
      const withPrecipitation = await canvas.screenshot({ path: resolve(output, `${id}.png`) });
      const withStats = await page.evaluate(() => ({ ...((window as any).__weatherView.stats) }));
      await page.evaluate(() => {
        const layer = (window as any).__weatherView.precipitation;
        (window as any).__weatherPresent = layer.present.bind(layer);
        layer.present = () => { layer.mesh.visible = false; };
      });
      await page.waitForTimeout(100);
      const withoutPrecipitation = await canvas.screenshot({ path: resolve(output, `${id}-without.png`) });
      const withoutStats = await page.evaluate(() => ({ ...((window as any).__weatherView.stats) }));
      expect(withPrecipitation.equals(withoutPrecipitation)).toBe(false);
      console.info(JSON.stringify({ weatherVisualSample: id, backend: state.backend,
        with: withStats, without: withoutStats,
        note: 'Capture indicative en pause sur backend logiciel; ni benchmark GPU ni comparaison de cadence.' }));
      await page.evaluate(() => { (window as any).__weatherView.precipitation.present = (window as any).__weatherPresent; });
      await page.waitForTimeout(100);
      expect(await page.evaluate(() => (window as any).__weatherView.precipitation.mesh.instanceMatrix.version)).toBe(state.poseVersion);
    }
    await page.evaluate(() => {
      const view = (window as any).__weatherView;
      view.rig.setMode('perspective');
      view.controls.enableDamping = false;
      view.controls.target.set(15.5, 0, 15.5);
      view.camera.position.set(15.5, 4, 35.5);
      view.controls.update();
    });
    await expect.poll(() => page.evaluate(() => (window as any).__weatherView.precipitation.mesh.visible)).toBe(true);
    await page.screenshot({ path: resolve(output, 'rainy-thunderstorm-prepared-perspective.png') });
    expect(errors).toEqual([]);
  } finally { await browser.close(); }
});
