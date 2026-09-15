import { expect, type Page } from '@playwright/test';
import type { World } from '../../src/sim/types';

declare global {
  interface Window {
    __lisiere: { world: World; tick: number; backend: string; projectCell(x: number, z: number): { x: number; y: number } };
  }
}

// Transport one JSON string: tracing every tile as a remote object can dominate large maps.
export const serializedWorld = (page: Page): Promise<string> => page.evaluate(() => JSON.stringify(window.__lisiere.world));
export const world = async (page: Page): Promise<World> => JSON.parse(await serializedWorld(page)) as World;
export async function expectWorld(page: Page, expected: World) {
  const serialized = JSON.stringify(expected);
  // Exact comparison, with no expensive recursive matcher/tracing over thousands of tile objects.
  await expect.poll(async () => await serializedWorld(page) === serialized, {
    message: `État exact : graine ${expected.seed}, carte ${expected.width}×${expected.height}, tick ${expected.tick}, ${expected.jobs.length} ordre(s)`,
  }).toBe(true);
}
export const saveKey = 'lisiere.save.v1';

export function observeErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' || /GPUValidationError|Error while parsing|invalid pipeline/i.test(message.text())) errors.push(message.text());
  });
  return errors;
}

export async function panel(page: Page, name: 'architect' | 'work' | 'schedule' | 'assign' | 'menu') {
    // Snapshot adoption precedes GPU preparation and the closing of old panels.
    // Wait for the same interactive state a player needs, not just visibility.
    await expect(page.locator('.game-shell')).toHaveJSProperty('inert', false);
  if (!await page.locator(`#${name}-panel`).isVisible()) await page.locator(`[data-panel="${name}"]`).click();
  await expect(page.locator(`#${name}-panel`)).toBeVisible();
}

export async function tool(page: Page, name: 'mine' | 'haul-chunks' | 'uninstall' | 'deconstruct' | 'select' | 'chop' | 'harvest' | 'cut' | 'cancel' | 'wall' | 'bed' | 'table' | 'horseshoes' | 'stool' | 'campfire' | 'stockpile' | 'remove-stockpile' | 'growing' | 'remove-growing') {
  await panel(page, 'architect');
  const category = name === 'horseshoes' ? 'recreation' : name === 'campfire' ? 'temperature' : name === 'wall' ? 'structure' : name === 'bed' || name === 'table' || name === 'stool' ? 'furniture' : name === 'stockpile' || name === 'remove-stockpile' || name === 'growing' || name === 'remove-growing' ? 'zones' : 'orders';
  await page.locator(`[data-category="${category}"]`).click();
  await page.locator(`[data-tool="${name}"]`).click();
}

export async function cell(page: Page, x: number, z: number) {
  const point = await page.evaluate(({ x, z }) => window.__lisiere.projectCell(x, z), { x, z });
  const bounds = await page.locator('#viewport canvas').boundingBox();
  if (!bounds) throw new Error('Canvas absent');
  await page.mouse.click(bounds.x + point.x, bounds.y + point.y);
}
export async function dragRectangle(page: Page, from: { x: number; z: number }, to: { x: number; z: number }, release = true) {
  const points = await page.evaluate(({ from, to }) => [window.__lisiere.projectCell(from.x, from.z), window.__lisiere.projectCell(to.x, to.z)], { from, to });
  const bounds = await page.locator('#viewport canvas').boundingBox();
  if (!bounds) throw new Error('Canvas absent');
  expect(await page.evaluate(({ points, bounds }) => points.map(point => document.elementFromPoint(bounds.x + point.x, bounds.y + point.y)?.tagName), { points, bounds }), 'Les extrémités du tracé doivent être sur la carte visible, hors panneaux.').toEqual(['CANVAS', 'CANVAS']);
  await page.mouse.move(bounds.x + points[0].x, bounds.y + points[0].y); await page.mouse.down();
  await page.mouse.move(bounds.x + points[1].x, bounds.y + points[1].y, { steps: 6 });
  if (release) await page.mouse.up();
}

export async function startPaused(page: Page) {
  await page.goto('/?size=32&seed=42&e2e');
  await expect(page.locator('#loading')).toHaveCount(0);
  await expect(page.locator('#viewport canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('#pause-banner')).toBeVisible();
  expect((await world(page)).width).toBe(32);
}
