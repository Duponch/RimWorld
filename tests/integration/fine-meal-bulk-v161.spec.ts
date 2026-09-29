import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { countedProducts, billWanted } from '../../src/sim/cooking-bills.ts';
import { deserializeWorld, validateWorld } from '../../src/sim/serialization.ts';
import type { World } from '../../src/sim/types.ts';
import { cell, expectWorld, observeErrors, panel, pause, saveKey, world } from './helpers.ts';
import { editBill, revealCells } from './player-actions.ts';

test('V161 prepared fine meal x4 cooks 20 protein and 20 vegetables into 4 through UI and worker', async ({ page }) => {
  test.setTimeout(180000);
  // Only the stove, two raw piles and a destination are prepared. The bill,
  // collection, work and four portions must be produced by the real worker.
  const legacy = JSON.parse(readFileSync(new URL('../../public/test-saves/v152/repas-fin.json', import.meta.url), 'utf8')) as World;
  expect(legacy.schemaVersion).toBe(152);
  for (const pile of legacy.piles) if (pile.item === 'milk' || pile.item === 'rice') pile.quantity = 20;
  legacy.stock.food = 40;
  legacy.pawns[1]!.hunger = 100;
  const destination = { id: legacy.nextId++, x: 12, z: 8, filters: { wood: false, food: true }, priority: 1, capacity: 75 };
  legacy.stockpiles.push(destination);
  const migrated = deserializeWorld(JSON.stringify(legacy));
  migrated.schemaVersion = 160 as World['schemaVersion'];
  const raw = JSON.stringify(migrated);
  const prepared = deserializeWorld(raw), cook = prepared.pawns[0]!;
  expect(JSON.parse(raw).schemaVersion).toBe(160);
  const stove = prepared.structures.find(s => s.kind === 'fueled-stove')!;
  expect(validateWorld(prepared)).toEqual([]);
  expect(prepared.piles.filter(p => p.item === 'milk' || p.item === 'rice').map(p => [p.item, p.quantity])).toEqual([['milk', 20], ['rice', 20]]);
  expect(prepared.piles.some(p => p.item === 'fine-meal')).toBe(false);
  expect(stove.bills).toEqual([]);
  expect(stove.fuel!.ticks).toBeGreaterThan(0);
  expect(cook.skills.cooking!.level).toBeGreaterThanOrEqual(6);

  const errors = observeErrors(page);
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), { key: saveKey, data: raw });
  await page.goto('/?scenario=camp&size=32&e2e');
  await expect(page.locator('#loading')).toHaveCount(0);
  await pause(page);
  await panel(page, 'menu'); await page.locator('#load').click();
  await expect(page.locator('#notice')).toContainText('Sauvegarde rechargée');
  await expectWorld(page, prepared);

  await page.keyboard.press('Escape'); await revealCells(page, [stove]); await cell(page, stove.x, stove.z);
  const add = page.locator('[data-add-recipe="cook-fine-meal-bulk"]');
  await expect(add).toBeEnabled();
  await expect(add).toContainText('raffinés x4');
  await expect(add).toHaveAttribute('title', /20 protéines \(viande ou lait\) \+ 20 végétaux · 4 plats raffinés · Cuisine 6/);
  await add.click();
  await expect.poll(async () => (await world(page)).structures.find(s => s.id === stove.id)?.bills?.length).toBe(1);
  const bill = (await world(page)).structures.find(s => s.id === stove.id)!.bills![0]!;
  expect(bill.recipe).toBe('cook-fine-meal-bulk');
  await expect(page.locator(`[data-bill="${bill.id}"] .bill-cost`)).toContainText('20 protéines (viande ou lait) + 20 végétaux → 4 plats raffinés · Cuisine 6');
  await editBill(page, bill.id, { ...bill, mode: 'until', target: 3, filters: { ...bill.filters, milk: true, rice: true }, destination: 'stockpile' });
  await expect.poll(async () => (await world(page)).structures.find(s => s.id === stove.id)?.bills?.[0]?.mode).toBe('until');
  await expect(page.locator(`[data-bill="${bill.id}"] [data-field="milk"]`)).toBeChecked();
  await expect(page.locator(`[data-bill="${bill.id}"] [data-field="rice"]`)).toBeChecked();
  await panel(page, 'work');
  await page.locator(`select[data-owner="${cook.id}"][data-work="cook"]`).selectOption('1');
  await page.keyboard.press('Escape'); await page.locator('[data-speed="6"]').click();

  await page.waitForFunction(id => {
    const task = window.__lisiere.world.pawns.find(p => p.id === id)?.cooking;
    if (task?.recipe !== 'cook-fine-meal-bulk' || task.phase !== 'work' || task.progress < 10) return false;
    (document.querySelector('[data-speed="0"]') as HTMLButtonElement).click(); return true;
  }, cook.id, { polling: 50, timeout: 60000 });
  await expect(page.locator('#pause-banner')).toBeVisible();
  const working = await world(page), task = working.pawns.find(p => p.id === cook.id)!.cooking!;
  expect(task.ingredients.reduce((sum, ingredient) => sum + ingredient.quantity, 0)).toBe(40);
  expect(task.ingredients.filter(ingredient => ingredient.item === 'milk').reduce((sum, ingredient) => sum + ingredient.quantity, 0)).toBe(20);
  expect(task.ingredients.filter(ingredient => ingredient.item === 'rice').reduce((sum, ingredient) => sum + ingredient.quantity, 0)).toBe(20);
  expect(task.ingredients.every(ingredient => ingredient.stage === 'placed')).toBe(true);
  expect(working.piles.some(p => p.item === 'fine-meal')).toBe(false);
  expect(validateWorld(working)).toEqual([]);
  await panel(page, 'menu'); await page.locator('#save').click();
  await expect(page.locator('#notice')).toContainText('Colonie sauvegardée');
  await page.locator('#load').click();
  await expect(page.locator('#notice')).toContainText('Sauvegarde rechargée');
  await expectWorld(page, working);

  await page.keyboard.press('Escape'); await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(({ id, x, z }) => {
    const current = window.__lisiere.world;
    if (current.pawns.find(p => p.id === id)?.cooking) return false;
    const stored = current.piles.filter(p => p.item === 'fine-meal' && p.owner.type === 'ground' && p.owner.x === x && p.owner.z === z)
      .reduce((sum, pile) => sum + pile.quantity, 0);
    if (stored !== 4) return false;
    (document.querySelector('[data-speed="0"]') as HTMLButtonElement).click(); return true;
  }, { id: cook.id, x: destination.x, z: destination.z }, { polling: 50, timeout: 60000 });
  await expect(page.locator('#pause-banner')).toBeVisible();
  const cooked = await world(page), cookedBill = cooked.structures.find(s => s.id === stove.id)!.bills![0]!;
  expect(cooked.piles.filter(p => p.item === 'fine-meal').reduce((sum, pile) => sum + pile.quantity, 0)).toBe(4);
  expect(cooked.piles.filter(p => p.item === 'milk' || p.item === 'rice').reduce((sum, pile) => sum + pile.quantity, 0)).toBe(0);
  expect(cooked.structures.find(s => s.id === stove.id)!.fuel!.burned).toBeGreaterThan(0);
  expect(cookedBill.mode).toBe('until');
  expect(cookedBill.target).toBe(3);
  expect(countedProducts(cooked, cookedBill)).toBe(4);
  expect(billWanted(cooked, cookedBill)).toBe(false);
  expect(validateWorld(cooked)).toEqual([]);
  await page.keyboard.press('Escape'); await revealCells(page, [stove]); await cell(page, stove.x, stove.z);
  await expect(page.locator(`[data-bill="${bill.id}"] [data-bill-status]`)).toContainText('4 / 3');
  await expect(page.locator('#food-items [data-item="fine-meal"]')).toContainText('Plat raffiné');
  expect(errors).toEqual([]);
});
