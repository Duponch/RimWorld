import {expect,test} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization';
import {captureRoomQuality} from '../../src/sim/room-quality';
import {observeErrors,world,panel,cell,saveKey,expectWorld,pause,pawnTab} from './helpers';
import {revealCells} from './player-actions';

test('pièces vécues : inspection, repas physique, souvenir dans Besoins et reprise worker',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);page.setDefaultTimeout(15000);
  try{
    const w=deserializeWorld(readFileSync('public/test-saves/v103/salles.json','utf8')),p=w.pawns[0]!;
    expect(validateWorld(w)).toEqual([]);expect(p.roomMemories).toBeUndefined();
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(w)});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('[data-speed="0"]')).toBeVisible();await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,w);await page.keyboard.press('Escape');
    await revealCells(page,[{x:14,z:14}]);await cell(page,14,14);
    await page.locator('.cell-environment summary').click();
    const quality=captureRoomQuality(w).room({x:14,z:14})!;
    await expect(page.locator('#room-description')).toContainText(`Impression : ${quality.impressiveness.toFixed(1)}`);
    await expect(page.locator('#room-description')).toContainText(`Richesse : ${quality.wealth.toFixed(1)}`);
    await expect(page.locator('#room-description')).toContainText(`Espace : ${quality.space.toFixed(1)}`);
    await page.screenshot({path:'artifacts/room-quality-ui-v103.png'});
    await page.locator(`[data-pawn="${p.id}"]`).click();await pawnTab(page,'needs');
    // Besoins opens its details automatically; its redundant summary is hidden.
    await expect(page.locator('#mood-thoughts')).toBeVisible();await expect(page.locator('[data-thought="room-dining"]')).toHaveCount(0);
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).pawns[0]!.roomMemories?.some(m=>m.kind==='dining')??false,{timeout:20000}).toBe(true);
    await pause(page);const finished=await world(page);expect(validateWorld(finished)).toEqual([]);
    await expect(page.locator('[data-thought="room-dining"]')).toBeVisible();
    await expect(page.locator('[data-thought="room-dining"]')).toContainText('Salle du dernier repas');
    expect(finished.pawns[0]!.hunger).toBeGreaterThan(50);
    await page.locator('[data-thought="room-dining"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-thought="room-dining"]')).toBeInViewport();
    await page.screenshot({path:'artifacts/room-memory-ui-v103.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,finished);
    await page.keyboard.press('Escape');await page.locator(`[data-pawn="${p.id}"]`).click();await pawnTab(page,'needs');
    await expect(page.locator('[data-thought="room-dining"]')).toContainText('Salle du dernier repas');
    const backend=await page.evaluate(()=>window.__lisiere.backend);expect(backend).toContain('WebGPU');expect(errors).toEqual([]);
    const report=JSON.stringify({backend,tick:finished.tick,memories:finished.pawns[0]!.roomMemories,quality,errors},(_key,value)=>value instanceof Set?[...value]:value,2);
    writeFileSync('artifacts/room-experience-native-v103.json',report);
    await testInfo.attach('room-experience',{contentType:'application/json',body:report});
  }finally{await browser.close();}
});
