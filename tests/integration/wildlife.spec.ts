import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { observeErrors,panel,world,expectWorld,saveKey } from './helpers';
import { validateWorld } from '../../src/sim/index';

test('ordinary camp wildlife, GPU presentation, grazing and exact UI save/reload at 1x and 6x',async({playwright})=>{
  test.setTimeout(150000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  try {
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    await page.goto('/?scenario=camp&e2e&size=64');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    const initial=await world(page);expect(initial.wildlife?.animals.length).toBe(3);expect(validateWorld(initial)).toEqual([]);
    await panel(page,'wildlife');await expect(page.locator('[data-animal]')).toHaveCount(3);await expect(page.locator('[data-fauna-enable]')).toBeHidden();
    await page.locator('[data-animal] button').first().click();await page.locator('[data-speed="1"]').click();
    await expect.poll(async()=>(await world(page)).wildlife!.animals.some(a=>!!a.motion),{timeout:10000}).toBe(true);
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).wildlife!.eatenNutrition,{timeout:80000}).toBeGreaterThan(0);
    await page.locator('[data-speed="0"]').click();await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');const saved=await world(page);expect(validateWorld(saved)).toEqual([]);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();try{await expectWorld(page,saved);}catch(e){writeFileSync('artifacts/wildlife-ui-failure-v76.json',JSON.stringify({expected:saved,stored:JSON.parse(await page.evaluate(key=>localStorage.getItem(key)!,saveKey)),actual:await world(page)}));throw e;}
    await panel(page,'wildlife');await expect(page.locator('[data-animal]')).toHaveCount(3);await page.locator('[data-animal] button').first().click();
    await page.mouse.move(820,400);await page.mouse.wheel(0,-700);await page.waitForTimeout(500);
    await expect(page.locator('#fps-counter')).toBeVisible();await page.screenshot({path:'artifacts/wildlife-v76.png'});
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).tick).toBeGreaterThan(saved.tick+10);await page.locator('[data-speed="0"]').click();
    expect(errors).toEqual([]);writeFileSync('artifacts/wildlife-ui-v76.json',JSON.stringify({date:new Date().toISOString(),start:initial.tick,saved:saved.tick,end:(await world(page)).tick,population:3,eatenNutrition:saved.wildlife!.eatenNutrition,errors},null,2));
  } finally {await browser.close();}
});
