import { expect, test } from '@playwright/test';
import { createWorld, serializeWorld, validateWorld } from '../../src/sim/index';
import { expectWorld, observeErrors, panel, pause, pawnTab, saveKey } from './helpers';
import { testOutputPath } from '../test-output';

test('V200 prepared needs: visible Core markers follow actual levels without changing the world', async ({ playwright }) => {
  const initial = createWorld(200, 32, 32), pawn = initial.pawns[0]!;
  Object.assign(pawn, { hunger: 18, rest: 21, beauty: 52, comfort: 65 });
  pawn.recreation.level = 55;
  expect(validateWorld(initial)).toEqual([]);
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page);
  try {
    await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), { key: saveKey, data: serializeWorld(initial) });
    await page.goto('/?scenario=camp&size=32&seed=200&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page); await panel(page, 'menu'); await page.locator('#load').click();
    await expectWorld(page, initial); await page.keyboard.press('Escape');
    expect(await page.evaluate(() => window.__lisiere.backend)).toBe('WebGPU');
    await page.locator(`[data-pawn="${pawn.id}"]`).click(); await pawnTab(page, 'needs');
    const positions = { hunger: [12, 24], rest: [14, 28], recreation: [15, 30, 70, 85], beauty: [15, 35, 65, 85], comfort: [10, 60, 70, 80, 90] };
    for (const [need, thresholds] of Object.entries(positions)) {
      const row = page.locator(`[data-need="${need}"]`);
      await expect(row).toBeVisible(); await expect(row.locator('[data-need-threshold]')).toHaveCount(thresholds.length);
      const layout = await row.evaluate(element => {
        const meter = element.querySelector('meter')!, bar = meter.getBoundingClientRect();
        return { value: meter.value, markers: [...element.querySelectorAll<HTMLElement>('[data-need-threshold]')].map(marker => {
          const rect = marker.getBoundingClientRect();
          return { threshold: Number(marker.dataset.needThreshold), passed: marker.classList.contains('need-threshold-passed'),
            x: (rect.x + rect.width / 2 - bar.x - 1) / (bar.width - 2) * 100,
            y: rect.y - bar.y, height: rect.height, color: getComputedStyle(marker).backgroundColor };
        }) };
      });
      expect(layout.markers.map(marker => marker.threshold)).toEqual(thresholds);
      for (const marker of layout.markers) {
        expect(marker.x).toBeCloseTo(marker.threshold, 0);
        expect(marker.passed).toBe(marker.threshold < layout.value);
        expect(marker.y).toBeGreaterThan(3); expect(marker.height).toBeGreaterThan(3);
      }
      expect(new Set(layout.markers.map(marker => marker.color)).size).toBe(2);
      await row.hover(); await expect(page.locator('#game-tooltip')).toBeVisible();
      await expect(page.locator('#game-tooltip')).toContainText('Repères de la jauge');
      for (const threshold of thresholds) await expect(page.locator('#game-tooltip')).toContainText(`${threshold} %`);
    }
    await page.keyboard.press('Escape');
    await page.screenshot({ path: testOutputPath('artifacts/needs-thresholds-v200.png') });
    await expectWorld(page, initial); expect(errors).toEqual([]);
  } finally { await browser.close(); }
});
