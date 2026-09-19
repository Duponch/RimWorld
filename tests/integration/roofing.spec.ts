import { expect, test } from '@playwright/test';
import { roomCamp } from '../scenarios/rooms';
import { serializeWorld, validateWorld } from '../../src/sim/serialization';
import { observeErrors, world, panel, tool, cell, dragRectangle, saveKey, expectWorld } from './helpers';
import { revealCells } from './player-actions';

test('toits : zone tracée, pose physique, affichage, retrait et reprise par le worker',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);page.setDefaultTimeout(15000);
  try {
    // Exercise the save/load race deterministically, not by hoping the machine
    // is slow. Only the UI's receipt of a completed save is delayed.
    await page.route('**/src/bridge/SimulationClient.ts*',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:await response.text()+'\nconst originalSave=SimulationClient.prototype.save; SimulationClient.prototype.save=async function(){const data=await originalSave.call(this);await new Promise(resolve=>setTimeout(resolve,1000));return data;};'});
    });
    const initial=roomCamp();
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
    await page.keyboard.press('Escape');await tool(page,'build-roof');
    await revealCells(page,[{x:10,z:10},{x:20,z:20}]);await dragRectangle(page,{x:10,z:10},{x:20,z:20});
    await expect.poll(async()=>(await world(page)).roofing?.build.length).toBe(121);
    expect((await world(page)).roofing?.constructed).toEqual([]);
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).roofing?.constructed.length,{timeout:20000}).toBe(121);
    await page.locator('[data-speed="0"]').click();await cell(page,13,13);
    await expect(page.locator('#room-description')).toContainText('Pièce couverte · 36 / 36 cases');
    const covered=await world(page);expect(validateWorld(covered)).toEqual([]);
    await page.locator('#roof-toggle').click();await expect(page.locator('#roof-toggle')).toHaveAttribute('aria-pressed','true');
    await expectWorld(page,covered);await page.screenshot({path:'artifacts/roofing-ui-covered.png'});
    await page.locator('#roof-toggle').click();
    await tool(page,'ignore-roof');await revealCells(page,[{x:10,z:10},{x:20,z:20}]);await dragRectangle(page,{x:10,z:10},{x:20,z:20});
    await expect.poll(async()=>(await world(page)).roofing?.build.length).toBe(0);
    expect((await world(page)).roofing?.constructed.length).toBe(121);
    await tool(page,'remove-roof');await cell(page,13,13);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).roofing?.constructed.length).toBe(120);
    await page.locator('[data-speed="0"]').click();const removed=await world(page);
    await panel(page,'menu');await page.locator('#save').click();await expect(page.locator('#load')).toBeDisabled();await page.locator('#load').click();await expectWorld(page,removed);
    await page.keyboard.press('Escape');await cell(page,13,13);
    await expect(page.locator('#room-description')).toContainText('35 / 36 cases');
    await expect(page.locator('#fps-counter')).toBeVisible();expect(errors).toEqual([]);
    const backend=await page.evaluate(()=>window.__lisiere.backend);expect(backend).toContain('WebGPU');
    await page.screenshot({path:'artifacts/roofing-ui-cutaway.png'});
    await testInfo.attach('roofing',{contentType:'application/json',body:JSON.stringify({backend,roofing:removed.roofing,errors})});
  } finally {await browser.close();}
});
