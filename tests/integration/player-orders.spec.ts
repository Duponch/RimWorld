import { test, expect } from '@playwright/test';
import { createWorld, applyCommand, serializeWorld, refreshStock, validateWorld } from '../../src/sim/index';
import { world, panel, cell, saveKey, expectWorld, observeErrors } from './helpers';

test('sélection de groupe, deux projections, menu et file de travail par la vraie interface, reprise exacte',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const fixture=createWorld(42,32,32);fixture.tick=2000;fixture.tiles=fixture.tiles.map(()=>({terrain:'grass'}));fixture.resources=[];fixture.piles=[];fixture.jobs=[];fixture.structures=[];
    fixture.pawns.forEach((p,i)=>{Object.assign(p,{x:12+i*3,z:16,hunger:100,rest:100});p.schedule.fill('anything');p.priorities={gather:i===0?1:0,build:0,haul:0,grow:0,cook:0};});
    for(const x of [12,17,21]){fixture.resources.push({id:fixture.nextId++,kind:'tree',amount:12,x,z:12});expect(applyCommand(fixture,{type:'designate',kind:'chop',x,z:12}).ok).toBe(true);}
    refreshStock(fixture);
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(fixture)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
    const ids=fixture.pawns.map(p=>p.id);
    await page.locator(`[data-pawn="${ids[0]}"]`).click();
    await page.locator(`[data-pawn="${ids[1]}"]`).click({modifiers:['Shift']});
    await expect(page.locator('.colonist.selected')).toHaveCount(2);await expect(page.locator('#group-title')).toHaveText('2 colons sélectionnés');
    const right=async(x:number,z:number,queue=false)=>{
      const point=await page.evaluate(({x,z})=>window.__lisiere.projectCell(x,z),{x,z});const bounds=(await page.locator('#viewport canvas').boundingBox())!;
      if(queue)await page.keyboard.down('Shift');await page.mouse.click(bounds.x+point.x,bounds.y+point.y,{button:'right'});if(queue)await page.keyboard.up('Shift');
      await expect(page.locator('#order-menu')).toBeVisible();
    };
    await right(17,12);await expect(page.locator('#order-menu')).toContainText('un seul colon');await page.keyboard.press('Escape');
    await expect(page.locator('.colonist.selected')).toHaveCount(2);
    await page.locator(`[data-pawn="${ids[1]}"]`).click({modifiers:['Shift']});await expect(page.locator('.colonist.selected')).toHaveCount(1);
    // Double-click a projected body/feet proxy; no camera recentring on map clicks.
    let point=await page.evaluate(()=>window.__lisiere.projectCell(12,16));const bounds=(await page.locator('#viewport canvas').boundingBox())!;
    await page.mouse.dblclick(bounds.x+point.x,bounds.y+point.y);await expect(page.locator('.colonist.selected')).toHaveCount(3);
    const beforeSelection=await world(page);expect(beforeSelection).toEqual(fixture);
    // Rectangle tests in each projection, plus Escape during an uncommitted drag.
    for(let mode=0;mode<2;mode++) {
      if(mode)await page.locator('#camera-mode').click();
      await page.keyboard.press('Escape');
      const points=await page.evaluate(()=>[12,15,18].map(x=>window.__lisiere.projectCell(x,16)));
      const left=Math.min(...points.map(p=>p.x))-22,top=Math.min(...points.map(p=>p.y))-45,right=Math.max(...points.map(p=>p.x))+22,bottom=Math.max(...points.map(p=>p.y))+10;
      await page.mouse.move(bounds.x+left,bounds.y+top);await page.mouse.down();await page.mouse.move(bounds.x+right,bounds.y+bottom,{steps:6});
      await expect(page.locator('.selection-rectangle')).toBeVisible();await page.mouse.up();await expect(page.locator('.colonist.selected')).toHaveCount(3);
      await page.mouse.move(bounds.x+left,bounds.y+top);await page.mouse.down();await page.mouse.move(bounds.x+right,bounds.y+bottom,{steps:3});await page.keyboard.press('Escape');await page.mouse.up();
      await expect(page.locator('.selection-rectangle')).toBeHidden();await expect(page.locator('.colonist.selected')).toHaveCount(3);
    }
    await page.locator(`[data-pawn="${ids[1]}"]`).click();await right(17,12);await expect(page.locator('#order-menu button')).toBeDisabled();await expect(page.locator('#order-menu')).toContainText('désactivé');
    await page.keyboard.press('Escape');await page.locator(`[data-pawn="${ids[0]}"]`).click();
    await right(17,12);await page.locator(`[data-order-job="${fixture.jobs[1]!.id}"]`).click();
    await right(21,12,true);await page.locator(`[data-order-job="${fixture.jobs[2]!.id}"]`).click();
    await expect(page.locator('#selected-orders')).toContainText('1 ordre(s) en file');
    const ordered=await world(page);expect(ordered.pawns[0]!.orders).toEqual({active:fixture.jobs[1]!.id,queue:[fixture.jobs[2]!.id]});expect(validateWorld(ordered)).toEqual([]);
    await page.screenshot({path:'artifacts/player-orders.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,ordered);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).jobs.length,{timeout:15000}).toBe(0);await page.locator('[data-speed="0"]').click();
    const final=await world(page);expect(final.stock.wood).toBe(36);expect(validateWorld(final)).toEqual([]);expect(final.pawns[0]!.orders).toEqual({active:null,queue:[]});
    expect(await page.locator('#fps-counter').isVisible()).toBe(true);expect(errors).toEqual([]);
    await testInfo.attach('orders',{contentType:'application/json',body:JSON.stringify({backend:await page.evaluate(()=>window.__lisiere.backend),tick:final.tick,wood:final.stock.wood,errors})});
  } finally {await browser.close();}
});
