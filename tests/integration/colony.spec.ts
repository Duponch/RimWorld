import { expect, test, type Page } from '@playwright/test';
import { createWorld } from '../../src/sim/engine';
import { deserializeWorld, serializeWorld } from '../../src/sim/serialization';
import { addGroundMaterial, refreshStock } from '../../src/sim/materials';
import legacySave from '../fixtures/schema-1-active-construction.json' with { type: 'json' };
import type { World } from '../../src/sim/types';

import { world, serializedWorld, expectWorld, saveKey, observeErrors, panel, tool, cell, dragRectangle, startPaused } from './helpers';

test('besoins physiques : repas en main, sommeil dans deux lits orientés, attribution et sauvegarde UI', async ({ playwright }, testInfo) => {
  test.setTimeout(120_000);
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page);
  try {
    await startPaused(page);
    const fixture = createWorld(42, 32, 32);
    fixture.tiles = fixture.tiles.map(() => ({ terrain: 'grass' })); fixture.resources = []; fixture.piles = []; fixture.stockpiles = [];
    fixture.pawns.forEach((pawn, index) => { pawn.x = 12 + index * 2; pawn.z = 16; pawn.hunger = index === 0 ? 10 : 90; pawn.rest = index === 0 ? 90 : 19; });
    const ids = [fixture.nextId++, fixture.nextId++];
    fixture.structures = [{ id: ids[0], kind: 'bed', x: 17, z: 18, orientation: 1, footprint: 'standard' }, { id: ids[1], kind: 'bed', x: 19, z: 18, orientation: 2, footprint: 'standard' }];
    addGroundMaterial(fixture, 'food', 1, { x: 16, z: 14 }); refreshStock(fixture);
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: saveKey, value: serializeWorld(fixture) });
    await startPaused(page); // Reopen so the normal save-slot discovery sees this fixture.
    await panel(page, 'menu'); await page.locator('#load').click(); await expectWorld(page, fixture);
    await page.getByRole('button', { name: 'Vitesse normale', exact: true }).click();
    await page.waitForFunction(() => {
      const w = window.__lisiere.world;
      if (w.pawns[0].state !== 'eating' || w.pawns.filter(pawn => pawn.state === 'sleeping').length !== 2) return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click(); return true;
    });
    await expect(page.locator('#pause-banner')).toBeVisible();
    const eating = await world(page);
    expect(eating.stock.food).toBe(1); expect(eating.pawns[0].hunger).toBeLessThan(10);
    expect(eating.pawns[0].need).toMatchObject({ kind: 'eat', phase: 'ingest' });
    for (const pawn of eating.pawns.slice(1)) {
      const bed = eating.structures.find(bed => bed.id === pawn.bedId)!;
      expect({ x: pawn.x, z: pawn.z }).toEqual({ x: bed.x, z: bed.z });
    }
    await panel(page, 'menu'); await page.locator('#save').click();
    await expect.poll(() => page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(JSON.stringify(eating));
    await page.locator('#menu-panel [data-close-panel]').click();
    await page.locator(`[data-pawn="${eating.pawns[0].id}"]`).click();
    await expect(page.locator('#selected-action')).toContainText('Mange la portion tenue en main');
    await page.screenshot({ path: 'artifacts/needs-eating-sleeping.png' });
    await page.getByRole('button', { name: 'Vitesse 6 fois', exact: true }).click();
    await expect.poll(async () => (await world(page)).stock.food).toBe(0);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    expect((await world(page)).pawns[0].hunger).toBeGreaterThan(40);
    await panel(page, 'menu'); await page.locator('#load').click(); await expectWorld(page, eating);
    if (await page.locator('#inspect-close').isVisible()) await page.locator('#inspect-close').click();
    await cell(page, 18, 18); // Foot of the bed: head cell selects the sleeping pawn.
    await expect(page.getByLabel('Propriétaire du lit', { exact: true })).toBeVisible();
    await page.getByLabel('Propriétaire du lit', { exact: true }).selectOption(String(eating.pawns[0].id));
    await expect.poll(async () => (await world(page)).pawns[0].bedId).toBe(ids[0]);
    expect(errors).toEqual([]);
    const graphics = await page.evaluate(async () => {
      const adapter = await navigator.gpu?.requestAdapter();
      return { backend: window.__lisiere.backend, adapter: adapter ? { vendor: adapter.info.vendor, architecture: adapter.info.architecture, device: adapter.info.device, description: adapter.info.description } : null };
    });
    await testInfo.attach('needs-gameplay', { contentType: 'application/json', body: JSON.stringify({ ...graphics, phases: ['pickup', 'ingest', 'sleep', 'bed-reassignment'], foodConsumed: 1, resumedExactly: true, errors }) });
  } finally { await browser.close(); }
});

