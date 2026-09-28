import { expect, test } from '@playwright/test';
import { observeErrors, panel, startPaused } from './helpers';

test('V149 : sons locaux décodés, réglages conservés et présentation Chromium', async ({ page }) => {
    const errors = observeErrors(page);
    await startPaused(page);
    await expect(page.locator('#fps-counter')).toBeVisible();
    const backend = await page.evaluate(() => window.__lisiere.backend);
    expect(['WebGL 2', 'WebGPU']).toContain(backend);
    test.info().annotations.push({ type: 'renderer-backend', description: backend });
    await expect.poll(() => page.evaluate(() => window.__lisiere.audio.availableSounds)).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => window.__lisiere.audio.loadedCount)).toBeGreaterThan(0);
    await panel(page, 'menu');
    const enabled = page.locator('#sound-enabled');
    const volume = page.locator('#sound-volume');
    await expect(enabled).toBeChecked();
    await enabled.uncheck();
    await volume.evaluate((input: HTMLInputElement) => {
      input.value = '42';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect.poll(() => page.evaluate(() => ({
      enabled: localStorage.getItem('lisiere.audio.effects.enabled.v1'),
      volume: localStorage.getItem('lisiere.audio.effects.volume.v1'),
    }))).toEqual({ enabled: 'false', volume: '0.42' });
    await page.goto('/');
    await page.getByRole('button', { name: 'Options' }).click();
    await expect(page.locator('.front-menu .front-texture-setting').filter({ hasText: 'Effets sonores' }).locator('input[type=checkbox]')).not.toBeChecked();
    await expect(page.locator('.front-volume-setting input[type=range]')).toHaveValue('42');
    expect(errors).toEqual([]);
});
