import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium, expect } = await import('@playwright/test');
await mkdir('artifacts', { recursive: true });
// Normal Chromium's new headless mode: no software adapter is forced by this probe.
// Device identity and observed backend remain the evidence; this is not a benchmark.
const browser = await chromium.launch({ headless: true, channel: 'chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
// Observe pose adoption through the real UI/worker pipeline, without mutating the renderer.
await page.route('**/src/main.ts*', async route => {
  const response = await route.fetch();
  const source = await response.text();
  const probe = `
const originalProbeSetWorld = ColonyRenderer.prototype.setWorld;
ColonyRenderer.prototype.setWorld = function(world, replaced) {
  const result = originalProbeSetWorld.call(this, world, replaced);
  window.__poseProbe = { replaced, tick: world.tick, poses: [...this.pawnVisuals].map(([id, pose]) => ({ id, from: pose.from.toArray(), to: pose.to.toArray() })) };
  return result;
};
`;
  await route.fulfill({ response, body: probe + source });
});
const errors = [];
const diagnostics = [];
const captures = [];
let observed = null;
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error' || /GPUValidationError|Error while parsing|invalid pipeline|device.*lost/i.test(message.text())) errors.push(message.text());
  if (message.text().includes('Lisière renderer diagnostics')) diagnostics.push(message.text());
});

async function panel(name) {
  if (!await page.locator(`#${name}-panel`).isVisible()) await page.locator(`[data-panel="${name}"]`).click();
  await expect(page.locator(`#${name}-panel`)).toBeVisible();
}
async function tool(name, category) {
  await panel('architect');
  await page.locator(`[data-category="${category}"]`).click();
  await page.locator(`[data-tool="${name}"]`).click();
}
async function cell(x, z) {
  const point = await page.evaluate(({ x, z }) => window.__lisiere.projectCell(x, z), { x, z });
  const bounds = await page.locator('#viewport canvas').boundingBox();
  if (!bounds) throw new Error('Canvas absent');
  await page.mouse.click(bounds.x + point.x, bounds.y + point.y);
}
async function capture(name) {
  const path = `artifacts/${name}.png`;
  // Let pointer/rotation changes reach a rendered frame before capturing the preview.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path });
  captures.push({ path, viewport: page.viewportSize(), tick: await page.evaluate(() => window.__lisiere.world.tick) });
}
const world = async () => JSON.parse(await page.evaluate(() => JSON.stringify(window.__lisiere.world)));

