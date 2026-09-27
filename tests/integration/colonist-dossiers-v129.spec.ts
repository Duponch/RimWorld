import { test, expect } from '@playwright/test';
import { createWorld, serializeWorld, validateWorld } from '../../src/sim/index';
import { expectWorld, observeErrors, panel, pawnTab, saveKey } from './helpers';

test('V129: colonist dossiers stay above the compact summary and expose recorded data', async ({ playwright }) => {
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page);
  try {
    const initial = createWorld(129, 32, 32), pawn = initial.pawns[0]!;
    initial.events.push({ tick: initial.tick, type: 'need', message: `Bavardage entre ${pawn.name} et ${initial.pawns[1]!.name}.` });
    expect(validateWorld(initial)).toEqual([]);
    await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), { key: saveKey, data: serializeWorld(initial) });
    await page.goto('/?scenario=camp&size=32&seed=129&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();
    await panel(page, 'menu'); await page.locator('#load').click(); await expectWorld(page, initial);
    await page.keyboard.press('Escape');
    await page.locator(`[data-pawn="${pawn.id}"]`).click();
    await expect(page.locator('[data-colonist-tab]')).toHaveText(['Journal', 'Matériel', 'Social', 'Bio', 'Besoins', 'Santé']);
    const geometry = await page.evaluate(() => {
      const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const pages = rect('.colonist-inspector-pages'), tabs = rect('.colonist-inspector-tabs'), summary = rect('.colonist-inspector-summary');
      return { pageBottom: pages.bottom, tabsTop: tabs.top, tabsBottom: tabs.bottom, summaryTop: summary.top, pageWidth: pages.width };
    });
    expect(geometry.pageBottom).toBeLessThanOrEqual(geometry.tabsTop + 2);
    expect(geometry.tabsBottom).toBeLessThanOrEqual(geometry.summaryTop + 2);
    expect(geometry.pageWidth).toBeGreaterThan(650);
    await pawnTab(page, 'journal');
    await expect(page.locator('#pawn-journal-rows')).toContainText('Bavardage entre');
    await page.locator('[data-journal-filter="combat"]').click();
    await expect(page.locator('#pawn-journal-empty')).toBeVisible();
    await pawnTab(page, 'health');
    await expect(page.locator('.health-capacities')).toContainText('Conscience');
    await pawnTab(page, 'gear');
    await expect(page.locator('#equipment-details')).toContainText('Inventaire');
    await pawnTab(page, 'social');
    await expect(page.locator('#social-opinions thead')).toContainText('Avis réciproque');
    expect(errors).toEqual([]);
    await page.screenshot({ path: 'artifacts/colonist-dossiers-v129.png' });
  } finally { await browser.close(); }
});
