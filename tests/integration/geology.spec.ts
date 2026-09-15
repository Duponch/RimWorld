import { test, expect } from '@playwright/test';
import { createWorld, serializeWorld, validateWorld } from '../../src/sim/index';
import { STONE_KINDS, STONE_LABELS } from '../../src/sim/geology';
import { cell, expectWorld, observeErrors, panel, saveKey, world } from './helpers';
import { revealCells } from './player-actions';

test('inspecter les cinq roches, sauvegarder leurs identités et reprendre une carte historique', async ({ playwright }, testInfo) => {
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(10000); const errors = observeErrors(page);
  try {
    const fixture = createWorld(42, 32, 32); fixture.tick = 2000;
    fixture.tiles = fixture.tiles.map(() => ({ terrain: 'grass' })); fixture.resources = [];
    const cells = STONE_KINDS.map((stone, i) => ({ x: 12 + i, z: 12, stone }));
    for (const c of cells) fixture.tiles[c.z * fixture.width + c.x] = { terrain: 'rock', stone: c.stone };
    fixture.resources.push({ id: fixture.nextId++, x: 12, z: 14, kind: 'rock', amount: 9, stone: 'granite' });
    expect(validateWorld(fixture)).toEqual([]);
    await page.addInitScript(({ key, saved }) => localStorage.setItem(key, saved), { key: saveKey, saved: serializeWorld(fixture) });
    await page.goto('/?e2e'); await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click(); await expect(page.locator('#pause-banner')).toBeVisible();
    await panel(page, 'menu'); await page.locator('#load').click(); await expectWorld(page, fixture); await page.keyboard.press('Escape');
    await revealCells(page, cells);
    for (const c of cells) {
      await cell(page, c.x, c.z); await expect(page.locator('#cell-title')).toHaveText(`Massif · ${STONE_LABELS[c.stone]}`);
      await expect(page.locator('#cell-description')).toContainText('Miner révèle le sol rocheux');
    }
    await cell(page, 12, 14); await expect(page.locator('#cell-title')).toHaveText('Rochers · Granite');
    await expect(page.locator('#cell-description')).not.toContainText('9 unités à récolter');
    const before = await world(page); await panel(page, 'menu'); await page.locator('#save').click(); await page.locator('#load').click(); await expectWorld(page, before);
    await page.keyboard.press('Escape'); await page.screenshot({ path: 'artifacts/geology-inspection.png' });
    const old = JSON.parse(serializeWorld(fixture)); old.schemaVersion = 26;for(const a of old.pawns){delete a.priorities.mine;delete a.priorities.craft;}
    for (const t of old.tiles) delete t.stone; for (const r of old.resources) delete r.stone;
    await page.evaluate(({ key, saved }) => localStorage.setItem(key, saved), { key: saveKey, saved: JSON.stringify(old) });
    await panel(page, 'menu'); await page.locator('#load').click(); await expect.poll(async () => (await world(page)).schemaVersion).toBe(33);
    await page.keyboard.press('Escape'); await revealCells(page, cells); await cell(page, 12, 12);
    await expect(page.locator('#cell-title')).toContainText('type historique non défini');
    expect(errors).toEqual([]); await testInfo.attach('geology', { body: JSON.stringify({ cells, errors, schemaVersion: (await world(page)).schemaVersion }), contentType: 'application/json' });
  } finally { await browser.close(); }
});
