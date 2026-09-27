import {readFileSync} from 'node:fs';
import {expect,test} from '@playwright/test';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {expectWorld,observeErrors,pause,saveKey,world} from './helpers';

test('produits animaux V120 : colonie préparée, jauges, fiches et reprise native WebGPU',async({playwright})=>{
  test.setTimeout(60000);
  const raw=readFileSync(new URL('../../public/test-saves/v120/produits-animaux.json',import.meta.url),'utf8');
  const prepared=deserializeWorld(raw);
  expect(validateWorld(prepared)).toEqual([]);
  const camel=prepared.wildlife!.animals.find(a=>a.species==='dromedary')!;
  const muffalo=prepared.wildlife!.animals.find(a=>a.species==='muffalo')!;
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:raw});
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);
    await page.locator('[data-panel="menu"]').click();
    await page.locator('#load').click();
    await expectWorld(page,prepared);

    await page.locator('[data-panel="animals"]').click();
    await expect(page.locator(`[data-domestic-details="${camel.id}"]`)).toContainText('Lait 100 %');
    await expect(page.locator(`[data-domestic-details="${muffalo.id}"]`)).toContainText('Laine 100 %');
    await page.locator(`[data-domestic-focus="${camel.id}"]`).click();
    await expect(page.locator('[data-animal-content="info"]')).toContainText('Lait : 100 % de maturité');
    await page.locator('[data-panel="animals"]').click();
    await page.locator(`[data-domestic-focus="${muffalo.id}"]`).click();
    await expect(page.locator('[data-animal-content="info"]')).toContainText('Laine de mufalo : 100 % de maturité');
    expect(validateWorld(await world(page))).toEqual([]);
    expect(errors).toEqual([]);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toContain('WebGPU');
  }finally{await browser.close();}
});
