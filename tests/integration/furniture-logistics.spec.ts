import {test,expect} from '@playwright/test';
import {serializeWorld,deserializeWorld,stepWorld,validateWorld} from '../../src/sim/index';
import {deconstructionCamp,fixtureBuilding} from '../scenarios/deconstruction';
import {woodAccount} from '../scenarios/colony-player';
import {perform,revealCells} from './player-actions';
import {cell,world,panel,saveKey,expectWorld,observeErrors} from './helpers';

test('ranger un meuble par le menu contextuel, reprendre sa cargaison, puis le réinstaller avec Transport seul',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const fixture=deconstructionCamp();fixture.tick=2000;const p=fixture.pawns[0]!,bed=fixtureBuilding(fixture,'bed',14,16);
    fixture.structures=[];fixture.packed=[{building:bed,owner:{type:'ground',x:14,z:16}}];p.x=14;p.z=16;p.bedId=bed.id;p.priorities.build=0;p.priorities.haul=1;
    const pin=fixtureBuilding(fixture,'horseshoes',14,16);
    const initial=woodAccount(fixture),rotation={value:0},storage={x:24,z:19};
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(fixture)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
    await page.keyboard.press('Escape');await revealCells(page,[bed]);await cell(page,14,16);await expect(page.locator('#cell-install')).toHaveCount(0);
    await cell(page,14,16);await expect(page.locator('#cell-install')).toBeVisible();
    await perform(page,{reason:'Installer le paquet, pas le piquet sur la même case.',command:{type:'install',structureId:bed.id,x:19,z:16,orientation:0}},rotation);
    expect((await world(page)).jobs[0]?.furniture?.structureId).toBe(bed.id);
    await page.keyboard.press('Escape');await cell(page,14,16);await cell(page,14,16);await page.locator('#cell-cancel').click({timeout:5000});await expect.poll(async()=>(await world(page)).jobs.length).toBe(0);
    await perform(page,{reason:'Réserver une case aux meubles emballés.',command:{type:'stockpile',...storage,enabled:true,filters:{wood:false,food:false,furniture:true},priority:3,capacity:1}},rotation);
    expect((await world(page)).stockpiles[0]).toMatchObject({filters:{wood:false,food:false,furniture:true},priority:3,capacity:1});
    await perform(page,{reason:'Prioriser le transport du lit.',command:{type:'order-haul',pawnId:p.id,target:{type:'furniture',structureId:bed.id},queue:false}},rotation);
    const accepted=await world(page);await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(()=>{if(window.__lisiere.world.pawns[0]?.haul?.whole&&window.__lisiere.world.pawns[0].haul.phase==='deliver'){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;},undefined,{timeout:15000});
    await expect(page.locator('#pause-banner')).toBeVisible();const carrying=await world(page);
    expect(carrying.packed[0]!.owner).toEqual({type:'pawn',pawnId:p.id});expect(woodAccount(carrying)).toBe(initial);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,carrying);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).packed[0]?.owner,{timeout:15000}).toEqual({type:'ground',...storage});await page.locator('[data-speed="0"]').click();
    const stored=await world(page),replay=deserializeWorld(serializeWorld(accepted));stepWorld(replay,stored.tick-replay.tick);expect(replay).toEqual(stored);
    await page.keyboard.press('Escape');await revealCells(page,[storage]);await cell(page,storage.x,storage.z);await expect(page.locator('#cell-install')).toBeVisible();
    await page.screenshot({path:'artifacts/furniture-logistics-stored.png'});
    await perform(page,{reason:'Reposer le même lit avec le transporteur.',command:{type:'install',structureId:bed.id,x:21,z:16,orientation:1}},rotation);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).structures.length,{timeout:15000}).toBe(2);await page.locator('[data-speed="0"]').click();
    const result=await world(page);expect(result.structures.find(s=>s.id===bed.id)).toMatchObject({x:21,z:16,orientation:1});expect(result.structures.find(s=>s.id===pin.id)).toMatchObject({x:14,z:16});expect(result.packed).toEqual([]);expect(result.pawns[0]!.bedId).toBe(bed.id);expect(result.pawns[0]!.priorities.build).toBe(0);
    expect(woodAccount(result)).toBe(initial);expect(validateWorld(result)).toEqual([]);expect(errors).toEqual([]);await expect(page.locator('#fps-counter')).toBeVisible();
    await page.screenshot({path:'artifacts/furniture-logistics-installed.png'});
    await testInfo.attach('furniture-logistics-result',{contentType:'application/json',body:JSON.stringify({backend:await page.evaluate(()=>window.__lisiere.backend),tick:result.tick,buildings:result.structures,storage:result.stockpiles,wood:initial,resumedExactly:true,errors})});
  } finally {await browser.close();}
});
