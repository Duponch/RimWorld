import { expect, test } from '@playwright/test';
import { deconstructionCamp, fixtureBuilding } from '../scenarios/deconstruction';
import { addGroundMaterial } from '../../src/sim/materials';
import { serializeWorld, validateWorld } from '../../src/sim/serialization';
import { observeErrors, world, panel, tool, cell, saveKey, expectWorld } from './helpers';
import { revealCells } from './player-actions';

test('porte : construction, ouverture physique, maintien/interdiction, sauvegarde animée et GPU natif',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  page.setDefaultTimeout(15000);
  try {
    const w=deconstructionCamp(),p=w.pawns[0]!;w.tick=2000;
    for(let z=0;z<32;z++)if(z!==16)fixtureBuilding(w,'wall',16,z);
    w.resources.push({id:w.nextId++,kind:'tree',amount:12,x:21,z:16});
    addGroundMaterial(w,'blocks',25,{x:13,z:15},'granite-blocks');
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(w)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,w);
    await tool(page,'door');await expect(page.locator('#construction-material option')).toHaveCount(7);
    await page.locator('#construction-material').selectOption('granite-blocks');await expect(page.locator('#tool-instruction')).toContainText('25 Blocs de granite');
    await revealCells(page,[{x:16,z:16}]);await cell(page,16,16);await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.some(s=>s.kind==='door'),{timeout:18000}).toBe(true);
    await page.locator('[data-speed="0"]').click();await cell(page,16,16);await expect(page.locator('#door-state')).toContainText('Fermée');
    await page.locator('#door-holdOpen').check();await expect.poll(async()=>(await world(page)).structures.find(s=>s.kind==='door')!.door!.holdOpen).toBe(true);
    expect((await world(page)).structures.find(s=>s.kind==='door')!.door!.open).toBe(false);await expect(page.locator('#cell-uninstall')).toBeHidden();
    await panel(page,'work');await page.locator(`select[data-owner="${p.id}"][data-work="gather"]`).selectOption('1');
    await tool(page,'chop');await revealCells(page,[{x:21,z:16}]);await cell(page,21,16);await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(()=>{const s=window.__lisiere.world.structures.find(s=>s.kind==='door');return s?.door?.open&&window.__lisiere.tick<s.door.changedAt+10;},undefined,{polling:50,timeout:15000});
    await page.locator('[data-speed="0"]').click();const opening=await world(page);expect(opening.pawns[0]!.x).toBeLessThan(16);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,opening);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).resources.length,{timeout:10000}).toBe(0);
    await page.locator('[data-speed="0"]').click();await cell(page,16,16);await expect(page.locator('#door-state')).toContainText('Ouverte');
    await page.locator('#door-forbidden').check();await expect.poll(async()=>(await world(page)).structures.find(s=>s.kind==='door')!.door!.forbidden).toBe(true);
    const final=await world(page);expect(final.pawns[0]!.x).toBeGreaterThan(16);expect(validateWorld(final)).toEqual([]);expect(errors).toEqual([]);await expect(page.locator('#fps-counter')).toBeVisible();
    await page.screenshot({path:'artifacts/doors-ui.png'});
    await testInfo.attach('doors',{contentType:'application/json',body:JSON.stringify({backend:await page.evaluate(()=>window.__lisiere.backend),openingTick:opening.tick,completedTick:final.tick,pawn:final.pawns[0],door:final.structures.find(s=>s.kind==='door'),errors})});
  } finally {await browser.close();}
});
