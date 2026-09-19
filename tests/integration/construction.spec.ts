import { SCHEMA_VERSION } from '../../src/sim/types';
import { withoutPawnSkills } from '../scenarios/legacy-skills';
import { revealCells, perform } from './player-actions';
import { deconstructionCamp } from '../scenarios/deconstruction';
import { footprintCells } from '../../src/sim/definitions';
import { expect, test } from '@playwright/test';
import { createWorld, refreshStock, addGroundMaterial, serializeWorld, validateWorld } from '../../src/sim/index';
import { world, panel, tool, cell, saveKey, expectWorld, observeErrors } from './helpers';

test('atelier mixte : choix du matériau, trois cases tournées, chantier long rechargé et meuble réinstallé',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const fixture=deconstructionCamp();fixture.tick=2000;
    addGroundMaterial(fixture,'steel',75,{x:12,z:16},'steel');addGroundMaterial(fixture,'steel',30,{x:12,z:17},'steel');
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(fixture)});
    await page.goto('/?scenario=camp&size=32&e2e');await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
    await tool(page,'stonecutter');await expect(page.locator('#tool-instruction')).toContainText('75 Bois + 30 Acier');
    await page.locator('#construction-material').selectOption('steel');await expect(page.locator('#tool-instruction')).toContainText('105 Acier');
    await revealCells(page,[{x:17,z:16}]);await page.locator('#viewport canvas').focus();
    await page.keyboard.press('e');await cell(page,17,16);
    await expect.poll(async()=>(await world(page)).jobs.length).toBe(1);
    await page.keyboard.press('Escape');await cell(page,17,15);
    const plan=(await world(page)).jobs[0]!;expect(plan).toMatchObject({kind:'stonecutter',material:'steel',orientation:1});
    expect(footprintCells(plan).map(c=>[c.x,c.z]).sort()).toEqual([[17,15],[17,16],[17,17]]);
    await expect(page.locator('#cell-job')).toContainText('105 Acier');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{if(!window.__lisiere.world.jobs.some(j=>j.kind==='stonecutter'&&j.progress>=125))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},undefined,{timeout:30000,polling:'raf'});
    await expect(page.locator('#pause-banner')).toBeVisible();const working=await world(page);expect(validateWorld(working)).toEqual([]);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,working);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).structures.length).toBe(1);await page.locator('[data-speed="0"]').click();
    const built=await world(page),bench=built.structures[0]!;expect(bench.material).toBe('steel');expect(built.piles).toEqual([]);
    await page.keyboard.press('Escape');await cell(page,17,16);await expect(page.locator('#cell-description')).toContainText('1 fragment → 20 blocs');await expect(page.locator('#cell-description')).toContainText('1 × 3 cases');
    await perform(page,{reason:'Déplacer et tourner l’atelier sans reconstruire ses matériaux.',command:{type:'install',structureId:bench.id,x:20,z:20,orientation:0}},{value:1});
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===bench.id)?.x).toBe(20);await page.locator('[data-speed="0"]').click();
    const moved=await world(page);expect(validateWorld(moved)).toEqual([]);expect(moved.packed).toEqual([]);expect(moved.piles).toEqual([]);
    expect(moved.structures[0]).toMatchObject({...bench,x:20,z:20,orientation:0});
    await page.keyboard.press('Escape');await revealCells(page,[{x:20,z:20}]);await cell(page,20,20);await expect(page.locator('#cell-title')).toContainText('Acier');await expect(page.locator('#cell-description')).toContainText('3 × 1 cases');await expect(page.locator('#fps-counter')).toBeVisible();
    await page.screenshot({path:'artifacts/stonebench-ui.png'});expect(errors).toEqual([]);
    await testInfo.attach('stonebench',{contentType:'application/json',body:JSON.stringify({tick:moved.tick,bench:moved.structures[0],errors})});
  } catch(error) {await page.screenshot({path:'artifacts/stonebench-ui-failure.png'});throw error;} finally {await browser.close();}
});

