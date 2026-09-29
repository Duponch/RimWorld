import { expect, test } from '@playwright/test';
import { observeErrors, panel, startPaused } from './helpers';
import { applyCommand, serializeWorld, validateWorld } from '../../src/sim/index';
import { miningCamp } from '../scenarios/mining';
import { expectWorld, saveKey } from './helpers';

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

test('V149 : un vrai contact de minage démarre un MP3 décodé après le geste utilisateur', async ({ page }) => {
    const errors = observeErrors(page);
    const initial = miningCamp(1);
    const pawn = initial.pawns[0]!;
    const target = { x: pawn.x + 1, z: pawn.z };
    initial.tiles[target.z * initial.width + target.x] = { terrain: 'rock', stone: 'granite' };
    expect(applyCommand(initial, { type: 'designate', kind: 'mine', ...target }).ok).toBe(true);
    expect(validateWorld(initial)).toEqual([]);
    await page.addInitScript(({ key, saved }) => {
      localStorage.setItem(key, saved);
      (window as any).__audioProbe = { starts: [] as { state: string; duration: number; loop: boolean }[] };
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args) {
        (window as any).__audioProbe.context = this.context;
        (window as any).__audioProbe.starts.push({ state: this.context.state, duration: this.buffer?.duration ?? 0, loop: this.loop });
        return start.apply(this, args);
      };
    }, { key: saveKey, saved: serializeWorld(initial) });
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();
    await panel(page, 'menu');
    await page.locator('#load').click();
    await expectWorld(page, initial);
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => window.__lisiere.audio.availableSounds)).toBe(7);
    await expect(page.locator('#sound-enabled')).toBeChecked();
    await expect(page.locator('#sound-volume')).toHaveValue('75');
    await page.locator('[data-speed="6"]').click();
    await expect.poll(() => page.evaluate(() => (window as any).__audioProbe.starts
      .filter((source: { state: string; duration: number; loop: boolean }) => !source.loop && source.duration > 0.5)))
      .toContainEqual(expect.objectContaining({ state: 'running', loop: false }));
    await page.evaluate(() => (window as any).__audioProbe.context.suspend());
    expect(await page.evaluate(() => (window as any).__audioProbe.context.state)).toBe('suspended');
    await page.locator('[data-speed="6"]').click();
    await expect.poll(() => page.evaluate(() => (window as any).__audioProbe.context.state)).toBe('running');
    expect(errors).toEqual([]);
});
