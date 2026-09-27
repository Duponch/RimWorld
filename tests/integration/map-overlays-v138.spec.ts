import { expect, test } from '@playwright/test';
import { createWorld } from '../../src/sim/engine';
import { applyCommand } from '../../src/sim/engine';
import { addGroundMaterial, refreshStock } from '../../src/sim/materials';
import { serializeWorld, validateWorld } from '../../src/sim/serialization';
import { expectWorld, observeErrors, panel, saveKey } from './helpers';

const near = { x: 18, z: 23 }, far = { x: 18, z: 0 }, behind = { x: 18, z: 31 };

test('V138: low perspective culls remote pile labels and designation sprites, then ortho zoom restores them', async ({ playwright }) => {
  test.setTimeout(120_000);
  const world = createWorld(1381, 32, 32);
  world.tiles = world.tiles.map(() => ({ terrain: 'grass' }));
  world.resources = []; world.structures = []; world.piles = []; world.packed = [];
  world.jobs = []; world.growingZones = []; world.stockpiles = [];
  for (const target of [near, far, behind]) {
    world.tiles[target.z * world.width + target.x] = { terrain: 'rock', stone: 'granite' };
    expect(applyCommand(world, { type: 'designate', kind: 'mine', ...target }).ok).toBe(true);
    addGroundMaterial(world, 'food', 4, { x: target.x - 1, z: target.z }, 'simple-meal');
  }
  refreshStock(world);
  expect(validateWorld(world)).toEqual([]);
  const browser = await playwright.chromium.launch({ channel: 'chromium', headless: false, args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 768 } });
  const errors = observeErrors(page);
  try {
    await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), { key: saveKey, data: serializeWorld(world) });
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `const originalOverlayFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){window.__v138Overlay=this;return originalOverlayFrame.call(this,now);};\n` + await response.text() });
    });
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();
    await panel(page, 'menu'); await page.locator('#load').click(); await expectWorld(page, world);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !!(window as any).__v138Overlay && !(window as any).__v138Overlay.preparing);
    expect(await page.evaluate(() => window.__lisiere.backend)).toBe('WebGPU');
    await page.evaluate(() => {
      const view = (window as any).__v138Overlay;
      view.controls.enableDamping = false;
      view.rig.setMode('perspective');
      view.controls.target.set(16, 0, 16);
      view.camera.position.set(16, 3, 30);
      view.camera.updateProjectionMatrix(); view.controls.update();
    });
    await page.waitForTimeout(300);
    const state = await page.evaluate(({ near, far, behind }) => {
      const view = (window as any).__v138Overlay, canvas = document.querySelector<HTMLCanvasElement>('.map-labels-overlay')!;
      const rect = canvas.getBoundingClientRect(), ratio = canvas.width / rect.width;
      const sample = (x: number, y: number, z: number) => {
        const point = view.camera.position.clone().set(x, y, z).project(view.camera);
        const px = Math.round((point.x + 1) * rect.width * ratio / 2), py = Math.round((1 - point.y) * rect.height * ratio / 2);
        const data = canvas.getContext('2d')!.getImageData(px - 15, py - 15, 30, 30).data;
        return { projected: { x: rect.left + px / ratio, y: rect.top + py / ratio, ndc: point.toArray() },
          opaque: Array.from(data).filter((value, index) => index % 4 === 3 && value > 0).length };
      };
      return { near: sample(near.x - 1, .32, near.z), far: sample(far.x - 1, .32, far.z),
        spriteNear: sample(near.x, 3.2, near.z).projected,
        spriteFar: sample(far.x, 3.2, far.z).projected,
        spriteBehind: sample(behind.x, 3.2, behind.z).projected,
        behindViewZ: view.camera.position.clone().set(behind.x, 3.2, behind.z).applyMatrix4(view.camera.matrixWorldInverse).z,
        range: view.designations.detailDistance.value,
        cameraNear: view.camera.position.distanceTo(view.camera.position.clone().set(near.x, 3.2, near.z)),
        cameraFar: view.camera.position.distanceTo(view.camera.position.clone().set(far.x, 3.2, far.z)),
        iconScale: view.designations.screenScale.value,
        iconVisible: view.designations.mesh.visible,
        bufferVersion: view.designations.mesh.geometry.getAttribute('designationPosition').version };
    }, { near, far, behind });
    expect(state.near.opaque).toBeGreaterThan(0);
    expect(state.far.opaque).toBe(0);
    expect(state.cameraNear).toBeLessThan(state.range);
    expect(state.cameraFar).toBeGreaterThan(state.range);
    expect(state.behindViewZ).toBeGreaterThan(0);
    expect(state.iconVisible).toBe(true);
    const withIcons = await page.screenshot({ path: test.info().outputPath('map-overlays-v138-near.png') });
    await page.evaluate(() => {
      const layer = (window as any).__v138Overlay.designations;
      (window as any).__v138OriginalPresent = layer.present.bind(layer);
      layer.present = () => { layer.mesh.visible = false; };
    });
    await page.waitForTimeout(120);
    const withoutIcons = await page.screenshot();
    const spritePixels = await page.evaluate(async ({ withIcons, withoutIcons, nearPoint, farPoint, behindPoint }) => {
      const bitmap = async (base64: string) => {
        const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
        return createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      };
      const [a, b] = await Promise.all([bitmap(withIcons), bitmap(withoutIcons)]);
      const canvas = document.createElement('canvas'); canvas.width = a.width; canvas.height = a.height;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(a, 0, 0); const before = ctx.getImageData(0, 0, a.width, a.height).data;
      ctx.clearRect(0, 0, a.width, a.height); ctx.drawImage(b, 0, 0);
      const after = ctx.getImageData(0, 0, b.width, b.height).data;
      const changed = (point: { x: number; y: number }) => {
        let count = 0;
        for (let y = Math.max(0, Math.floor(point.y) - 23); y < Math.min(a.height, Math.ceil(point.y) + 23); y++)
          for (let x = Math.max(0, Math.floor(point.x) - 23); x < Math.min(a.width, Math.ceil(point.x) + 23); x++) {
            const i = (y * a.width + x) * 4;
            if (Math.max(Math.abs(before[i]! - after[i]!), Math.abs(before[i + 1]! - after[i + 1]!), Math.abs(before[i + 2]! - after[i + 2]!)) > 35) count++;
          }
        return count;
      };
      return { near: changed(nearPoint), far: changed(farPoint), behind: changed(behindPoint) };
    }, { withIcons: withIcons.toString('base64'), withoutIcons: withoutIcons.toString('base64'), nearPoint: state.spriteNear, farPoint: state.spriteFar, behindPoint: state.spriteBehind });
    expect(spritePixels.near).toBeGreaterThan(20);
    expect(spritePixels.far).toBe(0);
    expect(spritePixels.behind).toBe(0);
    await page.evaluate(() => {
      const view = (window as any).__v138Overlay;
      view.designations.present = (window as any).__v138OriginalPresent;
      view.rig.setMode('orthographic'); view.controls.target.set(16, 0, 16);
      view.camera.zoom = 6; view.camera.updateProjectionMatrix(); view.controls.update();
    });
    await page.waitForTimeout(120);
    const afterOrbit = await page.evaluate(() => {
      const view = (window as any).__v138Overlay;
      return { visible: view.designations.mesh.visible,
        bufferVersion: view.designations.mesh.geometry.getAttribute('designationPosition').version };
    });
    expect(afterOrbit.bufferVersion).toBe(state.bufferVersion);
    expect(afterOrbit.visible).toBe(true);
    await page.evaluate(() => {
      const view = (window as any).__v138Overlay;
      view.camera.zoom = .25; view.camera.updateProjectionMatrix(); view.controls.update();
    });
    await page.waitForTimeout(120);
    expect(await page.evaluate(() => (window as any).__v138Overlay.designations.mesh.visible)).toBe(false);
    expect(errors).toEqual([]);
  } finally { await browser.close(); }
});
