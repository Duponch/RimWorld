import { expect, test } from '@playwright/test';
import { createWorld, serializeWorld, addGroundMaterial, refreshStock } from '../../src/sim/index';
import { world, expectWorld, saveKey, observeErrors, panel, tool, cell, startPaused } from './helpers';

test('table et tabouret : construction UI, portion transportée, repas assis, confort, reprise et compteur FPS permanent', async ({ playwright }, testInfo) => {
  test.setTimeout(120000);
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page);
  try {
    await startPaused(page);
    const fixture = createWorld(42, 32, 32);
    fixture.tiles = fixture.tiles.map(() => ({ terrain: 'grass' })); fixture.resources = []; fixture.piles = []; fixture.stockpiles = [];
    fixture.pawns = fixture.pawns.slice(0, 1);
    Object.assign(fixture.pawns[0]!, { x: 13, z: 16, hunger: 100, rest: 100, comfort: 10 });
    addGroundMaterial(fixture, 'wood', 60, { x: 14, z: 16 }); refreshStock(fixture);
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: saveKey, value: serializeWorld(fixture) });
    await startPaused(page); await panel(page, 'menu'); await page.locator('#load').click();
    await expect(page.locator('#fps-counter')).toBeVisible();
    await expect(page.locator('#fps-counter')).toHaveText(/^[1-9]\d* FPS$/);
    await tool(page, 'table'); await page.keyboard.press('e');
    await expect(page.locator('#placement-orientation')).toHaveText('90°');
    await cell(page, 17, 16); await tool(page, 'stool'); await cell(page, 17, 15);
    expect((await world(page)).jobs).toHaveLength(2);
    await page.getByRole('button', { name: 'Vitesse 6 fois', exact: true }).click();
    await expect.poll(async () => (await world(page)).structures.length, { timeout: 20000 }).toBe(2);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const built = await world(page); expect(built.stock.wood).toBe(7);
    Object.assign(built.pawns[0]!, { x: 13, z: 16, hunger: 20, comfort: 10, path: [] });
    addGroundMaterial(built, 'food', 1, { x: 14, z: 16 }); refreshStock(built);
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: saveKey, value: serializeWorld(built) });
    await panel(page, 'menu'); await page.locator('#load').click();
    await page.getByRole('button', { name: 'Vitesse normale', exact: true }).click();
    await page.waitForFunction(() => {
      const p = window.__lisiere.world.pawns[0]!;
      if (p.need?.kind !== 'eat' || p.need.phase !== 'travel' || !p.path.length) return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click(); return true;
    });
    const carrying = await world(page); expect(carrying.stock.food).toBe(1);
    expect(carrying.pawns[0]!.need).toMatchObject({ kind: 'eat', phase: 'travel' });
    await panel(page, 'menu'); await page.locator('#save').click(); await page.locator('#load').click();
    await expectWorld(page, carrying);
    await page.getByRole('button', { name: 'Vitesse normale', exact: true }).click();
    await page.waitForFunction(() => {
      const p = window.__lisiere.world.pawns[0]!;
      if (p.state !== 'eating' || p.need?.kind !== 'eat' || p.need.progress < 10) return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click(); return true;
    });
    const eating = await world(page), eater = eating.pawns[0]!;
    expect({ x: eater.x, z: eater.z }).toEqual({ x: 17, z: 15 });
    expect(eater.comfort).toBeGreaterThan(carrying.pawns[0]!.comfort);
    await cell(page, 17, 15); await expect(page.locator('#selected-action')).toContainText('Mange la portion');
    await expect(page.locator('#comfort-meter')).toBeVisible();
    await page.mouse.move(800, 480); await page.mouse.wheel(0, -850);
    await page.waitForTimeout(400); // Let camera damping settle for the pose inspection.
    await page.screenshot({ path: 'artifacts/dining-seated.png' });
    await panel(page, 'menu'); await expect(page.locator('#fps-counter')).toBeVisible();
    await page.locator('#save').click(); await page.locator('#load').click(); await expectWorld(page, eating);
    await page.getByRole('button', { name: 'Vitesse 6 fois', exact: true }).click();
    await expect.poll(async () => (await world(page)).stock.food).toBe(0);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    expect((await world(page)).pawns[0]!.memories).toEqual([]);
    await page.setViewportSize({ width: 640, height: 820 });
    await expect(page.locator('#fps-counter')).toBeVisible();
    await expect(page.locator('#fps-counter')).toHaveText(/^[1-9]\d* FPS$/);
    const counter = await page.locator('#fps-counter').boundingBox();
    expect(counter!.x + counter!.width).toBeLessThanOrEqual(640);
    expect(errors).toEqual([]);
    await testInfo.attach('dining-gameplay', { contentType: 'application/json', body: JSON.stringify({ backend: await page.evaluate(() => window.__lisiere.backend), woodConsumed: 53, foodConsumed: 1, resumedPhases: ['travel', 'ingest'], fpsVisiblePausedAndMenuAndCompact: true, errors }) });
  } finally { await browser.close(); }
});
