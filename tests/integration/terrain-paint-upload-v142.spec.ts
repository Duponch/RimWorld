import { writeTestFile } from '../test-output.ts';
import { expect, test } from '@playwright/test';

import { observeErrors } from './helpers';

type TextureWrite = { width: number; height: number; bytes: number };

test('a 250² painted atlas uploads one changed cell through staging, with identical pixels to a full upload', async ({ playwright }) => {
  test.setTimeout(180_000);
  const browser = await playwright.chromium.launch({ channel: 'chromium', headless: false, args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  try {
    const errors = observeErrors(page);
    await page.addInitScript(() => {
      const state = { active: false, hooked: false, writes: [] as TextureWrite[] };
      (window as any).__terrainUploadProbe = state;
      const queue = (globalThis as any).GPUQueue?.prototype;
      if (!queue?.writeTexture) return;
      const original = queue.writeTexture;
      try {
        queue.writeTexture = function (...args: unknown[]) {
          if (state.active) {
            const data = args[1] as { byteLength?: number };
            const size = args[3] as { width?: number; height?: number } | number[];
            state.writes.push({
              width: Array.isArray(size) ? size[0]! : size.width!,
              height: Array.isArray(size) ? size[1]! : size.height!,
              bytes: data.byteLength ?? 0,
            });
          }
          return Reflect.apply(original, this, args);
        };
        state.hooked = true;
      } catch { /* The renderer's observable staging version remains the fallback. */ }
    });
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `const terrainUploadFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){window.__terrainUploadView=this;return terrainUploadFrame.call(this,now);};\n` + await response.text() });
    });
    await page.goto('/?scenario=camp&e2e&seed=42&size=250');
    await expect(page.locator('#loading')).toHaveCount(0);
    await expect(page.locator('#viewport canvas')).toBeVisible();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.locator('#pause-banner')).toBeVisible();
    await page.waitForFunction(() => Boolean((window as any).__terrainUploadView?.world));

    // Remove other world silhouettes, leave the same 250² atlas, and point the
    // paused camera at one unoccluded cell before comparing screenshots.
    await page.evaluate(() => {
      const view = (window as any).__terrainUploadView;
      const world = structuredClone(view.world);
      world.resources = []; world.structures = []; world.jobs = []; world.piles = [];
      world.packed = []; world.stockpiles = []; world.pawns = [];
      world.wildlife.animals = [];
      world.tiles = world.tiles.map(() => ({ terrain: 'grass' }));
      view.hasTracks = false;
      view.setGroundGrassEnabled(false);
      view.setWorld(world, true, 0);
      view.controls.enableDamping = false;
      view.rig.setMode('orthographic');
      const dx = 125 - view.controls.target.x, dz = 125 - view.controls.target.z;
      view.camera.position.x += dx; view.camera.position.z += dz;
      view.controls.target.set(125, 0, 125);
      view.camera.zoom = 4.5;
      view.camera.updateProjectionMatrix(); view.controls.update();
    });
    await page.waitForFunction(() => {
      const view = (window as any).__terrainUploadView;
      return view?.terrainPaintResident && view.terrainPaintTexture.image.width === 2000;
    });
    const initial = await page.evaluate(() => {
      const view = (window as any).__terrainUploadView;
      return { backend: view.backend, atlasVersion: view.terrainPaintTexture.version,
        stagingVersion: view.terrainPaintStaging.version, atlasBytes: view.terrainPaintTexture.image.data.byteLength };
    });
    expect(initial).toMatchObject({ backend: 'WebGPU', atlasBytes: 16_000_000 });

    const canvas = page.locator('#viewport canvas');
    const bounds = await canvas.boundingBox();
    const point = await page.evaluate(() => window.__lisiere.projectCell(125, 125));
    if (!bounds) throw new Error('World canvas has no bounds.');
    const clip = { x: bounds.x + point.x - 180, y: bounds.y + point.y - 140, width: 360, height: 280 };
    // Cropping around the target also excludes the changing FPS overlay.
    const capture = () => page.screenshot({ clip });
    const before = await capture();
    const single = await page.evaluate(() => {
      const view = (window as any).__terrainUploadView;
      const probe = (window as any).__terrainUploadProbe;
      probe.writes.length = 0; probe.active = true;
      const world = structuredClone(view.world), index = 125 * world.width + 125;
      world.tiles[index] = { terrain: 'water' };
      view.setWorld(world, false, 0);
      return { atlasVersion: view.terrainPaintTexture.version, stagingVersion: view.terrainPaintStaging.version,
        resident: view.terrainPaintResident };
    });
    expect(single.atlasVersion).toBe(initial.atlasVersion);
    expect(single.stagingVersion).toBeGreaterThan(initial.stagingVersion);
    expect(single.resident).toBe(true);
    await page.waitForTimeout(200);
    const partial = await capture();
    expect(partial.equals(before)).toBe(false);
    const patchWrites = await page.evaluate(() => {
      const probe = (window as any).__terrainUploadProbe;
      probe.active = false;
      return { hooked: probe.hooked, writes: probe.writes as TextureWrite[] };
    });
    expect(patchWrites.hooked).toBe(true);
    expect(patchWrites.writes).toContainEqual({ width: 24, height: 24, bytes: 2304 });
    expect(patchWrites.writes.some(write => write.bytes >= 16_000_000)).toBe(false);

    // A full write of the same CPU atlas must produce exactly the same land,
    // water pigment and shore-foam image as the partial GPU copy.
    await page.evaluate(() => {
      const view = (window as any).__terrainUploadView;
      view.terrainPaintTexture.needsUpdate = true;
    });
    await page.waitForTimeout(200);
    const fullReference = await capture();
    if (!partial.equals(fullReference)) {
      await writeTestFile(test.info().outputPath('terrain-partial.png'), partial);
      await writeTestFile(test.info().outputPath('terrain-full.png'), fullReference);
    }
    expect(partial.equals(fullReference)).toBe(true);

    const multiple = await page.evaluate(() => {
      const view = (window as any).__terrainUploadView;
      const probe = (window as any).__terrainUploadProbe;
      const before = { atlas: view.terrainPaintTexture.version, staging: view.terrainPaintStaging.version };
      probe.writes.length = 0; probe.active = true;
      const world = structuredClone(view.world), a = 126 * world.width + 125, b = a + 1;
      world.tiles[a] = { terrain: 'soil' }; world.tiles[b] = { terrain: 'soil' };
      view.setWorld(world, false, 0);
      return { before, after: { atlas: view.terrainPaintTexture.version, staging: view.terrainPaintStaging.version } };
    });
    expect(multiple.after.atlas).toBeGreaterThan(multiple.before.atlas);
    expect(multiple.after.staging).toBe(multiple.before.staging);
    await page.waitForFunction(() => (window as any).__terrainUploadView?.terrainPaintResident);
    const multiWrites = await page.evaluate(() => {
      const probe = (window as any).__terrainUploadProbe;
      probe.active = false;
      return { hooked: probe.hooked, writes: probe.writes as TextureWrite[] };
    });
    expect(multiWrites.hooked).toBe(true);
    expect(multiWrites.writes.some(write => write.bytes >= 16_000_000)).toBe(true);

    const toggled = await page.evaluate(() => {
      const view = (window as any).__terrainUploadView;
      const staging = view.terrainPaintStaging.version;
      view.setTexturesEnabled(false);
      const plainWidth = view.terrainPaintTexture.image.width;
      const world = structuredClone(view.world), index = 127 * world.width + 125;
      world.tiles[index] = { terrain: 'gravel' };
      view.setWorld(world, false, 0);
      const stagingAfterPlainEdit = view.terrainPaintStaging.version;
      view.setTexturesEnabled(true);
      return { plainWidth, restoredWidth: view.terrainPaintTexture.image.width,
        staging, stagingAfterPlainEdit, residentBeforeRender: view.terrainPaintResident };
    });
    expect(toggled).toMatchObject({ plainWidth: 1, restoredWidth: 2000,
      stagingAfterPlainEdit: toggled.staging, residentBeforeRender: false });
    await page.waitForFunction(() => (window as any).__terrainUploadView?.terrainPaintResident);
    const afterToggle = await page.evaluate(() => {
      const view = (window as any).__terrainUploadView;
      const previous = view.terrainPaintStaging.version;
      const world = structuredClone(view.world), index = 128 * world.width + 125;
      world.tiles[index] = { terrain: 'soil' };
      view.setWorld(world, false, 0);
      return { previous, current: view.terrainPaintStaging.version,
        atlasWidth: view.terrainPaintTexture.image.width, resident: view.terrainPaintResident };
    });
    expect(afterToggle).toMatchObject({ atlasWidth: 2000, resident: true });
    expect(afterToggle.current).toBeGreaterThan(afterToggle.previous);

    const newMap = await page.evaluate(() => {
      const view = (window as any).__terrainUploadView;
      const oldVersion = view.terrainPaintTexture.version;
      const oldStaging = view.terrainPaintStaging.version;
      const world = structuredClone(view.world);
      world.seed = (world.seed + 1) >>> 0;
      view.setWorld(world, false, 0);
      return { atlasVersion: view.terrainPaintTexture.version, oldVersion,
        stagingVersion: view.terrainPaintStaging.version, oldStaging,
        atlasWidth: view.terrainPaintTexture.image.width, residentBeforeRender: view.terrainPaintResident };
    });
    expect(newMap.atlasWidth).toBe(2000);
    expect(newMap.atlasVersion).toBeGreaterThan(newMap.oldVersion);
    expect(newMap.stagingVersion).toBe(newMap.oldStaging);
    expect(newMap.residentBeforeRender).toBe(false);
    await page.waitForFunction(() => (window as any).__terrainUploadView?.terrainPaintResident);
    const afterNewMap = await page.evaluate(() => {
      const view = (window as any).__terrainUploadView;
      const atlas = view.terrainPaintTexture, staging = view.terrainPaintStaging;
      const oldVersion = atlas.version, oldStaging = staging.version;
      const world = structuredClone(view.world), index = 130 * world.width + 130;
      world.tiles[index] = { terrain: 'gravel' };
      view.setWorld(world, false, 0);
      return { atlasVersion: atlas.version, oldVersion,
        stagingVersion: staging.version, oldStaging, resident: view.terrainPaintResident };
    });
    expect(afterNewMap.atlasVersion).toBe(afterNewMap.oldVersion);
    expect(afterNewMap.stagingVersion).toBeGreaterThan(afterNewMap.oldStaging);
    expect(afterNewMap.resident).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});
