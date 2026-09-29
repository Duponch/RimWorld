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
      await page.evaluate(() => {
        const view = (window as any).__weatherView;
        view.rig.setMode('orthographic');
        view.rig.configureMap(32, 32);
      });
      await expect.poll(() => page.evaluate(() => (window as any).__weatherView.precipitation.mesh.geometry.instanceCount)).toBe(210);
      const state = await page.evaluate(() => {
        const view = (window as any).__weatherView, mesh = view.precipitation.mesh;
        const layer = view.precipitation;
        return { backend: view.backend, weather: view.world.weather.current, visible: mesh.visible,
          count: mesh.geometry.instanceCount, shadows: mesh.castShadow || mesh.receiveShadow,
          geometry: mesh.geometry.uuid, material: mesh.material.uuid,
          vertexVersion: mesh.geometry.getAttribute('position').version,
          snowFraction: layer.snowFraction.value,
          dimensions: [layer.dimensions.value.x, layer.dimensions.value.y],
          stride: layer.stride.value, phase: [layer.rainPhase.value, layer.snowPhase.value],
          tick: view.world.tick };
      });
      expect(['WebGPU', 'WebGL 2']).toContain(state.backend);
      expect(state.weather).toBe(kind);
      expect(state.visible).toBe(true);
      expect(state.shadows).toBe(false);
      expect(state.tick).toBe(0);
      expect(state.dimensions).toEqual([32, 32]);
      expect(state.snowFraction > .8).toBe(expectedSnow);
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
      if (expectedSnow) {
        const footprint = await page.evaluate(() => {
          const view = (window as any).__weatherView;
          const camera = view.camera;
          camera.updateMatrixWorld();
          const bounds = document.querySelector('#viewport canvas')!.getBoundingClientRect();
          return [[-.5, -.5], [31.5, -.5], [31.5, 31.5], [-.5, 31.5]].map(([x, z]) => {
            const p = new (camera.position.constructor)(x, 0, z).project(camera);
            return [(p.x + 1) * bounds.width / 2, (1 - p.y) * bounds.height / 2];
          });
        });
        const pixels = await page.evaluate(async ({ on, off, footprint }) => {
          const decode = async (encoded: string) => {
            const binary = atob(encoded), bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const bitmap = await createImageBitmap(new Blob([bytes.buffer as ArrayBuffer], { type: 'image/png' }));
            const surface = new OffscreenCanvas(bitmap.width, bitmap.height);
            const context = surface.getContext('2d')!;
            context.drawImage(bitmap, 0, 0);
            bitmap.close();
            return { width: surface.width, height: surface.height,
              pixels: context.getImageData(0, 0, surface.width, surface.height).data };
          };
          const first = await decode(on), second = await decode(off);
          let insideChanged = 0, outsideChanged = 0;
          for (let y = 10; y < Math.min(first.height - 150, 850); y += 2)
            for (let x = 280; x < Math.min(first.width - 200, 1200); x += 2) {
              let positive = false, negative = false;
              for (let corner = 0; corner < 4; corner++) {
                const a = footprint[corner]!, b = footprint[(corner + 1) % 4]!;
                const cross = (b[0]! - a[0]!) * (y - a[1]!) - (b[1]! - a[1]!) * (x - a[0]!);
                if (cross > 0) positive = true;
                if (cross < 0) negative = true;
              }
              const offset = (y * first.width + x) * 4;
              const changed = Math.max(...[0, 1, 2].map(c => Math.abs(first.pixels[offset + c]! - second.pixels[offset + c]!))) > 16;
              if (changed) { if (positive && negative) outsideChanged++; else insideChanged++; }
            }
          return { insideChanged, outsideChanged };
        }, { on: withPrecipitation.toString('base64'), off: withoutPrecipitation.toString('base64'), footprint });
        expect(pixels.insideChanged).toBeGreaterThan(20);
        // A real 3D volume above the map remains visible against the sky in
        // iso; only its world X/Z footprint, not its screen projection, is bounded.
        expect(pixels.outsideChanged).toBeGreaterThan(20);
        console.info(JSON.stringify({ isoSnowVolumePixels: pixels }));
      }
      console.info(JSON.stringify({ weatherVisualSample: id, backend: state.backend,
        with: withStats, without: withoutStats,
        note: 'Capture indicative en pause sur backend logiciel; ni benchmark GPU ni comparaison de cadence.' }));
      await page.evaluate(() => { (window as any).__weatherView.precipitation.present = (window as any).__weatherPresent; });
      await page.waitForTimeout(100);
      expect(await page.evaluate(() => (window as any).__weatherView.precipitation.mesh.geometry.getAttribute('position').version)).toBe(state.vertexVersion);
      // Pan and zoom change the projection while the map volume, particle
      // phase and resident vertices stay exactly the same at a frozen tick.
      const panState = await page.evaluate(() => {
        const view = (window as any).__weatherView;
        const layer = view.precipitation;
        const before = [layer.dimensions.value.x, layer.dimensions.value.y,
          layer.stride.value, layer.rainPhase.value, layer.snowPhase.value,
          layer.mesh.geometry.instanceCount];
        view.camera.position.x += 4;
        view.camera.position.y += 3;
        view.camera.position.z += 5;
        view.controls.target.x += 4;
        view.camera.zoom *= 1.3;
        view.camera.updateProjectionMatrix();
        view.controls.update();
        view.frame(performance.now());
        return { before, after: [layer.dimensions.value.x, layer.dimensions.value.y,
          layer.stride.value, layer.rainPhase.value, layer.snowPhase.value,
          layer.mesh.geometry.instanceCount],
          vertexVersion: layer.mesh.geometry.getAttribute('position').version };
      });
      expect(panState.after).toEqual(panState.before);
      expect(panState.vertexVersion).toBe(state.vertexVersion);
      if (expectedSnow) {
        await page.evaluate(() => {
          const view = (window as any).__weatherView;
          view.rig.setMode('perspective');
          view.controls.enableDamping = false;
          view.controls.target.set(15.5, 0, 15.5);
          view.camera.position.set(15.5, 4, 35.5);
          view.controls.update();
        });
        await page.screenshot({ path: resolve(output, 'snow-hard-prepared-perspective.png') });
        await page.evaluate(() => (window as any).__weatherView.rig.setMode('orthographic'));
      }
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
    // Isolate the draw geometry of a 250² precipitation volume on this same
    // small prepared scene. This measures submission size, not 250² gameplay
    // cadence or hardware GPU time.
    const fullMapDraw = await page.evaluate(() => {
      const view = (window as any).__weatherView, layer = view.precipitation;
      layer.configureMap(250, 250);
      view.frame(performance.now());
      const withPrecipitation = { count: layer.mesh.geometry.instanceCount,
        calls: view.stats.drawCalls, triangles: view.stats.triangles };
      const present = layer.present.bind(layer);
      layer.present = () => { layer.mesh.visible = false; };
      view.frame(performance.now());
      const withoutPrecipitation = { calls: view.stats.drawCalls, triangles: view.stats.triangles };
      layer.present = present;
      layer.configureMap(32, 32);
      return { backend: view.backend, withPrecipitation, withoutPrecipitation };
    });
    expect(fullMapDraw.withPrecipitation.count).toBe(12_813);
    expect(fullMapDraw.withPrecipitation.calls - fullMapDraw.withoutPrecipitation.calls).toBe(1);
    expect(fullMapDraw.withPrecipitation.triangles - fullMapDraw.withoutPrecipitation.triangles).toBe(25_626);
    console.info(JSON.stringify({ fullMapDraw, note: '250² precipitation volume over 32² prepared scene; draw/triangle count only.' }));
    expect(errors).toEqual([]);
  } finally { await browser.close(); }
});
