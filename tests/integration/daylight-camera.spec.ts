import { expect, test } from '@playwright/test';
import { createWorld, serializeWorld } from '../../src/sim/index';
import { observeErrors, panel, saveKey, tool, cell, expectWorld, world, dragRectangle } from './helpers';
import { revealCells } from './player-actions';

test('vue iso/perspective : sélection, rectangle, pause, reprise et ciel restauré depuis la sauvegarde', async ({ playwright }, testInfo) => {
  test.setTimeout(120000);
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page);
  // Read-only observation of actual renderer state; actions use the public UI.
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `const originalSkyFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const r=originalSkyFrame.call(this,now);window.__skyProbe={mode:this.cameraMode,sample:{...this.daylight.sample},span:this.rig.span,target:this.controls.target.toArray(),tick:this.timeline.tick,frame:this.stats};return r;};\n` + await response.text() });
  });
  const probe = () => page.evaluate(() => (window as any).__skyProbe);
  try {
    const fixture = createWorld(42, 32, 32); fixture.tick = 3000;
    fixture.tiles = fixture.tiles.map(() => ({ terrain: 'grass' })); fixture.resources = []; fixture.piles = []; fixture.stock = { wood: 0, food: 0 };
    fixture.pawns.forEach((p, i) => Object.assign(p, { x: 13 + i, z: 15, hunger: 100, rest: 100 }));
    fixture.resources.push({ id: fixture.nextId++, kind: 'tree', x: 18, z: 14, amount: 12 });
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: saveKey, value: serializeWorld(fixture) });
    await page.goto('/?scenario=camp&e2e&size=32&seed=42'); await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click(); await panel(page, 'menu'); await page.locator('#load').click(); await expectWorld(page, fixture);
    await expect.poll(async () => (await probe()).sample.daylight).toBe(1);
    const initial = await probe();
    for (let i = 0; i < 6; i++) {
      await page.locator('#camera-mode').click();
      await expect(page.locator('#camera-mode')).toHaveAttribute('aria-pressed', String(i % 2 === 0));
    }
    await expectWorld(page, fixture);
    const toggled = await probe(); expect(toggled.span).toBeCloseTo(initial.span, 8); expect(toggled.target).toEqual(initial.target);
    await page.locator('#camera-mode').click(); await tool(page, 'select'); await revealCells(page, [{ x: 18, z: 14 }]); await cell(page, 18, 14);
    await expect(page.locator('#cell-description')).toContainText('18, 14');
    await tool(page, 'stockpile'); await revealCells(page, [{ x: 17, z: 12 }, { x: 19, z: 13 }]); await dragRectangle(page, { x: 17, z: 12 }, { x: 19, z: 13 });
    await expect.poll(async () => (await world(page)).stockpiles.length).toBe(6);
    await tool(page, 'chop'); await revealCells(page, [{ x: 18, z: 14 }]); await cell(page, 18, 14);
    await expect.poll(async () => (await world(page)).jobs.length).toBe(1);
    const beforeGesture = await world(page);
    await tool(page, 'stockpile'); await revealCells(page, [{ x: 17, z: 10 }, { x: 19, z: 11 }]); await dragRectangle(page, { x: 17, z: 10 }, { x: 19, z: 11 }, false);
    await page.locator('#camera-mode').focus(); await page.locator('#camera-mode').press('Enter'); await page.mouse.up();
    await expectWorld(page, beforeGesture);
    await page.locator('#camera-mode').click();
    await page.setViewportSize({ width: 1100, height: 780 }); await tool(page, 'select'); await revealCells(page, [{ x: 18, z: 14 }]); await cell(page, 18, 14);
    await expect(page.locator('#cell-description')).toContainText('18, 14');
    const paused = (await probe()).sample;
    await page.waitForTimeout(350); expect((await probe()).sample).toEqual(paused);
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(() => window.__lisiere.world.tick >= 3040);
    await page.locator('[data-speed="0"]').click();
    await expect.poll(async () => (await probe()).tick).toBe((await world(page)).tick);
    expect((await probe()).sample.x).not.toBe(paused.x);
    await panel(page, 'menu'); await page.locator('#save').click();
    const saved = await world(page), savedSky = (await probe()).sample;
    await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click(); await page.waitForFunction(t => window.__lisiere.world.tick > t + 30, saved.tick);
    await page.locator('[data-speed="0"]').click(); await panel(page, 'menu'); await page.locator('#load').click(); await expectWorld(page, saved);
    await expect.poll(async () => (await probe()).sample).toEqual(savedSky);
    expect((await probe()).mode).toBe('perspective');
    // A previous save at midnight restores lighting immediately, without
    // advancing the world or depending on time elapsed in this browser.
    fixture.tick = 0;
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: saveKey, value: serializeWorld(fixture) });
    await panel(page, 'menu'); await page.locator('#load').click();
    await expect.poll(async () => (await probe()).sample.daylight).toBe(0); await expectWorld(page, fixture);
    await expect(page.locator('#fps-counter')).toBeVisible(); expect(errors).toEqual([]);
    await testInfo.attach('daylight-camera', { contentType: 'application/json', body: JSON.stringify({ initial, toggled, savedSky, midnight: await probe(), errors }) });
  } finally { await browser.close(); }
});
