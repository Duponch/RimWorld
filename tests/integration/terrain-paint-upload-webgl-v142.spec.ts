import { expect, test, type Page } from '@playwright/test';
import { observeErrors, startPaused } from './helpers';

const canvasCapture = async (page: Page, x: number, z: number): Promise<Buffer> => {
  const bounds = await page.locator('#viewport canvas').boundingBox();
  if (!bounds) throw new Error('World canvas has no bounds.');
  const point = await page.evaluate(({ x, z }) => window.__lisiere.projectCell(x, z), { x, z });
  return page.screenshot({ clip: {
    x: bounds.x + point.x - 110,
    y: bounds.y + point.y - 90,
    width: 220,
    height: 180,
  } });
};

test('WebGL fallback copies center, border and shore pigment exactly like a full atlas upload', async ({ playwright }) => {
  test.setTimeout(120_000);
  const browser = await playwright.chromium.launch({ channel: 'chromium', headless: false, args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  try {
    const errors = observeErrors(page);
    await page.addInitScript(() => {
      // WebGPURenderer selects its WebGL 2 fallback when no GPU API is exposed.
      Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined });
    });
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `const terrainFallbackFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){window.__terrainFallbackView=this;return terrainFallbackFrame.call(this,now);};\n` + await response.text() });
    });
    await startPaused(page);
    await page.waitForFunction(() => Boolean((window as any).__terrainFallbackView?.world));
    expect(await page.evaluate(() => ({ backend: (window as any).__terrainFallbackView.backend,
      gpuMissing: navigator.gpu === undefined }))).toEqual({ backend: 'WebGL 2', gpuMissing: true });

    await page.evaluate(() => {
      const view = (window as any).__terrainFallbackView;
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
      view.camera.zoom = 4.5;
      view.camera.updateProjectionMatrix(); view.controls.update();
    });
    await page.waitForFunction(() => (window as any).__terrainFallbackView?.terrainPaintResident);

    const edits = [
      { x: 16, z: 16, terrain: 'soil' },
      { x: 0, z: 0, terrain: 'gravel' },
      { x: 18, z: 16, terrain: 'water' },
    ];
    for (const edit of edits) {
      await page.evaluate(({ x, z }) => {
        const view = (window as any).__terrainFallbackView;
        const dx = x - view.controls.target.x, dz = z - view.controls.target.z;
        view.camera.position.x += dx; view.camera.position.z += dz;
        view.controls.target.set(x, 0, z);
        view.controls.update();
      }, edit);
      await page.waitForTimeout(100);
      const before = await canvasCapture(page, edit.x, edit.z);
      const patch = await page.evaluate(({ x, z, terrain }) => {
        const view = (window as any).__terrainFallbackView;
        const atlas = view.terrainPaintTexture, staging = view.terrainPaintStaging;
        const prior = { atlas: atlas.version, staging: staging.version };
        const world = structuredClone(view.world);
        world.tiles[z * world.width + x] = { terrain };
        view.setWorld(world, false, 0);
        return { prior, next: { atlas: atlas.version, staging: staging.version }, resident: view.terrainPaintResident };
      }, edit);
      expect(patch.next.atlas, `${edit.terrain} at ${edit.x},${edit.z} must keep the atlas version`).toBe(patch.prior.atlas);
      expect(patch.next.staging).toBeGreaterThan(patch.prior.staging);
      expect(patch.resident).toBe(true);
      await page.waitForTimeout(150);
      const partial = await canvasCapture(page, edit.x, edit.z);
      expect(partial.equals(before), `${edit.terrain} at ${edit.x},${edit.z} should change the visible cell`).toBe(false);

      await page.evaluate(() => { (window as any).__terrainFallbackView.terrainPaintTexture.needsUpdate = true; });
      await page.waitForTimeout(150);
      const full = await canvasCapture(page, edit.x, edit.z);
      expect(partial.equals(full), `${edit.terrain} at ${edit.x},${edit.z} must match a full upload`).toBe(true);
    }
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});
