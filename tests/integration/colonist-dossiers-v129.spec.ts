import { testOutputPath } from '../test-output.ts';
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
      return { pageBottom: pages.bottom, tabsTop: tabs.top, tabsBottom: tabs.bottom, summaryTop: summary.top, pageWidth: pages.width,
        pageRadius: getComputedStyle(document.querySelector('.colonist-inspector-pages')!).borderBottomLeftRadius,
        tabRadius: getComputedStyle(document.querySelector('[data-colonist-tab]')!).borderBottomLeftRadius,
        summaryRadius: getComputedStyle(document.querySelector('.colonist-inspector-summary')!).borderTopLeftRadius };
    });
    expect(geometry.tabsTop - geometry.pageBottom).toBeGreaterThanOrEqual(7);
    expect(geometry.summaryTop - geometry.tabsBottom).toBeGreaterThanOrEqual(7);
    expect([geometry.pageRadius, geometry.tabRadius, geometry.summaryRadius]).toEqual(['10px', '8px', '10px']);
    expect(geometry.pageWidth).toBeGreaterThan(650);
    await pawnTab(page, 'journal');
    await expect(page.locator('#pawn-journal-rows')).toContainText('Bavardage entre');
    for (const viewport of [{ width: 1366, height: 768 }, { width: 1522, height: 1195 }]) {
      await page.setViewportSize(viewport);
      const layout = await page.evaluate(() => {
        const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
        const inspector = box('#inspector'), pages = box('.colonist-inspector-pages');
        const card = box('#pawn-journal'), actions = box('.colonist-inspector-actions');
        const policy = box('#inspector-hostility'), navigation = document.querySelector<HTMLElement>('.main-tabs')!;
        return {
          inspector: { left: inspector.left, right: inspector.right, top: inspector.top, bottom: inspector.bottom },
          pages: { left: pages.left, right: pages.right, height: pages.height },
          card: { left: card.left, right: card.right },
          actions: { left: actions.left, right: actions.right },
          policy: { left: policy.left, right: policy.right },
          navigationWidth: navigation.clientWidth,
          navigationScrollWidth: navigation.scrollWidth,
        };
      });
      expect(layout.inspector.top).toBeGreaterThanOrEqual(0);
      expect(layout.inspector.bottom).toBeLessThanOrEqual(viewport.height - 75);
      expect(layout.pages.height).toBeLessThan(370);
      expect(layout.card.left).toBeGreaterThan(layout.pages.left + 12);
      expect(layout.card.right).toBeLessThan(layout.pages.right - 12);
      expect(layout.policy.left).toBeGreaterThan(layout.actions.left + 10);
      expect(layout.policy.right).toBeLessThan(layout.actions.right - 10);
      expect(layout.navigationScrollWidth).toBeLessThanOrEqual(layout.navigationWidth + 1);
      await page.screenshot({ path:testOutputPath(`artifacts/colonist-dossiers-v131-${viewport.width}.png`) });
    }
    await page.locator('[data-journal-filter="combat"]').click();
    await expect(page.locator('#pawn-journal-empty')).toBeVisible();
    await pawnTab(page, 'health');
    await expect(page.locator('.health-capacities')).toContainText('Conscience');
    await page.screenshot({ path:testOutputPath('artifacts/colonist-dossiers-v131-health.png') });
    await pawnTab(page, 'gear');
    await expect(page.locator('#equipment-details')).toContainText('Inventaire');
    await page.screenshot({ path:testOutputPath('artifacts/colonist-dossiers-v131-gear.png') });
    await pawnTab(page, 'bio');
    await page.screenshot({ path:testOutputPath('artifacts/colonist-dossiers-v131-bio.png') });
    await pawnTab(page, 'needs');
    await page.screenshot({ path:testOutputPath('artifacts/colonist-dossiers-v131-needs.png') });
    await pawnTab(page, 'social');
    await expect(page.locator('#social-opinions thead')).toContainText('Avis réciproque');
    await page.locator('#toggle-draft').click();
    await expect(page.locator('#stop-draft')).toBeVisible();
    for (const viewport of [{ width: 1366, height: 768 }, { width: 1522, height: 1195 }]) {
      await page.setViewportSize(viewport);
      const draftedLayout = await page.evaluate(() => {
        const actions = document.querySelector('.colonist-inspector-actions')!.getBoundingClientRect();
        const controls = ['#toggle-draft', '#stop-draft', '#fire-at-will', '#target-shot', '#target-melee', '#manage-work']
          .map(selector => document.querySelector(selector)!.getBoundingClientRect());
        return { actions: { left: actions.left, right: actions.right, top: actions.top, bottom: actions.bottom },
          controls: controls.map(rect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })) };
      });
      for (const rect of draftedLayout.controls) {
        expect(rect.left).toBeGreaterThanOrEqual(draftedLayout.actions.left + 10);
        expect(rect.right).toBeLessThanOrEqual(draftedLayout.actions.right - 10);
        expect(rect.top).toBeGreaterThanOrEqual(draftedLayout.actions.top);
        expect(rect.bottom).toBeLessThanOrEqual(draftedLayout.actions.bottom);
      }
      await page.screenshot({ path:testOutputPath(`artifacts/colonist-dossiers-v131-drafted-${viewport.width}.png`) });
    }
    expect(errors).toEqual([]);
    await page.screenshot({ path:testOutputPath('artifacts/colonist-dossiers-v129.png') });
  } finally { await browser.close(); }
});
