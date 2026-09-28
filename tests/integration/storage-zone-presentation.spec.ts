import { testOutputPath } from '../test-output.ts';
import { expect, test } from '@playwright/test';
import { createWorld, serializeWorld, validateWorld } from '../../src/sim/index';
import { addGroundMaterial, refreshStock } from '../../src/sim/materials';
import { cell, expectWorld, observeErrors, panel, pause, saveKey } from './helpers';
import { revealCells } from './player-actions';

test('stockpile area stays a faint overlay around stored items and remains selectable', async ({ playwright }) => {
  test.setTimeout(90_000);
  const browser = await playwright.chromium.launch({ channel: 'chromium', headless: false, args: [] });
  try {
    const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
    const errors = observeErrors(page);
    const prepared = createWorld(138, 32, 32);
    prepared.tick = 2000;
    prepared.tiles = prepared.tiles.map(() => ({ terrain: 'grass' }));
    prepared.resources = []; prepared.structures = []; prepared.jobs = []; prepared.piles = [];
    prepared.packed = []; prepared.growingZones = []; prepared.stockpiles = [];
    for (let z = 12; z < 17; z++) for (let x = 13; x < 19; x++)
      prepared.stockpiles.push({ id: prepared.nextId++, x, z, filters: { wood: true, food: true }, priority: 1, capacity: 75 });
    addGroundMaterial(prepared, 'wood', 20, { x: 15, z: 14 }, 'wood');
    addGroundMaterial(prepared, 'food', 12, { x: 17, z: 15 }, 'rice');
    refreshStock(prepared);
    expect(validateWorld(prepared)).toEqual([]);

    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value),
      { key: saveKey, value: serializeWorld(prepared) });
    await page.goto('/?scenario=camp&size=32&seed=138&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);
    await panel(page, 'menu'); await page.locator('#load').click(); await expectWorld(page, prepared);
    await page.keyboard.press('Escape');
    await revealCells(page, [{ x: 15, z: 14 }, { x: 17, z: 15 }, { x: 13, z: 12 }, { x: 12, z: 12 }]);
    expect(await page.evaluate(() => window.__lisiere.backend)).toBe('WebGPU');
    const screenshot = await page.screenshot({ path:testOutputPath('artifacts/storage-zone-presentation.png') });
    expect(screenshot.byteLength).toBeGreaterThan(10_000);
    await cell(page, 13, 12);
    await expect(page.locator('#cell-title')).toHaveText('Réserve');
    await expect(page.locator('#cell-storage')).toBeVisible();
    await cell(page, 12, 12);
    await expect(page.locator('#inspector')).toBeHidden();
    expect(errors).toEqual([]);
  } finally { await browser.close(); }
});
