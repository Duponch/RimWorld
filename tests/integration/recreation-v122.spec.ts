import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { deserializeWorld, validateWorld } from '../../src/sim/serialization';
import { expectWorld, observeErrors, pause, pawnTab, saveKey, world } from './helpers';

test('échecs V122 : meuble, besoin, siège et partie dans Chromium/WebGPU', async ({ playwright }) => {
  test.setTimeout(60000);
  const raw = readFileSync(new URL('../../public/test-saves/v122/echecs.json', import.meta.url), 'utf8');
  const prepared = deserializeWorld(raw);
  expect(validateWorld(prepared)).toEqual([]);
  const pawn = prepared.pawns[0]!;
  expect(prepared.structures.some(s => s.kind === 'chess-table')).toBe(true);
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page);
  try {
    await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), { key: saveKey, data: raw });
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);
    await page.locator('[data-panel="menu"]').click();
    await page.locator('#load').click();
    await expectWorld(page, prepared);

    await page.locator('[data-panel="architect"]').click();
    await page.locator('[data-category="recreation"]').click();
    const tool = page.locator('[data-tool="chess-table"]');
    await expect(tool).toBeVisible();
    await expect(tool).toContainText('Table d’échecs');
    expect(await tool.locator('.tool-icon').evaluate(el => getComputedStyle(el).backgroundImage)).not.toBe('none');
    await page.locator('#architect-panel [data-close-panel]').click();

    await page.locator(`[data-pawn="${pawn.id}"]`).click();
    await pawnTab(page, 'needs');
    await expect(page.locator('#recreation-tolerance')).toContainText('Jeux cérébraux');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(id => {
      const pawn = window.__lisiere.world.pawns.find(p => p.id === id);
      return pawn?.recreation.task?.activity === 'chess' && pawn.recreation.task.phase === 'active'
        && pawn.recreation.level > 10 && (pawn.skills.intellectual?.xp ?? 0) > 0;
    }, pawn.id, { timeout: 15000 });
    await pause(page);
    const actual = await world(page);
    expect(actual.pawns[0]!.recreation.tolerance.cerebral).toBeGreaterThan(0);
    expect(validateWorld(actual)).toEqual([]);
    await expect(page.locator('#recreation-tolerance')).toContainText('Jeux cérébraux');
    expect(await page.evaluate(() => window.__lisiere.backend)).toContain('WebGPU');
    expect(errors).toEqual([]);
    await page.screenshot({ path: test.info().outputPath('recreation-v122.png') });
  } finally {
    await browser.close();
  }
});
