import {test,expect} from '@playwright/test';
import {serializeWorld,deserializeWorld,stepWorld,validateWorld} from '../../src/sim/index';
import {deconstructionCamp,fixtureBuilding} from '../scenarios/deconstruction';
import {woodAccount} from '../scenarios/colony-player';
import {perform,revealCells} from './player-actions';
import {cell,world,panel,saveKey,expectWorld,observeErrors} from './helpers';

test('le joueur réinstalle un lit tourné, reprend son portage sauvegardé puis désinstalle et repose un piquet',async({playwright},testInfo)=>{
 test.setTimeout(90000);
 const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
 const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
 try {
  const fixture=deconstructionCamp();fixture.tick=2000;const bed=fixtureBuilding(fixture,'bed',14,16,1),pin=fixtureBuilding(fixture,'horseshoes',18,13);fixture.pawns[0]!.bedId=bed.id;const initial=woodAccount(fixture);
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(fixture)});
  await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
  const rotation={value:0};await perform(page,{reason:'Déplacer le lit existant.',command:{type:'install',structureId:bed.id,x:23,z:19,orientation:3}},rotation);
  await cell(page,bed.x,bed.z);await page.locator('#cell-cancel').click();await expect.poll(async()=>(await world(page)).jobs.length).toBe(0);
  await perform(page,{reason:'Reprendre le déplacement après annulation sur la source.',command:{type:'install',structureId:bed.id,x:23,z:19,orientation:3}},rotation);
  const accepted=await world(page);await page.locator('[data-speed="1"]').click();
  await page.waitForFunction(()=>{if(window.__lisiere.world.packed.some(p=>p.owner.type==='pawn')){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;},undefined,{timeout:15000});
  await expect(page.locator('#pause-banner')).toBeVisible();const carrying=await world(page);expect(carrying.packed[0]!.owner.type).toBe('pawn');expect(woodAccount(carrying)).toBe(initial);
  await page.screenshot({path:'artifacts/furniture-carried.png'});await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,carrying);
  await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===bed.id)?.x,{timeout:15000}).toBe(23);await page.locator('[data-speed="0"]').click();
  const installed=await world(page),replay=deserializeWorld(serializeWorld(accepted));stepWorld(replay,installed.tick-replay.tick);expect(replay).toEqual(installed);expect(installed.pawns[0]!.bedId).toBe(bed.id);expect(installed.structures.find(s=>s.id===bed.id)?.orientation).toBe(3);
  await page.keyboard.press('Escape');await revealCells(page,[pin]);await cell(page,pin.x,pin.z);await page.locator('#cell-uninstall').click();await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).packed.length,{timeout:15000}).toBe(1);await page.locator('[data-speed="0"]').click();
  await perform(page,{reason:'Installer le piquet emballé.',command:{type:'install',structureId:pin.id,x:21,z:13,orientation:0}},rotation);
  await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===pin.id)?.x,{timeout:15000}).toBe(21);await page.locator('[data-speed="0"]').click();
  const result=await world(page);expect(result.structures).toHaveLength(2);expect(result.packed).toEqual([]);expect(woodAccount(result)).toBe(initial);expect(validateWorld(result)).toEqual([]);expect(errors).toEqual([]);await expect(page.locator('#fps-counter')).toBeVisible();await page.screenshot({path:'artifacts/furniture-installed.png'});
  await testInfo.attach('furniture-result',{contentType:'application/json',body:JSON.stringify({backend:await page.evaluate(()=>window.__lisiere.backend),tick:result.tick,buildings:result.structures,wood:woodAccount(result),errors})});
 } finally {await browser.close();}
});