test('colonie matérielle : réserve filtrée, transport visible, trois couchages et reprise exacte en livraison', async ({ playwright }) => {
  test.setTimeout(120_000);
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  try {
  const errors = observeErrors(page);
  await startPaused(page);
  const pausedTick = (await world(page)).tick;
  await page.waitForTimeout(350);
  expect((await world(page)).tick).toBe(pausedTick);
  await expect(page.locator('#alerts [data-alert="beds"]')).toBeVisible();

  await panel(page, 'work');
  await page.getByLabel('Priorité collecte Ada', { exact: true }).selectOption('1');
  await page.getByLabel('Priorité construction Ada', { exact: true }).selectOption('3');
  await page.getByLabel('Priorité transport Ada', { exact: true }).selectOption('2');
  await expect.poll(async () => (await world(page)).pawns[0].priorities).toEqual({ gather: 1, build: 3, haul: 2, grow: 2 });
  await tool(page, 'stockpile');
  await page.locator('#stockpile-food').uncheck();
  await page.locator('#stockpile-capacity').fill('10');
  await dragRectangle(page, { x: 14, z: 17 }, { x: 14, z: 18 });
  await expect.poll(async () => (await world(page)).stockpiles.length).toBe(2);
  expect((await world(page)).stockpiles.every(zone => zone.filters.wood && !zone.filters.food && zone.capacity === 10)).toBe(true);
  await tool(page, 'harvest'); await cell(page, 18, 14);
  await tool(page, 'chop'); await cell(page, 14, 14);
  await tool(page, 'bed'); await cell(page, 16, 18);
  await expect.poll(async () => (await world(page)).jobs.length).toBe(3);
  // Observe a real in-flight transfer through snapshots, then freeze its authoritative state.
  await page.getByRole('button', { name: 'Vitesse normale', exact: true }).click();
  // Act on the displayed state in the same browser callback: a separate driver round trip
  // can outlast a short delivery. This clicks the real control and never mutates simulation data.
  await page.waitForFunction(() => {
    if (!window.__lisiere.world.pawns.some(pawn => pawn.haul?.phase === 'deliver')) return false;
    document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();
    return true;
  });
  await expect(page.locator('#pause-banner')).toBeVisible();
  const duringHaul = await world(page);
  expect(duringHaul.piles.some(pile => pile.owner.type === 'pawn')).toBe(true);
  await expect(page.locator('#material-status')).not.toHaveText(/^0 portées/);
  await panel(page, 'menu');
  await page.locator('#save').click();
  await expect(page.getByRole('status')).toContainText('sauvegardée');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!) as World, saveKey);
  expect(saved.schemaVersion).toBe(8);
  expect(saved.pawns.some(pawn => pawn.haul?.phase === 'deliver')).toBe(true);
  expect(JSON.stringify(saved)).toBe(JSON.stringify(duringHaul));

  await page.getByRole('button', { name: 'Vitesse 6 fois', exact: true }).click();
  await expect.poll(async () => (await world(page)).jobs.length).toBe(0);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('#pause-banner')).toBeVisible();
  const finished = await world(page);
  expect(finished.structures.filter(structure => structure.kind === 'bed')).toHaveLength(1);
  expect(finished.stock).toEqual({ wood: 16, food: 28 });
  expect(finished.pawns.every(pawn => pawn.hunger < 91 && pawn.hunger > 60)).toBe(true);
  expect(finished.resources.some(resource => resource.x === 14 && resource.z === 14)).toBe(false);
  await expect(page.locator('#alerts [data-alert="beds"]')).toBeVisible();

  // Use the actual remaining material to satisfy the colony's warning, not a patched fixture.
  const extraBeds = [15, 17, 18].map(x => ({ x, z: 18 })).filter(target =>
    !finished.pawns.some(pawn => pawn.x === target.x && (pawn.z === target.z || pawn.z === target.z + 1))).slice(0, 2);
  expect(extraBeds).toHaveLength(2);
  await tool(page, 'bed');
  for (const target of extraBeds) await cell(page, target.x, target.z);
  await expect.poll(async () => (await world(page)).jobs.length).toBe(2);
  await page.getByRole('button', { name: 'Vitesse 6 fois', exact: true }).click();
  await expect.poll(async () => (await world(page)).structures.filter(item => item.kind === 'bed').length).toBe(3);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('#alerts [data-alert="beds"]')).toHaveCount(0);
  expect((await world(page)).stock.wood).toBe(0);
  await panel(page, 'menu');
  await page.locator('#load').click();
  await expectWorld(page, saved);
  await expect(page.locator('#alerts [data-alert="beds"]')).toBeVisible();

  const woodBeforeCancel = saved.piles.filter(pile => pile.kind === 'wood').reduce((sum, pile) => sum + pile.quantity, 0);
  await tool(page, 'cancel'); await cell(page, 16, 19); // Second footprint cell selects the same plan.
  await expect.poll(async () => (await world(page)).jobs.length).toBe(saved.jobs.length - 1);
  expect((await world(page)).piles.filter(pile => pile.kind === 'wood').reduce((sum, pile) => sum + pile.quantity, 0)).toBe(woodBeforeCancel);
  await page.keyboard.press('Escape'); await cell(page, 14, 17);
  await expect(page.locator('#cell-storage')).toBeVisible();
  await page.locator('#selected-stockpile-wood').uncheck();
  await page.locator('#selected-stockpile-food').check();
  await page.locator('#update-stockpile').click();
  await expect.poll(async () => (await world(page)).stockpiles.find(zone => zone.x === 14 && zone.z === 17)?.filters).toEqual({ wood: false, food: true });
  await page.locator('#delete-stockpile').click();
  await expect.poll(async () => (await world(page)).stockpiles.length).toBe(1);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'artifacts/colony-desktop.png' });
  expect(errors).toEqual([]);
  } finally { await browser.close(); }
});

