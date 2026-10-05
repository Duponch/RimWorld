import {readFileSync} from 'node:fs';
import {expect,test} from '@playwright/test';
import {isColonist} from '../../src/sim/affiliation.ts';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {decodeStoredSave} from '../../src/ui/save-storage-codec.ts';
import {TEST_COLONY_COUNT} from '../test-colony-count.ts';
import {writeTestFileSync} from '../test-output.ts';
import {expectWorld,observeErrors,panel,pause,pawnTab,saveKey,world} from './helpers.ts';

test('Les Aulnes loads through the catalogue, lives at two speeds and saves an exact continuation',async({playwright},info)=>{
  test.setTimeout(120_000);
  const initial=deserializeWorld(await decodeStoredSave(readFileSync('public/test-saves/v221/les-aulnes.json','utf8')));
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1600,height:1000}}),errors=observeErrors(page);
  const proof:Record<string,unknown>={complete:false,initialTick:initial.tick};
  try{
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    if(await front.isHidden()){await panel(page,'menu');await page.locator('#browse-saves').click();}
    else await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    await front.getByRole('button',{name:'Colonies de test'}).click();
    await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);
    await front.locator('input[name="test-colony"][value="established-colony-v221"]').check();
    await page.screenshot({path:info.outputPath('catalogue.png')});
    await front.getByRole('button',{name:'Charger cette colonie'}).click();await expectWorld(page,initial);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    proof.hardware=await page.evaluate(async()=>{const adapter=await navigator.gpu?.requestAdapter(),info=adapter?.info;
      return {vendor:info?.vendor,architecture:info?.architecture,description:info?.description,
        fallback:(info as unknown as {isFallbackAdapter?:boolean}|undefined)?.isFallbackAdapter??null};});
    expect(JSON.stringify(proof.hardware)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software adapter|basic render driver/i);
    await page.locator('#wall-cutaway').click();await page.screenshot({path:info.outputPath('village-isometric.png')});
    await page.locator('#camera-mode').click();await expectWorld(page,initial);await page.screenshot({path:info.outputPath('village-perspective.png')});
    const resident=initial.pawns.find(p=>isColonist(p)&&!p.visitor&&!p.prisoner&&p.state!=='dead')!;
    await page.locator(`[data-pawn="${resident.id}"]`).click();await pawnTab(page,'bio');
    await page.screenshot({path:info.outputPath('resident-bio.png')});await pawnTab(page,'social');
    await page.screenshot({path:info.outputPath('resident-social.png')});await page.keyboard.press('Escape');
    await panel(page,'world');await page.screenshot({path:info.outputPath('world.png')});await page.keyboard.press('Escape');
    for(const [speed,ticks] of [[1,80],[6,600]] as const){
      const before=await world(page),started=performance.now();await page.locator(`[data-speed="${speed}"]`).click();
      await page.waitForFunction(target=>window.__lisiere.world.tick>=target,before.tick+ticks,{timeout:30_000});await pause(page);
      const after=await world(page);expect(validateWorld(after)).toEqual([]);
      expect(after.pawns.filter(p=>isColonist(p)&&!p.visitor&&!p.prisoner&&p.state!=='dead')).toHaveLength(7);
      expect(after.structures.filter(s=>s.kind==='mini-turret').every(s=>s.turret?.holdFire===false&&s.power?.on===true)).toBe(true);
      const milliseconds=performance.now()-started;
      proof[`speed${speed}`]={before:before.tick,after:after.tick,jobs:after.jobs.length,milliseconds,
        confirmedTicksPerSecond:(after.tick-before.tick)*1000/milliseconds};
    }
    const confirmed=await world(page);await panel(page,'menu');await page.locator('#save').click();
    await expect.poll(()=>page.evaluate(key=>{const raw=window.__lisiere.saveRepository.peekItem(key);return raw?JSON.parse(raw).tick:null;},saveKey)).toBe(confirmed.tick);
    const saved=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);expect(deserializeWorld(saved!)).toEqual(confirmed);
    await page.locator('#load').click();await expectWorld(page,confirmed);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await page.waitForFunction(target=>window.__lisiere.world.tick>=target,confirmed.tick+200);await pause(page);
    const resumed=await world(page);expect(validateWorld(resumed)).toEqual([]);proof.finalTick=resumed.tick;
    expect(await page.evaluate(()=>window.__lisiere.incident)).toEqual({simulationStopped:false,graphicsFault:false,waiting:0});
    expect(errors).toEqual([]);proof.complete=true;
  }finally{
    proof.errors=errors;proof.incident=await page.evaluate(()=>window.__lisiere.incident).catch(()=>undefined);
    await page.screenshot({path:info.outputPath('final-state.png')}).catch(()=>undefined);
    writeTestFileSync(info.outputPath('proof.json'),JSON.stringify(proof,null,2));await browser.close();
  }
});
