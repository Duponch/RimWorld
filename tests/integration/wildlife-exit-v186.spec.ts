import { readFileSync } from 'node:fs';
import { expect,test } from '@playwright/test';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization.ts';
import { expectWorld,observeErrors,panel,pause,world } from './helpers.ts';
import { TEST_COLONY_COUNT } from '../test-colony-count.ts';
import { testOutputPath,writeTestFile } from '../test-output.ts';

test('V186 public scene starts a physical exit, saves mid-route and retains the domestic animal',async({playwright})=>{
  test.setTimeout(120_000);
  const prepared=deserializeWorld(readFileSync('public/test-saves/v186/faune-affamee.json','utf8'));
  const [wild,healthy,pet]=prepared.wildlife!.animals;
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    await front.getByRole('button',{name:'Colonies de test'}).click();
    await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);
    await front.locator('input[name="test-colony"][value="faune-affamee-v186"]').check();
    await front.getByRole('button',{name:'Charger cette colonie'}).click();
    await expectWorld(page,prepared);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    await panel(page,'wildlife');
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{
      const a=window.__lisiere.world.wildlife?.animals.find(a=>a.id===id);
      if(!a?.exiting||!a.path.length||!a.motion)return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },wild!.id,{polling:'raf'});
    await pause(page);const walking=await world(page);
    expect(validateWorld(walking)).toEqual([]);expect(walking.wildlife!.exitedAnimals).toBeUndefined();
    await expect(page.locator(`[data-animal-activity="${wild!.id}"]`)).toContainText('Quitte la carte faute de nourriture');
    await page.locator(`[data-animal="${wild!.id}"] button`).click();
    await expect(page.locator('[data-animal-activity]').filter({hasText:'Quitte la carte faute de nourriture'})).not.toHaveCount(0);
    await page.screenshot({path:testOutputPath('artifacts/wildlife-exit-v186-walking.png')});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();
    await expectWorld(page,walking);
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).wildlife!.exitedAnimals,{timeout:30_000}).toBe(1);
    await pause(page);const ended=await world(page);
    expect(validateWorld(ended)).toEqual([]);
    expect(ended.wildlife!.animals.map(a=>a.id)).toEqual([healthy!.id,pet!.id]);
    expect(ended.piles.some(p=>p.kind==='corpse')).toBe(false);
    await panel(page,'wildlife');await expect(page.locator('[data-animal]')).toHaveCount(1);
    expect(errors).toEqual([]);
    await writeTestFile('artifacts/wildlife-exit-v186-browser.json',JSON.stringify({date:new Date().toISOString(),
      prepared:true,backend:await page.evaluate(()=>window.__lisiere.backend),savedTick:walking.tick,endedTick:ended.tick,
      departedId:wild!.id,retained:ended.wildlife!.animals.map(a=>a.id),exited:ended.wildlife!.exitedAnimals,errors},null,2));
  }finally{await browser.close();}
});
