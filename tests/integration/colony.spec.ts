import { expect, test, type Page } from '@playwright/test';
import { createWorld } from '../../src/sim/engine';
import { deserializeWorld } from '../../src/sim/serialization';
import legacySave from '../fixtures/schema-1-active-construction.json' with { type: 'json' };
import type { World } from '../../src/sim/types';

declare global {
  interface Window {
    __lisiere: { world: World; backend: string; projectCell(x: number, z: number): { x: number; y: number } };
  }
}

// Transport one JSON string: tracing every tile as a remote object can dominate the 128² case.
const serializedWorld = (page: Page): Promise<string> => page.evaluate(() => JSON.stringify(window.__lisiere.world));
const world = async (page: Page): Promise<World> => JSON.parse(await serializedWorld(page)) as World;
async function expectWorld(page: Page, expected: World) {
  const serialized = JSON.stringify(expected);
  // Exact comparison, with no expensive recursive matcher/tracing over thousands of tile objects.
  await expect.poll(async () => await serializedWorld(page) === serialized, {
    message: `État exact : graine ${expected.seed}, carte ${expected.width}×${expected.height}, tick ${expected.tick}, ${expected.jobs.length} ordre(s)`,
  }).toBe(true);
}
const saveKey = 'lisiere.save.v1';

function observeErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' || /GPUValidationError|Error while parsing|invalid pipeline/i.test(message.text())) errors.push(message.text());
  });
  return errors;
}

async function panel(page: Page, name: 'architect' | 'work' | 'menu') {
  if (!await page.locator(`#${name}-panel`).isVisible()) await page.locator(`[data-panel="${name}"]`).click();
  await expect(page.locator(`#${name}-panel`)).toBeVisible();
}

async function tool(page: Page, name: 'chop' | 'harvest' | 'cancel' | 'wall' | 'bed' | 'stockpile' | 'remove-stockpile') {
  await panel(page, 'architect');
  const category = name === 'wall' ? 'structure' : name === 'bed' ? 'furniture' : name === 'stockpile' || name === 'remove-stockpile' ? 'zones' : 'orders';
  await page.locator(`[data-category="${category}"]`).click();
  await page.locator(`[data-tool="${name}"]`).click();
}

async function cell(page: Page, x: number, z: number) {
  const point = await page.evaluate(({ x, z }) => window.__lisiere.projectCell(x, z), { x, z });
  const bounds = await page.locator('#viewport canvas').boundingBox();
  if (!bounds) throw new Error('Canvas absent');
  await page.mouse.click(bounds.x + point.x, bounds.y + point.y);
}

async function startPaused(page: Page) {
  await page.goto('/?size=32&seed=42&e2e');
  await expect(page.locator('#loading')).toHaveCount(0);
  await expect(page.locator('#viewport canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('#pause-banner')).toBeVisible();
  expect((await world(page)).width).toBe(32);
}

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
  await expect.poll(async () => (await world(page)).pawns[0].priorities).toEqual({ gather: 1, build: 3, haul: 2 });
  await tool(page, 'stockpile');
  await page.locator('#stockpile-food').uncheck();
  await page.locator('#stockpile-capacity').fill('10');
  await cell(page, 14, 17); await cell(page, 14, 18);
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
  expect(saved.schemaVersion).toBe(2);
  expect(saved.pawns.some(pawn => pawn.haul?.phase === 'deliver')).toBe(true);
  expect(JSON.stringify(saved)).toBe(JSON.stringify(duringHaul));

  await page.getByRole('button', { name: 'Vitesse 6 fois', exact: true }).click();
  await expect.poll(async () => (await world(page)).jobs.length).toBe(0);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('#pause-banner')).toBeVisible();
  const finished = await world(page);
  expect(finished.structures.filter(structure => structure.kind === 'bed')).toHaveLength(1);
  expect(finished.stock).toEqual({ wood: 16, food: 32 });
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
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).schemaVersion, saveKey)).toBe(2);
  expect(errors).toEqual([]);
});

test('nouvelle colonie : tailles 64 et 128, graine exacte et retour sans perte à une partie avec ordres', async ({ playwright }) => {
  // The two other scenarios keep the configured software fallback. Large-map transitions
  // exercise the browser's normal adapter selection, independently of that fallback probe.
  test.setTimeout(150_000);
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  try {
    const errors = observeErrors(page);
    await startPaused(page);
    await panel(page, 'work');
    await page.getByLabel('Priorité construction Ada', { exact: true }).selectOption('0');
    await tool(page, 'chop'); await cell(page, 14, 14);
    await expect.poll(async () => (await world(page)).jobs.length).toBe(1);
    const previous = await world(page);
    for (const [size, seed] of [[64, 271], [128, 0xffffffff]]) {
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
      await panel(page, 'menu');
      await expect(page.locator('#restore-previous')).toBeEnabled();
      await page.locator('#restore-previous').click();
      await expectWorld(page, previous);
      await expect(page.locator('#map-size')).toHaveText('32 × 32');
    }
    await test.info().attach('transition-renderer', {
      body: JSON.stringify({ backend: await page.evaluate(() => window.__lisiere.backend), sizes: [32, 64, 128], restoredExactly: true }),
      contentType: 'application/json',
    });
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});
