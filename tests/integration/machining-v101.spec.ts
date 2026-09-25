import { expect, test } from '@playwright/test';
import { serializeWorld, validateWorld } from '../../src/sim/index';
import { addMaterial } from '../../src/sim/materials';
import { createMachiningFixture, prepareCompletedResearch } from '../scenarios/machining-v101';
import { cell, expectWorld, observeErrors, panel, pause, saveKey, world } from './helpers';
import { perform, revealCells } from './player-actions';

async function loadPrepared(page:import('@playwright/test').Page,initial:import('../../src/sim/types').World):Promise<void> {
  page.setDefaultTimeout(15000);
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(initial)});
  await page.goto('/?scenario=camp&size=32&e2e');
  await expect(page.locator('[data-speed="0"]')).toBeVisible();
  await expect(page.locator('#loading')).toHaveCount(0);
  await pause(page);await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
  await page.keyboard.press('Escape');
}

test('research UI requires Machining before Gunsmithing and performs the final Machining work',async({playwright})=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
  try{
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    const {world:initial}=createMachiningFixture();await loadPrepared(page,initial);
    await panel(page,'research');
    await expect(page.locator('[data-machining-start]')).toBeEnabled();
    await expect(page.locator('[data-gunsmithing-start]')).toBeDisabled();
    await expect(page.locator('[data-gunsmithing-start]')).toHaveAttribute('title','Nécessite Usinage');
    await page.locator('[data-machining-start]').click();
    await expect.poll(async()=>(await world(page)).research?.project).toBe('machining');
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).research?.machining?.completedAt,{timeout:30000}).toBeGreaterThan(initial.tick);
    await pause(page);
    await expect(page.locator('[data-machining-status]')).toContainText('Terminée');
    await expect(page.locator('[data-gunsmithing-start]')).toBeEnabled();
    const done=await world(page);expect(validateWorld(done)).toEqual([]);expect(errors).toEqual([]);
    await page.screenshot({path:'artifacts/machining-research-v101.png'});
  } finally {await browser.close();}
});

test('Architect builds a powered machining table; bill controls make two distinct guns and the pawn equips one',async({playwright})=>{
  test.setTimeout(240000);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
  try{
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    const {world:initial,pawn}=createMachiningFixture();prepareCompletedResearch(initial);await loadPrepared(page,initial);
    await panel(page,'architect');await page.locator('[data-category="production"]').click();
    const tool=page.locator('[data-tool="machining-table"]');await expect(tool).toBeVisible();
    await expect(tool).toContainText('Atelier d’usinage');await tool.click();
    await revealCells(page,[{x:15,z:8}]);await cell(page,15,8);
    await expect.poll(async()=>(await world(page)).jobs.some(j=>j.kind==='machining-table'&&j.x===15&&j.z===8)).toBe(true);
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{if(!window.__lisiere.world.structures.some(s=>s.kind==='machining-table'))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},undefined,{timeout:90000});
    await pause(page);
    const built=await world(page),station=built.structures.find(s=>s.kind==='machining-table')!;
    expect(station.power?.parentId).not.toBeNull();
    expect(built.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(90);
    expect(built.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0)).toBe(5);
    await page.keyboard.press('Escape');await revealCells(page,[station]);await cell(page,station.x,station.z);
    await expect(page.locator('#add-cooking-bill')).toBeVisible();
    await expect(page.locator('#add-bill-make-bolt-action-rifle')).toBeVisible();
    await page.locator('#add-cooking-bill').click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===station.id)?.bills?.length).toBe(1);
    await page.locator('#add-bill-make-bolt-action-rifle').click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===station.id)?.bills?.length).toBe(2);
    await expect(page.locator('.bill-cost')).toHaveCount(2);
    await expect(page.locator('.bill-cost').first()).toContainText('30 acier · 2 composants');
    await expect(page.locator('.bill-cost').last()).toContainText('60 acier · 3 composants');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{
      const piles=window.__lisiere.world.piles;
      if(!piles.some(p=>p.item==='revolver'&&p.owner.type==='ground')||!piles.some(p=>p.item==='bolt-action-rifle'&&p.owner.type==='ground'))return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },undefined,{timeout:150000});
    await pause(page);
    const crafted=await world(page),rifle=crafted.piles.find(p=>p.item==='bolt-action-rifle'&&p.owner.type==='ground')!;
    expect(crafted.piles.some(p=>p.item==='unfinished-gun')).toBe(false);
    expect(crafted.piles.filter(p=>p.item==='steel'||p.item==='component')).toEqual([]);
    for(const gun of crafted.piles.filter(p=>p.item==='revolver'||p.item==='bolt-action-rifle')){expect(gun.weapon?.hitPoints).toBeGreaterThan(0);expect(gun.weapon?.quality).toBeDefined();}
    await perform(page,{reason:'Équiper réellement le fusil fabriqué.',command:{type:'order-equipment',pawnId:pawn.id,itemId:rifle.id,action:'equip',queue:false}},{value:0});
    await page.locator('[data-speed="1"]').click();
    await expect.poll(async()=>(await world(page)).piles.find(p=>p.id===rifle.id)?.owner.type,{timeout:20000}).toBe('equipment');
    await pause(page);const final=await world(page);expect(validateWorld(final)).toEqual([]);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,final);
    await page.screenshot({path:'artifacts/machining-guns-v101.png'});
    expect(errors).toEqual([]);
  } finally {await browser.close();}
});

