import { expect, test } from '@playwright/test';
import { createWorld, serializeWorld, deserializeWorld, validateWorld } from '../../src/sim/index';
import { addGroundMaterial, refreshStock } from '../../src/sim/materials';
import { world, observeErrors, panel, tool, cell, expectWorld, saveKey } from './helpers';
import { editBill } from './player-actions';
import { withoutPostV10Fields } from '../scenarios/legacy-save';
import { ROT_DAYS, rotAge } from '../../src/sim/food-preservation';
import { TICKS_PER_DAY } from '../../src/sim/types';

test('cuisine par interface : construction, facture, ingrédients portés, reprise et repas rangés',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);
  try {
    const initial=createWorld(42,32,32);initial.tiles=initial.tiles.map(()=>({terrain:'grass'}));initial.resources=[];initial.piles=[];
    initial.pawns.forEach(p=>{p.hunger=100;p.rest=100;p.priorities={gather:0,build:1,haul:1,grow:0,cook:0};});
    addGroundMaterial(initial,'wood',50,{x:14,z:17},'wood');addGroundMaterial(initial,'food',7,{x:21,z:13},'berries');addGroundMaterial(initial,'food',23,{x:21,z:15},'rice');refreshStock(initial);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?size=32&seed=42&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
    await tool(page,'campfire');await cell(page,15,14);
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.filter(s=>s.kind==='campfire').length,{timeout:15000}).toBe(1);
    await page.locator('[data-speed="0"]').click();
    await panel(page,'work');
    for(const p of initial.pawns)await page.locator(`select[data-owner="${p.id}"][data-work="haul"]`).selectOption('0');
    await page.locator(`select[data-owner="${initial.pawns[0]!.id}"][data-work="cook"]`).selectOption('1');
    await tool(page,'stockpile');await page.locator('#stockpile-wood').uncheck();await cell(page,17,13);
    await page.keyboard.press('Escape');await cell(page,15,14);
    await expect(page.locator('#fire-fuel')).toContainText('Allumé');await page.locator('#add-cooking-bill').click();
    const station=(await world(page)).structures.find(s=>s.kind==='campfire')!,bill=station.bills![0]!;
    await editBill(page,bill.id,{...bill,target:2});
    await expect(page.locator('[data-bill-status]')).toContainText('2 restant');
    await page.locator('[data-speed="6"]').click();
    // Observe and press the real Pause button in one callback to retain this short phase.
    await page.waitForFunction(()=>{
      if(!window.__lisiere.world.pawns.some(p=>p.cooking?.phase==='work'&&p.cooking.progress>=10))return false;
      (document.querySelector('[data-speed="0"]') as HTMLButtonElement).click();return true;
    },undefined,{polling:50,timeout:20000});
    await expect(page.locator('#pause-banner')).toBeVisible();
    const cooking=await world(page),chef=cooking.pawns.find(p=>p.cooking)!;
    expect(chef.cooking?.phase).toBe('work');expect(chef).toMatchObject({x:15,z:13,state:'working'});
    expect(cooking.piles.filter(p=>p.kind==='food').reduce((n,p)=>n+p.quantity,0)).toBe(30);
    expect(validateWorld(cooking)).toEqual([]);
    await expect(page.locator('[data-bill-reason]')).toContainText('Prépare un repas simple');
    await page.locator(`[data-pawn="${chef.id}"]`).click();
    await expect(page.locator('#selected-action')).toContainText('Prépare un repas simple');
    await expect(page.locator('#selected-action')).not.toContainText('Aucun travail');
    await cell(page,15,14);
    await page.screenshot({path:'artifacts/cooking-work.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,cooking);
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>{const w=await world(page);return w.piles.filter(p=>p.item==='simple-meal'&&p.owner.type==='ground').reduce((n,p)=>n+p.quantity,0);},{timeout:20000}).toBe(2);
    await page.locator('[data-speed="0"]').click();await cell(page,15,14);
    await expect(page.locator('[data-bill-status]')).toContainText('0 restant');
    await expect(page.locator('[data-bill-reason]')).toContainText('Quantité demandée terminée');
    await expect(page.locator('#food-items [data-item="simple-meal"] strong')).toHaveText('2');
    const finished=await world(page);
    expect(finished.piles.filter(p=>p.item==='simple-meal').map(p=>p.owner)).toEqual([{type:'ground',x:17,z:13}]);
    expect(finished.piles.filter(p=>p.item==='rice'||p.item==='berries').reduce((n,p)=>n+p.quantity,0)).toBe(10);
    expect(validateWorld(finished)).toEqual([]);
    expect(finished.piles.filter(p=>p.item==='simple-meal').every(p=>p.rot&&rotAge(p,finished.tick)>0)).toBe(true);
    await page.locator('#fire-auto-refuel').uncheck();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===station.id)?.fuel?.autoRefuel).toBe(false);
    await page.locator('#add-cooking-bill').click();
    const added=(await world(page)).structures.find(s=>s.id===station.id)!.bills![1]!;
    await page.locator(`[data-bill="${added.id}"]`).getByRole('button',{name:'Monter la facture'}).click();
    await expect(page.locator('[data-bill]').first()).toHaveAttribute('data-bill',String(added.id));
    await page.locator(`[data-bill="${added.id}"]`).getByRole('button',{name:'Supprimer la facture'}).click();
    await expect(page.locator('[data-bill]')).toHaveCount(1);
    await expect(page.locator('#fps-counter')).toBeVisible();
    await page.screenshot({path:'artifacts/cooking-complete.png'});
    expect(errors).toEqual([]);
    await testInfo.attach('cooking-state',{contentType:'application/json',body:JSON.stringify({backend:await page.evaluate(()=>window.__lisiere.backend),tick:finished.tick,workCheckpoint:cooking.tick,raw:10,meals:2,errors})});
  } finally {await browser.close();}
});

