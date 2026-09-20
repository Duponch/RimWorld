import { test, expect, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { createScenarioWorld } from '../../src/sim/new-game';
import { survivorDecisions } from '../scenarios/survivor-player';
import { deserializeWorld, serializeWorld, validateWorld } from '../../src/sim/serialization';
import { world, pause, panel, expectWorld, observeErrors } from './helpers';
import { perform } from './player-actions';

const manualKey = 'lisiere.save.v1';
const previousKey = 'lisiere.previous.v1';
const viewport = { width: 1440, height: 1000 };
const front = (page: Page) => page.locator('.front-menu');
const menuButton = (page: Page, name: string) => front(page).getByRole('button', { name, exact: true });

async function coldHome(page: Page): Promise<void> {
  // e2e only exposes the observation bridge; it must not create a diagnostic camp.
  await page.goto('/?e2e');
  await expect(front(page)).toBeVisible();
  await expect(page.locator('#front-title')).toHaveText('Lisière');
  expect(await page.evaluate(() => window.__lisiere.world)).toBeUndefined();
  await expect(page.locator('#viewport canvas')).toHaveCount(0);
  await expect(page.locator('.game-shell')).toBeHidden();
  await expect(page.locator('#fps-counter')).toBeVisible();
}

async function chooseSave(page: Page, key: string): Promise<void> {
  await menuButton(page, 'Charger une partie').click();
  await expect(menuButton(page, 'Charger')).toBeDisabled();
  await front(page).locator(`input[name="front-save"][value="${key}"]`).check();
  await menuButton(page, 'Charger').click();
}

async function returnHome(page: Page): Promise<void> {
  await panel(page, 'menu');
  await page.locator('#return-home').click();
  await expect(page.locator('#front-title')).toHaveText('Lisière');
  await expect(menuButton(page, 'Reprendre la colonie')).toBeVisible();
}

async function metricWindow(page: Page, speed: number) {
  await page.locator(`[data-speed="${speed}"]`).click();
  await expect(page.locator(`[data-speed="${speed}"]`)).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => {
    const probe = (window as any).__scenarioProbe;
    probe.frames = []; probe.previous = 0;
    probe.started = performance.now(); probe.tick = window.__lisiere.tick;
    probe.active = true;
  });
  await page.waitForTimeout(10000);
  const sample = await page.evaluate(() => {
    const probe = (window as any).__scenarioProbe;
    probe.active = false;
    const frames = (probe.frames as number[]).sort((a, b) => a - b);
    return {
      milliseconds: performance.now() - probe.started,
      ticks: window.__lisiere.tick - probe.tick,
      frames: frames.length,
      p95: frames[Math.min(frames.length - 1, Math.floor(frames.length * .95))],
      p99: frames[Math.min(frames.length - 1, Math.floor(frames.length * .99))],
      max: frames.at(-1),
    };
  });
  await pause(page);
  expect(sample.frames).toBeGreaterThan(20);
  expect(sample.ticks).toBeGreaterThan(0);
  // Detect the previous 10 Hz clock without claiming a throughput guarantee.
  const targetTicksPerSecond = 6 * speed;
  const actualTicksPerSecond = sample.ticks / (sample.milliseconds / 1000);
  expect(actualTicksPerSecond).toBeLessThan(targetTicksPerSecond * 1.15);
  return { speed, targetTicksPerSecond, actualTicksPerSecond, ...sample };
}

