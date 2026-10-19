import { expect, test, type Page } from '@playwright/test';
import { createWorld } from '../../src/sim/engine';
import { applyCommand } from '../../src/sim/engine';
import { addGroundMaterial, refreshStock } from '../../src/sim/materials';
import { serializeWorld, validateWorld } from '../../src/sim/serialization';
import { expectWorld, observeErrors, panel, saveKey } from './helpers';

const near = { x: 18, z: 23 }, far = { x: 18, z: 0 }, behind = { x: 18, z: 31 };

async function changedPixels(page: Page, before: Buffer, after: Buffer, points: Record<string, { x: number; y: number }>) {
  return page.evaluate(async ({ before, after, points }) => {
    const bitmap = async (base64: string) => createImageBitmap(new Blob([
      Uint8Array.from(atob(base64), char => char.charCodeAt(0)),
    ], { type: 'image/png' }));
    const [a, b] = await Promise.all([bitmap(before), bitmap(after)]);
    const canvas = document.createElement('canvas'); canvas.width = a.width; canvas.height = a.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(a, 0, 0); const first = ctx.getImageData(0, 0, a.width, a.height).data;
    ctx.clearRect(0, 0, a.width, a.height); ctx.drawImage(b, 0, 0);
    const second = ctx.getImageData(0, 0, b.width, b.height).data;
    const result: Record<string, number> = {};
    for (const [key, point] of Object.entries(points)) {
      let count = 0;
      for (let y = Math.max(0, Math.floor(point.y) - 23); y < Math.min(a.height, Math.ceil(point.y) + 23); y++)
        for (let x = Math.max(0, Math.floor(point.x) - 23); x < Math.min(a.width, Math.ceil(point.x) + 23); x++) {
          const i = (y * a.width + x) * 4;
          if (Math.max(Math.abs(first[i]! - second[i]!), Math.abs(first[i + 1]! - second[i + 1]!), Math.abs(first[i + 2]! - second[i + 2]!)) > 35) count++;
        }
      result[key] = count;
    }
    a.close(); b.close();
    return result;
  }, { before: before.toString('base64'), after: after.toString('base64'), points });
}