test('conservation dans le worker : migration V10, inspection de fraîcheur, expiration et sauvegarde refusée sans remplacement',async({playwright},testInfo)=>{
  test.setTimeout(60000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  page.setDefaultTimeout(10000);
  try {
    const initial=createWorld(42,32,32);initial.tiles=initial.tiles.map(()=>({terrain:'grass'}));initial.resources=[];initial.piles=[];
    initial.pawns.forEach((p,i)=>{p.x=11+i;p.z=12;p.hunger=100;p.rest=100;p.priorities={gather:0,build:0,haul:0,grow:0,cook:0};});
    addGroundMaterial(initial,'food',10,{x:17,z:16},'berries');refreshStock(initial);
    const old=withoutPostV10Fields(JSON.parse(serializeWorld(initial)));old.schemaVersion=10;delete old.deconstructed;
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:JSON.stringify(old)});
    await page.goto('/?size=32&seed=42&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();
    await expect.poll(async()=>(await world(page)).schemaVersion).toBe(24);
    expect(await world(page)).toEqual(deserializeWorld(JSON.stringify(old)));await page.keyboard.press('Escape');await cell(page,17,16);
    await expect(page.locator('#cell-materials')).toContainText('pourrit dans 14.0 j');
    const aged=structuredClone(initial);aged.piles[0]!.rot={progress:ROT_DAYS.berries*TICKS_PER_DAY-120,atTick:0};
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(aged)});
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,aged);
    await page.keyboard.press('Escape');await cell(page,17,16);await expect(page.locator('#cell-materials')).toContainText('pourrit dans 0.5 h');
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).spoiled.berries,{timeout:12000}).toBe(10);
    await page.locator('[data-speed="0"]').click();await expect(page.locator('#cell-materials')).toBeEmpty();
    const expired=await world(page);expect(expired.stock.food).toBe(0);expect(expired.piles).toEqual([]);expect(validateWorld(expired)).toEqual([]);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,expired);
    const invalid=structuredClone(aged);invalid.piles[0]!.rot!.progress=-1;
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:JSON.stringify(invalid)});
    await panel(page,'menu');await page.locator('#load').click();await expect(page.getByRole('status')).toHaveClass(/error/);await expectWorld(page,expired);
    expect(errors).toEqual([]);await testInfo.attach('preservation-state',{contentType:'application/json',body:JSON.stringify({tick:expired.tick,spoiled:expired.spoiled,migration:10,schema:expired.schemaVersion,errors})});
  } finally {await browser.close();}
});
