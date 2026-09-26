import { expect, test } from '@playwright/test';
import { observeErrors, panel, startPaused } from './helpers';

const preferenceKey = 'lisiere.presentation.ground-grass.v1';

test('le tapis d’herbe est un choix local synchronisé entre accueil et partie', async ({ page }) => {
  const errors = observeErrors(page);
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\nObject.defineProperty(window,'__grassLayerPresent',{get:()=>Boolean(renderer?.grass)});` });
  });
  const layerPresent = () => page.evaluate(() => Boolean((window as Window & { __grassLayerPresent?: boolean }).__grassLayerPresent));
  await page.goto('/');
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  const frontToggle = page.getByRole('checkbox', { name: 'Tapis d’herbe' });
  await expect(frontToggle).toBeChecked();
  await frontToggle.uncheck();
  expect(await page.evaluate(key => localStorage.getItem(key), preferenceKey)).toBe('false');

  await page.reload();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Tapis d’herbe' })).not.toBeChecked();

  await startPaused(page);
  await panel(page, 'menu');
  const gameToggle = page.locator('#ground-grass-enabled');
  await expect(gameToggle).not.toBeChecked();
  expect(await layerPresent()).toBe(false);
  const savedBefore = await page.evaluate(() => localStorage.getItem('lisiere.save.v1'));
  await gameToggle.check();
  await expect(gameToggle).toBeChecked();
  expect(await layerPresent()).toBe(true);
  expect(await page.evaluate(key => localStorage.getItem(key), preferenceKey)).toBe('true');
  expect(await page.evaluate(() => localStorage.getItem('lisiere.save.v1'))).toBe(savedBefore);
  await gameToggle.uncheck();
  expect(await layerPresent()).toBe(false);
  await gameToggle.check();
  expect(await layerPresent()).toBe(true);

  await page.locator('#browse-saves').click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Tapis d’herbe' })).toBeChecked();
  expect(errors).toEqual([]);
});
