import { testOutputPath } from '../test-output.ts';
import {test,expect} from '@playwright/test';
import {observeErrors} from './helpers';

test('HUD droit et conseils ouvrent seulement des panneaux existants',async({playwright})=>{
  test.setTimeout(60_000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.goto('/?scenario=camp&size=32&seed=130&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();
    await expect(page.locator('#status-alerts p').first()).toBeVisible();
    await expect(page.locator('#alerts .legacy-event-controls')).toHaveCount(0);
    await expect(page.locator('.site-readout #clock')).toBeVisible();
    const fps=await page.locator('#fps-counter').boundingBox();
    const help=await page.locator('.learning-readout>summary').boundingBox();
    expect(fps&&help&&help.y>=fps.y+fps.height).toBeTruthy();
    await page.locator('.learning-readout>summary').click();
    await page.locator('.learning-concepts details').first().locator('summary').click();
    await page.locator('[data-guide-panel="schedule"]').click();
    await expect(page.locator('#schedule-panel')).toBeVisible();
    await expect(page.locator('.learning-readout')).not.toHaveAttribute('open');
    await page.screenshot({path:testOutputPath('artifacts/object-hud-v130.png')});
    expect(errors).toEqual([]);
  }finally{await browser.close();}
});
