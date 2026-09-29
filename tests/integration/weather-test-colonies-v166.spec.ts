import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { deserializeWorld } from '../../src/sim/index.ts';
import { expectWorld, observeErrors, panel } from './helpers.ts';

const slugs = [
  'clear', 'fog', 'rain', 'dry-thunderstorm', 'foggy-rain',
  'snow-gentle', 'snow-hard', 'rainy-thunderstorm',
] as const;

async function openCatalogue(page: Page): Promise<void> {
  const front = page.locator('.front-menu');
  if (await front.isHidden()) {
    await panel(page, 'menu');
    await page.locator('#browse-saves').click();
  } else await front.getByRole('button', { name: 'Charger une partie', exact: true }).click();
  await front.getByRole('button', { name: 'Colonies de test' }).click();
}

test('V166 : the eight weather scenes appear in Colonies de test and load from that menu', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = observeErrors(page);
  await page.goto('/?e2e');
  await openCatalogue(page);
  const front = page.locator('.front-menu');
  for (const slug of slugs)
    await expect(front.locator(`input[name="test-colony"][value="weather-${slug}-v166"]`)).toHaveCount(1);
  for (const slug of ['rain', 'snow-hard'] as const) {
    await front.locator(`input[name="test-colony"][value="weather-${slug}-v166"]`).check();
    await front.getByRole('button', { name: 'Charger cette colonie' }).click();
    const expected = deserializeWorld(readFileSync(`public/test-saves/v166/${slug}-prepared.json`, 'utf8'));
    await expectWorld(page, expected);
    await expect(page.locator('#pause-banner')).toBeVisible();
    if (slug === 'rain') await openCatalogue(page);
  }
  expect(errors).toEqual([]);
});
