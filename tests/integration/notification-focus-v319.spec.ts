import {expect,test,type Page} from '@playwright/test';
import {serializeWorld,validateWorld} from '../../src/sim/index';
import {notificationFocusCamp} from '../helpers/notification-focus-v319';
import {expectWorld,observeErrors,panel,pause,saveKey,world} from './helpers';
import {testOutputPath,writeTestFile} from '../test-output';

async function centeredOn(page:Page,id:number){
  await expect.poll(()=>page.evaluate(id=>{const actor=window.__lisiere.world.pawns.find(p=>p.id===id)!;
    const point=window.__lisiere.projectCell(actor.x,actor.z),canvas=document.querySelector('#viewport canvas')!.getBoundingClientRect();
    return Math.hypot(point.x-canvas.width/2,point.y-canvas.height/2);
  },id)).toBeLessThan(1);
}

test('V319 prepared native notifications: hypothermia cycling, actual downed completed raid, separate information, management contexts and exact reload',async({playwright})=>{
  test.setTimeout(120000);const prepared=notificationFocusCamp(),initial=prepared.world;
  const browser=await playwright.chromium.launch({channel:process.env.LISIERE_BROWSER_CHANNEL??'chrome',args:[]});
  const page=await browser.newPage({baseURL:process.env.LISIERE_BASE_URL??'http://127.0.0.1:5173',viewport:{width:2560,height:1440}}),errors=observeErrors(page);
  page.setDefaultTimeout(15000);
  const evidence:Record<string,unknown>={prepared:true,seed:319,people:prepared.people,raiderId:prepared.raiderId};
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&size=32&seed=319&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    evidence.backend=await page.evaluate(()=>window.__lisiere.backend);expect(evidence.backend).toBe('WebGPU');
    const cold=page.locator('[data-alert="hypothermia"]');await expect(cold).toHaveAttribute('role','button');
    await cold.click();await centeredOn(page,prepared.people[0]!);await expect(page.locator('[data-colonist-tab="health"]')).toHaveAttribute('aria-selected','true');
    await cold.focus();await cold.press('Enter');await centeredOn(page,prepared.people[1]!);await expect(cold).toBeFocused();
    await cold.press('Space');await centeredOn(page,prepared.people[0]!);await expect(page.locator('dialog[open]')).toHaveCount(0);
    const raid=page.locator('#raid-letter');await expect(raid).toContainText('Assaut terminé');await raid.click();await centeredOn(page,prepared.raiderId);
    await expect(page.locator('#selected-name')).toContainText(initial.pawns.find(p=>p.id===prepared.raiderId)!.name);await expect(page.locator('#raid-dialog')).not.toBeVisible();
    await raid.click();await centeredOn(page,prepared.raiderId);await page.locator('#raid-details').click();await expect(page.locator('#raid-dialog')).toBeVisible();
    await page.locator('#locate-raid').click();await expect(page.locator('#raid-dialog')).not.toBeVisible();await centeredOn(page,prepared.raiderId);
    await page.screenshot({path:testOutputPath('artifacts/notification-v319-downed-raid.png')});
    await page.locator('[data-alert="beds"]').click();await expect(page.locator('#architect-panel')).toBeVisible();await expect(page.locator('[data-category="furniture"]')).toHaveClass(/active/);await page.keyboard.press('Escape');
    await page.locator('[data-alert="no-stockpile"]').click();await expect(page.locator('[data-tool="stockpile"]')).toHaveClass(/active/);await page.keyboard.press('Escape');
    const after=await world(page);expect(validateWorld(after)).toEqual([]);expect(serializeWorld(after)).toBe(serializeWorld(initial));
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await cold.click();await centeredOn(page,prepared.people[0]!);await raid.click();await centeredOn(page,prepared.raiderId);evidence.reloadTick=initial.tick;
    expect(errors).toEqual([]);evidence.errors=errors;await writeTestFile('artifacts/notification-v319.json',JSON.stringify(evidence,null,2));
  }finally{await browser.close();}
});
