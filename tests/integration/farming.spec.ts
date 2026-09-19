import { plantClimateFixture } from '../scenarios/plant-climate';
import { plantGrowth } from '../../src/sim/plants';
import { test, expect } from '@playwright/test';
import { createWorld, stepWorld, serializeWorld, validateWorld } from '../../src/sim/index';
import { addGroundMaterial, refreshStock } from '../../src/sim/materials';
import { observeErrors, world, panel, tool, cell, dragRectangle, expectWorld, saveKey } from './helpers';

test('culture par interface : champ, semis GPU, inspection, politiques, maturité et sauvegarde', async ({playwright}, testInfo) => {
  test.setTimeout(60000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);
  try {
    const initial=createWorld(42,32,32);
    initial.resources=[]; initial.tiles=initial.tiles.map(()=>({terrain:'grass'}));
    initial.pawns.forEach(p=>{p.hunger=100;p.rest=100;p.priorities.haul=0;});
    addGroundMaterial(initial,'wood',25,{x:18,z:16});refreshStock(initial);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&size=32&seed=42&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();
    await expectWorld(page,initial);
    await tool(page,'growing');await dragRectangle(page,{x:18,z:16},{x:20,z:17});
    await expect.poll(async()=>(await world(page)).growingZones[0]?.cells.length).toBe(6);
    await panel(page,'work');await expect(page.locator('[data-work="grow"]')).toHaveCount(3);
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).resources.filter(r=>r.kind==='rice').length,{timeout:15000}).toBe(6);
    await page.locator('[data-speed="0"]').click();await cell(page,18,16);
    const cleared=await world(page);
    expect(cleared.stock.wood).toBe(initial.stock.wood);
    expect(cleared.stockpiles).toEqual([]);
    expect(cleared.piles.some(p=>p.owner.type==='ground'&&p.owner.x===18&&p.owner.z===16)).toBe(false);
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


test('cold room: UI explains stopped plants, no sowing, built fire restores growth and sowing',async({playwright})=>{
  test.setTimeout(75000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const initial=plantClimateFixture(-10),id=initial.resources[0]!.id;
    for(const entity of [...initial.resources,...initial.structures,...initial.pawns]){entity.x+=12;entity.z+=12;}
    initial.roofing!.constructed=initial.roofing!.constructed.map(i=>i+12*32+12);
    for(const region of initial.thermal!.regions)region.cells=region.cells.map(i=>i+12*32+12);
    addGroundMaterial(initial,'wood',30,{x:18,z:17});refreshStock(initial);initial.pawns[0]!.priorities.build=1;
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
    await tool(page,'growing');await dragRectangle(page,{x:16,z:16},{x:17,z:16});
    await tool(page,'select');await cell(page,16,16);
    await expect(page.locator('#cell-description')).toContainText('Croissance thermique 0 %');
    await cell(page,17,16);await expect(page.locator('#cell-description')).toContainText('Nouveaux semis suspendus');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(t=>{if(window.__lisiere.world.tick<t)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},initial.tick+60);
    const cold=await world(page);expect(cold.resources).toHaveLength(1);expect(plantGrowth(cold,cold.resources[0]!)).toBe(.2);expect(cold.jobs.some(j=>j.kind==='sow')).toBe(false);
    await cell(page,16,16);await page.screenshot({path:'artifacts/plant-climate-cold.png'});
    await tool(page,'campfire');await cell(page,15,15);await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{
      const w=window.__lisiere.world;
      if(!w.structures.some(s=>s.kind==='campfire'&&(s.fuel?.ticks??0)>0)||w.resources.length<2||(w.thermal?.regions[0]?.temperature??0)<7)return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },undefined,{timeout:20000});
    const warmed=await world(page),withoutFire=structuredClone(cold);stepWorld(withoutFire,warmed.tick-cold.tick);
    expect(warmed.thermal!.regions[0]!.temperature).toBeGreaterThan(withoutFire.thermal!.regions[0]!.temperature+3);
    expect(plantGrowth(warmed,warmed.resources.find(p=>p.id===id)!)).toBeGreaterThan(.2);
    expect(warmed.resources.some(p=>p.x===17&&p.z===16&&p.kind==='rice')).toBe(true);expect(validateWorld(warmed)).toEqual([]);
    await tool(page,'select');await cell(page,16,16);await expect(page.locator('#cell-description')).toContainText('Croissance diurne');
    await expect(page.locator('#cell-description')).not.toContainText('Croissance thermique 0 %');await expect(page.locator('#fps-counter')).toBeVisible();
    await page.locator('[data-speed="6"]').click();await expect(page.locator('#cell-description')).toContainText('Croissance 21 %',{timeout:10000});
    await page.locator('[data-speed="0"]').click();const final=await world(page);
    await page.screenshot({path:'artifacts/plant-climate-warmed.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,final);
    expect(errors).toEqual([]);
  } finally {await browser.close();}
});
