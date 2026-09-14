import { expect, test } from '@playwright/test';
import { createWorld, refreshStock, addGroundMaterial, serializeWorld, validateWorld } from '../../src/sim/index';
import { world, panel, tool, cell, saveKey, expectWorld, observeErrors } from './helpers';

test('chantier par interface : plan sur une pile, dégagement porté, cadre, sauvegarde et achèvement',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const fixture=createWorld(42,32,32);fixture.tick=2000;fixture.tiles=fixture.tiles.map(()=>({terrain:'grass'}));fixture.resources=[];fixture.piles=[];fixture.pawns=fixture.pawns.slice(0,1);
    Object.assign(fixture.pawns[0]!,{x:13,z:16,hunger:100,rest:100,priorities:{build:1,haul:0,gather:0,grow:0,cook:0}});fixture.pawns[0]!.schedule.fill('anything');
    addGroundMaterial(fixture,'wood',5,{x:12,z:16},'wood');addGroundMaterial(fixture,'food',23,{x:16,z:14},'rice');refreshStock(fixture);
    const old=JSON.parse(serializeWorld(fixture));old.schemaVersion=15;
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:JSON.stringify(old)});
    await page.goto('/?size=32&e2e');await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();
    await expect.poll(async()=>(await world(page)).schemaVersion).toBe(16);
    await tool(page,'wall');await cell(page,16,14);await page.keyboard.press('Escape');await cell(page,16,14);
    await expect(page.locator('#cell-job')).toContainText('Plan');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{
      if(!window.__lisiere.world.pawns.some(p=>p.haul?.destination.type==='aside'&&p.haul.phase==='deliver'))return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },undefined,{timeout:15000,polling:'raf'});
    await expect(page.locator('#pause-banner')).toBeVisible();const carried=await world(page);
    expect(carried.pawns[0]!.haul?.quantity).toBe(10);expect(validateWorld(carried)).toEqual([]);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,carried);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{
      if(!window.__lisiere.world.jobs.some(j=>j.construction==='frame'))return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },undefined,{timeout:18000,polling:'raf'});
    await expect(page.locator('#pause-banner')).toBeVisible();await cell(page,16,14);await expect(page.locator('#cell-job')).toContainText('Cadre');
    const frame=await world(page);expect(frame.jobs[0]!.escrow.wood).toBe(5);expect(validateWorld(frame)).toEqual([]);
    await page.screenshot({path:'artifacts/construction-frame.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,frame);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).structures.some(s=>s.kind==='wall'),{timeout:15000}).toBe(true);
    await page.locator('[data-speed="0"]').click();const final=await world(page);
    expect(final.jobs).toEqual([]);expect(final.stock.wood).toBe(0);expect(final.piles.filter(p=>p.item==='rice').reduce((n,p)=>n+p.quantity,0)).toBe(23);expect(validateWorld(final)).toEqual([]);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');expect(errors).toEqual([]);
    await testInfo.attach('construction',{contentType:'application/json',body:JSON.stringify({carriedTick:carried.tick,frameTick:frame.tick,finishedTick:final.tick,materialConserved:true,errors})});
  } finally {await browser.close();}
});
