import { test, expect, chromium } from '@playwright/test';
import { createWorld, deserializeWorld, serializeWorld } from '../../src/sim/index';
import { decodeStoredSave } from '../../src/ui/save-storage-codec';
import { expectWorld, panel, pause, saveKey, world } from './helpers';

test('storage open refusal leaves the startup error visible and historical saves intact', async ({ page }) => {
  const original = serializeWorld(createWorld(42, 32, 32));
  await page.addInitScript(({ key, original }) => {
    localStorage.setItem(key, original);
    Object.defineProperty(indexedDB, 'open', { value: () => { throw new Error('Storage access denied for control'); } });
  }, { key: saveKey, original });
  await page.goto('/?e2e');
  await expect(page.locator('.front-menu')).toBeVisible();
  await expect(page.locator('.front-error')).toBeVisible();
  await expect(page.locator('.front-error')).toContainText('La base de sauvegardes ne répond pas');
  await expect(page.locator('.front-error')).toContainText('Storage access denied for control');
  await expect(page.locator('.front-status')).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(original);
});

test('a stopped worker during accepted replacement preparation cannot reopen the game', async () => {
  test.setTimeout(90_000);
  const original = serializeWorld(createWorld(42, 32, 32));
  const browser = await chromium.launch({ channel: 'chromium', headless: true, args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173' });
  try {
    await page.addInitScript(({ key, original }) => localStorage.setItem(key, original), { key: saveKey, original });
    await page.goto('/?e2e'); await page.waitForFunction(() => !!window.__lisiere);
    const front = page.locator('.front-menu');
    await front.getByRole('button', { name: 'Charger une partie', exact: true }).click();
    await front.locator(`input[name="front-save"][value="${saveKey}"]`).check();
    // The first frame is the presentation boundary after authoritative adoption.
    // Hold it to exercise a transport stop during this otherwise narrow window.
    await page.evaluate(() => {
      const originalFrame = window.requestAnimationFrame;
      window.requestAnimationFrame = callback => {
        window.requestAnimationFrame = originalFrame;
        (window as unknown as { releasePreparation?: () => void }).releasePreparation = () => callback(performance.now());
        return 0;
      };
    });
    await front.getByRole('button', { name: 'Charger', exact: true }).click();
    await page.waitForFunction(() => !!(window as unknown as { releasePreparation?: () => void }).releasePreparation);
    expect(await page.evaluate(() => window.__lisiere.incident.simulationStopped)).toBe(false);
    await page.evaluate(() => {
      window.__lisiere.stopSimulation();
      (window as unknown as { releasePreparation: () => void }).releasePreparation();
    });
    await expect(front.locator('.front-error')).toContainText('pendant la préparation');
    await expect(front).toBeVisible();
    await expect(page.locator('#game-incident')).toBeVisible();
    expect(await page.evaluate(() => window.__lisiere.incident.simulationStopped)).toBe(true);
    await expect(front.getByRole('button', { name: 'Reprendre la colonie', exact: true })).toHaveCount(0);
    expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(original);
  } finally { await browser.close(); }
});

test('native IndexedDB migration, exact save/reload and real GPU loss recovery', async () => {
  test.setTimeout(150_000);
  const initial = createWorld(42, 32, 32), original = serializeWorld(initial);
  // Native hardware, independent of the suite's software compatibility launch.
  const browser = await chromium.launch({ channel: 'chromium', headless: true, args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const pageErrors: string[] = [], warnings: string[] = [], consoleErrors: string[] = [];
  let expectedLoss = false;
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
  page.on('console', message => { if (message.type() === 'error' && !(expectedLoss && /device.*(lost|destroyed)/i.test(message.text()))) consoleErrors.push(message.text()); });
  await page.addInitScript(({ key, original }) => {
    localStorage.setItem(key, original);
    localStorage.setItem('lisiere.audio.effects.enabled.v1', 'false');
    localStorage.setItem('lisiere.audio.music.enabled.v1', 'false');
    const warn = console.warn;
    (window as unknown as { shaderWarnings: string[] }).shaderWarnings = [];
    console.warn = (...args: unknown[]) => {
      if (String(args[0]).includes('THREE.TSL')) (window as unknown as { shaderWarnings: string[] }).shaderWarnings.push(new Error(String(args[0])).stack ?? '');
      warn(...args);
    };
  }, { key: saveKey, original });
  async function loadManual(): Promise<void> {
    const front = page.locator('.front-menu');
    await front.getByRole('button', { name: 'Charger une partie', exact: true }).click();
    await front.locator(`input[name="front-save"][value="${saveKey}"]`).check();
    await front.getByRole('button', { name: 'Charger', exact: true }).click();
  }
  try {
    await page.goto('/?e2e');
    await page.waitForFunction(() => !!window.__lisiere);
    expect(await page.evaluate(() => window.__lisiere.saveRepository.status.backend)).toBe('indexeddb');
    await loadManual(); await expectWorld(page, initial); await pause(page);
    expect(await page.evaluate(() => window.__lisiere.backend)).toBe('WebGPU');
    await page.locator('[data-speed="1"]').click();
    await expect.poll(() => page.evaluate(() => window.__lisiere.tick)).toBeGreaterThan(initial.tick + 3);
    await pause(page);
    const before = await world(page);
    await panel(page, 'menu'); await page.locator('#save').click();
    await expect.poll(async () => {
      const raw = await page.evaluate(key => window.__lisiere.saveRepository.getItem(key), saveKey);
      return raw ? deserializeWorld(await decodeStoredSave(raw)).tick : -1;
    }).toBe(before.tick);
    const stored = (await page.evaluate(key => window.__lisiere.saveRepository.getItem(key), saveKey))!;
    expect(deserializeWorld(await decodeStoredSave(stored))).toEqual(before);
    expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(original);
    await page.reload(); await page.waitForFunction(() => !!window.__lisiere);
    await loadManual(); await expectWorld(page, before); await pause(page);
    expectedLoss = true;
    expect(await page.evaluate(() => window.__lisiere.loseGraphicsDevice())).toBe(true);
    await expect(page.locator('#game-incident')).toBeVisible();
    await expect(page.locator('#retry-display')).toBeEnabled();
    await page.keyboard.press('1'); await page.keyboard.press('Space');
    expect(await world(page)).toEqual(before);
    await page.locator('#retry-display').dblclick();
    await expect(page.locator('#game-incident')).toBeHidden();
    expectedLoss = false;
    await expectWorld(page, before);
    expect(await page.evaluate(() => window.__lisiere.incident)).toEqual({ graphicsFault: false, simulationStopped: false, waiting: 0 });
    expect(await page.locator('#viewport canvas').count()).toBe(1);
    await page.screenshot({ path: test.info().outputPath('recovered-native.png') });
    await test.info().attach('native-consolidation', { contentType: 'application/json', body: JSON.stringify({
      backend: await page.evaluate(() => window.__lisiere.backend), tick: before.tick, warningCount: warnings.length, warnings: [...new Set(warnings)], consoleErrors,
      shaderWarningStacks: await page.evaluate(() => [...new Set((window as unknown as { shaderWarnings: string[] }).shaderWarnings)].slice(0, 16)),
    }, null, 2) });
    await panel(page, 'menu'); await page.locator('#return-home').click();
    await expect(page.locator('.front-menu').getByRole('button', { name: 'Reprendre la colonie', exact: true })).toBeVisible();
    await page.evaluate(() => window.__lisiere.stopSimulation());
    await expect(page.locator('.front-menu').getByRole('button', { name: 'Reprendre la colonie', exact: true })).toHaveCount(0);
    await expect(page.locator('#incident-colonies')).toBeEnabled();
    await page.locator('#incident-colonies').click(); await loadManual(); await expectWorld(page, before);
    expect(await page.evaluate(() => window.__lisiere.incident.simulationStopped)).toBe(false);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(warnings.filter(warning => warning.includes('THREE.TSL'))).toEqual([]);
  } finally { await browser.close(); }
});
