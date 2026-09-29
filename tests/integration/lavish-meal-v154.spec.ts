import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { deserializeWorld, validateWorld } from '../../src/sim/serialization.ts';
import { TICKS_PER_DAY, type World } from '../../src/sim/types.ts';
import { cell, expectWorld, observeErrors, panel, pause, pawnTab, saveKey, world } from './helpers.ts';
import { editBill, revealCells } from './player-actions.ts';

test('V154 prepared Core meal uses the real UI, worker, policy and ingestion', async ({ page }) => {
  test.setTimeout(180000);
  // Prepare a legacy V152 state. The stove and raw foods are present, while
  // bill creation, policy authorization, collection, cooking and eating occur
  // through the player UI and worker below. The historical fixture is untouched.
  const legacy = JSON.parse(readFileSync(new URL('../../public/test-saves/v152/repas-fin.json', import.meta.url), 'utf8')) as World;
  expect(legacy.schemaVersion).toBe(152);
  for (const pile of legacy.piles) if (pile.item === 'milk' || pile.item === 'rice') pile.quantity = 10;
  legacy.stock.food = 20;
  const legacyEater = legacy.pawns[1]!;
  legacyEater.memories = [{ kind: 'ate-fine-meal', expiresAt: legacy.tick + TICKS_PER_DAY }];
  const raw = JSON.stringify(legacy);
  const prepared = deserializeWorld(raw), cook = prepared.pawns[0]!, eater = prepared.pawns[1]!;
  const stove = prepared.structures.find(s => s.kind === 'fueled-stove')!;
  expect(validateWorld(prepared)).toEqual([]);
  expect(prepared.piles.filter(p => p.item === 'milk' || p.item === 'rice').map(p => [p.item, p.quantity])).toEqual([['milk', 10], ['rice', 10]]);
  expect(prepared.piles.some(p => p.item === 'lavish-meal')).toBe(false);
  expect(stove.bills).toEqual([]);
  expect(stove.fuel!.ticks).toBeGreaterThan(0);
  expect(cook.skills.cooking!.level).toBeGreaterThanOrEqual(8);
  expect(prepared.foodPolicies.find(p => p.id === eater.foodPolicyId)!.allowed).not.toContain('lavish-meal');

  const errors = observeErrors(page);
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), { key: saveKey, data: raw });
  await page.goto('/?scenario=camp&size=32&e2e');
  await expect(page.locator('#loading')).toHaveCount(0);
  await pause(page);
  await panel(page, 'menu'); await page.locator('#load').click();
  await expect(page.locator('#notice')).toContainText('Sauvegarde rechargée');
  await expectWorld(page, prepared);

  // V152 policies keep their exact permissions until the player changes one.
  await page.keyboard.press('Escape'); await panel(page, 'assign');
  await page.locator('#manage-food-policies').click();
  await page.locator('#food-policy-choice').selectOption(String(eater.foodPolicyId));
  const permission = page.locator('[data-allowed-food="lavish-meal"]');
  await expect(permission).not.toBeChecked();
  await permission.check(); await page.locator('#apply-food-policy').click();
  await expect.poll(async () => (await world(page)).foodPolicies.find(p => p.id === eater.foodPolicyId)?.allowed.includes('lavish-meal')).toBe(true);
  await page.locator('#close-food-policies').click();
  await page.getByRole('button', { name: 'Fermer Assignations' }).click();
  await page.locator(`[data-pawn="${eater.id}"]`).click(); await pawnTab(page, 'needs');
  await expect(page.locator('[data-thought="ate-fine-meal"]')).toContainText('+5');

  await page.keyboard.press('Escape'); await revealCells(page, [stove]); await cell(page, stove.x, stove.z);
  const add = page.locator('[data-add-recipe="lavish-meal"]');
  await expect(add).toBeEnabled(); await expect(add).toContainText('plat gastronomique'); await add.click();
  await expect.poll(async () => (await world(page)).structures.find(s => s.id === stove.id)?.bills?.length).toBe(1);
  const bill = (await world(page)).structures.find(s => s.id === stove.id)!.bills![0]!;
  expect(bill.recipe).toBe('lavish-meal');
  await expect(page.locator(`[data-bill="${bill.id}"] .bill-cost`)).toContainText('10 protéines (viande ou lait) + 10 végétaux · Cuisine 8');
  await editBill(page, bill.id, { ...bill, filters: { ...bill.filters, 'hare-meat': false, milk: true, rice: true }, destination: 'drop' });
  await expect.poll(async () => (await world(page)).structures.find(s => s.id === stove.id)?.bills?.[0]?.destination).toBe('drop');
  await expect(page.locator(`[data-bill="${bill.id}"] [data-field="milk"]`)).toBeChecked();
  await expect(page.locator(`[data-bill="${bill.id}"] [data-field="hare-meat"]`)).not.toBeChecked();
  await panel(page, 'work');
  await page.locator(`select[data-owner="${cook.id}"][data-work="cook"]`).selectOption('1');
  await page.keyboard.press('Escape'); await page.locator('[data-speed="6"]').click();

  // Pause at a real work phase and verify the full staged recipe survives save/load.
  await page.waitForFunction(id => {
    const task = window.__lisiere.world.pawns.find(p => p.id === id)?.cooking;
    if (task?.recipe !== 'lavish-meal' || task.phase !== 'work' || task.progress < 10) return false;
    (document.querySelector('[data-speed="0"]') as HTMLButtonElement).click(); return true;
  }, cook.id, { polling: 50, timeout: 45000 });
  await expect(page.locator('#pause-banner')).toBeVisible();
  const working = await world(page), task = working.pawns.find(p => p.id === cook.id)!.cooking!;
  expect(task.ingredients.reduce((sum, ingredient) => sum + ingredient.quantity, 0)).toBe(20);
  expect(task.ingredients.every(ingredient => ingredient.stage === 'placed')).toBe(true);
  expect(working.piles.some(p => p.item === 'lavish-meal')).toBe(false);
  expect(validateWorld(working)).toEqual([]);
  await panel(page, 'menu'); await page.locator('#save').click();
  await expect(page.locator('#notice')).toContainText('Colonie sauvegardée');
  await page.locator('#load').click(); await expect(page.locator('#notice')).toContainText('Sauvegarde rechargée');
  await expectWorld(page, working);
  await page.keyboard.press('Escape'); await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(id => {
    const current = window.__lisiere.world;
    if (current.pawns.find(p => p.id === id)?.cooking || !current.piles.some(p => p.item === 'lavish-meal')) return false;
    (document.querySelector('[data-speed="0"]') as HTMLButtonElement).click(); return true;
  }, cook.id, { polling: 50, timeout: 45000 });
  await expect(page.locator('#pause-banner')).toBeVisible();
  const cooked = await world(page);
  expect(cooked.piles.filter(p => p.item === 'lavish-meal').reduce((sum, pile) => sum + pile.quantity, 0)).toBe(1);
  expect(cooked.piles.filter(p => p.item === 'milk' || p.item === 'rice').reduce((sum, pile) => sum + pile.quantity, 0)).toBe(0);
  expect(cooked.structures.find(s => s.id === stove.id)!.fuel!.burned).toBeGreaterThan(0);
  expect(cooked.structures.find(s => s.id === stove.id)!.bills![0]!.target).toBe(0);
  expect(validateWorld(cooked)).toEqual([]);
  await expect(page.locator('#food-items [data-item="lavish-meal"]')).toContainText('Plat gastronomique');

  await page.locator('[data-speed="6"]').click();
  await expect.poll(async () => (await world(page)).pawns.find(p => p.id === eater.id)?.memories.some(m => m.kind === 'ate-lavish-meal'), { timeout: 45000, intervals: [100] }).toBe(true);
  await pause(page);
  const eaten = await world(page), eaterNow = eaten.pawns.find(p => p.id === eater.id)!;
  expect(eaten.piles.some(p => p.item === 'lavish-meal')).toBe(false);
  expect(eaterNow.hunger).toBeGreaterThan(prepared.pawns[1]!.hunger);
  expect(eaterNow.memories.some(m => m.kind === 'ate-fine-meal')).toBe(false);
  expect(validateWorld(eaten)).toEqual([]);
  await page.locator(`[data-pawn="${eater.id}"]`).click(); await pawnTab(page, 'needs');
  await expect(page.locator('[data-thought="ate-lavish-meal"]')).toContainText('+12');
  await expect(page.locator('[data-thought="ate-fine-meal"]')).toHaveCount(0);
  await panel(page, 'menu'); await page.locator('#save').click();
  await expect(page.locator('#notice')).toContainText('Colonie sauvegardée');
  await page.locator('#load').click(); await expect(page.locator('#notice')).toContainText('Sauvegarde rechargée');
  await expectWorld(page, eaten);
  expect(errors).toEqual([]);
});
