import { test,expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { createWorld,serializeWorld,validateWorld } from '../../src/sim/index';
import { refreshStock } from '../../src/sim/materials';
import { observeErrors,world,panel,tool,cell,dragRectangle,expectWorld,saveKey } from './helpers';

test('cotton UI 1×/6×: crop choice, sowing, cloth filter, physical harvest/cargo/storage and save/load',async({playwright})=>{
  test.setTimeout(100000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]}),proof=[];
  try{for(const speed of [1,6]){
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    const initial=createWorld(42,32,32);initial.resources=[];initial.piles=[];initial.tiles=initial.tiles.map(()=>({terrain:'grass'}));initial.pawns.forEach(p=>{p.hunger=100;p.rest=100;p.priorities.grow=1;p.priorities.haul=2;});refreshStock(initial);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
    await tool(page,'growing');await dragRectangle(page,{x:18,z:16},{x:20,z:17});await tool(page,'select');await cell(page,18,16);
    await page.locator('#growing-plant').selectOption('cotton');await page.getByRole('button',{name:'Appliquer les réglages de culture'}).click();
    await expect.poll(async()=>(await world(page)).growingZones[0]?.plant).toBe('cotton');
    await tool(page,'stockpile');await page.locator('#stockpile-wood').uncheck();await page.locator('#stockpile-food').uncheck();await page.locator('#stockpile-textile').check();await cell(page,23,16);await tool(page,'select');
    await page.locator(`[data-speed="${speed}"]`).click();
    await page.waitForFunction(()=>{if(window.__lisiere.world.resources.filter(r=>r.kind==='cotton').length!==6)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},undefined,{timeout:30000});
    await cell(page,18,16);await expect(page.locator('#cell-title')).toHaveText('Cotonnier');await expect(page.locator('#cell-description')).toContainText('Croissance');
    await page.locator('#growing-allowSow').uncheck();await page.locator('#growing-allowCut').uncheck();await page.getByRole('button',{name:'Appliquer les réglages de culture'}).click();
    await expect.poll(async()=>(await world(page)).growingZones[0]?.allowSow).toBe(false);
    const saved=await world(page);await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,saved);
    // Maturity is a presentation boundary fixture. The core scenario grows for 18+ real simulated days.
    const mature=structuredClone(saved);for(const r of mature.resources){r.growth=1;r.growthTick=mature.tick;}
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(mature)});await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,mature);await page.keyboard.press('Escape');
    await cell(page,18,16);await expect(page.locator('#cell-description')).toContainText('10 tissu');await page.screenshot({path:`artifacts/cotton-v71-${speed}x.png`});
    await page.locator(`[data-speed="${speed}"]`).click();
    await page.waitForFunction(()=>{if(!window.__lisiere.world.piles.some(p=>p.item==='cloth'&&p.owner.type==='pawn'))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},undefined,{timeout:15000});
    const carried=await world(page);expect(validateWorld(carried)).toEqual([]);await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,carried);await page.keyboard.press('Escape');
    await page.locator(`[data-speed="${speed}"]`).click();
    await page.waitForFunction(()=>{const w=window.__lisiere.world;if(w.resources.length||!w.piles.some(p=>p.item==='cloth'&&p.quantity===60&&p.owner.type==='ground'&&p.owner.x===23&&p.owner.z===16))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},undefined,{timeout:20000});
    const end=await world(page);expect(validateWorld(end)).toEqual([]);expect(end.stock.food).toBe(0);await expect(page.locator('#cloth')).toHaveText('60');await expect(page.locator('#fps-counter')).toBeVisible();
    await cell(page,23,16);await expect(page.locator('#cell-materials')).toContainText('Tissu');await expect(page.locator('#selected-stockpile-textile')).toBeChecked();
    await page.screenshot({path:`artifacts/cloth-v71-${speed}x.png`});expect(errors).toEqual([]);proof.push({speed,sownAt:saved.tick,cargoAt:carried.tick,storedAt:end.tick,cloth:60,errors});await page.close();
  }}finally{await browser.close();}writeFileSync('artifacts/textile-ui-v71.json',JSON.stringify({date:new Date().toISOString(),maturity:'UI boundary fixture; natural growth separately tested',proof},null,2));
});
