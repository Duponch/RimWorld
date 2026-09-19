import { perform } from './player-actions';
import { test,expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { createWorld } from '../../src/sim/engine';
import { enableArrivals } from '../../src/sim/arrivals';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { observeErrors,panel,saveKey,world,expectWorld } from './helpers';

test('arrival UI at 1x/6x: real worker, letter, postpone/save, edge entry and fourth pawn',async({playwright})=>{
  test.setTimeout(150000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]}),proof=[];
  try {for(const speed of [1,6]) {
    const initial=createWorld(42,32,32);enableArrivals(initial);initial.arrivals!.nextCheck=5;
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    page.setDefaultTimeout(15000);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await page.locator(`[data-speed="${speed}"]`).click();await expect(page.locator('#arrival-letter')).toBeVisible();await page.locator('#arrival-letter').focus();
    const focusTick=(await world(page)).tick;await page.waitForFunction(t=>window.__lisiere.tick>=t+5,focusTick);await expect(page.locator('#arrival-letter')).toBeFocused();await page.locator('[data-speed="0"]').click();
    const pending=await world(page);expect(pending.pawns).toHaveLength(3);await page.locator('#arrival-letter').click();await expect(page.locator('#arrival-dialog')).toContainText('Meilleure compétence');await page.screenshot({path:`artifacts/arrival-letter-v66-${speed}x.png`});await page.locator('#postpone-arrival').click();
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,pending);await page.keyboard.press('Escape');
    await page.locator('#arrival-letter').click();await page.locator('#accept-arrival').click();await expect.poll(async()=>(await world(page)).pawns.length).toBe(4);
    const joined=await world(page),newcomer=joined.pawns.at(-1)!;expect(validateWorld(joined)).toEqual([]);expect(joined.arrivals!.accepted).toBe(1);
    await expect(page.locator(`[data-pawn="${newcomer.id}"]`)).toBeVisible();await page.locator(`[data-pawn="${newcomer.id}"]`).click();await expect(page.locator('#inspector')).toContainText(newcomer.name);
    await page.screenshot({path:`artifacts/arrival-v66-${speed}x.png`});
    await panel(page,'work');await expect(page.locator('#work-panel')).toContainText(newcomer.name);await page.keyboard.press('Escape');
    await perform(page,{reason:'Diriger le nouveau colon vers le camp.',command:{type:'draft',pawnIds:[newcomer.id],enabled:true}},{value:0});
    await perform(page,{reason:'Vérifier son déplacement physique depuis la bordure.',command:{type:'draft-move',pawnIds:[newcomer.id],target:{x:16,z:16},queue:false}},{value:0});
    await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(async()=>{const p=(await world(page)).pawns.at(-1)!;return p.x!==newcomer.x||p.z!==newcomer.z;},{timeout:30000}).toBe(true);await page.locator('[data-speed="0"]').click();
    const walking=await world(page);await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,walking);await page.keyboard.press('Escape');
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(pending)});await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,pending);await page.keyboard.press('Escape');
    await page.locator('#arrival-letter').click();await page.locator('#reject-arrival').click();await expect.poll(async()=>(await world(page)).arrivals?.declined).toBe(1);
    const refused=await world(page);expect(refused.pawns).toHaveLength(3);expect(refused.pawns.every(p=>p.deniedJoining?.length===1)).toBe(true);expect(validateWorld(refused)).toEqual([]);
    const expiring=createWorld(42);enableArrivals(expiring);expiring.tick=5998;expiring.arrivals!.serial=1;expiring.arrivals!.nextCheck=10000;expiring.arrivals!.pending={id:1,openedAt:0,expiresAt:6000,name:'Voyageur',profile:0};
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(expiring)});await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,expiring);await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();await expect(page.locator('#arrival-letter')).toHaveCount(0);await page.locator('[data-speed="0"]').click();expect((await world(page)).arrivals?.expired).toBe(1);
    // Reloading a former camp after an activation must not leave its activation
    // button disabled by UI state retained from the previous world.
    const former=createWorld(42);
    for(let reload=0;reload<2;reload++) {
      await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(former)});await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,former);await page.keyboard.press('Escape');
      await expect(page.locator('#enable-arrivals')).toBeEnabled();await page.locator('#enable-arrivals').click();await expect.poll(async()=>!!(await world(page)).arrivals).toBe(true);await expect(page.locator('#enable-arrivals')).toBeHidden();expect((await world(page)).pawns).toHaveLength(3);
    }
    expect(errors).toEqual([]);proof.push({speed,pendingTick:pending.tick,joinedTick:joined.tick,newcomer:{id:newcomer.id,x:newcomer.x,z:newcomer.z},walkingTick:walking.tick,refusal:true,expiration:true,formerCampActivation:true,errors});await page.close();
  }}finally{await browser.close();}
  writeFileSync('artifacts/arrival-ui-v66.json',JSON.stringify({date:new Date().toISOString(),controlledCalendar:true,proof},null,2)+'\n');
});
