import { expect, test } from '@playwright/test';
import { roomCamp } from '../scenarios/rooms';
import { serializeWorld, validateWorld } from '../../src/sim/serialization';
import { observeErrors, world, panel, cell, saveKey, expectWorld } from './helpers';
import { revealCells } from './player-actions';

test('pièces : inspection, porte ouverte, brèche exécutée et rechargement dans le vrai worker', async ({ playwright }, testInfo) => {
  test.setTimeout(90000);
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page); page.setDefaultTimeout(15000);
  try {
    const w = roomCamp(), p = w.pawns[0]!; p.priorities.gather = 1;
    w.resources.push({ id: w.nextId++, kind: 'tree', x: 12, z: 15, amount: 12 });
    await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), { key: saveKey, data: serializeWorld(w) });
    await page.goto('/?size=32&e2e'); await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click(); await panel(page, 'menu');
    await page.locator('#load').click(); await expectWorld(page, w); await expect(page.locator('.game-shell')).not.toHaveJSProperty('inert', true);
    await page.keyboard.press('Escape'); await revealCells(page, [{ x: 13, z: 13 }, { x: 15, z: 15 }]);
    await cell(page, 13, 13); await expect(page.locator('#room-description')).toHaveText('Pièce non couverte · 36 cases.');
    await page.screenshot({ path: 'artifacts/rooms-ui-enclosed.png' });
    await cell(page, 15, 15); await expect(page.locator('#room-description')).toContainText('Seuil');
    await page.locator('#door-holdOpen').check();
    // Use a real collection order to cross the doorway, not an injected open state.
    await page.locator('[data-panel="architect"]').click();
    await page.locator('[data-category="orders"]').click(); await page.locator('[data-tool="chop"]').click();
    await cell(page, 12, 15); await page.keyboard.press('Escape'); await page.locator('[data-speed="6"]').click();
    await expect.poll(async () => (await world(page)).resources.length, { timeout: 12000 }).toBe(0);
    await page.locator('[data-speed="0"]').click(); await cell(page, 15, 15);
    await expect(page.locator('#door-state')).toContainText('Ouverte'); await expect(page.locator('#room-description')).toContainText('Seuil');
    await cell(page, 13, 13); await expect(page.locator('#room-description')).toContainText('36 cases');
    // Keep the selected interior through snapshots after a real wall removal.
    await cell(page, 11, 10); await page.locator('#cell-deconstruct').click();
    await cell(page, 13, 13); await expect(page.locator('#room-description')).toContainText('36 cases');
    await panel(page, 'work'); // Reopen while paused: no later snapshot can repair stale text.
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async () => (await world(page)).structures.some(s => s.x === 11 && s.z === 10), { timeout: 12000 }).toBe(false);
    await page.locator('[data-speed="0"]').click(); const breached = await world(page);
    await page.locator('[data-panel="work"]').click(); await expect(page.locator('#room-description')).toContainText('Extérieur');
    expect(validateWorld(breached)).toEqual([]);
    await panel(page, 'menu'); await page.locator('#save').click(); await page.locator('#load').click(); await expectWorld(page, breached);
    await expect(page.locator('.game-shell')).not.toHaveJSProperty('inert', true); await page.keyboard.press('Escape');
    await cell(page, 13, 13); await expect(page.locator('#room-description')).toContainText('Extérieur');
    // A pawn's inspection uses the same current logical cell and room cache.
    await page.locator(`[data-pawn="${p.id}"]`).click(); await expect(page.locator('#room-description')).toContainText('Extérieur');
    expect(errors).toEqual([]); await expect(page.locator('#fps-counter')).toBeVisible();
    const backend = await page.evaluate(() => window.__lisiere.backend); expect(backend).toContain('WebGPU');
    await page.screenshot({ path: 'artifacts/rooms-ui-breach.png' });
    await testInfo.attach('rooms', { contentType: 'application/json', body: JSON.stringify({ backend, finalTick: breached.tick, errors }) });
  } finally { await browser.close(); }
});