test('frontières : commandes répétées, sauvegarde invalide atomique, aide et organisation compacte', async ({ page }) => {
  const errors = observeErrors(page);
  await startPaused(page);
  await panel(page, 'work');
  await page.getByRole('button', { name: 'Vitesse normale', exact: true }).click();
  const spamStart = (await world(page)).tick;
  // Ordinary UI changes must not reset the worker's wall-clock epoch.
  await page.evaluate(async () => {
    for (let i = 0; i < 40; i++) {
      const select = document.querySelector<HTMLSelectElement>('[aria-label="Priorité collecte Ada"]')!;
      select.value = String(i % 2 + 1);
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  });
  expect((await world(page)).tick - spamStart).toBeGreaterThanOrEqual(7);
  await expect.poll(async () => (await world(page)).pawns[0].priorities.gather).toBe(2);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('#pause-banner')).toBeVisible();
  const before = await world(page);
  await panel(page, 'menu');
  await page.locator('#save').click();
  await expect(page.getByRole('status')).toContainText('sauvegardée');
  await page.evaluate(key => localStorage.setItem(key, '{"schemaVersion":999}'), saveKey);
  await page.locator('#load').click();
  await expect(page.getByRole('status')).toHaveClass(/error/);
  expect(await world(page)).toEqual(before);
  await tool(page, 'wall'); await cell(page, 16, 16);
  await expect(page.getByRole('status')).toHaveClass(/error/);
  expect((await world(page)).jobs).toHaveLength(0);
  await tool(page, 'bed'); await page.locator('#rotate-building').click();
  await expect(page.locator('#placement-orientation')).toHaveText('90°');
  await cell(page, 16, 18);
  await expect.poll(async () => (await world(page)).jobs[0]?.orientation).toBe(1);
  await tool(page, 'cancel'); await cell(page, 17, 18);
  await expect.poll(async () => (await world(page)).jobs.length).toBe(0);
  await page.getByRole('button', { name: 'Ouvrir l’aide', exact: true }).click();
  await expect(page.locator('#help')).toBeVisible();
  await page.getByRole('button', { name: 'Fermer l’aide', exact: true }).click();
  await expect(page.locator('#help')).not.toBeVisible();
  await page.locator('#architect-panel [data-close-panel]').click();

  for (const viewport of [{ width: 1280, height: 720 }, { width: 768, height: 900 }]) {
    await page.setViewportSize(viewport);
    // Check roles and spatial relationships, keeping typography and exact pixels free to evolve.
    const colons = await page.locator('.colonist-bar').boundingBox();
    const resources = await page.locator('.resource-list').boundingBox();
    const time = await page.locator('.time-panel').boundingBox();
    const navigation = await page.getByRole('navigation', { name: 'Gestion de la colonie' }).boundingBox();
    expect(colons && resources && time && navigation).toBeTruthy();
    expect(colons!.y + colons!.height).toBeLessThan(viewport.height * 0.25);
    expect(resources!.x + resources!.width).toBeLessThan(viewport.width * 0.4);
    expect(time!.x).toBeGreaterThan(viewport.width * 0.5);
    expect(time!.y + time!.height).toBeLessThanOrEqual(navigation!.y + 1);
    expect(navigation!.y).toBeGreaterThan(viewport.height * 0.8);
    await panel(page, 'work');
    await expect(page.getByLabel('Priorité construction Ada', { exact: true })).toBeVisible();
    const work = await page.locator('#work-panel').boundingBox();
    expect(work!.y + work!.height).toBeLessThanOrEqual(navigation!.y + 1);
    await tool(page, 'bed');
    await expect(page.locator('[data-tool="bed"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('#architect-panel [data-close-panel]').click();
  }
  await page.screenshot({ path: 'artifacts/colony-compact.png' });
  // Real legacy data crosses localStorage → client → worker migration, not a patched snapshot.
  await page.evaluate(({ key, data }) => localStorage.setItem(key, data), { key: saveKey, data: JSON.stringify(legacySave) });
  await panel(page, 'menu'); await page.locator('#load').click();
  await expectWorld(page, deserializeWorld(JSON.stringify(legacySave)));
  expect((await world(page)).structures.find(structure => structure.kind === 'bed')?.footprint).toBe('legacy-single');
  await panel(page, 'menu'); await page.locator('#save').click();
  await expect(page.getByRole('status')).toContainText('sauvegardée');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).schemaVersion, saveKey)).toBe(8);
  expect(errors).toEqual([]);
});

