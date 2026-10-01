import { expect, test, type Page } from '@playwright/test';
import { createScenarioWorld } from '../../src/sim/new-game';
import { serializeWorld, validateWorld } from '../../src/sim/serialization';
import { testOutputPath } from '../test-output';
import { cell, expectWorld, observeErrors, panel, pause, saveKey, settledCells, tool } from './helpers';

const target = { x: 127, z: 143 };

type Framing = {
  canvas: { x: number; y: number; width: number; height: number };
  point: { x: number; y: number };
  desired: { x: number; y: number };
  pixelsPerCell: number;
  clear: boolean;
};

/** Read the public QA projection; camera movement itself uses only player gestures. */
async function framing(page: Page): Promise<Framing> {
  return page.evaluate(({ x, z }) => {
    const canvas = document.querySelector<HTMLCanvasElement>('#viewport canvas');
    if (!canvas) throw new Error('Canvas absent');
    const bounds = canvas.getBoundingClientRect();
    const center = window.__lisiere.projectCell(x, z);
    const east = window.__lisiere.projectCell(x + 1, z);
    const south = window.__lisiere.projectCell(x, z + 1);
    const point = { x: bounds.x + center.x, y: bounds.y + center.y };
    return {
      canvas: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
      point,
      desired: { x: bounds.x + bounds.width * .52, y: bounds.y + bounds.height * .47 },
      pixelsPerCell: Math.max(Math.hypot(east.x - center.x, east.y - center.y), Math.hypot(south.x - center.x, south.y - center.y)),
      clear: document.elementFromPoint(point.x, point.y) === canvas,
    };
  }, target);
}

/** Pan and zoom as a player would; stop the gesture search after 20 seconds. */
async function focusPlant(page: Page): Promise<Framing> {
  const deadline = Date.now() + 20_000;
  let view = await framing(page);
  for (let attempt = 0; attempt < 14 && Date.now() < deadline; attempt++) {
    await settledCells(page, [target]);
    view = await framing(page);
    const dx = view.desired.x - view.point.x;
    const dy = view.desired.y - view.point.y;
    if (Math.hypot(dx, dy) < 25 && view.pixelsPerCell >= 85 && view.clear) return view;
    if (Math.hypot(dx, dy) >= 25 || !view.clear) {
      const anchor = view.desired;
      await page.mouse.move(anchor.x, anchor.y);
      await page.mouse.down({ button: 'middle' });
      await page.mouse.move(anchor.x + Math.max(-280, Math.min(280, dx)), anchor.y + Math.max(-180, Math.min(180, dy)), { steps: 8 });
      await page.mouse.up({ button: 'middle' });
    } else {
      await page.mouse.move(view.point.x, view.point.y);
      await page.mouse.wheel(0, -450);
    }
  }
  await settledCells(page, [target]);
  view = await framing(page);
  expect(view, 'The wild healroot must be centered and large enough to inspect after real camera gestures.').toMatchObject({ clear: true });
  expect(Math.hypot(view.desired.x - view.point.x, view.desired.y - view.point.y)).toBeLessThan(35);
  expect(view.pixelsPerCell).toBeGreaterThanOrEqual(85);
  return view;
}

async function capture(page: Page, name: string, view: Framing): Promise<void> {
  const full = await page.screenshot({ path: testOutputPath(`artifacts/healroot-v178-${name}-hd.png`) });
  await test.info().attach(`healroot-${name}-hd`, { body: full, contentType: 'image/png' });
  const size = 500;
  const detail = await page.screenshot({ clip: {
    x: Math.max(0, Math.min(1920 - size, Math.round(view.point.x - size / 2))),
    y: Math.max(0, Math.min(1200 - size, Math.round(view.point.y - size / 2))),
    width: size,
    height: size,
  }, path: testOutputPath(`artifacts/healroot-v178-${name}-detail.png`) });
  await test.info().attach(`healroot-${name}-detail`, { body: detail, contentType: 'image/png' });
}

test('V178: naturally generated healroot has a legible selected model in iso and perspective', async ({ playwright }) => {
  test.setTimeout(120_000);
  const initial = createScenarioWorld(42, 250, 'crashlanded', { hilliness: 'small-hills', biome: 'boreal-forest' });
  const plant = initial.resources.find(resource => resource.species === 'healroot-wild' && resource.x === target.x && resource.z === target.z);
  expect(plant?.growth).toBe(1);
  expect(validateWorld(initial)).toEqual([]);
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1920, height: 1200 }, deviceScaleFactor: 1 });
  const errors = observeErrors(page);
  try {
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: saveKey, value: serializeWorld(initial) });
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);
    await panel(page, 'menu');
    await page.locator('#load').click();
    await expectWorld(page, initial);
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => window.__lisiere.backend)).toBe('WebGPU');
    await expect(page.locator('#camera-mode')).toHaveAttribute('aria-pressed', 'false');
    // This natural seed has a foreground birch. Use the player's canopy toggle
    // to inspect the low plant instead of moving or deleting the generated tree.
    await page.getByRole('button',{name:'Feuillage',exact:true}).click();

    let view = await focusPlant(page);
    await tool(page, 'select');
    await cell(page, target.x, target.z);
    await expect(page.locator('#cell-title')).toHaveText('Racine de guérison sauvage');
    await expect(page.locator('#cell-description')).toContainText(/Croissance\s*:\s*100 %/);
    view = await framing(page);
    await capture(page, 'iso', view);

    await page.locator('#camera-mode').click();
    await expect(page.locator('#camera-mode')).toHaveAttribute('aria-pressed', 'true');
    view = await focusPlant(page);
    await expect(page.locator('#cell-title')).toHaveText('Racine de guérison sauvage');
    await capture(page, 'perspective', view);
    await expectWorld(page, initial);
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});