async function showLayers(page: Page, labels: boolean, icons: boolean) {
  await page.evaluate(({ labels, icons }) => {
    const view = (window as any).__v138Overlay, overlay = view.mapLabels;
    overlay.draw = labels ? view.__v138LabelDraw : (...args: any[]) => {
      view.__v138LabelDraw(...args); overlay.mesh.visible = false;
    };
    view.designations.present = icons ? view.__v138DesignationPresent : () => { view.designations.mesh.visible = false; };
  }, { labels, icons });
  await page.waitForTimeout(120);
}

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
      view.__v138LabelDraw = view.mapLabels.draw.bind(view.mapLabels);
      view.__v138DesignationPresent = view.designations.present.bind(view.designations);
      view.controls.enableDamping = false;
      view.rig.setMode('perspective');
      view.controls.target.set(16, 0, 16);
      view.camera.position.set(16, 3, 30);
      view.camera.updateProjectionMatrix(); view.controls.update();
    });
    await page.waitForTimeout(300);
    const state = await page.evaluate(({ near, far, behind }) => {
      const view = (window as any).__v138Overlay, rect = view.renderer.domElement.getBoundingClientRect();
      const sample = (x: number, y: number, z: number) => {
        const point = view.camera.position.clone().set(x, y, z).project(view.camera);
        return { x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2, ndc: point.toArray() };
      };
      const labelPoint = (target: { x: number; z: number }) => {
        const entry = view.mapLabels.chunks.flatMap((chunk: any) => chunk.entries).find((entry: any) => entry.x === target.x - 1 && entry.z === target.z);
        if (!entry || entry.label !== '4') throw Error('Physical quantity caption missing');
        return sample(entry.x, entry.y, entry.z);
      };
      return { near: labelPoint(near), far: labelPoint(far), behind: labelPoint(behind),
        spriteNear: sample(near.x, 3.2, near.z),
        spriteFar: sample(far.x, 3.2, far.z),
        spriteBehind: sample(behind.x, 3.2, behind.z),
        behindViewZ: view.camera.position.clone().set(behind.x, 3.2, behind.z).applyMatrix4(view.camera.matrixWorldInverse).z,
        range: view.designations.detailDistance.value,
        cameraNear: view.camera.position.distanceTo(view.camera.position.clone().set(near.x, 3.2, near.z)),
        cameraFar: view.camera.position.distanceTo(view.camera.position.clone().set(far.x, 3.2, far.z)),
        iconScale: view.designations.screenScale.value,
        iconVisible: view.designations.mesh.visible,
        labelBufferVersion: view.mapLabels.mesh.geometry.getAttribute('labelAnchor').version,
        bufferVersion: view.designations.mesh.geometry.getAttribute('designationPosition').version };
    }, { near, far, behind });
    expect(state.cameraNear).toBeLessThan(state.range);
    expect(state.cameraFar).toBeGreaterThan(state.range);
    expect(state.behindViewZ).toBeGreaterThan(0);
    expect(state.iconVisible).toBe(true);
    for (const point of [state.near, state.far]) {
      expect(Math.abs(point.ndc[0]!)).toBeLessThan(.95);
      expect(Math.abs(point.ndc[1]!)).toBeLessThan(.95);
    }
    const withIcons = await page.screenshot({ path: 'tmp/map-labels-v438/map-overlays-v138-near.png' });
    await showLayers(page, false, true);
    const withoutLabels = await page.screenshot({ path: 'tmp/map-labels-v438/map-overlays-v138-no-labels.png' });
    const labelPixels = await changedPixels(page, withIcons, withoutLabels, { near: state.near, far: state.far, behind: state.behind });
    expect(labelPixels.near).toBeGreaterThan(5);
    expect(labelPixels.far).toBe(0);
    expect(labelPixels.behind).toBe(0);
    await showLayers(page, true, false);
    const withoutIcons = await page.screenshot();
    const spritePixels = await changedPixels(page, withIcons, withoutIcons, { near: state.spriteNear, far: state.spriteFar, behind: state.spriteBehind });
    expect(spritePixels.near).toBeGreaterThan(20);
    expect(spritePixels.far).toBe(0);
    expect(spritePixels.behind).toBe(0);
    await showLayers(page, true, true);
    await page.evaluate(far => {
      const view = (window as any).__v138Overlay;
      view.rig.setMode('orthographic'); view.controls.target.set(far.x, 0, far.z);
      view.camera.position.set(far.x, 24, far.z + 26);
      view.camera.zoom = 6; view.camera.updateProjectionMatrix(); view.controls.update();
    }, far);
    await page.waitForTimeout(120);
    const afterOrbit = await page.evaluate(() => {
      const view = (window as any).__v138Overlay;
      return { visible: view.designations.mesh.visible,
        labelBufferVersion: view.mapLabels.mesh.geometry.getAttribute('labelAnchor').version,
        bufferVersion: view.designations.mesh.geometry.getAttribute('designationPosition').version };
    });
    expect(afterOrbit.bufferVersion).toBe(state.bufferVersion);
    expect(afterOrbit.labelBufferVersion).toBe(state.labelBufferVersion);
    expect(afterOrbit.visible).toBe(true);
    const orthoPoints = await page.evaluate(far => {
      const view = (window as any).__v138Overlay, rect = view.renderer.domElement.getBoundingClientRect();
      const point = (x: number, y: number, z: number) => {
        const p = view.camera.position.clone().set(x, y, z).project(view.camera);
        return { x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2 };
      };
      const entry = view.mapLabels.chunks.flatMap((chunk: any) => chunk.entries).find((entry: any) => entry.x === far.x - 1 && entry.z === far.z);
      if (!entry || entry.label !== '4') throw Error('Physical quantity caption missing');
      return { label: point(entry.x, entry.y, entry.z), sprite: point(far.x, 3.2, far.z) };
    }, far);
    const orthoWith = await page.screenshot({ path: 'tmp/map-labels-v438/map-overlays-v138-ortho.png' });
    await showLayers(page, false, false);
    const orthoWithout = await page.screenshot({ path: 'tmp/map-labels-v438/map-overlays-v138-ortho-without.png' });
    const restored = await changedPixels(page, orthoWith, orthoWithout, orthoPoints);
    expect(restored.label).toBeGreaterThan(5);
    expect(restored.sprite).toBeGreaterThan(20);
    await showLayers(page, true, true);
    await page.evaluate(() => {
      const view = (window as any).__v138Overlay;
      view.camera.zoom = .25; view.camera.updateProjectionMatrix(); view.controls.update();
    });
    await page.waitForTimeout(120);
    expect(await page.evaluate(() => (window as any).__v138Overlay.designations.mesh.visible)).toBe(false);
    expect(await page.evaluate(() => (window as any).__v138Overlay.mapLabels.mesh.visible)).toBe(false);
    expect(errors).toEqual([]);
  } finally { await browser.close(); }
});
