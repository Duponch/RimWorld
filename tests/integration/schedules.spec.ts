import { withoutPawnSkills } from '../scenarios/legacy-skills';
import { expect, test } from '@playwright/test';
import { createWorld, serializeWorld, deserializeWorld, validateWorld } from '../../src/sim/index';
import { withoutPostV11Fields } from '../scenarios/legacy-save';
import { world, panel, saveKey, expectWorld, observeErrors } from './helpers';

test('Horaires : peindre, annuler, clavier, copier, reprendre et réveiller physiquement par le worker', async ({playwright}, testInfo) => {
  test.setTimeout(75000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);page.setDefaultTimeout(10000);
  try {
    const fixture=createWorld(42,32,32);fixture.tiles=fixture.tiles.map(()=>({terrain:'grass'}));fixture.resources=[];
    fixture.pawns.forEach((p,i)=>{p.x=13+i*3;p.z=13;p.rest=60;p.priorities={clean:0,firefight:0,warden:0,basic:3,hunt:0,research:0, patient:0,bedrest:0,doctor:0,art:0,craft:2,mine:2,gather:0,build:0,haul:0,grow:0,cook:0};fixture.structures.push({id:fixture.nextId++,kind:'bed',x:p.x,z:p.z,orientation:0,footprint:'standard',quality:'normal'});p.bedId=fixture.structures.at(-1)!.id;});
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(fixture)});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
    await page.keyboard.press('F2');await expect(page.locator('#schedule-panel')).toBeVisible();
    await expect(page.locator('[data-schedule-hour]')).toHaveCount(72);await expect(page.locator('[data-schedule-brush="recreation"]')).toBeEnabled();
    const [ada,noe]=fixture.pawns;
    const slot=(id:number,h:number)=>page.locator(`[data-schedule-pawn="${id}"][data-schedule-hour="${h}"]`);
    await page.locator('[data-schedule-brush="work"]').click();
    const a=await slot(ada!.id,8).boundingBox(),b=await slot(ada!.id,12).boundingBox();
    await page.mouse.move(a!.x+a!.width/2,a!.y+a!.height/2);await page.mouse.down();await page.mouse.move(b!.x+b!.width/2,b!.y+b!.height/2,{steps:5});await page.mouse.up();
    await expect.poll(async()=>(await world(page)).pawns[0]!.schedule.slice(8,13)).toEqual(Array(5).fill('work'));
    const beforeCancel=await world(page);await page.mouse.move(a!.x+a!.width/2,a!.y+a!.height/2);await page.mouse.down();await page.mouse.move(b!.x+b!.width/2,b!.y+b!.height/2);await page.keyboard.press('Escape');await page.mouse.up();
    await expectWorld(page,beforeCancel);await expect(page.locator('#schedule-panel')).toBeVisible();
    await slot(ada!.id,0).focus();await page.keyboard.press('Space');await expect.poll(async()=>(await world(page)).pawns[0]!.schedule[0]).toBe('work');await expect(page.locator('#pause-banner')).toBeVisible();
    await page.keyboard.press('Tab');await expect(slot(ada!.id,1)).toBeFocused();
    await page.locator(`[data-schedule-copy="${ada!.id}"]`).click();await page.locator(`[data-schedule-paste="${noe!.id}"]`).click();
    await expect.poll(async()=>{const w=await world(page);return JSON.stringify(w.pawns[0]!.schedule)===JSON.stringify(w.pawns[1]!.schedule);}).toBe(true);
    await page.locator('[data-schedule-brush="sleep"]').click();await slot(ada!.id,0).click();await expect.poll(async()=>(await world(page)).pawns[0]!.schedule[0]).toBe('sleep');
    expect((await world(page)).pawns[1]!.schedule[0]).toBe('work'); // Clipboard is an independent value.
    await page.screenshot({path:'artifacts/schedules-ui.png'});
    const configured=await world(page);await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,configured);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.state).toBe('sleeping');await page.locator('[data-speed="0"]').click();
    const asleep=await world(page);expect(asleep.pawns[0]!.need).toMatchObject({kind:'sleep',target:{x:13,z:13}});expect(asleep.pawns[1]!.state).not.toBe('sleeping');
    await panel(page,'schedule');await page.locator('[data-schedule-brush="work"]').click();await slot(ada!.id,0).click();await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).pawns[0]!.state).not.toBe('sleeping');await page.locator('[data-speed="0"]').click();
    const awake=await world(page);expect([awake.pawns[0]!.x,awake.pawns[0]!.z]).toEqual([13,13]);expect(validateWorld(awake)).toEqual([]);
    const old=withoutPostV11Fields(JSON.parse(serializeWorld(awake)));(old.schemaVersion=11,withoutPawnSkills(old));for(const a of old.pawns){delete a.priorities.mine;delete a.priorities.craft;delete a.motion;a.moveCooldown=0;}delete old.deconstructed;delete old.packed;
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:JSON.stringify(old)});
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,deserializeWorld(JSON.stringify(old)));
    await panel(page,'schedule');await expect(page.locator('#schedule-profile')).toContainText('Sauvegarde historique');
    const legacy=await world(page),bad=structuredClone(legacy);bad.pawns[0]!.schedule[0]='joy' as never;
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:JSON.stringify(bad)});await panel(page,'menu');await page.locator('#load').click();
    await expect(page.locator('#notice')).toHaveClass(/error/);await expectWorld(page,legacy);await expect(page.locator('#fps-counter')).toBeVisible();
    expect(errors).toEqual([]);await testInfo.attach('schedule-result',{contentType:'application/json',body:JSON.stringify({tick:awake.tick,configured:configured.pawns.map(p=>p.schedule),sleepObserved:true,workWake:true,migration:11,errors})});
  } finally {await browser.close();}
});
