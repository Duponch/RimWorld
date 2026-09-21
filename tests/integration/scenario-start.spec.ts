import { test, expect, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { createScenarioWorld } from '../../src/sim/new-game';
import { STONE_LABELS } from '../../src/sim/geology';
import { resolveSite, type SiteOptions } from '../../src/sim/site';
import { survivorDecisions } from '../scenarios/survivor-player';
import { deserializeWorld, serializeWorld, validateWorld } from '../../src/sim/serialization';
import { world, pause, panel, cell, settledCells, expectWorld, observeErrors } from './helpers';
import { perform, revealCells } from './player-actions';

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

test('native V90: chosen site, fertile land, first physical decisions and unchanged historical landscapes', async ({ playwright }) => {
  test.setTimeout(360000);
  // Native launch deliberately omits the generic software WebGPU arguments.
  // All served sources must stay frozen for this entire grouped run.
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', viewport });
  const allErrors: string[] = [];
  const samples: Awaited<ReturnType<typeof metricWindow>>[] = [];
  const checkpoints: Record<string, unknown> = {};
  const chosenSite: SiteOptions = { hilliness: 'large-hills' };
  const stonesFor = (seed: number) => resolveSite(seed, chosenSite).stones.map(stone => STONE_LABELS[stone]).join(', ');
  const historicalData = readFileSync(new URL('../../artifacts/heatwave-checkpoint-v81.json', import.meta.url), 'utf8');
  const historicalInput = JSON.parse(historicalData);
  expect(historicalInput.schemaVersion).toBe(81);
  const historicalExpected = deserializeWorld(historicalData);
  expect(historicalExpected.gameProfile).toBeUndefined();
  // Unmodified published V82 native checkpoint, source tmp/scenario-native-v82.json,
  // tick 1145. Gzip only changes storage; this hash verifies the original bytes.
  const previousLandscapeData = gunzipSync(readFileSync(new URL('../fixtures/scenario-v82.json.gz', import.meta.url))).toString('utf8');
  const previousLandscapeSha256 = 'f9fcb0bb4caa6696c958aac876c90be89f8bda64b31d79ad402ba9e00ce15af6';
  expect(createHash('sha256').update(previousLandscapeData).digest('hex')).toBe(previousLandscapeSha256);
  const previousLandscapeInput = JSON.parse(previousLandscapeData);
  expect(previousLandscapeInput.schemaVersion).toBe(82);
  expect(previousLandscapeInput.scenario).toMatchObject({ id: 'crashlanded', revision: 1 });
  const previousLandscapeExpected = deserializeWorld(previousLandscapeData);
  expect(previousLandscapeExpected.site).toBeUndefined();

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
    await page.screenshot({ path: 'artifacts/scenario-home-v83.png' });

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
    await page.screenshot({ path: 'artifacts/scenario-story-v83.png' });
    await menuButton(page, 'Suivant').click();
    const smallHills = front(page).getByRole('radio', { name: 'Petites collines', exact: true });
    const largeHills = front(page).getByRole('radio', { name: 'Grandes collines', exact: true });
    await expect(smallHills).toBeChecked();
    await expect(front(page).locator('.front-site-default')).toContainText('pas un site imposé par RimWorld');
    await front(page).getByRole('radio', { name: 'Plat', exact: true }).check();
    await expect(page.locator('#front-site-relief')).toHaveText('Plat');
    await largeHills.check();
    await expect(page.locator('#front-site-relief')).toHaveText('Grandes collines');
    await page.locator('#front-random-seed').click();
    const randomSeed = await page.locator('#front-seed').inputValue();
    expect(randomSeed).toMatch(/^\d+$/);
    expect(Number(randomSeed)).toBeLessThanOrEqual(0xffffffff);
    await expect(page.locator('#front-site-stones')).toHaveText(stonesFor(Number(randomSeed)));
    for (const seed of [0, 0xffffffff, 42]) {
      await page.locator('#front-seed').fill(String(seed));
      await expect(page.locator('#front-site-stones')).toHaveText(stonesFor(seed));
      await expect(largeHills).toBeChecked();
    }
    await menuButton(page, 'Retour').click();
    await expect(difficulty).toBeChecked();
    await expect(reloadable).toBeChecked();
    await menuButton(page, 'Retour').click();
    await menuButton(page, 'Suivant').click();
    await expect(difficulty).toBeChecked();
    await menuButton(page, 'Suivant').click();
    await expect(page.locator('#front-seed')).toHaveValue('42');
    await expect(largeHills).toBeChecked();
    await expect(page.locator('#front-site-stones')).toHaveText(stonesFor(42));
    await page.screenshot({ path: 'artifacts/scenario-site-v83.png' });

    await page.setViewportSize({ width: 480, height: 800 });
    await page.locator('#front-title').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#front-seed')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(menuButton(page, 'Démarrer')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#front-seed')).toBeFocused();
    await largeHills.focus();
    await page.keyboard.press('ArrowUp');
    await expect(smallHills).toBeChecked();
    await expect(page.locator('#front-site-relief')).toHaveText('Petites collines');
    await page.keyboard.press('ArrowDown');
    await expect(largeHills).toBeChecked();
    expect(await page.evaluate(() => {
      const menu = document.querySelector('.front-menu')!;
      const body = menu.querySelector('.front-content')!;
      return menu.scrollWidth <= menu.clientWidth && body.scrollWidth <= body.clientWidth;
    })).toBe(true);
    await page.screenshot({ path: 'artifacts/scenario-config-narrow-v83.png' });
    await page.locator('#front-seed').fill('4294967296');
    await expect(page.locator('#front-site-stones')).toHaveText('Saisissez une graine valide.');
    await menuButton(page, 'Démarrer').click();
    await expect(front(page).getByRole('alert')).toContainText('4 294 967 295');
    expect(await page.evaluate(() => window.__lisiere.world)).toBeUndefined();
    expect(await page.evaluate(key => localStorage.getItem(key), previousKey)).toBe(historicalData);
    await page.locator('#front-seed').fill('42');
    await page.setViewportSize(viewport);
    const creationStarted = Date.now();
    await menuButton(page, 'Démarrer').dblclick();
    await expect(front(page)).toBeHidden({ timeout: 45000 });
    await expectWorld(page, createScenarioWorld(42, 250, 'crashlanded', chosenSite));
    const initial = await world(page);
    checkpoints.creation = { milliseconds: Date.now() - creationStarted, tick: initial.tick, scenario: initial.scenario, gameProfile: initial.gameProfile, site: initial.site };
    expect(initial.tick).toBe(0);
    expect(initial.scenario?.id).toBe('crashlanded');
    expect(initial.gameProfile?.difficulty).toBe('adventure-story');
    expect(initial.site).toEqual(resolveSite(42, chosenSite));
    // Crashlanded revision 5 is the current V90 public profile. Older
    // landscape saves below retain their original revision and are checked as
    // migration inputs, while this newly created world must use the current
    // revision.
    expect(initial.scenario?.revision).toBe(5);
    expect(initial.tiles.some(tile => tile.terrain === 'water')).toBe(false);
    for (const id of ['enable-arrivals', 'enable-raids', 'enable-heatwaves']) await expect(page.locator(`#${id}`)).toBeHidden();
    await expect(page.locator('#clock')).toHaveText('06:00');
    await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed', 'true');
    // A second successful init would overwrite this slot with the first world.
    expect(await page.evaluate(key => localStorage.getItem(key), previousKey)).toBe(historicalData);
    await panel(page, 'research');
    await expect(page.locator('[data-air-status]')).toContainText('Acquise au départ');
    await expect(page.locator('[data-research-status]')).toContainText('Acquise au départ');

    // Read a naturally generated rich-soil tile by real camera/pointer actions.
    // No fixture clears plants or substitutes terrain to satisfy inspection.
    await page.keyboard.press('Escape');
    const occupied = new Set([
      ...[...initial.resources, ...initial.pawns, ...(initial.wildlife?.animals ?? [])].map(entity => entity.z * initial.width + entity.x),
      ...initial.piles.flatMap(pile => pile.owner.type === 'ground' ? [pile.owner.z * initial.width + pile.owner.x] : []),
    ]);
    const richLand = initial.tiles.flatMap((tile, index) => tile.terrain === 'rich-soil' && !occupied.has(index) ? [{ x: index % initial.width, z: Math.floor(index / initial.width) }] : [])
      .sort((a, b) => (a.x - initial.scenario!.landing.x) ** 2 + (a.z - initial.scenario!.landing.z) ** 2 - (b.x - initial.scenario!.landing.x) ** 2 - (b.z - initial.scenario!.landing.z) ** 2)[0];
    expect(richLand, 'This chosen site should expose a real rich-soil patch for the player.').toBeDefined();
    await revealCells(page, [richLand!]);
    await cell(page, richLand!.x, richLand!.z);
    await expect(page.locator('#cell-title')).toHaveText('Terre riche');
    await expect(page.locator('#cell-description')).toContainText('Fertilité : 140 %');
    await expect(page.locator('#cell-description')).toContainText('Terrain cultivable');
    expect(await world(page)).toEqual(initial);
    checkpoints.richSoil = { ...richLand, description: await page.locator('#cell-description').textContent() };
    await page.screenshot({ path: 'artifacts/scenario-rich-soil-v83.png' });
    await page.keyboard.press('Escape');

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
    writeFileSync('tmp/scenario-established-v83.json', serializeWorld(established));
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
    await page.screenshot({ path: 'artifacts/scenario-start-v83.png' });
    writeFileSync('tmp/scenario-native-v83.json', serializeWorld(finalWorld));
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
    expect((await world(page)).site).toEqual(finalWorld.site);
    checkpoints.coldCurrent = { scenario: (await world(page)).scenario, site: finalWorld.site, tick: finalWorld.tick };

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

    // Reuse this renderer with the same seed/size/scenario, changing only site.
    // First pan away through real controls so a missing reset cannot pass by
    // coincidence when both landings happen to be near the map centre.
    const flatSite: SiteOptions = { hilliness: 'flat' };
    const flatExpected = createScenarioWorld(42, 250, 'crashlanded', flatSite);
    const flatLanding = flatExpected.scenario!.landing;
    const landingView = () => page.evaluate(landing => {
      const bounds = document.querySelector('#viewport canvas')!.getBoundingClientRect();
      const point = window.__lisiere.projectCell(landing.x, landing.z);
      return { ...point, width: bounds.width, height: bounds.height,
        visible: point.x > 20 && point.y > 20 && point.x < bounds.width - 20 && point.y < bounds.height - 20
          && document.elementFromPoint(bounds.x + point.x, bounds.y + point.y)?.tagName === 'CANVAS' };
    }, flatLanding);
    await menuButton(page, 'Reprendre la colonie').click();
    await expect(front(page)).toBeHidden();
    const canvas = await page.locator('#viewport canvas').boundingBox();
    expect(canvas).not.toBeNull();
    for (let attempt = 0; attempt < 3 && (await landingView()).visible; attempt++) {
      await page.mouse.move(canvas!.x + canvas!.width * .75, canvas!.y + canvas!.height * .45);
      await page.mouse.down({ button: 'middle' });
      await page.mouse.move(canvas!.x + canvas!.width * .2, canvas!.y + canvas!.height * .45, { steps: 12 });
      await page.mouse.up({ button: 'middle' });
      await settledCells(page, [flatLanding]);
    }
    const beforeRecreation = await landingView();
    expect(beforeRecreation.visible, 'The old view must be away from the next landing before recreation.').toBe(false);
    expect(await world(page)).toEqual(finalWorld);
    await returnHome(page);
    await menuButton(page, 'Nouvelle partie').click();
    await menuButton(page, 'Suivant').click();
    await front(page).getByRole('radio', { name: 'Récit d’aventure', exact: true }).check();
    await front(page).getByRole('radio', { name: 'Rechargeable à tout moment', exact: true }).check();
    await menuButton(page, 'Suivant').click();
    await page.locator('#front-seed').fill('42');
    await front(page).getByRole('radio', { name: 'Plat', exact: true }).check();
    await menuButton(page, 'Démarrer').click();
    await expect(front(page)).toBeHidden({ timeout: 45000 });
    await expectWorld(page, flatExpected);
    const recreated = await world(page);
    expect(recreated.site).toEqual(resolveSite(42, flatSite));
    expect(recreated.tiles).not.toEqual(initial.tiles);
    await settledCells(page, [flatLanding]);
    const afterRecreation = await landingView();
    expect(afterRecreation.visible, 'A different relief must recenter the existing renderer on its actual landing.').toBe(true);
    expect(await page.evaluate(key => localStorage.getItem(key), manualKey)).toBe(serializeWorld(finalWorld));
    expect(JSON.parse(await page.evaluate(key => localStorage.getItem(key), previousKey) ?? 'null')).toEqual(finalWorld);
    checkpoints.sameSeedNewSite = { seed: recreated.seed, site: recreated.site, landing: flatLanding, tick: recreated.tick, beforeRecreation, afterRecreation };
    await page.screenshot({ path: 'artifacts/scenario-recreated-site-v83.png' });
    allErrors.push(...errors);
    await page.close();

    // A real V82 generated landscape must retain its river, geology and agenda.
    page = await context.newPage(); errors = observeErrors(page);
    await coldHome(page);
    await page.evaluate(({ key, data }) => localStorage.setItem(key, data), { key: previousKey, data: previousLandscapeData });
    await chooseSave(page, previousKey);
    await expect(front(page)).toBeHidden({ timeout: 45000 });
    await expectWorld(page, previousLandscapeExpected);
    const previousLandscape = await world(page);
    expect(previousLandscape.site).toBeUndefined();
    expect(previousLandscape.tiles).toEqual(previousLandscapeInput.tiles);
    expect(previousLandscape.resources).toEqual(previousLandscapeInput.resources);
    expect(previousLandscape.scenario).toEqual(previousLandscapeInput.scenario);
    expect(previousLandscape.gameProfile).toEqual(previousLandscapeInput.gameProfile);
    expect(previousLandscape.tick).toBe(previousLandscapeInput.tick);
    for (const id of ['enable-arrivals', 'enable-raids', 'enable-heatwaves']) await expect(page.locator(`#${id}`)).toBeHidden();
    expect(await page.evaluate(key => localStorage.getItem(key), previousKey)).toBe(previousLandscapeData);
    expect(await page.evaluate(key => localStorage.getItem(key), manualKey)).toBe(serializeWorld(finalWorld));
    checkpoints.coldPreviousLandscape = { source: 'tests/fixtures/scenario-v82.json.gz', sourceVersion: 82, sourceSha256: previousLandscapeSha256, loadedVersion: previousLandscape.schemaVersion, tick: previousLandscape.tick, site: null };
    await page.screenshot({ path: 'artifacts/scenario-historical-v82-landscape-v83.png' });
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
    expect(oldWorld.arrivals).toBeUndefined();
    expect(oldWorld.raids).toBeUndefined();
    expect(oldWorld.heatwaves?.profile).toBe('camp-heat-v1');
    await expect(page.locator('#enable-arrivals')).toBeVisible();
    await expect(page.locator('#enable-raids')).toBeVisible();
    await expect(page.locator('#enable-heatwaves')).toBeHidden();
    expect(await page.evaluate(key => localStorage.getItem(key), previousKey)).toBe(historicalData);
    expect(await page.evaluate(key => localStorage.getItem(key), manualKey)).toBe(serializeWorld(finalWorld));
    await page.screenshot({ path: 'artifacts/scenario-historical-v83.png' });
    checkpoints.coldHistorical = { source: 'artifacts/heatwave-checkpoint-v81.json', sourceVersion: 81, loadedVersion: oldWorld.schemaVersion, tick: oldWorld.tick, width: oldWorld.width };
    allErrors.push(...errors);
    expect(allErrors).toEqual([]);
    writeFileSync('artifacts/scenario-ui-v83.json', JSON.stringify({ backend, userAgent, viewport, samples, checkpoints, errors: allErrors }, null, 2));
  } catch (error) {
    const failureTag = `scenario-ui-v83-failed-${Date.now()}`;
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
