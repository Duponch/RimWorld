import { expect,test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization';
import { expectWorld,observeErrors,panel,pawnTab,pause,saveKey,world } from './helpers';

test('V134: mots gentils, trait et humeur sont visibles après échange et reprise WebGPU',async({playwright})=>{
  test.setTimeout(90_000);
  const raw=readFileSync('public/test-saves/v134/mots-gentils.json','utf8');
  const prepared=deserializeWorld(raw),[speaker,victim]=prepared.pawns;
  expect(validateWorld(prepared)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  try{
    const errors=observeErrors(page);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:raw});
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,prepared);
    await page.locator(`[data-pawn="${speaker!.id}"]`).click();await pawnTab(page,'bio');
    await expect(page.locator('[data-trait="kind"]')).toContainText('Aimable');
    await page.locator(`[data-pawn="${victim!.id}"]`).click();await pawnTab(page,'social');
    await expect(page.locator(`[data-social-pawn="${speaker!.id}"]`)).toHaveAttribute('title',/Mots gentils/);
    await pawnTab(page,'needs');
    await expect(page.locator(`[data-thought="kind-words-${speaker!.id}"]`)).toContainText('Mots gentils');
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();
    await expectWorld(page,prepared);
    expect(validateWorld(await world(page))).toEqual([]);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toContain('WebGPU');
    expect(errors).toEqual([]);
  }finally{await browser.close();}
});
