import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { bereavementDemoActors } from '../../scripts/generate-bereavement-demo-v181.ts';
import { deserializeWorld, validateWorld } from '../../src/sim/serialization.ts';
import { testOutputPath, writeTestFile } from '../test-output.ts';
import { expectWorld, observeErrors, panel, pause, pawnTab, world } from './helpers.ts';

test('V181 catalogue scene plays one true blood-loss death and shows opposite saved memories in Needs', async ({ playwright }) => {
  test.setTimeout(120_000);
  const expected = deserializeWorld(readFileSync('public/test-saves/v181/deuil-et-souvenirs.json', 'utf8'));
  const { patient, friend, rival } = bereavementDemoActors(expected);
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page);
  try {
    await page.goto('/?e2e');
    const front = page.locator('.front-menu');
    if (await front.isHidden()) { await panel(page, 'menu'); await page.locator('#browse-saves').click(); }
    else await front.getByRole('button', { name: 'Charger une partie', exact: true }).click();
    await front.getByRole('button', { name: 'Colonies de test' }).click();
    await expect(front.locator('input[name="test-colony"]')).toHaveCount(36);
    await front.locator('input[name="test-colony"][value="deuil-et-souvenirs-v181"]').check();
    await expect(front).toContainText('Deuil et souvenirs · 3 colons');
    await page.screenshot({ path: testOutputPath('artifacts/bereavement-v181-catalogue.png') });
    await front.getByRole('button', { name: 'Charger cette colonie' }).click();
    await expectWorld(page, expected);
    await expect(page.locator('#pause-banner')).toBeVisible();
    expect(await page.evaluate(() => window.__lisiere.backend)).toBe('WebGPU');
    expect((await world(page)).pawns.find(pawn => pawn.id === patient.id)?.health?.death).toBeUndefined();
    await page.locator(`[data-pawn="${patient.id}"]`).click();
    await pawnTab(page, 'health');
    await expect(page.locator('#health-inspection')).toBeVisible();
    await expect(page.locator('[data-health="status"]')).not.toContainText('Décédé');
    await page.screenshot({ path: testOutputPath('artifacts/bereavement-v181-before.png') });

    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id => {
      const deceased = window.__lisiere.world.pawns.find(pawn => pawn.id === id);
      if (deceased?.health?.death?.tick !== 1) return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();
      return true;
    }, patient.id, { polling: 50, timeout: 20_000 });
    await pause(page);
    const death = await world(page);
    const deceased = death.pawns.find(pawn => pawn.id === patient.id)!;
    expect(deceased.state).toBe('dead');
    expect(deceased.health?.death).toEqual({ tick: 1, cause: 'blood-loss' });
    const corpse = death.piles.find(pile => pile.humanCorpse?.pawnId === patient.id);
    expect(corpse).toBeDefined();
    expect(deceased.body?.pileId).toBe(corpse?.id);
    const friendAfter = death.pawns.find(pawn => pawn.id === friend.id)!;
    const rivalAfter = death.pawns.find(pawn => pawn.id === rival.id)!;
    expect(friendAfter.bereavement).toMatchObject([{ otherId: patient.id, kind: 'friend-died', at: 1 }]);
    expect(rivalAfter.bereavement).toMatchObject([{ otherId: patient.id, kind: 'rival-died', at: 1 }]);

    await page.locator(`[data-pawn="${friend.id}"]`).click();
    await pawnTab(page, 'needs');
    const grief = page.locator(`[data-thought="friend-died-${patient.id}"]`);
    await expect(grief).toContainText('Mort de Mina (ami)');
    await expect(grief.locator('strong')).toHaveAttribute('data-sign', 'negative');
    await expect(grief).toHaveAttribute('title', /encore \d+ h/);
    await page.screenshot({ path: testOutputPath('artifacts/bereavement-v181-friend.png') });
    await page.locator(`[data-pawn="${rival.id}"]`).click();
    await pawnTab(page, 'needs');
    const relief = page.locator(`[data-thought="rival-died-${patient.id}"]`);
    await expect(relief).toContainText('Mort de Mina (rival)');
    await expect(relief.locator('strong')).toHaveAttribute('data-sign', 'positive');
    await expect(relief).toHaveAttribute('title', /encore \d+ h/);
    await page.screenshot({ path: testOutputPath('artifacts/bereavement-v181-rival.png') });

    await panel(page, 'menu'); await page.locator('#save').click(); await page.locator('#load').click();
    await expectWorld(page, death);
    expect(validateWorld(await world(page))).toEqual([]);
    await page.keyboard.press('Escape');
    await page.locator(`[data-pawn="${rival.id}"]`).click();
    await pawnTab(page, 'needs');
    expect(await page.locator(`[data-thought="rival-died-${patient.id}"]`).count()).toBe(1);
    expect(errors).toEqual([]);
    await expect(page.locator('#fps-counter')).toBeVisible();
    await writeTestFile('artifacts/bereavement-v181-ui-report.json', JSON.stringify({
      date: new Date().toISOString(), backend: 'native WebGPU', prepared: true,
      seed: expected.seed, map: [expected.width, expected.height], ticks: { loaded: expected.tick, paused: death.tick, death: deceased.health?.death?.tick },
      patientId: patient.id, corpseId: corpse?.id, friend: friendAfter.bereavement, rival: rivalAfter.bereavement, errors,
    }, null, 2));
  } finally { await browser.close(); }
});