test('native V82: cold menus, explicit adventure profile, first physical decisions and recoverable loading', async ({ playwright }) => {
  test.setTimeout(360000);
  // Native launch deliberately omits the generic software WebGPU arguments.
  // All served sources must stay frozen for this entire grouped run.
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', viewport });
  const allErrors: string[] = [];
  const samples: Awaited<ReturnType<typeof metricWindow>>[] = [];
  const checkpoints: Record<string, unknown> = {};
  const historicalData = readFileSync(new URL('../../artifacts/heatwave-checkpoint-v81.json', import.meta.url), 'utf8');
  const historicalInput = JSON.parse(historicalData);
  expect(historicalInput.schemaVersion).toBe(81);
  const historicalExpected = deserializeWorld(historicalData);
  expect(historicalExpected.gameProfile).toBeUndefined();

  try {
    let page = await context.newPage();
    let errors = observeErrors(page);
    await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), { key: previousKey, data: historicalData });
    await page.addInitScript(() => {
      const probe = { active: false, frames: [] as number[], previous: 0, started: 0, tick: 0 };
      (window as any).__scenarioProbe = probe;
      const frame = (now: number) => {
        if (probe.active) {
          if (probe.previous) probe.frames.push(now - probe.previous);
          probe.previous = now;
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    await coldHome(page);
    for (const name of ['Tutoriel', 'Options', 'Mods', 'Crédits']) await expect(front(page).getByRole('button', { name: new RegExp(`^${name}`) })).toBeDisabled();
    await expect(menuButton(page, 'Reprendre la colonie')).toHaveCount(0);
    expect(await page.evaluate(key => localStorage.getItem(key), manualKey)).toBeNull();
    await page.screenshot({ path: 'artifacts/scenario-home-v82.png' });

    await menuButton(page, 'Nouvelle partie').click();
    await expect(page.locator('#front-title')).toHaveText('Choisir un scénario');
    await expect(front(page).getByRole('button', { name: /Atterrissage forcé/ })).toHaveAttribute('aria-pressed', 'true');
    for (const name of ['Tribu perdue', 'Le riche explorateur', 'Brutalité nue', 'Personnalisé']) await expect(front(page).getByRole('button', { name: new RegExp(name) })).toBeDisabled();
    await expect(front(page).locator('.front-scenario-detail')).toContainText('adaptation encore partielle');
    await menuButton(page, 'Suivant').click();
    const difficulty = front(page).getByRole('radio', { name: 'Récit d’aventure', exact: true });
    const reloadable = front(page).getByRole('radio', { name: 'Rechargeable à tout moment', exact: true });
    await expect(difficulty).not.toBeChecked();
    await expect(reloadable).not.toBeChecked();
    await expect(front(page).getByRole('radio', { name: /Pacifique/ })).toBeDisabled();
    await expect(front(page).getByRole('radio', { name: /Engagement/ })).toBeDisabled();
    await menuButton(page, 'Suivant').click();
    await expect(front(page).getByRole('alert')).toContainText('Choisissez');
    await difficulty.check();
    await menuButton(page, 'Suivant').click();
    await expect(front(page).getByRole('alert')).toContainText('mode de sauvegarde');
    await reloadable.check();
    await page.screenshot({ path: 'artifacts/scenario-story-v82.png' });
    await menuButton(page, 'Suivant').click();
    await page.locator('#front-seed').fill('42');
    await menuButton(page, 'Retour').click();
    await expect(difficulty).toBeChecked();
    await expect(reloadable).toBeChecked();
    await menuButton(page, 'Retour').click();
    await menuButton(page, 'Suivant').click();
    await expect(difficulty).toBeChecked();
    await menuButton(page, 'Suivant').click();
    await expect(page.locator('#front-seed')).toHaveValue('42');

    await page.setViewportSize({ width: 480, height: 800 });
    await page.locator('#front-title').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#front-seed')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(menuButton(page, 'Démarrer')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#front-seed')).toBeFocused();
    expect(await page.evaluate(() => {
      const menu = document.querySelector('.front-menu')!;
      const body = menu.querySelector('.front-content')!;
      return menu.scrollWidth <= menu.clientWidth && body.scrollWidth <= body.clientWidth;
    })).toBe(true);
    await page.screenshot({ path: 'artifacts/scenario-config-narrow-v82.png' });
    await page.locator('#front-seed').fill('4294967296');
    await menuButton(page, 'Démarrer').click();
    await expect(front(page).getByRole('alert')).toContainText('4 294 967 295');
    expect(await page.evaluate(() => window.__lisiere.world)).toBeUndefined();
    expect(await page.evaluate(key => localStorage.getItem(key), previousKey)).toBe(historicalData);
    await page.locator('#front-seed').fill('42');
    await page.setViewportSize(viewport);
    const creationStarted = Date.now();
    await menuButton(page, 'Démarrer').dblclick();
    await expect(front(page)).toBeHidden({ timeout: 45000 });
    await expectWorld(page, createScenarioWorld(42, 250, 'crashlanded'));
    const initial = await world(page);
    checkpoints.creation = { milliseconds: Date.now() - creationStarted, tick: initial.tick, scenario: initial.scenario, gameProfile: initial.gameProfile };
    expect(initial.tick).toBe(0);
    expect(initial.scenario?.id).toBe('crashlanded');
    expect(initial.gameProfile?.difficulty).toBe('adventure-story');
    await expect(page.locator('#clock')).toHaveText('06:00');
    await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed', 'true');
    // A second successful init would overwrite this slot with the first world.
    expect(await page.evaluate(key => localStorage.getItem(key), previousKey)).toBe(historicalData);
    await panel(page, 'research');
    await expect(page.locator('[data-air-status]')).toContainText('Acquise au départ');
    await expect(page.locator('[data-research-status]')).toContainText('Acquise au départ');

    const rotation = { value: 0 };
    const decisions = survivorDecisions(initial);
    expect(decisions.filter(decision => decision.command.type === 'designate' && decision.command.kind === 'bed')).toHaveLength(3);
    for (const decision of decisions) await perform(page, decision, rotation);
    await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async () => (await world(page)).structures.filter(structure => structure.kind === 'bed').length, { timeout: 110000 }).toBe(3);
    await pause(page);
    const established = await world(page);
    expect(validateWorld(established)).toEqual([]);
    expect(established.stock.wood).toBeLessThan(initial.stock.wood);
    expect(established.growingZones.reduce((sum, zone) => sum + zone.cells.length, 0)).toBe(20);
    expect(established.pawns).toHaveLength(3);
    checkpoints.firstDecisions = { commands: decisions.length, tick: established.tick, beds: 3, field: 20, stock: established.stock };
    writeFileSync('tmp/scenario-established-v82.json', serializeWorld(established));
    await panel(page, 'menu');
    await page.locator('#save').click();
    await expect.poll(async () => JSON.parse(await page.evaluate(key => localStorage.getItem(key), manualKey) ?? 'null')).toEqual(established);
    await page.locator('#load').click();
    await expectWorld(page, established);
    await page.keyboard.press('Escape');

    // Consecutive samples with one renderer; later checks use one tab at a time.
    for (const speed of [1, 6]) samples.push(await metricWindow(page, speed));
    // The game menu also owns a real acknowledged pause, across shortcuts.
    await page.locator('[data-speed="6"]').click();
    await panel(page, 'menu');
    const menuPaused = await world(page);
    await page.keyboard.press('Space'); await page.waitForTimeout(500);
    expect(await world(page)).toEqual(menuPaused);
    await page.keyboard.press('F1');
    await expect(page.locator('[data-speed="6"]')).toHaveAttribute('aria-pressed','true');
    await pause(page);
    const finalWorld = await world(page);
    expect(validateWorld(finalWorld)).toEqual([]);
    await page.screenshot({ path: 'artifacts/scenario-start-v82.png' });
    writeFileSync('tmp/scenario-native-v82.json', serializeWorld(finalWorld));
    const backend = await page.evaluate(() => window.__lisiere.backend);
    const userAgent = await page.evaluate(() => navigator.userAgent);

    await returnHome(page);
    const pausedAtHome = await world(page);
    await page.keyboard.press('3');
    await page.waitForTimeout(500);
    expect(await world(page)).toEqual(pausedAtHome);
    await menuButton(page, 'Reprendre la colonie').click();
    await expect(front(page)).toBeHidden();
    await expectWorld(page, finalWorld);
    await returnHome(page);
    await chooseSave(page, manualKey);
    await expect(front(page)).toBeHidden();
    await expectWorld(page, finalWorld);
    allErrors.push(...errors);
    await page.close();

    page = await context.newPage(); errors = observeErrors(page);
    await coldHome(page);
    await chooseSave(page, manualKey);
    await expect(front(page)).toBeHidden({ timeout: 45000 });
    await expectWorld(page, finalWorld);
    expect((await world(page)).gameProfile).toEqual(finalWorld.gameProfile);
    checkpoints.coldCurrent = { scenario: (await world(page)).scenario, tick: finalWorld.tick };

    // Controlled input fixtures: rejection preserves world and recovery bytes.
    await returnHome(page);
    for (const [kind, data] of [
      ['invalid', '{not valid JSON'],
      ['future', JSON.stringify({ ...finalWorld, schemaVersion: 999 })],
    ]) {
      const active = await world(page);
      const previous = await page.evaluate(key => localStorage.getItem(key), previousKey);
      await page.evaluate(({ key, data }) => localStorage.setItem(key, data), { key: manualKey, data: data! });
      await chooseSave(page, manualKey);
      await expect(front(page).getByRole('alert')).toContainText('illisible ou incompatible');
      await expect(menuButton(page, 'Charger')).toBeEnabled();
      expect(await world(page)).toEqual(active);
      expect(await page.evaluate(key => localStorage.getItem(key), manualKey)).toBe(data);
      expect(await page.evaluate(key => localStorage.getItem(key), previousKey)).toBe(previous);
      checkpoints[kind!] = { rejected: true, tickPreserved: active.tick, message: await front(page).getByRole('alert').textContent() };
      await menuButton(page, 'Retour').click();
    }
    await page.evaluate(({ key, data }) => localStorage.setItem(key, data), { key: manualKey, data: serializeWorld(finalWorld) });
    allErrors.push(...errors);
    await page.close();

    // Actual published V81 checkpoint: a controlled historical climate camp.
    page = await context.newPage(); errors = observeErrors(page);
    await coldHome(page);
    await page.evaluate(({ key, data }) => localStorage.setItem(key, data), { key: previousKey, data: historicalData });
    await chooseSave(page, previousKey);
    await expect(front(page)).toBeHidden({ timeout: 45000 });
    await expectWorld(page, historicalExpected);
    const oldWorld = await world(page);
    expect(oldWorld.scenario).toBeUndefined();
    expect(oldWorld.gameProfile).toBeUndefined();
    expect(oldWorld.tick).toBe(historicalInput.tick);
    expect(oldWorld.width).toBe(16);
    expect(await page.evaluate(key => localStorage.getItem(key), previousKey)).toBe(historicalData);
    expect(await page.evaluate(key => localStorage.getItem(key), manualKey)).toBe(serializeWorld(finalWorld));
    await page.screenshot({ path: 'artifacts/scenario-historical-v82.png' });
    checkpoints.coldHistorical = { source: 'artifacts/heatwave-checkpoint-v81.json', sourceVersion: 81, loadedVersion: oldWorld.schemaVersion, tick: oldWorld.tick, width: oldWorld.width };
    allErrors.push(...errors);
    expect(allErrors).toEqual([]);
    writeFileSync('artifacts/scenario-ui-v82.json', JSON.stringify({ backend, userAgent, viewport, samples, checkpoints, errors: allErrors }, null, 2));
  } catch (error) {
    const failureTag = `scenario-ui-v82-failed-${Date.now()}`;
    const active = context.pages().at(-1);
    if (active && !active.isClosed()) {
      await active.screenshot({ path: `artifacts/${failureTag}.png` }).catch(() => {});
      const state = await active.evaluate(() => window.__lisiere?.world).catch(() => undefined);
      if (state) writeFileSync(`tmp/${failureTag}.json`, JSON.stringify(state));
      checkpoints.failure = { message: String(error), title: await active.locator('#front-title').textContent().catch(() => null), error: await active.locator('.front-error').textContent().catch(() => null) };
    }
    writeFileSync(`artifacts/${failureTag}.json`, JSON.stringify({ viewport, samples, checkpoints, errors: allErrors }, null, 2));
    console.info(`Failure evidence: artifacts/${failureTag}.json; checkpoint: tmp/${failureTag}.json`);
    throw error;
  } finally {
    await browser.close();
  }
});
