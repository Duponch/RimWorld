import { expect, test } from '@playwright/test';
import { observeErrors, panel, startPaused } from './helpers';

const preferenceKey = 'lisiere.presentation.textures.v1';

test('les textures 3D restent synchronisées entre accueil, jeu et rechargement', async ({ page }) => {
  const errors = observeErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  const frontToggle = page.getByRole('checkbox', { name: 'Textures 3D stylisées' });
  await expect(frontToggle).toBeChecked();
  await frontToggle.focus();
  await page.keyboard.press('Space');
  await expect(frontToggle).not.toBeChecked();
  expect(await page.evaluate(key => localStorage.getItem(key), preferenceKey)).toBe('false');

  await page.reload();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Textures 3D stylisées' })).not.toBeChecked();

  await startPaused(page);
  await panel(page, 'menu');
  const gameToggle = page.locator('#textures-enabled');
  await expect(gameToggle).not.toBeChecked();
  const savedBefore = await page.evaluate(() => localStorage.getItem('lisiere.save.v1'));
  await gameToggle.focus();
  await page.keyboard.press('Space');
  await expect(gameToggle).toBeChecked();
  expect(await page.evaluate(key => localStorage.getItem(key), preferenceKey)).toBe('true');
  expect(await page.evaluate(() => localStorage.getItem('lisiere.save.v1'))).toBe(savedBefore);

  await page.locator('#browse-saves').click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Textures 3D stylisées' })).toBeChecked();
  expect(errors).toEqual([]);
});
