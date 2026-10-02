import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { fireTouch } from '../../src/sim/firefighting.ts';
import { deserializeWorld, validateWorld } from '../../src/sim/serialization.ts';
import { cell, expectWorld, observeErrors, panel, pause, tool, world } from './helpers.ts';
import { testOutputPath, writeTestFile } from '../test-output.ts';

test('V184 prepared Flashstorm loads through the public menu, strikes physically, and resumes exactly', async ({ playwright }) => {
  test.setTimeout(150_000);
  const prepared = deserializeWorld(readFileSync('public/test-saves/v184/orage-sec-et-incendies.json', 'utf8'));
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page);
  try {
    await page.goto('/?e2e');
    const front = page.locator('.front-menu');
    await front.getByRole('button', { name: 'Charger une partie', exact: true }).click();
    await front.getByRole('button', { name: 'Colonies de test' }).click();
    await expect(front.locator('input[name="test-colony"]')).toHaveCount(36);
    await front.locator('input[name="test-colony"][value="orage-sec-et-incendies-v184"]').check();
    await expect(front).toContainText('Orage sec et incendies · 3 colons');
    await front.getByRole('button', { name: 'Charger cette colonie' }).click();
    await expectWorld(page, prepared);
    expect(await page.evaluate(() => window.__lisiere.backend)).toBe('WebGPU');
    expect((await world(page)).flashstorm).toBeUndefined();
    await expect(page.locator('#flashstorm-letter')).toHaveCount(0);

    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(() => {
      if (window.__lisiere.world.flashstorm?.active?.start !== 26_400) return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();
      return true;
    }, undefined, { polling: 'raf', timeout: 20_000 });
    await pause(page);
    const onset = await world(page);
    expect(onset.flashstorm?.active?.start).toBe(26_400);
    expect(validateWorld(onset)).toEqual([]);
    await expect(page.locator('#flashstorm-letter')).toContainText('Orage sec localisé');
    await page.locator('#flashstorm-letter').click();
    await expect(page.locator('#flashstorm-dialog')).toContainText('Extinction');
    await expect(page.locator('#flashstorm-dialog')).toContainText('ne garantit pas un incendie');
    await page.getByRole('button', { name: 'Fermer', exact: true }).click();
    await page.screenshot({ path: testOutputPath('artifacts/flashstorm-v184-onset.png') });

    await page.locator('[data-panel="menu"]').click();
    await page.locator('#save').click();
    await page.locator('#load').click();
    await expectWorld(page, onset);
    await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(() => {
      if (!window.__lisiere.world.flashstorm?.active?.strikes) return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();
      return true;
    }, undefined, { polling: 50, timeout: 30_000 });
    await pause(page);
    const struck = await world(page);
    expect(struck.flashstorm?.totalStrikes).toBeGreaterThan(0);
    expect(struck.weather?.lastLightning).toMatchObject({ x: 122, z: 123, coreTick: 264001 });
    expect(struck.fires?.items.length).toBeGreaterThan(0);
    expect(struck.fires?.ledger.ignitions).toBeGreaterThan(0);
    expect(validateWorld(struck)).toEqual([]);
    await expect(page.locator('#flashstorm-letter')).toBeVisible();
    await expect(page.locator('#fps-counter')).toBeVisible();
    await page.screenshot({ path: testOutputPath('artifacts/flashstorm-v184-strike.png') });

    // The first physical fire is near the three original colonists. The player
    // adds its cell to Foyer and assigns Extinction through the actual panels.
    const target = struck.fires!.items.find(fire => fire.x === 122 && fire.z === 123)!;
    expect(target).toBeDefined();
    await tool(page, 'home');
    await cell(page, target.x, target.z);
    await expect.poll(async () => (await world(page)).home?.includes(target.z * prepared.width + target.x)).toBe(true);
    await tool(page, 'select');
    await page.keyboard.press('Escape');
    await panel(page, 'work');
    const ada = prepared.pawns.find(pawn => pawn.name === 'Ada')!;
    await page.locator(`select[data-owner="${ada.id}"][data-work="firefight"]`).selectOption('1');
    await expect.poll(async () => (await world(page)).pawns.find(pawn => pawn.id === ada.id)?.priorities.firefight).toBe(1);
    await page.keyboard.press('Escape');
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction((pawnId: number) => {
      const pawn = window.__lisiere.world.pawns.find(candidate => candidate.id === pawnId);
      if (pawn?.firefighting?.phase !== 'beat') return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();
      return true;
    }, ada.id, { polling: 30, timeout: 30_000 });
    await pause(page);
    const beating = await world(page), worker = beating.pawns.find(pawn => pawn.id === ada.id)!;
    const attended = beating.fires!.items.find(fire => fire.id === worker.firefighting?.fireId)!;
    expect(worker.firefighting?.phase).toBe('beat');
    expect(attended).toBeDefined();
    expect(fireTouch(beating, worker, attended)).toBe(true);
    await page.screenshot({ path: testOutputPath('artifacts/flashstorm-v184-contact.png') });
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async () => (await world(page)).fires?.ledger.extinguished ?? 0, { timeout: 30_000 }).toBeGreaterThan(struck.fires!.ledger.extinguished);
    await pause(page);
    const fought = await world(page);
    expect(fought.fires?.ledger.extinguished).toBeGreaterThan(struck.fires!.ledger.extinguished);
    expect(validateWorld(fought)).toEqual([]);
    expect(errors).toEqual([]);
    await writeTestFile('artifacts/flashstorm-v184-ui-report.json', JSON.stringify({
      date: new Date().toISOString(), backend: 'native WebGPU', prepared: true,
      seed: prepared.seed, map: [prepared.width, prepared.height],
      ticks: { fixture: prepared.tick, onset: onset.tick, strike: struck.tick, contact: beating.tick, extinguished: fought.tick },
      center: struck.flashstorm?.active?.center, radius: struck.flashstorm?.active?.radius,
      strikes: struck.flashstorm?.totalStrikes, lastLightning: struck.weather?.lastLightning,
      activeFires: struck.fires?.items.length, contact: { pawnId: worker.id, fireId: attended.id, pawn: [worker.x, worker.z], fire: [attended.x, attended.z] },
      fireLedger: { struck: struck.fires?.ledger, fought: fought.fires?.ledger }, errors,
    }, null, 2));
  } finally { await browser.close(); }
});
