import { expect, test } from '@playwright/test';
import { observeErrors } from './helpers';

test('V165 : la musique longue démarre au geste et garde des réglages séparés des bruitages', async ({ page }) => {
  const errors = observeErrors(page);
  await page.addInitScript(() => {
    (window as any).__musicPlayed = [] as HTMLMediaElement[];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.src.includes('/assets/audio/music/')) (window as any).__musicPlayed.push(this);
      return play.call(this);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Options' }).click();
  await expect(page.locator('#front-music-enabled')).toBeChecked();
  await expect(page.locator('#front-music-volume')).toHaveValue('50');
  await expect.poll(() => page.evaluate(() => {
    const active = (window as any).__musicPlayed.at(-1) as HTMLMediaElement | undefined;
    return active?.currentTime ?? 0;
  }), { timeout: 20000 }).toBeGreaterThan(0.2);
  const initial = await page.evaluate(() => {
    const active = (window as any).__musicPlayed.at(-1) as HTMLMediaElement;
    return { src: active.src, duration: active.duration, volume: active.volume };
  });
  expect(initial.src).toContain('/assets/audio/music/');
  expect(initial.duration).toBeGreaterThan(180);
  expect(initial.volume).toBeGreaterThan(0);
  expect(initial.volume).toBeLessThan(0.5);
  await page.locator('#front-music-volume').evaluate((slider: HTMLInputElement) => {
    slider.value = '23';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('lisiere.audio.music.volume.v1'))).toBe('0.23');
  await page.locator('#front-music-enabled').uncheck();
  await expect.poll(() => page.evaluate(() => {
    const active = (window as any).__musicPlayed.at(-1) as HTMLMediaElement;
    return active.paused;
  })).toBe(true);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('lisiere.audio.music.enabled.v1'))).toBe('false');
  await page.reload();
  await page.getByRole('button', { name: 'Options' }).click();
  await expect(page.locator('#front-music-enabled')).not.toBeChecked();
  await expect(page.locator('#front-music-volume')).toHaveValue('23');
  expect(errors).toEqual([]);
});
