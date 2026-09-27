import {readFileSync} from 'node:fs';
import {expect,test} from '@playwright/test';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {expectWorld,observeErrors,panel,pause,pawnTab,saveKey,world} from './helpers';

test('V125 : insultes lisibles dans Social et Besoins, puis sauvegarde native exacte',async({playwright})=>{
  test.setTimeout(90_000);
  const raw=readFileSync(new URL('../../public/test-saves/v125/insulte-bagarre.json',import.meta.url),'utf8');
  const prepared=deserializeWorld(raw),[speaker,victim]=prepared.pawns;
  expect(validateWorld(prepared)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:raw});
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,prepared);
    await page.locator(`[data-pawn="${victim!.id}"]`).click();
    await pawnTab(page,'social');
    await expect(page.locator(`[data-social-pawn="${speaker!.id}"]`)).toContainText('Insulte');
    await expect(page.locator(`[data-social-pawn="${speaker!.id}"]`)).toContainText(' : -');
    await pawnTab(page,'needs');
    await expect(page.locator('#mood-inspection')).toHaveAttribute('open','');
    await expect(page.locator(`[data-thought="insult-${speaker!.id}"]`)).toContainText('Insulté par Ada');
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();
    await expectWorld(page,prepared);
    expect(validateWorld(await world(page))).toEqual([]);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toContain('WebGPU');
    expect(errors).toEqual([]);
    await page.screenshot({path:test.info().outputPath('social-conflict-v125.png')});
  }finally{await browser.close();}
});
