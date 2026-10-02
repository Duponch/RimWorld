import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { deserializeWorld, validateWorld } from '../../src/sim/serialization.ts';
import { outdoorTemperature } from '../../src/sim/temperature.ts';
import { expectWorld, observeErrors, panel, pause, pawnTab, world } from './helpers.ts';
import { testOutputPath, writeTestFile } from '../test-output.ts';

test('V180 public Cassandra heat scene loads from the catalogue, alerts, and resumes exact saved heat', async ({ playwright }) => {
  test.setTimeout(120_000);
  const expected = deserializeWorld(readFileSync('public/test-saves/v180/canicule-et-refuge.json', 'utf8'));
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page);
  const stock = (item: string, w: typeof expected) => w.piles.filter(p => p.item === item).reduce((n, p) => n + p.quantity, 0);
  try {
    await page.goto('/?e2e');
    const front = page.locator('.front-menu');
    if (await front.isHidden()) { await panel(page, 'menu'); await page.locator('#browse-saves').click(); }
    else await front.getByRole('button', { name: 'Charger une partie', exact: true }).click();
    await front.getByRole('button', { name: 'Colonies de test' }).click();
    await expect(front.locator('input[name="test-colony"]')).toHaveCount(36);
    await front.locator('input[name="test-colony"][value="canicule-et-refuge-v180"]').check();
    await expect(front).toContainText('Canicule et refuge · 3 colons');
    await page.screenshot({ path: testOutputPath('artifacts/misc-v180-catalogue.png') });
    await front.getByRole('button', { name: 'Charger cette colonie' }).click();
    await expectWorld(page, expected);
    await expect(page.locator('#pause-banner')).toBeVisible();
    expect(await page.evaluate(() => window.__lisiere.backend)).toBe('WebGPU');
    expect((await world(page)).miscIncidents?.active).toBeUndefined();

    await page.locator('[data-speed="1"]').click();
    await expect.poll(async () => (await world(page)).miscIncidents?.active?.start, { timeout: 20_000 }).toBe(26_400);
    await pause(page);
    const onset = await world(page);
    expect(onset.miscIncidents).toMatchObject({ opportunities: 1, heatwaves: 1 });
    expect(onset.events.some(e => e.tick === 26_400 && e.message.startsWith('Canicule :'))).toBe(true);
    await expect(page.locator('#heatwave-letter')).toContainText('Canicule');
    await page.locator('#heatwave-letter').click();
    await expect(page.locator('#heatwave-dialog')).toContainText('refroidisseur passif');
    await page.getByRole('button', { name: 'Fermer', exact: true }).click();
    await page.locator(`[data-pawn="${expected.pawns[0]!.id}"]`).click();
    await pawnTab(page, 'health');
    await expect(page.locator('#health-inspection')).toBeVisible();
    await expect(page.locator('[data-health="status"]')).not.toBeEmpty();
    await expect(page.locator('#wood')).toContainText('40');
    await page.screenshot({ path: testOutputPath('artifacts/misc-v180-onset.png') });

    await panel(page, 'menu'); await page.locator('#save').click(); await page.locator('#load').click();
    await expectWorld(page, onset);
    await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async () => (await world(page)).tick, { timeout: 30_000 }).toBeGreaterThanOrEqual(onset.tick + 120);
    await pause(page);
    const warmed = await world(page), coolerBefore = onset.structures.find(s => s.kind === 'passive-cooler')!, coolerAfter = warmed.structures.find(s => s.kind === 'passive-cooler')!;
    expect(warmed.miscIncidents?.heatwaves).toBe(1);
    expect(warmed.miscIncidents?.active).toBeDefined();
    expect(outdoorTemperature(warmed)).toBeGreaterThan(outdoorTemperature(onset));
    expect(warmed.thermal!.regions[0]!.temperature).toBeLessThan(outdoorTemperature(warmed));
    expect(coolerAfter.fuel!.ticks).toBe(coolerBefore.fuel!.ticks - (warmed.tick - onset.tick));
    expect(stock('wood', warmed)).toBe(40);
    expect(stock('survival-meal', warmed)).toBe(50);
    expect(validateWorld(warmed)).toEqual([]);
    await expect(page.locator('#fps-counter')).toBeVisible();
    expect(errors).toEqual([]);
    await page.screenshot({ path: testOutputPath('artifacts/misc-v180-ramp.png') });
    await writeTestFile('artifacts/misc-v180-ui-report.json', JSON.stringify({
      date: new Date().toISOString(), backend: 'native WebGPU', prepared: true,
      ticks: { fixture: expected.tick, onset: onset.tick, resumed: warmed.tick },
      temperature: { onsetOutside: outdoorTemperature(onset), resumedOutside: outdoorTemperature(warmed), inside: warmed.thermal!.regions[0]!.temperature },
      coolerFuel: { onset: coolerBefore.fuel!.ticks, resumed: coolerAfter.fuel!.ticks },
      wood: stock('wood', warmed), food: stock('survival-meal', warmed), errors,
    }, null, 2));
  } finally { await browser.close(); }
});
