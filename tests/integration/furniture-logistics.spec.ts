import { testOutputPath } from '../test-output.ts';
import {test,expect} from '@playwright/test';
import {applyCommand,serializeWorld,deserializeWorld,stepWorld,validateWorld} from '../../src/sim/index';
import {scheduleRoofs} from '../../src/sim/roofing';
import {deconstructionCamp,fixtureBuilding} from '../scenarios/deconstruction';
import {woodAccount} from '../scenarios/colony-player';
import {perform,revealCells} from './player-actions';
import {cell,world,panel,saveKey,expectWorld,observeErrors} from './helpers';

async function selectFurniture(page:import('@playwright/test').Page,at:{x:number;z:number},title:RegExp):Promise<void> {
  for(let attempt=0;attempt<10;attempt++){
    await revealCells(page,[at]);await cell(page,at.x,at.z);
    const heading=page.locator('#cell-title');
    if(await heading.count()&&title.test(await heading.textContent()??''))return;
  }
  throw new Error(`The physical furniture at ${at.x},${at.z} was not selected: ${title}`);
}

test('ranger un meuble par le menu contextuel, reprendre sa cargaison, puis le réinstaller avec Transport seul',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const fixture=deconstructionCamp();fixture.tick=2000;const p=fixture.pawns[0]!,bed=fixtureBuilding(fixture,'bed',14,16);
    fixture.structures=[];fixture.packed=[{building:bed,owner:{type:'ground',x:14,z:16}}];p.x=14;p.z=16;p.bedId=bed.id;p.priorities.build=0;p.priorities.haul=1;
    const pin=fixtureBuilding(fixture,'horseshoes',14,16);
    const initial=woodAccount(fixture),rotation={value:0},storage={x:24,z:19};
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(fixture)});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
    await page.keyboard.press('Escape');await revealCells(page,[bed]);await cell(page,14,16);await expect(page.locator('#cell-install')).toHaveCount(0);
    await selectFurniture(page,bed,/^Meuble emballé · Lit/);
    await expect(page.locator('#cell-install')).toBeVisible();await expect(page.locator('#cell-install')).toHaveText('Installer');
    await expect(page.locator('#cell-uninstall')).toBeHidden();
    await selectFurniture(page,pin,/^Piquet de fers à cheval/);
    await expect(page.locator('#cell-install')).toBeVisible();await expect(page.locator('#cell-install')).toHaveText('Réinstaller');
    await expect(page.locator('#cell-uninstall')).toBeVisible();
    await perform(page,{reason:'Installer le paquet, pas le piquet sur la même case.',command:{type:'install',structureId:bed.id,x:19,z:16,orientation:0}},rotation);
    expect((await world(page)).jobs[0]?.furniture?.structureId).toBe(bed.id);
    await page.keyboard.press('Escape');await selectFurniture(page,bed,/^Meuble emballé · Lit/);await page.locator('#cell-cancel').click({timeout:5000});await expect.poll(async()=>(await world(page)).jobs.length).toBe(0);
    await perform(page,{reason:'Réserver une case aux meubles emballés.',command:{type:'stockpile',...storage,enabled:true,filters:{wood:false,food:false,furniture:true},priority:3,capacity:1}},rotation);
    expect((await world(page)).stockpiles[0]).toMatchObject({filters:{wood:false,food:false,furniture:true},priority:3,capacity:1});
    await perform(page,{reason:'Prioriser le transport du lit.',command:{type:'order-haul',pawnId:p.id,target:{type:'furniture',structureId:bed.id},queue:false}},rotation);
    const accepted=await world(page);await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(()=>{if(window.__lisiere.world.pawns[0]?.haul?.whole&&window.__lisiere.world.pawns[0].haul.phase==='deliver'){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;},undefined,{timeout:15000});
    await expect(page.locator('#pause-banner')).toBeVisible();const carrying=await world(page);
    expect(carrying.packed[0]!.owner).toEqual({type:'pawn',pawnId:p.id});expect(woodAccount(carrying)).toBe(initial);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,carrying);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).packed[0]?.owner,{timeout:15000}).toEqual({type:'ground',...storage});await page.locator('[data-speed="0"]').click();
    const stored=await world(page),replay=deserializeWorld(serializeWorld(accepted));stepWorld(replay,stored.tick-replay.tick);expect(replay).toEqual(stored);
    await page.keyboard.press('Escape');await revealCells(page,[storage]);await cell(page,storage.x,storage.z);await expect(page.locator('#cell-install')).toBeVisible();
    await page.screenshot({path:testOutputPath('artifacts/furniture-logistics-stored.png')});
    await perform(page,{reason:'Reposer le même lit avec le transporteur.',command:{type:'install',structureId:bed.id,x:21,z:16,orientation:1}},rotation);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).structures.length,{timeout:15000}).toBe(2);await page.locator('[data-speed="0"]').click();
    const result=await world(page);expect(result.structures.find(s=>s.id===bed.id)).toMatchObject({x:21,z:16,orientation:1});expect(result.structures.find(s=>s.id===pin.id)).toMatchObject({x:14,z:16});expect(result.packed).toEqual([]);expect(result.pawns[0]!.bedId).toBe(bed.id);expect(result.pawns[0]!.priorities.build).toBe(0);
    expect(woodAccount(result)).toBe(initial);expect(validateWorld(result)).toEqual([]);expect(errors).toEqual([]);await expect(page.locator('#fps-counter')).toBeVisible();
    await page.screenshot({path:testOutputPath('artifacts/furniture-logistics-installed.png')});
    await testInfo.attach('furniture-logistics-result',{contentType:'application/json',body:JSON.stringify({backend:await page.evaluate(()=>window.__lisiere.backend),tick:result.tick,buildings:result.structures,storage:result.stockpiles,wood:initial,resumedExactly:true,errors})});
  } finally {await browser.close();}
});

