import { expect, test } from '@playwright/test';
import { pause } from './helpers';

test('les libellés Core adoptés et les dossiers humains restent lisibles sur une ligne', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?scenario=camp&e2e&size=32');
  await expect(page.locator('#loading')).toHaveCount(0);
  await pause(page);

  await expect(page.locator('[data-panel="schedule"]')).toHaveText('Planning');
  await expect(page.locator('[data-panel="assign"]')).toHaveText('Assignations');
  await page.locator('.colonist').first().click();
  await expect(page.getByRole('tab', { name: 'Matériel', exact: true })).toBeVisible();
  await expect(page.locator('[data-skill="intellectual"]')).toContainText('Intellectuel');
  await expect(page.locator('#inspector')).not.toContainText('Autres compétences et histoire personnelle à développer');
  await page.getByRole('tab', { name: 'Matériel', exact: true }).click();
  await expect(page.locator('#inspector')).not.toContainText('Inventaire personnel et tenues automatiques : à venir');

  for (const [width, height] of [[1366, 768], [1440, 1000], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const placement = await page.locator('.colonist-inspector-tabs').evaluate(host => {
      const bounds = host.getBoundingClientRect();
      const tabs = [...host.querySelectorAll('button')].map(button => button.getBoundingClientRect());
      return {
        rows: Math.max(...tabs.map(rect => rect.y)) - Math.min(...tabs.map(rect => rect.y)),
        within: tabs.every(rect => rect.left >= bounds.left && rect.right <= bounds.right),
        overlap: tabs.some((rect, index) => index > 0 && tabs[index - 1]!.right > rect.left),
        scroll: host.scrollWidth > host.clientWidth,
      };
    });
    expect(placement).toEqual({ rows: 0, within: true, overlap: false, scroll: false });
  }

  await page.locator('[data-panel="schedule"]').click();
  await expect(page.locator('#schedule-panel h2')).toHaveText('Planning');
  await expect(page.locator('[data-schedule-brush]')).toHaveText(['Temps libre', 'Travail', 'Dormir', 'Loisir']);
  await page.locator('[data-panel="assign"]').click();
  await expect(page.locator('#assign-panel h2')).toHaveText('Assignations');

  await page.locator('[data-panel="work"]').click();
  const columns = await page.locator('#work-panel [data-work-heading]').evaluateAll(headings => headings.map(heading => (heading as HTMLElement).dataset.workHeading));
  const controls = await page.locator('#work-rows tr').first().locator('[data-work]').evaluateAll(selects => selects.map(select => (select as HTMLElement).dataset.work));
  expect(controls).toEqual(columns);

  await page.locator('[data-panel="wildlife"]').click();
  await expect(page.locator('#wildlife-panel .fauna-table')).toBeVisible();
  await expect(page.locator('#wildlife-panel .fauna-combat')).toBeVisible();
  await page.locator('#wildlife-panel').screenshot({ path: 'artifacts/ui-faune-v118.png', animations: 'disabled' });
  await page.locator('[data-panel="research"]').click();
  await expect(page.locator('#research-panel .research-graph .research-node')).toHaveCount(11);
  await expect(page.locator('#research-panel .research-links path')).toHaveCount(6);
  await expect(page.locator('#research-panel .research-detail')).toBeVisible();
  await page.locator('#research-panel').screenshot({ path: 'artifacts/ui-recherche-v118.png', animations: 'disabled' });
});
