import {expect,test} from '@playwright/test';
import {addMaterial} from '../../src/sim/materials.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {mentalCamp} from '../scenarios/mental-break.ts';
import {expectWorld,observeErrors,panel,pause,pawnTab,saveKey,world} from './helpers.ts';

test('V150 food binge: confirmed entry, physical meal, inspection and saved replay',async({playwright})=>{
  test.setTimeout(120000);
  const initial=mentalCamp(1),pawn=initial.pawns[0]!;
  pawn.rest=90;pawn.hunger=98;pawn.foodPolicyId=4;
  addMaterial(initial,'food',40,{type:'ground',x:pawn.x+2,z:pawn.z},'rice');
  const initialFood=initial.piles.filter(p=>p.kind==='food').reduce((sum,p)=>sum+p.quantity,0);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  try {
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const hardware=await page.evaluate(async()=>{
      const adapter=await navigator.gpu?.requestAdapter(),info=adapter?.info;
      return {adapterAvailable:!!adapter,vendor:info?.vendor??null,architecture:info?.architecture??null,
        device:info?.device??null,description:info?.description??null,
        isFallbackAdapter:(info as unknown as {isFallbackAdapter?:boolean}|undefined)?.isFallbackAdapter
          ??(adapter as unknown as {isFallbackAdapter?:boolean}|null)?.isFallbackAdapter??null};
    });
    expect(hardware.isFallbackAdapter).not.toBe(true);
    expect(JSON.stringify(hardware)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software adapter|basic render driver/i);
    await test.info().attach('food-binge-gpu',{contentType:'application/json',body:JSON.stringify({backend:'WebGPU',hardware,
      limit:!hardware.adapterAvailable?'Adaptateur de diagnostic indisponible ; seul le backend WebGPU est confirmé.'
        :hardware.isFallbackAdapter===null?'Indicateur de repli indisponible ; identité relevée, absence de repli non certifiée par ce signal.':null})});
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).pawns[0]!.mental?.crisis?.kind,{timeout:30000,intervals:[100]}).toBe('food-binge');
    await pause(page);
    await page.locator(`[data-pawn="${pawn.id}"]`).click();
    await expect(page.locator('#alerts')).toContainText('frénésie alimentaire');
    await pawnTab(page,'needs');
    await expect(page.locator('#mood-target')).toContainText('Frénésie alimentaire');
    await expect(page.locator('#toggle-draft')).toBeDisabled();
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=> (await world(page)).events.some(e=>e.message.includes('a mangé une portion')),{timeout:45000,intervals:[150]}).toBe(true);
    await pause(page);
    const eating=await world(page);
    expect(eating.pawns[0]!.mental?.crisis?.kind).toBe('food-binge');
    expect(eating.piles.filter(p=>p.kind==='food').reduce((sum,p)=>sum+p.quantity,0)).toBeLessThan(initialFood);
    expect(validateWorld(eating)).toEqual([]);
    await panel(page,'menu');await page.locator('#save').click();
    await expect.poll(()=>page.evaluate(key=>{
      const raw=window.__lisiere.saveRepository.peekItem(key);return raw?JSON.parse(raw).tick:null;
    },saveKey)).toBe(eating.tick);
    const saved=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);
    expect(saved).not.toBeNull();expect(deserializeWorld(saved!)).toEqual(eating);
    await page.locator('#load').click();await expectWorld(page,eating);await page.keyboard.press('Escape');
    expect(errors).toEqual([]);
  } finally {await browser.close();}
});