test('un toit sur la source ne détourne pas l’annulation de la réinstallation du paquet',async({playwright})=>{
  test.setTimeout(90000);
  const fixture=deconstructionCamp();fixture.tick=2000;
  const bed=fixtureBuilding(fixture,'bed',14,16);
  fixture.structures=[];fixture.packed=[{building:bed,owner:{type:'ground',x:14,z:16}}];
  const pin=fixtureBuilding(fixture,'horseshoes',14,16),support=fixtureBuilding(fixture,'wall',13,16);
  const pawn=fixture.pawns[0]!;pawn.x=14;pawn.z=16;pawn.bedId=bed.id;pawn.priorities.build=1;
  expect(applyCommand(fixture,{type:'area',action:'build-roof',from:{x:14,z:16},to:{x:14,z:16}}).ok).toBe(true);
  scheduleRoofs(fixture);
  const roof=fixture.jobs.find(j=>j.kind==='build-roof'&&j.x===14&&j.z===16);
  expect(roof,'The adjacent wall must support a real scheduled roof job').toBeDefined();
  expect(validateWorld(fixture)).toEqual([]);
  const initialWood=woodAccount(fixture),initialRoofing=structuredClone(fixture.roofing);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    page.setDefaultTimeout(10000);
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(fixture)});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
    await page.keyboard.press('Escape');await selectFurniture(page,bed,/^Meuble emballé · Lit/);
    await expect(page.locator('#cell-install')).toHaveText('Installer');await expect(page.locator('#cell-uninstall')).toBeHidden();
    await selectFurniture(page,pin,/^Piquet de fers à cheval/);
    await expect(page.locator('#cell-install')).toHaveText('Réinstaller');await expect(page.locator('#cell-uninstall')).toBeVisible();
    await perform(page,{reason:'Réinstaller le lit emballé sous un ordre de toit distinct.',command:{type:'install',structureId:bed.id,x:19,z:16,orientation:0}},{value:0});
    const planned=await world(page),install=planned.jobs.find(j=>j.kind==='install'&&j.furniture?.structureId===bed.id);
    expect(install).toMatchObject({x:19,z:16});expect(planned.jobs.find(j=>j.id===roof!.id)).toEqual(roof);
    await page.keyboard.press('Escape');await selectFurniture(page,bed,/^Meuble emballé · Lit/);
    await expect(page.locator('#cell-cancel')).toBeHidden();
    await revealCells(page,[{x:19,z:16}]);await cell(page,19,16);
    await expect(page.locator('#cell-cancel')).toBeVisible();await page.locator('#cell-cancel').click();
    await expect.poll(async()=>(await world(page)).jobs.some(j=>j.id===install!.id)).toBe(false);
    const result=await world(page);
    expect(result.jobs.find(j=>j.id===roof!.id)).toEqual(roof);
    expect(result.roofing).toEqual(initialRoofing);
    expect(result.packed.find(p=>p.building.id===bed.id)?.owner).toEqual({type:'ground',x:14,z:16});
    expect(result.structures.find(s=>s.id===pin.id)).toMatchObject({x:14,z:16});
    expect(result.structures.find(s=>s.id===support.id)).toMatchObject({x:13,z:16});
    expect(woodAccount(result)).toBe(initialWood);expect(validateWorld(result)).toEqual([]);expect(errors).toEqual([]);
  } finally {await browser.close();}
});
