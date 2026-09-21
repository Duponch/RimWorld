import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { mentalCamp } from '../scenarios/mental-break';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { observeErrors,panel,pawnTab,saveKey,world,expectWorld } from './helpers';

test('sad wander at 1x/6x: interrupted work, refused control, saved wandering, physical sleep and catharsis',async({playwright})=>{
  test.setTimeout(150000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]}),proof=[];
  try {for(const speed of [1,6]) {
    const initial=mentalCamp(),p=initial.pawns[0]!;
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(async()=>!!(await world(page)).pawns[0]!.mental?.crisis,{intervals:[100]}).toBe(true);
    await page.locator('[data-speed="0"]').click();const started=await world(page);expect(validateWorld(started)).toEqual([]);expect(started.jobs[0]!.reservedBy).toBeNull();
    await page.locator(`[data-pawn="${p.id}"]`).click();await expect(page.locator('#toggle-draft')).toBeDisabled();await expect(page.locator('#alerts')).toContainText('errance triste');
      await pawnTab(page,'needs');await expect(page.locator('#mood-target')).toContainText('Errance triste');
    await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(async()=>{const q=(await world(page)).pawns[0]!;return q.x!==started.pawns[0]!.x||q.z!==started.pawns[0]!.z;},{intervals:[100]}).toBe(true);await page.locator('[data-speed="0"]').click();
    const wandering=await world(page);expect(wandering.pawns[0]!.mental?.crisis).toBeDefined();expect(wandering.resources).toEqual(initial.resources);
    await page.screenshot({path:`artifacts/mental-break-v65-${speed}x.png`});await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,wandering);await page.keyboard.press('Escape');
    await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(async()=>(await world(page)).pawns[0]!.mental?.catharsis.length,{timeout:60000,intervals:[200]}).toBe(1);await page.locator('[data-speed="0"]').click();
    const recovered=await world(page),q=recovered.pawns[0]!;expect(q.mental?.crisis).toBeUndefined();expect(q.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:p.bedId});expect(validateWorld(recovered)).toEqual([]);
      await page.locator(`[data-pawn="${p.id}"]`).click();await expect(page.locator('#toggle-draft')).toBeEnabled();await pawnTab(page,'needs');await expect(page.locator('[data-thought="catharsis"]')).toContainText('+40');
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,recovered);await page.keyboard.press('Escape');
    await page.locator(`[data-pawn="${p.id}"]`).click();await page.locator('#toggle-draft').click();await expect.poll(async()=>!!(await world(page)).pawns[0]!.draft).toBe(true);expect(errors).toEqual([]);
    proof.push({speed,entryTick:started.tick,walkingTick:wandering.tick,recoveredTick:recovered.tick,walkSpeed:wandering.pawns[0]!.motion?.speedFactor,bed:q.bedId,catharsis:q.mental?.catharsis,errors});await page.close();
  }}finally{await browser.close();}
  writeFileSync('artifacts/mental-break-ui-v65.json',JSON.stringify({date:new Date().toISOString(),proof},null,2)+'\n');
});
