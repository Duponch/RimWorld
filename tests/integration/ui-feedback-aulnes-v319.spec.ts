import {readFile} from 'node:fs/promises';
import {expect,test} from '@playwright/test';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {createMedicalRecord} from '../../src/sim/injury-state';
import {expectWorld,observeErrors,panel,pause,saveKey,world} from './helpers';
import {writeTestFile} from '../test-output';

test('V319 Aulnes: deliberate resource hints, native-title removal, selection and medical focus cycle',async({playwright})=>{
  test.setTimeout(140000);
  const source='public/test-saves/v284/les-aulnes-integrees.json';
  const original=deserializeWorld(await decodeStoredSave(await readFile(source,'utf8')));
  expect(original).toMatchObject({tick:8434,width:250,height:250});
  const prepared=structuredClone(original),people=prepared.pawns.filter(p=>!p.prisoner&&p.state!=='dead').slice(0,2);
  // Prepared medical display state only: no simulated exposure or gameplay gain.
  for(const pawn of people){pawn.health??=createMedicalRecord(prepared.tick);pawn.health.hypothermia=50000000;}
  expect(people).toHaveLength(2);expect(validateWorld(prepared)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chrome'}),page=await browser.newPage({baseURL:process.env.UI_FEEDBACK_V319_BASE_URL??'http://127.0.0.1:5393',viewport:{width:2560,height:1440}});
  page.setDefaultTimeout(15000);const errors=observeErrors(page);
  const load=async(data:string)=>{await page.evaluate(({key,data})=>window.__lisiere.saveRepository.setItem(key,data),{key:saveKey,data});await panel(page,'menu');await page.locator('#load').click();await page.keyboard.press('Escape');};
  try{
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);await pause(page);
    await load(serializeWorld(original));await expectWorld(page,original);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const resource=page.locator('.resource-ledger-heading').first(),tip=page.locator('#game-tooltip');
    await resource.hover();await page.waitForTimeout(700);await expect(tip).toBeHidden();
    await page.mouse.move(1280,850);await page.waitForTimeout(1100);await expect(tip).toBeHidden();
    await resource.hover();await expect(tip).toBeVisible();await expect(tip).not.toHaveText('');
    await expect(page.locator('[title]')).toHaveCount(0);await page.mouse.move(1280,850);
    await page.locator('.resource-list').evaluate(element=>element.dispatchEvent(new Event('selectstart',{bubbles:true,cancelable:true}))).then(allowed=>expect(allowed).toBe(false));
    await page.keyboard.press('Control+a');expect(await page.evaluate(()=>window.getSelection()?.toString())).toBe('');
    await panel(page,'menu');const name=page.locator('#save-name');
    // Existing editor IDs are optional here; editable controls have their own DOM lifecycle test.
    if(await name.count()){await name.fill('Aulnes V319');await expect(name).toHaveValue('Aulnes V319');}
    await page.keyboard.press('Escape');await expectWorld(page,original);
    await load(serializeWorld(prepared));await expectWorld(page,prepared);
    const alert=page.locator('[data-alert="hypothermia"]');await expect(alert).toContainText('2 colon(s)');
    const ids=[...people].sort((a,b)=>a.id-b.id).map(p=>p.id),selected:number[]=[];
    for(const id of [...ids,ids[0]!]){
      await alert.click();await expect(page.locator('[data-colonist-tab="health"]')).toHaveAttribute('aria-selected','true');
      await expect.poll(async()=>page.evaluate(id=>{
        const point=window.__lisiere.projectPawn(id);return !!point&&Math.abs(point.x-innerWidth/2)<160&&Math.abs(point.y-innerHeight/2)<200;
      },id)).toBe(true);
      const pawn=prepared.pawns.find(p=>p.id===id)!;await expect(page.locator('#selected-name')).toContainText(pawn.name);selected.push(id);
    }
    await expectWorld(page,prepared);expect(errors).toEqual([]);
    await page.screenshot({path:test.info().outputPath('aulnes-feedback.png')});
    await writeTestFile(test.info().outputPath('report.json'),JSON.stringify({source,tick:original.tick,selected,prepared:['two historical colonists hypothermia display set to 50000000'],errors,limits:'UI focus on a declared prepared medical state; no natural hypothermia, simulation throughput or FPS claim.'},null,2));
  }catch(error){if(await page.locator('.game-shell').count())await writeTestFile(test.info().outputPath('failed-world.json'),serializeWorld(await world(page)));throw error;}
  finally{await page.close();await browser.close();}
});
