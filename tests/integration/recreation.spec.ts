import { expect, test } from '@playwright/test';
import { createWorld, refreshStock, addGroundMaterial, serializeWorld, validateWorld } from '../../src/sim/index';
import { world, panel, tool, cell, saveKey, expectWorld, observeErrors } from './helpers';

test('loisirs par interface : migration, piquet construit, horaire, activité physique, inspection et reprise',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const fixture=createWorld(42,32,32);fixture.tick=2000;fixture.tiles=fixture.tiles.map(()=>({terrain:'grass'}));fixture.resources=[];fixture.piles=[];
    for(const p of fixture.pawns)p.schedule.fill('anything');
    addGroundMaterial(fixture,'wood',30,{x:15,z:17},'wood');refreshStock(fixture);
    const old=JSON.parse(serializeWorld(fixture));old.schemaVersion=14;delete old.deconstructed;delete old.packed;for(const pawn of old.pawns)delete pawn.orders;old.pawns.forEach((p:any)=>delete p.recreation);
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:JSON.stringify(old)});
    await page.goto('/?size=32&e2e');await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();
    await expect.poll(async()=>(await world(page)).schemaVersion).toBe(25);expect((await world(page)).pawns.map(p=>p.recreation.level)).toEqual([55,55,55]);
    await tool(page,'horseshoes');await cell(page,16,14);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).structures.some(s=>s.kind==='horseshoes'),{timeout:18000}).toBe(true);
    await page.locator('[data-speed="0"]').click();const built=await world(page);expect(built.stock.wood).toBe(20);
    await panel(page,'schedule');await page.locator('[data-schedule-brush="recreation"]').click();
    const hour=Math.floor(built.tick%6000/250);
    for(const p of built.pawns)await page.locator(`[data-schedule-pawn="${p.id}"][data-schedule-hour="${hour}"]`).click();
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{
      const w=window.__lisiere.world;
      if(!w.pawns.some(p=>p.state==='recreating'&&p.recreation.task?.activity==='horseshoes'&&p.recreation.level>56))return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },undefined,{timeout:20000,polling:'raf'});
    await expect(page.locator('#pause-banner')).toBeVisible();const active=await world(page),player=active.pawns.find(p=>p.state==='recreating'&&p.recreation.task?.activity==='horseshoes')!;
    expect(validateWorld(active)).toEqual([]);expect(player.recreation.tolerance.dexterity).toBeGreaterThan(0);
    await page.locator(`[data-pawn="${player.id}"]`).click();await expect(page.locator('#recreation-meter')).toBeVisible();await expect(page.locator('#recreation-tolerance')).toContainText('Dextérité');
    await expect(page.locator('#selected-action')).toContainText('fers à cheval');
    await page.screenshot({path:'artifacts/recreation-active.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,active);
    await page.keyboard.press('Escape');expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    await testInfo.attach('recreation',{contentType:'application/json',body:JSON.stringify({tick:active.tick,pin:active.structures,players:active.pawns.map(p=>({id:p.id,state:p.state,recreation:p.recreation})),errors})});
  } finally {await browser.close();}
});
