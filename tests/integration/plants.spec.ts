import { expect, test } from '@playwright/test';
import { createWorld, serializeWorld, validateWorld } from '../../src/sim/index';
import { world, startPaused, saveKey, expectWorld, observeErrors, panel, tool, cell } from './helpers';

test('buisson persistant : inspection, récolte, sauvegarde et coupe par la vraie interface',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    await startPaused(page);
    const fixture=createWorld(42,32,32);fixture.tiles=fixture.tiles.map(()=>({terrain:'grass'}));fixture.piles=[];fixture.stock={wood:0,food:0};
    fixture.pawns=fixture.pawns.slice(0,1);Object.assign(fixture.pawns[0]!,{x:16,z:16,hunger:100,rest:100});
    const id=fixture.nextId++;fixture.resources=[{id,kind:'berries',x:18,z:14,amount:10}];
    await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(fixture)});
    await startPaused(page);await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
    await tool(page,'select');await cell(page,18,14);
    await expect(page.locator('#cell-description')).toContainText('Croissance 100 %');
    await tool(page,'harvest');await cell(page,18,14);await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{if(window.__lisiere.world.resources[0]?.growth!==.3)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;});
    const picked=await world(page);expect(picked.resources[0]).toMatchObject({id,growth:.3});expect(picked.stock.food).toBe(10);
    await tool(page,'select');await cell(page,18,14);
    await expect(page.locator('#cell-description')).toContainText('Pas encore récoltable');
    await expect(page.locator('#fps-counter')).toBeVisible();
    await page.screenshot({path:'artifacts/bush-harvested.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,picked);
    await tool(page,'cut');await cell(page,18,14);await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{if(window.__lisiere.world.resources.length)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;});
    const cleared=await world(page);expect(cleared.stock.food).toBe(10);expect(validateWorld(cleared)).toEqual([]);expect(errors).toEqual([]);
    await testInfo.attach('persistent-bush',{contentType:'application/json',body:JSON.stringify({id,picked:picked.resources[0],food:cleared.stock.food,saveResumedExactly:true,cutRemovedBush:true,errors})});
  } finally {await browser.close();}
});