test('rectangles 250² : aperçu, interruptions, rotation, politiques préservées et récolte réelle', async ({ playwright }) => {
  test.setTimeout(150_000);
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  try {
    const errors = observeErrors(page);
    const diagnostics: string[] = [];
    page.on('console', message => { if (message.text().includes('Lisière renderer diagnostics')) diagnostics.push(message.text()); });
    await page.goto('/?e2e&seed=42&size=250');
    await page.waitForFunction(() => !!window.__lisiere);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.locator('#pause-banner')).toBeVisible();
    const initial = await serializedWorld(page);
    const from = { x: 123, z: 124 }, to = { x: 126, z: 125 };
    await tool(page, 'stockpile');
    await page.locator('#stockpile-food').uncheck(); await page.locator('#stockpile-capacity').fill('10');
    for (const interruption of ['escape', 'right', 'outside', 'blur', 'tool'] as const) {
      await tool(page, 'stockpile'); await dragRectangle(page, from, to, false);
      await expect(page.locator('#area-feedback')).toBeVisible();
      await expect(page.locator('#area-feedback')).toContainText('4 × 2 · 8 case(s) retenue(s)');
      expect(await serializedWorld(page)).toBe(initial);
      if (interruption === 'escape') await page.keyboard.press('Escape');
      else if (interruption === 'right') { await page.mouse.down({ button: 'right' }); await page.mouse.up({ button: 'right' }); }
      else if (interruption === 'outside') await page.mouse.move(35, 35);
      else if (interruption === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      else await page.keyboard.press('r');
      await page.mouse.up(); await expect(page.locator('#area-feedback')).toBeHidden();
      await expectWorld(page, JSON.parse(initial));
    }
    await tool(page, 'stockpile'); await dragRectangle(page, to, from, false);
    await expect(page.locator('#area-feedback')).toBeVisible();
    await expect(page.locator('#area-feedback')).toContainText('8 case(s) retenue(s)');
    // Hold the real gesture through rendered frames to compile and inspect the instanced preview.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: 'artifacts/area-preview-250.png' });
    await page.mouse.up();
    await expect.poll(async () => (await world(page)).stockpiles.length).toBe(8);
    await expect(page.locator('#notice')).toContainText('8 case(s) de réserve créée(s)');
    const stored = (await world(page)).stockpiles;
    expect(stored.every(cell => cell.filters.wood && !cell.filters.food && cell.capacity === 10)).toBe(true);
    // Overlap is additive: changing drawing settings must not overwrite existing policies.
    await page.locator('#stockpile-capacity').fill('20');
    await dragRectangle(page, { x: 125, z: 124 }, { x: 127, z: 125 });
    await expect.poll(async () => (await world(page)).stockpiles.length).toBe(10);
    expect((await world(page)).stockpiles.slice(0, 8)).toEqual(stored);
    expect((await world(page)).stockpiles.slice(8).every(cell => cell.capacity === 20)).toBe(true);
    await expect(page.locator('#notice')).toContainText('2 case(s) de réserve créée(s) · 4 case(s) ignorée(s)');

    await panel(page, 'menu'); await page.locator('#save').click();
    await expect(page.locator('#notice')).toContainText('sauvegardée');
    const saved = await world(page);
    await tool(page, 'remove-stockpile'); await dragRectangle(page, from, { x: 127, z: 125 }, false);
    await expect(page.locator('#area-feedback')).toContainText('10 case(s) retenue(s)');
    await page.mouse.up();
    await expect.poll(async () => ({ count: (await world(page)).stockpiles.length, errors, notice: await page.locator('#notice').textContent() })).toMatchObject({ count: 0, errors: [] });
    expect((await world(page)).piles).toEqual(saved.piles);
    await panel(page, 'menu'); await page.locator('#load').click(); await expectWorld(page, saved);
    // Also cover immediate release, without waiting on preview DOM or a screenshot.
    await tool(page, 'remove-stockpile'); await dragRectangle(page, from, { x: 127, z: 125 });
    await expect.poll(async () => ({ count: (await world(page)).stockpiles.length, errors, notice: await page.locator('#notice').textContent() })).toMatchObject({ count: 0, errors: [] });
    await panel(page, 'menu'); await page.locator('#load').click(); await expectWorld(page, saved);

    await tool(page, 'chop');
    // Right drag remains orbiting outside a designation gesture.
    await page.mouse.move(1000, 350); await page.mouse.down({ button: 'right' });
    await page.mouse.move(1090, 375, { steps: 8 }); await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(300);
    const beforeGather = await world(page);
    const gatherFrom = { x: 122, z: 122 }, gatherTo = { x: 125, z: 124 };
    const targets = beforeGather.resources.filter(resource => resource.kind === 'tree' && resource.x >= 122 && resource.x <= 125 && resource.z >= 122 && resource.z <= 124);
    expect(targets.length).toBeGreaterThan(0);
    await dragRectangle(page, gatherTo, gatherFrom);
    await expect.poll(async () => (await world(page)).jobs.length).toBe(targets.length);
    expect((await world(page)).jobs.map(job => `${job.x}:${job.z}`).sort()).toEqual(targets.map(resource => `${resource.x}:${resource.z}`).sort());
    const expectedWood = beforeGather.piles.filter(pile => pile.kind === 'wood').reduce((sum, pile) => sum + pile.quantity, 0) + targets.reduce((sum, resource) => sum + resource.amount, 0);
    await page.getByRole('button', { name: 'Vitesse 6 fois', exact: true }).click();
    await expect.poll(async () => (await world(page)).jobs.length, { timeout: 25000 }).toBe(0);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.locator('#pause-banner')).toBeVisible();
    const finished = await world(page);
    expect(finished.piles.filter(pile => pile.kind === 'wood').reduce((sum, pile) => sum + pile.quantity, 0)).toBe(expectedWood);
    expect(finished.resources.some(resource => targets.some(target => target.id === resource.id))).toBe(false);
    expect(errors).toEqual([]);
    const report = JSON.stringify({ timestamp: new Date().toISOString(), backend: await page.evaluate(() => window.__lisiere.backend), size: 250, seed: 42, interruptedGestures: ['Escape', 'right-button', 'release-over-UI', 'injected-window-blur', 'tool-change'], storageCells: 10, harvestedTrees: targets.length, conservedWood: expectedWood, screenshot: 'artifacts/area-preview-250.png', diagnostics, errors }, null, 2);
    await test.info().attach('area-gameplay', { body: report, contentType: 'application/json' });
  } finally { await browser.close(); }
});

