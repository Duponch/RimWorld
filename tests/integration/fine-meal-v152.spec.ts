import {readFileSync} from 'node:fs';
import {expect,test} from '@playwright/test';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {SCHEMA_VERSION} from '../../src/sim/types.ts';
import {cell,expectWorld,observeErrors,panel,pause,pawnTab,saveKey,world} from './helpers.ts';
import {editBill,revealCells} from './player-actions.ts';

test('V152 prepared milk and rice become a fine meal through the UI and a real ingestion',async({page})=>{
  test.setTimeout(120000);
  const raw=readFileSync(new URL('../../public/test-saves/v152/repas-fin.json',import.meta.url),'utf8');
  const prepared=deserializeWorld(raw),cook=prepared.pawns[0]!,eater=prepared.pawns[1]!;
  const stove=prepared.structures.find(s=>s.kind==='fueled-stove')!;
  // The prepared save supplies a built/fueled stove, two people and raw food only.
  // Bill creation, physical collection, work, output and ingestion occur below.
  expect(JSON.parse(raw).schemaVersion).toBe(152);
  expect(prepared.schemaVersion).toBe(SCHEMA_VERSION);
  expect(prepared.piles.filter(p=>p.item==='milk'||p.item==='rice').map(p=>[p.item,p.quantity])).toEqual([['milk',5],['rice',5]]);
  expect(prepared.piles.some(p=>p.item==='fine-meal')).toBe(false);
  expect(stove.bills).toEqual([]);
  expect(stove.fuel!.ticks).toBeGreaterThan(0);
  expect(cook.skills.cooking!.level).toBeGreaterThanOrEqual(6);
  expect(validateWorld(prepared)).toEqual([]);

  const errors=observeErrors(page);
  await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:raw});
  await page.goto('/?scenario=camp&size=32&e2e');
  await expect(page.locator('#loading')).toHaveCount(0);
  await pause(page);
  await panel(page,'menu');await page.locator('#load').click();
  await expect(page.locator('#notice')).toContainText('Sauvegarde rechargée');await expectWorld(page,prepared);
  await page.keyboard.press('Escape');
  await revealCells(page,[stove]);await cell(page,stove.x,stove.z);
  const add=page.locator('[data-add-recipe="fine-meal"]');
  await expect(add).toBeEnabled();await expect(add).toContainText('plat raffiné');
  await add.click();
  await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===stove.id)?.bills?.length).toBe(1);
  const bill=(await world(page)).structures.find(s=>s.id===stove.id)!.bills![0]!;
  expect(bill.recipe).toBe('fine-meal');
  await expect(page.locator(`[data-bill="${bill.id}"] .bill-cost`)).toContainText('5 protéines (viande ou lait) + 5 végétaux · Cuisine 6');
  await editBill(page,bill.id,{...bill,filters:{...bill.filters,'hare-meat':false,milk:true,rice:true},destination:'drop'});
  await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===stove.id)?.bills?.[0]?.destination).toBe('drop');
  await expect(page.locator(`[data-bill="${bill.id}"] [data-field="milk"]`)).toBeChecked();
  await expect(page.locator(`[data-bill="${bill.id}"] [data-field="hare-meat"]`)).not.toBeChecked();
  await panel(page,'work');
  await page.locator(`select[data-owner="${cook.id}"][data-work="cook"]`).selectOption('1');
  await page.keyboard.press('Escape');
  await page.locator('[data-speed="6"]').click();
  // Pause through the real speed control at a visible work phase, not by editing
  // the worker state. This gives a continuation checkpoint before consumption.
  await page.waitForFunction(id=>{
    const pawn=window.__lisiere.world.pawns.find(p=>p.id===id);
    if(pawn?.cooking?.recipe!=='fine-meal'||pawn.cooking.phase!=='work'||pawn.cooking.progress<10)return false;
    (document.querySelector('[data-speed="0"]') as HTMLButtonElement).click();return true;
  },cook.id,{polling:50,timeout:30000});
  await expect(page.locator('#pause-banner')).toBeVisible();
  const working=await world(page),task=working.pawns.find(p=>p.id===cook.id)!.cooking!;
  expect(task.ingredients.reduce((sum,i)=>sum+i.quantity,0)).toBe(10);
  expect(task.ingredients.every(i=>i.stage==='placed')).toBe(true);
  expect(working.piles.some(p=>p.item==='fine-meal')).toBe(false);
  expect(validateWorld(working)).toEqual([]);
  await panel(page,'menu');await page.locator('#save').click();
  await expect(page.locator('#notice')).toContainText('Colonie sauvegardée');
  await page.locator('#load').click();await expect(page.locator('#notice')).toContainText('Sauvegarde rechargée');
  await expectWorld(page,working);
  await page.keyboard.press('Escape');
  await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(id=>{
    const w=window.__lisiere.world;
    if(w.pawns.find(p=>p.id===id)?.cooking||!w.piles.some(p=>p.item==='fine-meal'))return false;
    (document.querySelector('[data-speed="0"]') as HTMLButtonElement).click();return true;
  },cook.id,{polling:50,timeout:30000});
  await expect(page.locator('#pause-banner')).toBeVisible();
  const cooked=await world(page);
  expect(cooked.piles.filter(p=>p.item==='fine-meal').reduce((n,p)=>n+p.quantity,0)).toBe(1);
  expect(cooked.piles.filter(p=>p.item==='milk'||p.item==='rice').reduce((n,p)=>n+p.quantity,0)).toBe(0);
  expect(cooked.structures.find(s=>s.id===stove.id)!.fuel!.burned).toBeGreaterThan(0);
  expect(cooked.structures.find(s=>s.id===stove.id)!.bills![0]!.target).toBe(0);
  expect(validateWorld(cooked)).toEqual([]);
  await expect(page.locator('#food-items [data-item="fine-meal"]')).toContainText('Plat raffiné');
  await page.locator('[data-speed="6"]').click();
  await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===eater.id)?.memories.some(m=>m.kind==='ate-fine-meal'),{timeout:30000,intervals:[100]}).toBe(true);
  await pause(page);
  const eaten=await world(page);
  expect(eaten.piles.some(p=>p.item==='fine-meal')).toBe(false);
  expect(eaten.pawns.find(p=>p.id===eater.id)!.hunger).toBeGreaterThan(prepared.pawns[1]!.hunger);
  expect(validateWorld(eaten)).toEqual([]);
  await page.locator(`[data-pawn="${eater.id}"]`).click();await pawnTab(page,'needs');
  await expect(page.locator('[data-thought="ate-fine-meal"]')).toContainText('+5');
  await panel(page,'menu');await page.locator('#save').click();
  await expect(page.locator('#notice')).toContainText('Colonie sauvegardée');
  await page.locator('#load').click();await expect(page.locator('#notice')).toContainText('Sauvegarde rechargée');
  await expectWorld(page,eaten);
  expect(errors).toEqual([]);
});
