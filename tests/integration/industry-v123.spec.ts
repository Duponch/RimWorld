import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { deserializeWorld, validateWorld } from '../../src/sim/serialization';
import { cell, expectWorld, observeErrors, panel, pause, saveKey, world } from './helpers';
import { revealCells } from './player-actions';

test('industrie V123 : la démonstration se charge, présente ses commandes et démarre un ouvrage réel', async ({ playwright }) => {
  test.setTimeout(90000);
  const raw = readFileSync(new URL('../../public/test-saves/v123/industrie.json', import.meta.url), 'utf8');
  const prepared = deserializeWorld(raw);
  expect(validateWorld(prepared)).toEqual([]);
  const bench = prepared.structures.find(structure => structure.kind === 'fabrication-bench')!;
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page);
  try {
    await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), { key: saveKey, data: raw });
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);
    await panel(page, 'menu');
    await page.locator('#load').click();
    await expectWorld(page, prepared);

    await panel(page, 'architect');
    await page.locator('[data-category="production"]').click();
    await expect(page.locator('[data-tool="fabrication-bench"]')).toContainText('Établi de fabrication');
    await expect(page.locator('[data-tool="hi-tech-research-bench"]')).toContainText('Bureau de recherche haute technologie');
    await expect(page.locator('[data-tool="multi-analyzer"]')).toContainText('Multi-analyseur');
    await page.locator('#architect-panel [data-close-panel]').click();

    await revealCells(page, [bench]);
    await cell(page, bench.x, bench.z);
    await expect(page.locator('#add-cooking-bill')).toBeVisible();
    await expect(page.locator('.bill-cost')).toContainText('12 acier');
    await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(() => window.__lisiere.world.piles.some(pile => (pile.componentWork?.progress ?? 0) > 0), undefined, { timeout: 30000 });
    await pause(page);
    const actual = await world(page);
    expect(actual.piles.some(pile => (pile.componentWork?.progress ?? 0) > 0)).toBe(true);
    expect(validateWorld(actual)).toEqual([]);
    expect(await page.evaluate(() => window.__lisiere.backend)).toContain('WebGPU');
    expect(errors).toEqual([]);
    await page.screenshot({ path: test.info().outputPath('industry-v123.png') });
  } finally {
    await browser.close();
  }
});