test('nouvelle colonie : défaut 250, tailles 128/200/250 et retour exact à une ancienne petite partie', async ({ playwright }) => {
  // Large-map transitions exercise normal adapter selection. The boundary scenario
  // separately covers the configured software fallback.
  test.setTimeout(180_000);
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  try {
    const errors = observeErrors(page);
    await page.goto('/?e2e');
    await page.waitForFunction(() => !!window.__lisiere);
    await expect(page.locator('#map-size')).toHaveText('250 × 250');
    await startPaused(page);
    await panel(page, 'work');
    await page.getByLabel('Priorité construction Ada', { exact: true }).selectOption('0');
    await tool(page, 'chop'); await cell(page, 14, 14);
    await expect.poll(async () => (await world(page)).jobs.length).toBe(1);
    const previous = await world(page);
    for (const [size, seed] of [[128, 271], [200, 7], [250, 0xffffffff]]) {
      await panel(page, 'menu');
      await page.locator('#new-colony').click();
      await expect(page.locator('#new-world-dialog')).toBeVisible();
      await page.locator('#world-seed').fill(String(seed));
      await page.locator('#world-size').selectOption(String(size));
      await page.locator('#new-world-form button[type="submit"]').click();
      await expect(page.locator('#new-world-dialog')).not.toBeVisible();
      await expectWorld(page, createWorld(seed, size, size));
      await expect(page.locator('#map-size')).toHaveText(`${size} × ${size}`);
      await expect(page.locator('#pause-banner')).toBeVisible();
      if (size === 250) {
        // A full-size save must survive storage and reloading, not only generation.
        await panel(page, 'menu'); await page.locator('#save').click();
        await expect(page.getByRole('status')).toContainText('sauvegardée');
        await page.locator('#load').click();
        await expectWorld(page, createWorld(seed, size, size));
      }
      await panel(page, 'menu');
      await expect(page.locator('#restore-previous')).toBeEnabled();
      await page.locator('#restore-previous').click();
      await expectWorld(page, previous);
      await expect(page.locator('#map-size')).toHaveText('32 × 32');
    }
    await test.info().attach('transition-renderer', {
      body: JSON.stringify({ backend: await page.evaluate(() => window.__lisiere.backend), defaultSize: 250, sizes: [32, 128, 200, 250], restoredExactly: true }),
      contentType: 'application/json',
    });
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});
