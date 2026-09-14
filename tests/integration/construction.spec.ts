import { revealCells } from './player-actions';
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
    const old=JSON.parse(serializeWorld(fixture));old.schemaVersion=15;for(const pawn of old.pawns)delete pawn.orders;
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:JSON.stringify(old)});
    await page.goto('/?size=32&e2e');await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();
    await expect.poll(async()=>(await world(page)).schemaVersion).toBe(21);
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


test('meubles et réserves : conserver les piles sur table et tabouret, retirer les cellules incompatibles et reprendre sans perte',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const fixture=createWorld(42,32,32);fixture.tick=2000;fixture.tiles=fixture.tiles.map(()=>({terrain:'grass'}));fixture.resources=[];fixture.piles=[];fixture.jobs=[];fixture.structures=[];fixture.stockpiles=[];fixture.pawns=fixture.pawns.slice(0,1);
    const p=fixture.pawns[0]!;Object.assign(p,{x:13,z:16,hunger:100,rest:100,priorities:{build:1,haul:0,gather:0,grow:0,cook:0}});p.schedule.fill('anything');
    addGroundMaterial(fixture,'wood',53,{x:12,z:16},'wood');addGroundMaterial(fixture,'food',10,{x:17,z:14},'rice');addGroundMaterial(fixture,'food',6,{x:19,z:14},'berries');
    const ids=fixture.piles.filter(p=>p.kind==='food').map(p=>p.id);
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(fixture)});
    await page.goto('/?size=32&e2e');await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
    for(const x of [17,19]){await tool(page,'stockpile');await cell(page,x,14);}
    await tool(page,'table');await cell(page,17,14);await tool(page,'stool');await cell(page,19,14);
    const planned=await world(page);expect(planned.jobs).toHaveLength(2);expect(planned.stockpiles.map(z=>z.x)).toEqual([19]);expect(planned.piles.filter(p=>ids.includes(p.id))).toEqual(fixture.piles.filter(p=>ids.includes(p.id)));
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{if(window.__lisiere.world.structures.length!==2)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},undefined,{timeout:30000,polling:'raf'});
    await expect(page.locator('#pause-banner')).toBeVisible();const built=await world(page);
    expect(validateWorld(built)).toEqual([]);expect(built.stock).toEqual({wood:0,food:16});expect(built.piles.filter(p=>ids.includes(p.id)).map(p=>p.owner)).toEqual(fixture.piles.filter(p=>ids.includes(p.id)).map(p=>p.owner));
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,built);
    await page.keyboard.press('Escape');await revealCells(page,[{x:17,z:14},{x:19,z:14}]);await cell(page,19,14);await expect(page.locator('#cell-storage')).toBeVisible();await expect(page.locator('#fps-counter')).toContainText('FPS');
    await page.screenshot({path:'artifacts/occupancy.png'});expect(errors).toEqual([]);
    await testInfo.attach('occupancy',{body:JSON.stringify({tick:built.tick,stock:built.stock,structures:built.structures,stored:built.stockpiles,ids,errors}),contentType:'application/json'});
  } finally {await browser.close();}
});