test('chantier par interface : plan sur une pile, dégagement porté, cadre, sauvegarde et achèvement',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const fixture=createWorld(42,32,32);fixture.tick=2000;fixture.tiles=fixture.tiles.map(()=>({terrain:'grass'}));fixture.resources=[];fixture.piles=[];fixture.pawns=fixture.pawns.slice(0,1);
    Object.assign(fixture.pawns[0]!,{x:13,z:16,hunger:100,rest:100,priorities: {hunt:0,research:0, patient:0,bedrest:0,doctor:0,craft:2,mine:2,build:1,haul:0,gather:0,grow:0,cook:0}});fixture.pawns[0]!.schedule.fill('anything');
    addGroundMaterial(fixture,'wood',5,{x:12,z:16},'wood');addGroundMaterial(fixture,'food',23,{x:16,z:14},'rice');refreshStock(fixture);
    const old=JSON.parse(serializeWorld(fixture));(old.schemaVersion=15,withoutPawnSkills(old));for(const a of old.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete old.deconstructed;delete old.packed;for(const pawn of old.pawns)delete pawn.orders;
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:JSON.stringify(old)});
    await page.goto('/?scenario=camp&size=32&e2e');await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();
    await expect.poll(async()=>(await world(page)).schemaVersion).toBe(SCHEMA_VERSION);
    await tool(page,'wall');await cell(page,16,14);await page.keyboard.press('Escape');await cell(page,16,14);
    await expect(page.locator('#cell-job')).toContainText('Plan');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{
      if(!window.__lisiere.world.pawns.some(p=>p.haul?.destination.type==='aside'&&p.haul.phase==='deliver'))return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },undefined,{timeout:15000,polling:'raf'});
    await expect(page.locator('#pause-banner')).toBeVisible();const carried=await world(page);
    expect(carried.pawns[0]!.haul?.quantity).toBe(10);expect(validateWorld(carried)).toEqual([]);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,carried);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{
      if(!window.__lisiere.world.jobs.some(j=>j.construction==='frame'))return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },undefined,{timeout:18000,polling:'raf'});
    await expect(page.locator('#pause-banner')).toBeVisible();await cell(page,16,14);await expect(page.locator('#cell-job')).toContainText('Cadre');
    const frame=await world(page);expect(frame.jobs[0]!.escrow.wood).toBe(5);expect(validateWorld(frame)).toEqual([]);
    await page.screenshot({path:'artifacts/construction-frame.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,frame);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).structures.some(s=>s.kind==='wall'),{timeout:15000}).toBe(true);
    await page.locator('[data-speed="0"]').click();const final=await world(page);
    expect(final.jobs).toEqual([]);expect(final.stock.wood).toBe(0);expect(final.piles.filter(p=>p.item==='rice').reduce((n,p)=>n+p.quantity,0)).toBe(23);expect(validateWorld(final)).toEqual([]);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');expect(errors).toEqual([]);
    await testInfo.attach('construction',{contentType:'application/json',body:JSON.stringify({carriedTick:carried.tick,frameTick:frame.tick,finishedTick:final.tick,materialConserved:true,errors})});
  } finally {await browser.close();}
});


test('meubles et réserves : conserver les piles sur table et tabouret, retirer les cellules incompatibles et reprendre sans perte',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const fixture=createWorld(42,32,32);fixture.tick=2000;fixture.tiles=fixture.tiles.map(()=>({terrain:'grass'}));fixture.resources=[];fixture.piles=[];fixture.jobs=[];fixture.structures=[];fixture.stockpiles=[];fixture.pawns=fixture.pawns.slice(0,1);
    const p=fixture.pawns[0]!;Object.assign(p,{x:13,z:16,hunger:100,rest:100,priorities: {hunt:0,research:0, patient:0,bedrest:0,doctor:0,craft:2,mine:2,build:1,haul:0,gather:0,grow:0,cook:0}});p.schedule.fill('anything');
    addGroundMaterial(fixture,'wood',28,{x:12,z:16},'wood');addGroundMaterial(fixture,'steel',25,{x:12,z:17},'steel');addGroundMaterial(fixture,'food',10,{x:17,z:14},'rice');addGroundMaterial(fixture,'food',6,{x:19,z:14},'berries');
    const ids=fixture.piles.filter(p=>p.kind==='food').map(p=>p.id);
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(fixture)});
    await page.goto('/?scenario=camp&size=32&e2e');await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
    for(const x of [17,19]){await tool(page,'stockpile');await cell(page,x,14);}
    await tool(page,'bed');await expect(page.locator('#tool-instruction')).toContainText('45 Bois');
    await tool(page,'table');await cell(page,17,14);await tool(page,'stool');await page.locator('#construction-material').selectOption('steel');
    await expect(page.locator('#tool-instruction')).toContainText('25 Acier');await cell(page,19,14);
    const planned=await world(page);expect(planned.jobs).toHaveLength(2);expect(planned.stockpiles.map(z=>z.x)).toEqual([19]);expect(planned.piles.filter(p=>ids.includes(p.id))).toEqual(fixture.piles.filter(p=>ids.includes(p.id)));
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{if(window.__lisiere.world.structures.length!==2)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},undefined,{timeout:30000,polling:'raf'});
    await expect(page.locator('#pause-banner')).toBeVisible();const built=await world(page);
    expect(validateWorld(built)).toEqual([]);expect(built.stock).toEqual({wood:0,food:16});expect(built.piles.filter(p=>ids.includes(p.id)).map(p=>p.owner)).toEqual(fixture.piles.filter(p=>ids.includes(p.id)).map(p=>p.owner));
    expect(built.structures.find(s=>s.kind==='stool')?.material).toBe('steel');expect(built.structures.find(s=>s.kind==='table')?.material).toBe('wood');expect(built.piles.filter(p=>p.item==='steel')).toEqual([]);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,built);
    await page.keyboard.press('Escape');await revealCells(page,[{x:17,z:14},{x:19,z:14}]);await cell(page,19,14);await expect(page.locator('#cell-storage')).toBeVisible();await expect(page.locator('#fps-counter')).toContainText('FPS');
    await expect(page.locator('#cell-title')).toContainText('Acier');
    await page.screenshot({path:'artifacts/materials-ui.png'});expect(errors).toEqual([]);
    await testInfo.attach('occupancy',{body:JSON.stringify({tick:built.tick,stock:built.stock,structures:built.structures,stored:built.stockpiles,ids,errors}),contentType:'application/json'});
  } finally {await browser.close();}
});
