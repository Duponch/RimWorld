import {readFileSync} from 'node:fs';
import {expect,test} from '@playwright/test';
import {applyCommand,stepWorld} from '../../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {decodeStoredSave} from '../../src/ui/save-storage-codec.ts';
import {writeTestFileSync} from '../test-output.ts';
import {expectWorld,observeErrors,panel,pause,saveKey,world} from './helpers.ts';

test('a real mechanical breach publishes, saves and resumes while both attackers recover',async({playwright},info)=>{
  test.setTimeout(75_000);
  const initial=deserializeWorld(await decodeStoredSave(readFileSync('public/test-saves/v219/ranged-mech.json','utf8')));
  expect(applyCommand(initial,{type:'draft',pawnIds:initial.pawns.map(p=>p.id),enabled:true}).ok).toBe(true);
  // Authentic public scene prefix, with one player command. No wall damage,
  // actor, recovery, RNG or time is injected to prepare the imminent breach.
  for(let i=0;i<1600&&!initial.structures.some(s=>s.id===382&&(s.damage??0)>=180);i++)stepWorld(initial);
  expect(initial.tick).toBe(271548);expect(validateWorld(initial)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  const proof:Record<string,unknown>={complete:false,prefix:{source:'public/test-saves/v219/ranged-mech.json',tick:initial.tick,wall:initial.structures.find(s=>s.id===382)}};
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    proof.backend=await page.evaluate(()=>window.__lisiere.backend);expect(proof.backend).toBe('WebGPU');
    proof.hardware=await page.evaluate(async()=>{
      const adapter=await navigator.gpu?.requestAdapter(),info=adapter?.info;
      return {vendor:info?.vendor,architecture:info?.architecture,description:info?.description,
        fallback:(info as unknown as {isFallbackAdapter?:boolean}|undefined)?.isFallbackAdapter??null};
    });
    expect(JSON.stringify(proof.hardware)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software adapter|basic render driver/i);
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(()=>!window.__lisiere.world.structures.some(s=>s.id===382),undefined,{timeout:20_000});
    await pause(page);const breached=await world(page);expect(validateWorld(breached)).toEqual([]);
    expect(breached.destroyed?.count).toBe(1);
    expect(breached.mechanoids?.some(m=>m.melee?.strike?.targetId===382)).toBe(true);
    expect(breached.mechanoids?.some(m=>m.melee?.order?.structure&&m.melee.order.targetId===382)).toBe(false);
    proof.breach={tick:breached.tick,attackers:breached.mechanoids,destroyed:breached.destroyed};
    await page.screenshot({path:info.outputPath('breach-confirmed.png')});
    await panel(page,'menu');await page.locator('#save').click();
    await expect.poll(()=>page.evaluate(key=>{const raw=window.__lisiere.saveRepository.peekItem(key);return raw?JSON.parse(raw).tick:null;},saveKey)).toBe(breached.tick);
    const saved=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);expect(deserializeWorld(saved!)).toEqual(breached);
    await page.locator('#load').click();await expectWorld(page,breached);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(tick=>window.__lisiere.world.tick>=tick,breached.tick+100);await pause(page);
    const continued=await world(page);expect(validateWorld(continued)).toEqual([]);proof.continuation={tick:continued.tick,incident:await page.evaluate(()=>window.__lisiere.incident)};
    expect(continued.structures.some(s=>s.id===382)).toBe(false);
    expect(await page.evaluate(()=>window.__lisiere.incident)).toEqual({simulationStopped:false,graphicsFault:false,waiting:0});
    expect(errors).toEqual([]);proof.complete=true;
  }finally{
    proof.errors=errors;proof.confirmed=await world(page).catch(()=>undefined);
    proof.incident=await page.evaluate(()=>window.__lisiere.incident).catch(()=>undefined);
    await page.screenshot({path:info.outputPath('final-state.png')}).catch(()=>undefined);
    writeTestFileSync(info.outputPath('proof.json'),JSON.stringify(proof,null,2));await browser.close();
  }
});