test('a real item-specific stockpile accepts the revolver and leaves the rifle outside',async({playwright})=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
  try{
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    const {world:initial,pawn}=createMachiningFixture();prepareCompletedResearch(initial);
    // Prepared goods stand in for the completed production fixture. The UI
    // still creates the policy and the colon performs the subsequent move.
    initial.piles=[];initial.stockpiles=[];pawn.priorities.haul=1;
    addMaterial(initial,'weapon',1,{type:'ground',x:17,z:12},'revolver');
    addMaterial(initial,'weapon',1,{type:'ground',x:18,z:12},'bolt-action-rifle');
    const revolver=initial.piles.find(p=>p.item==='revolver')!,rifle=initial.piles.find(p=>p.item==='bolt-action-rifle')!;
    await loadPrepared(page,initial);
    await panel(page,'architect');await page.locator('[data-category="zones"]').click();await page.locator('[data-tool="stockpile"]').click();
    const items=page.locator('#stockpile-items');
    await items.locator('[data-storage-item-toggle]').check();
    await items.getByRole('button',{name:'Tout refuser'}).click();
    await items.locator('summary').filter({hasText:'Armes'}).click();
    await items.locator('[data-storage-item="revolver"]').check();
    await expect(items.locator('[data-storage-item="bolt-action-rifle"]')).not.toBeChecked();
    await page.locator('#stockpile-priority').selectOption('3');
    await page.locator('#stockpile-capacity').fill('1');
    await revealCells(page,[{x:20,z:12}]);await cell(page,20,12);
    await expect.poll(async()=>(await world(page)).stockpiles.find(s=>s.x===20&&s.z===12)?.items).toEqual({revolver:true});
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(id=>{
      const pile=window.__lisiere.world.piles.find(p=>p.id===id);
      if(pile?.owner.type!=='ground'||pile.owner.x!==20||pile.owner.z!==12)return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },revolver.id,{timeout:50000});
    await pause(page);
    const moved=await world(page),stored=moved.piles.find(p=>p.id===revolver.id)!,outside=moved.piles.find(p=>p.id===rifle.id)!;
    expect(stored.owner).toEqual({type:'ground',x:20,z:12});
    expect(outside.owner).toEqual({type:'ground',x:18,z:12});
    expect(stored.weapon).toEqual(revolver.weapon);expect(outside.weapon).toEqual(rifle.weapon);
    await page.keyboard.press('Escape');await revealCells(page,[{x:20,z:12}]);await cell(page,20,12);
    await expect(page.locator('#selected-stockpile-items [data-storage-item-toggle]')).toBeChecked();
    await expect(page.locator('#selected-stockpile-items [data-storage-item="revolver"]')).toBeChecked();
    await expect(page.locator('#selected-stockpile-items [data-storage-item="bolt-action-rifle"]')).not.toBeChecked();
    expect(validateWorld(moved)).toEqual([]);expect(errors).toEqual([]);
    await page.screenshot({path:'artifacts/machining-storage-v101.png'});
  } finally {await browser.close();}
});
