import { test, expect } from '@playwright/test';
import { miningCamp } from '../scenarios/mining';
import { serializeWorld, validateWorld } from '../../src/sim/index';
import { cell, tool, panel, saveKey, world, expectWorld, observeErrors } from './helpers';
import { revealCells } from './player-actions';

test('miner, reprendre la roche endommagée et ranger son fragment par les commandes visibles',async({playwright},testInfo)=>{
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});page.setDefaultTimeout(10000);
  const errors=observeErrors(page);
  try {
    const fixture=miningCamp(),target={x:13,z:14},index=target.z*32+target.x;fixture.tiles[index]={terrain:'rock',stone:'granite'};fixture.rng=1;
    await page.addInitScript(({key,saved})=>localStorage.setItem(key,saved),{key:saveKey,saved:serializeWorld(fixture)});
    await page.goto('/?e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);await page.keyboard.press('Escape');
    await expect(page.locator('#fps-counter')).toBeVisible();
    await panel(page,'work');await page.locator('select[data-work="mine"]').selectOption('1');
    await tool(page,'mine');await revealCells(page,[target]);await cell(page,target.x,target.z);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(i=>{const w=window.__lisiere.world;if((w.tiles[i]!.miningDamage??0)>=160){(document.querySelector('[data-speed="0"]') as HTMLButtonElement).click();return true;}return false;},index,{polling:50});
    await expect(page.locator('#pause-banner')).toBeVisible();const damaged=await world(page);expect(damaged.tiles[index]!.terrain).toBe('rock');
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,damaged);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await page.waitForFunction(i=>{if(window.__lisiere.world.tiles[i]!.terrain==='rough-stone'){(document.querySelector('[data-speed="0"]') as HTMLButtonElement).click();return true;}return false;},index,{polling:50});
    await expect(page.locator('#pause-banner')).toBeVisible();let current=await world(page);expect(current.piles).toHaveLength(1);expect(current.piles[0]!.item).toBe('granite-chunk');
    await tool(page,'stockpile');await page.locator('#stockpile-wood').uncheck();await page.locator('#stockpile-food').uncheck();await page.locator('#stockpile-chunk').check();
    await revealCells(page,[{x:19,z:16}]);await cell(page,19,16);await page.keyboard.press('Escape');
    const tick=current.tick;await page.locator('[data-speed="6"]').click();await page.waitForFunction(t=>window.__lisiere.tick>=t,tick+30);await page.locator('[data-speed="0"]').click();
    current=await world(page);expect(current.piles[0]!.owner).toEqual({type:'ground',...target});
    await tool(page,'haul-chunks');await revealCells(page,[target]);await cell(page,target.x,target.z);await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{const w=window.__lisiere.world;return w.piles.length===1&&w.piles[0]!.owner.type==='ground'&&w.piles[0]!.owner.x===19;},undefined,{polling:100});await page.locator('[data-speed="0"]').click();
    current=await world(page);expect(validateWorld(current)).toEqual([]);expect(current.piles[0]).toMatchObject({item:'granite-chunk',quantity:1,owner:{type:'ground',x:19,z:16}});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,current);await page.keyboard.press('Escape');
    await page.screenshot({path:'artifacts/mining-ui.png'});expect(errors).toEqual([]);await testInfo.attach('mining-outcome',{body:JSON.stringify({tile:current.tiles[index],piles:current.piles,errors}),contentType:'application/json'});
  }finally{await browser.close();}
});
