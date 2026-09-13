import { test, expect } from '@playwright/test';
import { createWorld, serializeWorld, validateWorld } from '../../src/sim/index';
import { refreshStock } from '../../src/sim/materials';
import { observeErrors, world, panel, tool, cell, dragRectangle, expectWorld, saveKey } from './helpers';

test('culture par interface : champ, semis GPU, inspection, politiques, maturité et sauvegarde', async ({playwright}, testInfo) => {
  test.setTimeout(60000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);
  try {
    const initial=createWorld(42,32,32);
    initial.resources=[]; initial.tiles=initial.tiles.map(()=>({terrain:'grass'}));
    initial.pawns.forEach(p=>{p.hunger=100;p.rest=100;});refreshStock(initial);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?size=32&seed=42&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();
    await expectWorld(page,initial);
    await tool(page,'growing');await dragRectangle(page,{x:18,z:16},{x:20,z:17});
    await expect.poll(async()=>(await world(page)).growingZones[0]?.cells.length).toBe(6);
    await panel(page,'work');await expect(page.locator('[data-work="grow"]')).toHaveCount(3);
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).resources.filter(r=>r.kind==='rice').length,{timeout:15000}).toBe(6);
    await page.locator('[data-speed="0"]').click();await cell(page,18,16);
    await expect(page.locator('#cell-title')).toHaveText('Plant de riz');
    await expect(page.locator('#cell-description')).toContainText('Croissance');
    await page.locator('#growing-allowSow').uncheck();await page.locator('#growing-allowCut').uncheck();
    await page.getByRole('button',{name:'Appliquer les réglages de culture'}).click();
    await expect.poll(async()=>(await world(page)).growingZones[0]?.allowSow).toBe(false);
    const saved=await world(page);expect(validateWorld(saved)).toEqual([]);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,saved);
    // Only this boundary fixture advances maturity; the separate human journey never does.
    const ripe=structuredClone(saved);for(const crop of ripe.resources){crop.growth=1;crop.growthTick=ripe.tick;}
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(ripe)});
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,ripe);
    await page.screenshot({path:'artifacts/farming-ripe.png'});
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).resources.length,{timeout:15000}).toBe(0);
    await page.locator('[data-speed="0"]').click();
    const harvested=await world(page);expect(harvested.piles.filter(p=>p.item==='rice').reduce((n,p)=>n+p.quantity,0)).toBe(36);
    expect(harvested.growingZones[0]).toMatchObject({allowSow:false,allowCut:false});expect(validateWorld(harvested)).toEqual([]);
    await expect(page.locator('#fps-counter')).toBeVisible();
    await testInfo.attach('farming-state',{body:JSON.stringify({tick:harvested.tick,crops:harvested.resources.length,rice:36,errors}),contentType:'application/json'});
    expect(errors).toEqual([]);
  } finally {await browser.close();}
});
