import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { serializeWorld,validateWorld } from '../../src/sim/index';
import { carrierWithHelper } from '../scenarios/interrupted-cargo';
import { woodAccount } from '../scenarios/colony-player';
import { expectWorld,observeErrors,panel,saveKey,world } from './helpers';
import { perform } from './player-actions';

test('exhausted carrier sleeps, reloads, and another colon frees its cargo through player commands',async({playwright})=>{
  test.setTimeout(70000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const initial=carrierWithHelper(),p=initial.pawns[0]!,helper=initial.pawns[1]!,wood=woodAccount(initial);
    const held=initial.piles.find(q=>q.owner.type==='pawn')!,source=initial.piles.find(q=>q.owner.type==='ground'&&q.owner.x===2&&q.owner.z===3)!;
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.interruptedCargo).toBe(true);
    await page.locator('[data-speed="0"]').click();const sleeping=await world(page);expect(sleeping.pawns[0]!.state).toBe('sleeping');expect(sleeping.pawns[0]!.orders).toEqual({active:null,queue:[]});
    await expect(page.locator('#alerts')).toContainText('cargaison');await page.locator(`[data-pawn="${p.id}"]`).click();await expect(page.locator('#inspector')).toContainText('cargaison');await expect(page.locator('#fps-counter')).toBeVisible();
    await expect(page.locator('#fps-counter')).toHaveText(/\d+ FPS/);await page.screenshot({path:'artifacts/interrupted-cargo-sleep.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,sleeping);
    const rotation={value:0};await perform(page,{reason:'Permettre au second colon de transporter.',command:{type:'priority',pawnId:helper.id,work:'haul',value:1}},rotation);
    await perform(page,{reason:'Libérer physiquement une case proche du dormeur.',command:{type:'order-haul',pawnId:helper.id,target:{type:'pile',pileId:source.id},queue:false}},rotation);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.interruptedCargo).toBeUndefined();await page.locator('[data-speed="0"]').click();
    const final=await world(page);expect(final.piles.find(q=>q.id===held.id)).toMatchObject({quantity:10,item:'steel',owner:{type:'ground',x:2,z:3}});expect(final.pawns[0]!.need).toMatchObject({kind:'sleep',phase:'sleep'});expect(woodAccount(final)).toBe(wood);expect(validateWorld(final)).toEqual([]);expect(errors).toEqual([]);
    writeFileSync('artifacts/interrupted-cargo-ui-v44.json',JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',viewport:'1440x1000',initialTick:initial.tick,sleepTick:sleeping.tick,recoveryTick:final.tick,cargo:final.piles.find(q=>q.id===held.id),helperTask:final.pawns[1]!.haul,sleeping:final.pawns[0]!.need,wood,errors},null,2)+'\n');
  } finally {await browser.close();}
});
