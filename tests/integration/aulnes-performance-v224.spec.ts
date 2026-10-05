import {readFileSync} from 'node:fs';
import {expect,test} from '@playwright/test';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {decodeStoredSave,storedSaveMetadata} from '../../src/ui/save-storage-codec.ts';
import {TEST_COLONY_COUNT} from '../test-colony-count.ts';
import {expectWorld,observeErrors,panel,pause,saveKey,settledCells,world} from './helpers.ts';

test('corrected Aulnes reference loads through the catalogue and retains exact real sparse-worker save/recovery',async({playwright},info)=>{
  test.setTimeout(120_000);
  const initial=deserializeWorld(await decodeStoredSave(readFileSync('public/test-saves/v224/les-aulnes-sieges.json','utf8')));
  expect(initial.tick).toBe(6934);expect(validateWorld(initial)).toEqual([]);
  const chairs=initial.structures.filter(s=>s.kind==='armchair'&&[124,125,126].includes(s.x)&&[116,117].includes(s.z));
  expect(chairs).toHaveLength(6);expect(chairs.every(s=>s.orientation===2)).toBe(true);
  const outdoor=initial.structures.filter(s=>s.kind==='dining-chair'&&[124,127].includes(s.x)&&s.z===157);
  expect(outdoor.map(s=>[s.x,s.orientation])).toEqual([[124,1],[127,3]]);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5205',viewport:{width:1600,height:1000}}),errors=observeErrors(page);
  try{
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    await front.getByRole('button',{name:'Colonies de test'}).click();
    await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);
    await front.locator('input[name="test-colony"][value="aulnes-seating-v224"]').check();
    await front.getByRole('button',{name:'Charger cette colonie'}).click();await expectWorld(page,initial);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const hardware=await page.evaluate(async()=>{const adapter=await navigator.gpu?.requestAdapter();return {present:!!adapter,info:adapter?.info};});
    expect(hardware.present).toBe(true);expect(JSON.stringify(hardware)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software adapter|basic render driver/i);
    await page.locator('#wall-cutaway').click();
    for(const [name,cells] of [
      ['television',chairs],['outdoor',outdoor],
      ['research',initial.structures.filter(s=>s.kind==='hi-tech-research-bench')],
      ['dining',initial.structures.filter(s=>s.kind==='dining-chair'&&s.z===125&&[140,143].includes(s.x))],
    ] as const){
      const target={x:cells.reduce((sum,c)=>sum+c.x,0)/cells.length,z:cells.reduce((sum,c)=>sum+c.z,0)/cells.length};
      for(let attempt=0;attempt<24;attempt++){
        const pose=await page.evaluate(target=>{const b=document.querySelector('#viewport canvas')!.getBoundingClientRect(),p=window.__lisiere.projectCell(target.x,target.z),next=window.__lisiere.projectCell(target.x+1,target.z);return {x:b.left+b.width*.6,y:b.top+b.height*.48,dx:b.width*.6-p.x,dy:b.height*.48-p.y,scale:Math.hypot(next.x-p.x,next.y-p.y)};},target);
        if(Math.hypot(pose.dx,pose.dy)>16){await page.mouse.move(pose.x,pose.y);await page.mouse.down({button:'middle'});await page.mouse.move(pose.x+Math.max(-300,Math.min(300,pose.dx)),pose.y+Math.max(-220,Math.min(220,pose.dy)),{steps:8});await page.mouse.up({button:'middle'});}
        else if(pose.scale<55){await page.mouse.move(pose.x,pose.y);await page.mouse.wheel(0,-400);}
        else break;
        await settledCells(page,[target]);
      }
      const scale=await page.evaluate(target=>{const a=window.__lisiere.projectCell(target.x,target.z),b=window.__lisiere.projectCell(target.x+1,target.z);return Math.hypot(b.x-a.x,b.y-a.y);},target);
      expect(scale).toBeGreaterThan(50);await page.screenshot({path:info.outputPath(`${name}.png`)});
    }
    for(const [speed,ticks]of [[1,18],[6,120]]as const){
      const before=await world(page);await page.locator(`[data-speed="${speed}"]`).click();
      await page.waitForFunction(target=>window.__lisiere.world.tick>=target,before.tick+ticks,{timeout:30_000});await pause(page);
      expect(validateWorld(await world(page))).toEqual([]);
    }
    const confirmed=await world(page);await panel(page,'menu');await page.locator('#save').click();
    await expect.poll(async()=>{const saved=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);return saved?storedSaveMetadata(saved)?.tick:null;}).toBe(confirmed.tick);
    const saved=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);
    expect(deserializeWorld(await decodeStoredSave(saved!))).toEqual(confirmed);
    await page.locator('#load').click();await expectWorld(page,confirmed);await page.keyboard.press('Escape');
    const before=await world(page);await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(tick=>window.__lisiere.world.tick>=tick,before.tick+18);await pause(page);
    expect(validateWorld(await world(page))).toEqual([]);expect(errors).toEqual([]);
  }finally{await browser.close();}
});