try {
  await page.goto('http://127.0.0.1:5173/?e2e&seed=42&size=250');
  await page.waitForFunction(() => !!window.__lisiere && !!window.__poseProbe, undefined, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('#pause-banner')).toBeVisible();
  observed = await page.evaluate(() => ({
    backend: window.__lisiere.backend, userAgent: navigator.userAgent,
    map: { seed: window.__lisiere.world.seed, width: window.__lisiere.world.width, height: window.__lisiere.world.height },
  }));
  if (observed.backend !== 'WebGPU') throw new Error(`This WebGPU probe observed ${observed.backend}; no WebGPU validation can be claimed.`);
  const center = await page.evaluate(() => ({ x: Math.floor(window.__lisiere.world.width / 2), z: Math.floor(window.__lisiere.world.height / 2) }));
  await capture('colony-idle');

  await tool('stockpile', 'zones');
  await page.locator('#stockpile-food').uncheck();
  await cell(center.x - 2, center.z + 2);
  await page.locator('#stockpile-wood').uncheck();
  await page.locator('#stockpile-food').check();
  await cell(center.x + 3, center.z + 2);
  await expect.poll(() => page.evaluate(() => window.__lisiere.world.stockpiles.length)).toBe(2);

  // Compile actual moving/working poses and both construction blueprints through real controls.
  await tool('chop', 'orders'); await cell(center.x - 2, center.z - 2);
  await tool('wall', 'structure'); await cell(center.x, center.z + 2);
  await tool('bed', 'furniture'); await cell(center.x + 1, center.z + 2);
  await expect.poll(() => page.evaluate(() => window.__lisiere.world.jobs.length)).toBe(3);
  await page.locator('#architect-panel [data-close-panel]').click();
  await page.getByRole('button', { name: 'Vitesse normale', exact: true }).click();
  await page.waitForFunction(() => {
    if (!window.__lisiere.world.pawns.some(pawn => pawn.haul?.phase === 'deliver')) return false;
    document.querySelector('[data-speed="0"]').click();
    return true;
  });
  await expect(page.locator('#pause-banner')).toBeVisible();
  observed.cargo = (await world()).piles.filter(pile => pile.owner.type === 'pawn');
  if (!observed.cargo.length) throw new Error('No cargo remained when authoritative pause was acknowledged.');
  await capture('colony-carrying');
  await page.getByRole('button', { name: 'Vitesse 6 fois', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__lisiere.world.jobs.length), { timeout: 20_000 }).toBe(0);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('#pause-banner')).toBeVisible();
  const built = await world();
  observed.constructionPausedAt = built.tick;
  expect(built.structures.map(item => item.kind).sort()).toEqual(['bed', 'wall']);
  expect(built.structures.find(item => item.kind === 'bed')?.footprint).toBe('standard');
  observed.materials = { piles: built.piles.length, stockpiles: built.stockpiles.length, stock: built.stock, bedFootprint: '1x2' };
  await capture('colony-proportions');

  await tool('bed', 'furniture');
  for (let orientation = 0; orientation < 4; orientation++) {
    await expect(page.locator('#placement-orientation')).toHaveText(`${orientation * 90}°`);
    const point = await page.evaluate(({ x, z }) => window.__lisiere.projectCell(x, z), { x: center.x, z: center.z - 1 });
    const bounds = await page.locator('#viewport canvas').boundingBox();
    await page.mouse.move(bounds.x + point.x, bounds.y + point.y);
    await capture(`colony-bed-preview-${orientation}`);
    await page.keyboard.press('e');
  }
  await page.keyboard.press('Escape');

  // Occlusion controls change presentation only, including around a completed blocking wall.
  await page.locator('#wall-cutaway').click();
  await expect(page.locator('#wall-cutaway')).toHaveAttribute('aria-pressed', 'true');
  await capture('colony-cutaway');
  const foliageBefore = await page.locator('#foliage-toggle').getAttribute('aria-pressed');
  await page.locator('#foliage-toggle').click();
  await expect(page.locator('#foliage-toggle')).not.toHaveAttribute('aria-pressed', foliageBefore);
  await capture('colony-foliage-hidden');
  const afterVisibility = await world();
  if (JSON.stringify(afterVisibility) !== JSON.stringify(built)) throw new Error(`Occlusion controls changed the paused simulation state (ticks ${built.tick} → ${afterVisibility.tick}).`);
  await page.locator('#wall-cutaway').click();
  await page.locator('#foliage-toggle').click();

  await page.setViewportSize({ width: 1280, height: 720 });
  await panel('work');
  const priority = page.getByLabel('Priorité construction Ada', { exact: true });
  await expect(priority).toBeVisible();
  await expect(page.getByLabel('Priorité transport Ada', { exact: true })).toBeVisible();
  const control = await priority.boundingBox();
  const management = await page.locator('#work-panel').boundingBox();
  const navigation = await page.locator('.main-tabs').boundingBox();
  if (!control || !management || !navigation || control.y + control.height > management.y + management.height || management.y + management.height > navigation.y + 1) {
    throw new Error('Work priorities must remain inside their panel and above the navigation.');
  }
  await capture('colony-work-panel');
  await page.locator('#work-panel [data-close-panel]').click();
  await page.locator('.colonist-bar [data-pawn]').first().click();
  await expect(page.locator('#inspector')).toBeVisible();
  await capture('colony-inspector');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await capture('colony-final');

  // Same terrain/IDs with a higher tick must snap poses, not interpolate from the old save.
  const restored = await world();
  const actor = restored.pawns.find(pawn => pawn.jobId === null && pawn.haul === null);
  if (!actor) throw new Error('No idle actor available for the save replacement fixture.');
  const target = [{ x: center.x, z: center.z - 1 }, { x: center.x - 1, z: center.z - 1 }, { x: center.x + 1, z: center.z - 1 }]
    .find(cell => !restored.pawns.some(pawn => pawn.x === cell.x && pawn.z === cell.z));
  if (!target) throw new Error('No clear replacement fixture cell.');
  Object.assign(actor, target, { path: [], state: 'idle' }); restored.tick += 100;
  await panel('menu'); await page.locator('#save').click();
  await expect(page.locator('#load')).toBeEnabled();
  await page.evaluate(data => localStorage.setItem('lisiere.save.v1', data), JSON.stringify(restored));
  await page.locator('#load').click();
  await expect.poll(async () => JSON.stringify(await world()) === JSON.stringify(restored)).toBe(true);
  const poses = await page.evaluate(() => window.__poseProbe);
  const pose = poses.poses.find(item => item.id === actor.id);
  expect(poses.replaced).toBe(true);
  expect(pose.from.slice(0, 3)).toEqual([target.x, 0, target.z]);
  expect(pose.to.slice(0, 3)).toEqual([target.x, 0, target.z]);
  observed.replacement = { sameTerrainAndIds: true, higherTick: restored.tick, pawnId: actor.id, from: pose.from, to: pose.to, replaced: poses.replaced };
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
} finally {
  const report = { timestamp: new Date().toISOString(), ...observed, diagnostics, captures, errors };
  await writeFile('artifacts/render-probe.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (errors.length) process.exitCode = 1;
  await browser.close();
}
