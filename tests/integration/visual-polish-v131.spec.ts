import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { deserializeWorld, validateWorld } from '../../src/sim/serialization';
import { expectWorld, observeErrors, panel, pause, pawnTab, saveKey } from './helpers';

test('V131: a seated social gathering and colonist dossier remain readable at desktop sizes', async ({ playwright }) => {
  test.setTimeout(100_000);
  const raw = readFileSync(new URL('../../public/test-saves/v124/rencontre.json', import.meta.url), 'utf8');
  const prepared = deserializeWorld(raw);
  expect(validateWorld(prepared)).toEqual([]);
  const basile = prepared.pawns.find(pawn => pawn.name === 'Basile');
  expect(basile).toBeDefined();

  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1522, height: 1195 } });
  const errors = observeErrors(page);
  try {
    await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), { key: saveKey, data: raw });
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);
    await panel(page, 'menu');
    await page.locator('#load').click();
    await expectWorld(page, prepared);
    await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(id => {
      const pawn = window.__lisiere.world.pawns.find(item => item.id === id);
      return pawn?.state === 'recreating' && pawn.recreation.task?.activity === 'social-relax'
        && pawn.recreation.task.phase === 'active' && pawn.recreation.task.seatId !== null;
    }, basile!.id, { timeout: 30_000 });
    await pause(page);
    await page.locator(`[data-pawn="${basile!.id}"]`).click();
    await pawnTab(page, 'journal');
    await expect(page.locator('#selected-action')).toContainText('Se détend au point de rencontre');
    const projection = await page.evaluate(id => window.__lisiere.projectPawn(id), basile!.id);
    expect(projection).toBeDefined();
    const canvas = await page.locator('#viewport canvas').boundingBox();
    expect(canvas).not.toBeNull();
    await page.mouse.move(canvas!.x + projection!.x, canvas!.y + projection!.y);
    await page.mouse.wheel(0, -650);
    await page.waitForTimeout(350);

    for (const size of [{ width: 1522, height: 1195 }, { width: 1366, height: 768 }]) {
      await page.setViewportSize(size);
      await expect(page.locator('#inspector')).toBeVisible();
      const metrics = await page.evaluate(() => {
        const bounds = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
        const host = bounds('#inspector'), page = bounds('.colonist-inspector-pages');
        const tabs = bounds('.colonist-inspector-tabs'), summary = bounds('.colonist-inspector-summary');
        const actions = bounds('.colonist-inspector-actions'), navigation = bounds('.main-tabs');
        return {
          hostRight: host.right, pageBottom: page.bottom, tabsTop: tabs.top,
          tabsBottom: tabs.bottom, summaryTop: summary.top, actionsRight: actions.right,
          actionsBottom: actions.bottom, navigationTop: navigation.top,
          viewportWidth: innerWidth, viewportHeight: innerHeight,
        };
      });
      expect(metrics.pageBottom).toBeLessThanOrEqual(metrics.tabsTop + 2);
      expect(metrics.tabsBottom).toBeLessThanOrEqual(metrics.summaryTop + 2);
      expect(metrics.actionsRight).toBeLessThanOrEqual(metrics.hostRight + 1);
      expect(metrics.hostRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
      expect(metrics.actionsBottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
      expect(metrics.actionsBottom).toBeLessThanOrEqual(metrics.navigationTop + 1);
      await page.screenshot({ path: test.info().outputPath(`v131-gather-${size.width}x${size.height}.png`) });
    }
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});
