import { test, expect } from '@playwright/test';
import { serializeWorld, deserializeWorld, stepWorld, validateWorld } from '../../src/sim/index';
import { deconstructionCamp, fixtureBuilding } from '../scenarios/deconstruction';
import { woodAccount } from '../scenarios/colony-player';
import { perform, revealCells } from './player-actions';
import { cell, world, panel, saveKey, expectWorld, observeErrors } from './helpers';

test('le joueur désigne un rectangle, annule un meuble, priorise la déconstruction et retrouve son remboursement après sauvegarde',async({playwright},testInfo)=>{
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const fixture=deconstructionCamp();fixture.tick=2000;
    fixtureBuilding(fixture,'wall',18,14);fixtureBuilding(fixture,'bed',18,17);fixtureBuilding(fixture,'table',21,14,1);fixtureBuilding(fixture,'campfire',22,17);
    const pawn=fixture.pawns[0]!;pawn.priorities.gather=2;
    fixture.resources.push({id:fixture.nextId++,kind:'tree',x:12,z:16,amount:12});
    const initialWood=woodAccount(fixture);
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(fixture)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
    const rotation={value:0};
    await perform(page,{reason:'Retirer plusieurs ouvrages du camp.',command:{type:'area',action:'deconstruct',from:{x:18,z:14},to:{x:22,z:18}}},rotation);
    await expect.poll(async()=>(await world(page)).jobs.length).toBe(4);
    await page.keyboard.press('Escape');await revealCells(page,[{x:18,z:18}]);await cell(page,18,18);
    await expect(page.locator('#cell-job')).toContainText('Déconstruction');await page.locator('#cell-cancel').click();
    await expect.poll(async()=>(await world(page)).jobs.length).toBe(3);await expect(page.locator('#cell-deconstruct')).toBeVisible();
    await perform(page,{reason:'Conserver un abattage de priorité inférieure en attente.',command:{type:'designate',kind:'chop',x:12,z:16}},rotation);
    const pending=await world(page),wall=pending.jobs.find(j=>j.deconstruction?.kind==='wall')!;
    await perform(page,{reason:'Ouvrir ce passage en premier.',command:{type:'order-job',pawnId:fixture.pawns[0]!.id,jobId:wall.id,queue:false}},rotation);
    await expect(page.locator('#fps-counter')).toBeVisible();await page.screenshot({path:'artifacts/deconstruction-orders.png'});
    const accepted=await world(page);await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,accepted);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).deconstructed.count,{timeout:15000}).toBe(3);
    await page.locator('[data-speed="0"]').click();const result=await world(page);
    expect(result.structures.map(s=>s.kind)).toEqual(['bed']);expect(result.resources[0]!.amount).toBe(12);expect(result.stock.wood).toBeGreaterThanOrEqual(16);expect(result.stock.wood).toBeLessThanOrEqual(17);
    expect(woodAccount(result)).toBe(initialWood);expect(validateWorld(result)).toEqual([]);
    const replay=deserializeWorld(serializeWorld(accepted));stepWorld(replay,result.tick-replay.tick);expect(replay).toEqual(result);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,result);
    await page.keyboard.press('Escape');await cell(page,18,14);await expect(page.locator('#cell-title')).toContainText('Prairie');
    await page.screenshot({path:'artifacts/deconstruction-result.png'});
    await testInfo.attach('deconstruction-result',{contentType:'application/json',body:JSON.stringify({backend:await page.evaluate(()=>window.__lisiere.backend),tick:result.tick,stock:result.stock,ledger:result.deconstructed,errors})});
    expect(errors).toEqual([]);
  } finally {await browser.close();}
});
