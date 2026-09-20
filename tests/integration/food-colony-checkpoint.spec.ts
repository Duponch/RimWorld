import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { deserializeWorld, validateWorld } from '../../src/sim/serialization';
import { plantGrowth } from '../../src/sim/plants';
import type { Cell, World } from '../../src/sim/types';
import { cell, expectWorld, observeErrors, panel, pause, saveKey, tool, world } from './helpers';
import { revealCells } from './player-actions';

const checkpointPath = 'tmp/crashlanded-final-v84-42.json';
const reportPath = 'artifacts/food-colony-native-v84.json';
const viewport = { width: 1440, height: 1000 };

async function saveAndLoad(page: Page, expected: World): Promise<void> {
  await panel(page, 'menu');
  await page.locator('#save').click();
  await page.locator('#load').click();
  await expectWorld(page, expected);
  await page.keyboard.press('Escape');
}

async function inspect(page: Page, target: Cell, ready: () => Promise<boolean>, maxClicks: number): Promise<void> {
  await page.keyboard.press('Escape');
  await revealCells(page, [target]);
  // Shared pointer path from perform(): cycle past a pawn overlapping the cell.
  for (let attempt = 0; attempt < maxClicks; attempt++) {
    await cell(page, target.x, target.z);
    if (await ready()) return;
  }
  throw new Error(`Inspection inaccessible at ${target.x}, ${target.z}.`);
}

// Only the genuine final colony produced by the long pilot is accepted. No
// factory, fixture mutation, material injection or off-screen step is used.
test('native real V84 colony: load, inspect crops and stations, save and continue', async ({ playwright }) => {
  test.skip(!existsSync(checkpointPath), 'Complete the real 24-day V84 colony pilot first.');
  test.setTimeout(180000);
  const data = readFileSync(checkpointPath, 'utf8');
  const source = JSON.parse(data) as World;
  expect(source.schemaVersion).toBe(84);
  expect(source.seed).toBe(42);
  expect(source.scenario?.id).toBe('crashlanded');
  expect(source.tick).toBeGreaterThanOrEqual(24 * 6000);
  const initial = deserializeWorld(data);
  expect(initial).toEqual(source);
  expect(validateWorld(initial)).toEqual([]);

  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport });
  const errors = observeErrors(page);
  page.setDefaultTimeout(15000);
  const report: Record<string, unknown> = {
    version: 84, controlled: false, source: checkpointPath,
    sourceSha256: createHash('sha256').update(data).digest('hex'),
    initialTick: initial.tick, viewport, status: 'running', stage: 'load',
  };
  try {
    await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), { key: saveKey, data });
    await page.goto('/?e2e');
    const front = page.locator('.front-menu');
    await expect(front).toBeVisible();
    await front.getByRole('button', { name: 'Charger une partie', exact: true }).click();
    await front.locator(`input[name="front-save"][value="${saveKey}"]`).check();
    await front.getByRole('button', { name: 'Charger', exact: true }).click();
    await expectWorld(page, initial);
    await pause(page);
    await expectWorld(page, initial);
    report.backend = await page.evaluate(() => window.__lisiere.backend);
    expect(report.backend).toBe('WebGPU');
    await saveAndLoad(page, initial);

    report.stage = 'inspection';
    await tool(page, 'select');
    await page.keyboard.press('Escape');
    const crops = [], framing: Cell[] = [];
    for (const kind of ['rice', 'potato', 'corn'] as const) {
      const zone = initial.growingZones.find(z => z.plant === kind);
      expect(zone, `The real final colony contains its ${kind} field.`).toBeDefined();
      expect(zone!.cells.length).toBeGreaterThan(0);
      const plants = initial.resources.filter(r => r.kind === kind && zone!.cells.includes(r.z * initial.width + r.x));
      const target = plants[0] ?? { x: zone!.cells[0]! % initial.width, z: Math.floor(zone!.cells[0]! / initial.width) };
      framing.push(target);
      await inspect(page, target, async () => await page.locator('#growing-plant').isVisible() && await page.locator('#growing-plant').inputValue() === kind, initial.pawns.length + 5);
      await expect(page.locator('#growing-plant')).toHaveValue(kind);
      if (plants.length) await expect(page.locator('#cell-description')).toContainText('Croissance');
      crops.push({ kind, zoneId: zone!.id, cells: zone!.cells.length, plants: plants.length,
        growth: plants.map(plant => plantGrowth(initial, plant)), description: await page.locator('#cell-description').textContent() });
      // Merely read the controls. Reapplying an unchanged growing-policy through
      // perform() would cancel active growing jobs and alter this real state.
    }
    report.crops = crops;
    const stations = [];
    for (const [kind, title] of [['fueled-stove', 'Cuisinière à bois'], ['butcher-table', 'Table de boucherie']] as const) {
      const station = initial.structures.find(s => s.kind === kind);
      expect(station, `The real final colony built ${kind}.`).toBeDefined();
      framing.push(station!);
      await inspect(page, station!, async () => await page.locator('#cell-title').isVisible() && (await page.locator('#cell-title').textContent())!.includes(title), initial.pawns.length + 5);
      await expect(page.locator('#add-cooking-bill')).toBeVisible();
      if (kind === 'fueled-stove') await expect(page.locator('#fire-fuel')).toContainText('160 bois/jour de préparation');
      else await expect(page.locator('#cell-description')).toContainText('rendement du poste 100 %');
      stations.push({ kind, id: station!.id, fuel: station!.fuel, bills: station!.bills,
        description: await page.locator('#cell-description').textContent() });
    }
    report.stations = stations;
    await expectWorld(page, initial);
    await page.keyboard.press('Escape');
    await revealCells(page, framing);
    await page.screenshot({ path: 'artifacts/food-colony-native-v84.png' });

    report.stage = 'continuation';
    await page.locator('[data-speed="6"]').click();
    await expect(page.locator('[data-speed="6"]')).toHaveAttribute('aria-pressed', 'true');
    await page.waitForFunction(tick => window.__lisiere.tick >= tick, initial.tick + 120, { timeout: 30000 });
    await pause(page);
    const continued = await world(page);
    expect(continued.tick - initial.tick).toBeGreaterThanOrEqual(120);
    expect(validateWorld(continued)).toEqual([]);
    expect(continued.scenario).toEqual(initial.scenario);
    expect(continued.gameProfile).toEqual(initial.gameProfile);
    await saveAndLoad(page, continued);
    report.continuation = { requestedTicks: 120, actualTicks: continued.tick - initial.tick, speed: 6, finalTick: continued.tick, exactSaveReload: true };
    report.status = 'passed';
    report.stage = 'complete';
    expect(errors).toEqual([]);
  } catch (error) {
    report.status = 'failed';
    report.failure = String(error);
    await page.screenshot({ path: 'artifacts/food-colony-native-failure-v84.png' }).catch(() => {});
    throw error;
  } finally {
    writeFileSync(reportPath, JSON.stringify({ ...report, errors }, null, 2));
    await browser.close();
  }
});
