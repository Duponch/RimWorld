import { expect, test, type Locator } from '@playwright/test';
import { observeErrors, panel, startPaused } from './helpers';

const preferenceKey = 'lisiere.presentation.lighting.v1';
const setRange = (slider: Locator, percent: number) => slider.evaluate((node, value) => {
  (node as HTMLInputElement).value = String(value); node.dispatchEvent(new Event('input', { bubbles: true }));
}, percent);

test('soleil, lune et ambiance se synchronisent entre accueil, renderer et partie avec retour aux défauts', async ({ page }) => {
  const errors = observeErrors(page);
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\nObject.defineProperty(window,'__lightingSettingsV324',{value:()=>({presentation:{...lightingSettings},renderer:renderer?{...renderer.lightingSettings}:null})});` });
  });
  await page.goto('/'); await page.getByRole('button', { name: 'Options', exact: true }).click();
  for (const key of ['sun', 'moon', 'ambient']) {
    const slider = page.locator(`#front-lighting-${key}`);
    await expect(slider).toHaveValue('100'); await expect(slider).toHaveAttribute('min', '0');
    await expect(slider).toHaveAttribute('max', '300'); await expect(slider).toHaveAttribute('step', '5');
  }
  await page.locator('#front-lighting-sun').focus(); await page.keyboard.press('ArrowRight');
  await expect(page.locator('#front-lighting-sun-value')).toHaveText('105 %');
  await setRange(page.locator('#front-lighting-sun'), 75);
  await setRange(page.locator('#front-lighting-moon'), 150);
  await setRange(page.locator('#front-lighting-ambient'), 125);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), preferenceKey)).toEqual({ sun: .75, moon: 1.5, ambient: 1.25 });
  await page.reload(); await page.getByRole('button', { name: 'Options', exact: true }).click();
  await expect(page.locator('#front-lighting-sun')).toHaveValue('75');
  await expect(page.locator('#front-lighting-moon')).toHaveValue('150');
  await expect(page.locator('#front-lighting-ambient')).toHaveValue('125');

  await startPaused(page); await panel(page, 'menu');
  const read = () => page.evaluate(() => (window as any).__lightingSettingsV324());
  expect(await read()).toEqual({ presentation: { sun: .75, moon: 1.5, ambient: 1.25 }, renderer: { sun: .75, moon: 1.5, ambient: 1.25 } });
  const savedBefore = await page.evaluate(() => window.__lisiere.saveRepository.peekItem('lisiere.save.v1'));
  await setRange(page.locator('#lighting-moon'), 0);
  await expect(page.locator('#lighting-moon-value')).toHaveText('0 %');
  expect(await read()).toEqual({ presentation: { sun: .75, moon: 0, ambient: 1.25 }, renderer: { sun: .75, moon: 0, ambient: 1.25 } });
  await page.locator('#browse-saves').click(); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await expect(page.locator('#front-lighting-moon')).toHaveValue('0');
  await page.locator('#front-lighting-reset').click();
  for (const key of ['sun', 'moon', 'ambient']) {
    await expect(page.locator(`#front-lighting-${key}`)).toHaveValue('100');
    await expect(page.locator(`#lighting-${key}`)).toHaveValue('100');
  }
  expect(await read()).toEqual({ presentation: { sun: 1, moon: 1, ambient: 1 }, renderer: { sun: 1, moon: 1, ambient: 1 } });
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), preferenceKey)).toEqual({ sun: 1, moon: 1, ambient: 1 });
  expect(await page.evaluate(() => window.__lisiere.saveRepository.peekItem('lisiere.save.v1'))).toBe(savedBefore);
  expect(errors).toEqual([]);
});

test('le refus de stockage conserve le réglage courant et affiche une erreur explicite', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) { if (name === key) throw Error('Storage unavailable'); return original.call(this, name, value); };
    (window as any).__restoreLightingStorage = () => { Storage.prototype.setItem = original; };
  }, preferenceKey);
  try {
    await setRange(page.locator('#front-lighting-ambient'), 300);
    await expect(page.locator('#front-lighting-ambient-value')).toHaveText('300 %');
    await expect(page.locator('#lighting-ambient')).toHaveValue('300');
    await expect(page.locator('.front-error')).toContainText('ne peut pas le conserver');
    await page.locator('#front-lighting-reset').click();
    await expect(page.locator('#front-lighting-ambient')).toHaveValue('100');
  } finally { await page.evaluate(() => (window as any).__restoreLightingStorage()); }
});
