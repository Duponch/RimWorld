import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {pemmicanWorkshopV389} from '../scenarios/pemmican-v389';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {PEMMICAN_RESEARCH_COST,RESEARCH_SCALE} from '../../src/sim/research';
import type {Command,World} from '../../src/sim/types';
import {world,pause,panel,expectWorld,observeErrors,cell,settledCells} from './helpers';
import {perform,revealCells,inspectPerson} from './player-actions';

// Global integration discovery must not construct a page without explicit opt-in.
test.skip(process.env.PEMMICAN_V389!=='1','ROOT opt-in only; adopt/freeze V389 schema248 first.');
const stock=(w:World,item:string)=>w.piles.reduce((n,p)=>n+(p.item===item?p.quantity:0),0);
async function exportReload(page:Page,info:TestInfo){
  await pause(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);
  await page.keyboard.press('Escape');await panel(page,'menu');const manager=page.locator('[data-save-manager]');
  await manager.locator('[data-save-manager-name]').fill('V389 pemmican cuisson réelle');
  await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
  const path=info.outputPath('paid-work-exact.json');await(await download).saveAs(path);
  expect(deserializeWorld(await decodeStoredSave(await readFile(path,'utf8')))).toEqual(before);
  await page.locator('#browse-saves').click();await page.locator('.front-menu input[type=file]').setInputFiles(path);
  await expect(page.locator('.front-menu')).toBeHidden({timeout:30_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});
  await pause(page);await expectWorld(page,before);await page.keyboard.press('Escape');await info.attach('paid-work-exact',{path,contentType:'application/json'});return before;
}

test('V389 prepared camp: real research finish, paid pemmican, exact work reload, stock and ingestion',async({page},info)=>{
  test.setTimeout(120_000);const errors=observeErrors(page),f=pemmicanWorkshopV389(32),rotation={value:0};
  expect(f.world.schemaVersion).toBe(248);expect(f.world.research!.pemmican).toEqual({points:499*RESEARCH_SCALE});
  expect(stock(f.world,'pemmican')).toBe(0);expect(stock(f.world,'hare-meat')).toBe(5);expect(stock(f.world,'rice')).toBe(5);
  const path=info.outputPath('declared-pemmican-preparation.json');await writeFile(path,f.initial);
  const act=async(command:Command,reason:string)=>{await pause(page);await perform(page,{command,reason},rotation);await page.keyboard.press('Escape');};
  const inspectStation=async()=>{await page.keyboard.press('Escape');const w=await world(page),station=w.structures.find(s=>s.id===f.stationId)!;
    for(let i=0;i<=w.pawns.length;i++){await revealCells(page,[station]);await cell(page,station.x,station.z);if(await page.locator('[data-add-recipe="simple-meal"]').isVisible())break;}
    await expect(page.locator('[data-add-recipe="simple-meal"]')).toBeVisible();};
  try {
    await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(path);
    await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});await pause(page);await expectWorld(page,f.world);
    await inspectStation();await expect(page.locator('[data-add-recipe="make-pemmican"]')).toBeHidden();await expect(page.locator('[data-add-recipe="make-pemmican"]')).toBeDisabled();await page.keyboard.press('Escape');
    await panel(page,'research');await page.locator('[data-research-select="pemmican"]').click();
    await expect(page.locator('[data-research-selection-points]')).toContainText('499.0 / 500');
    await page.locator('[data-research-selected-start]').click();await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
    const witnessHandle=await page.waitForFunction(({id,points})=>{const w=window.__lisiere.world,p=w.pawns.find(p=>p.id===id),task=p?.research;
      return p&&task&&w.research!.pemmican!.points>points?{tick:w.tick,points:w.research!.pemmican!.points,stationId:task.stationId,cell:{x:p.x,z:p.z},spot:{x:task.spot.x,z:task.spot.z}}:false;
    },{id:f.pawnId,points:499*RESEARCH_SCALE},{polling:20,timeout:15_000});
    const researchWitness=await witnessHandle.jsonValue();await witnessHandle.dispose();
    if(!researchWitness)throw Error('No immutable research/contact witness.');
    await writeFile(info.outputPath('research-contact-witness.json'),JSON.stringify(researchWitness));await pause(page);
    const researchWork=await world(page);
    expect(researchWitness.stationId).toBe(f.deskId);expect(researchWitness.cell).toEqual(researchWitness.spot);
    expect(researchWork.research!.pemmican!.points).toBeGreaterThanOrEqual(researchWitness.points);expect(stock(researchWork,'pemmican')).toBe(0);
    await page.locator('[data-speed="6"]').click();await page.waitForFunction(()=>window.__lisiere.world.research?.pemmican?.completedAt!==undefined,undefined,{timeout:15_000});await pause(page);
    const researched=await world(page);expect(researched.research!.pemmican!.points).toBe(PEMMICAN_RESEARCH_COST);expect(stock(researched,'pemmican')).toBe(0);
    await inspectStation();await expect(page.locator('[data-add-recipe="make-pemmican"]')).toBeVisible();await expect(page.locator('[data-add-recipe="make-pemmican"]')).toBeEnabled();
    await act({type:'bill-add',structureId:f.stationId,recipe:'make-pemmican'},'Ajouter une facture après le dernier point réellement recherché au bureau.');
    const added=await world(page),bill=added.structures.find(s=>s.id===f.stationId)!.bills!.find(b=>b.recipe==='make-pemmican')!;
    const filters={...Object.fromEntries(Object.keys(bill.filters).map(id=>[id,false])),'hare-meat':true,rice:true};
    await act({type:'bill-update',structureId:f.stationId,billId:bill.id,settings:{...bill,mode:'times',target:1,destination:'stockpile',filters}},'Choisir les cinq viandes et cinq riz préparés, un lot et le stockage couvert.');
    await inspectStation();await expect(page.locator(`[data-bill="${bill.id}"] .bill-cost`)).toContainText('5 viandes animales + 5 végétaux → 16 pemmicans');
    await expect(page.locator(`[data-bill="${bill.id}"] [data-field="milk"]`)).toHaveCount(0);await page.keyboard.press('Escape');
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{const p=window.__lisiere.world.pawns.find(p=>p.id===id);return p?.cooking?.recipe==='make-pemmican'&&p.cooking.phase==='work'&&p.cooking.progress>0;},f.pawnId,{polling:20,timeout:20_000});await pause(page);
    const working=await world(page),cook=working.pawns.find(p=>p.id===f.pawnId)!,task=cook.cooking!;
    expect({x:cook.x,z:cook.z}).toEqual(task.spot);expect(task.progress).toBeGreaterThan(0);expect(stock(working,'pemmican')).toBe(0);
    expect(task.ingredients).toHaveLength(2);expect(task.ingredients.every(i=>i.stage==='placed')).toBe(true);expect(stock(working,'hare-meat')).toBe(5);expect(stock(working,'rice')).toBe(5);
    await revealCells(page,[working.structures.find(s=>s.id===f.stationId)!,f.storage]);await page.screenshot({path:info.outputPath('01-paid-campfire-work.png')});
    const resumed=await exportReload(page,info);expect(resumed.pawns.find(p=>p.id===f.pawnId)!.cooking).toEqual(task);
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===f.pawnId)?.cooking?.progress??0,{timeout:5_000,intervals:[50]}).toBeGreaterThan(task.progress);
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(({id,store})=>{const w=window.__lisiere.world,p=w.pawns.find(p=>p.id===id);return !p?.cooking&&!p?.haul&&w.piles.some(item=>item.item==='pemmican'&&item.quantity===16&&item.owner.type==='ground'&&item.owner.x===store.x&&item.owner.z===store.z);},{id:f.pawnId,store:f.storage},{timeout:20_000});await pause(page);
    const stored=await world(page);await writeFile(info.outputPath('stored-world.json'),JSON.stringify(stored));
    const product=stored.piles.find(p=>p.item==='pemmican')!;expect(stock(stored,'pemmican')).toBe(16);expect(stock(stored,'hare-meat')).toBe(0);expect(stock(stored,'rice')).toBe(0);
    expect(product.rot).toBeDefined();expect(stored.structures.find(s=>s.id===f.stationId)!.bills!.find(b=>b.id===bill.id)!.target).toBe(0);
    const meals=page.locator('#resources [data-resource-category="meals"]');
    if(!await meals.evaluate(node=>(node as HTMLDetailsElement).open))await meals.locator(':scope > summary').click();
    await expect(page.locator('#resources [data-item="pemmican"]')).toBeVisible();await expect(page.locator('#resources [data-item="pemmican"] strong')).toHaveText('16');
    for(let i=0;i<=stored.pawns.length+1;i++){await revealCells(page,[f.storage]);await cell(page,f.storage.x,f.storage.z);if((await page.locator('#cell-title').textContent())?.includes('Pemmican'))break;}
    await expect(page.locator('#cell-title')).toContainText('Pemmican');
    await page.screenshot({path:info.outputPath('02-real-stored-pemmican.png')});
    await page.keyboard.press('Escape');await page.locator(`[data-pawn="${f.pawnId}"]`).click();await revealCells(page,[f.storage]);
    const [point]=await settledCells(page,[f.storage]),bounds=(await page.locator('#viewport canvas').boundingBox())!;
    expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,{x:bounds.x+point!.x,y:bounds.y+point!.y})).toBe('CANVAS');
    await page.mouse.click(bounds.x+point!.x,bounds.y+point!.y,{button:'right'});const consume=page.locator(`[data-order-consume="${product.id}"]`);await expect(consume).toBeEnabled();await consume.click();
    await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===f.pawnId)?.need).toMatchObject({kind:'eat',forced:true,sourcePileId:product.id});
    const reserved=await world(page),need=reserved.pawns.find(p=>p.id===f.pawnId)!.need!;if(need.kind!=='eat')throw Error('No real food reservation.');
    const quantity=need.quantity;expect(quantity).toBeGreaterThan(0);expect(quantity).toBeLessThanOrEqual(16);
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{const p=window.__lisiere.world.pawns.find(p=>p.id===id);return p?.need?.kind==='eat'&&p.need.phase==='ingest'&&p.need.progress>0;},f.pawnId,{polling:20,timeout:15_000});await pause(page);
    const ingest=await world(page),eater=ingest.pawns.find(p=>p.id===f.pawnId)!;if(eater.need?.kind!=='eat')throw Error('Ingestion disappeared.');
    const ingestTask=eater.need,cargo=ingest.piles.find(p=>p.id===ingestTask.carryPileId)!;
    expect(cargo).toMatchObject({item:'pemmican',quantity,owner:{type:'pawn',pawnId:f.pawnId}});expect(eater.moveCooldown).toBe(0);expect(eater.motion?.end??0).toBeLessThanOrEqual(ingest.tick);
    await inspectPerson(page,f.pawnId,'gear');await expect(page.locator('#equipment-cargo')).toContainText('Pemmican');await page.screenshot({path:info.outputPath('03-owned-portion-ingesting.png')});
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(id=>!window.__lisiere.world.pawns.find(p=>p.id===id)?.need,f.pawnId,{timeout:10_000});await pause(page);
    const final=await world(page);await writeFile(info.outputPath('final-world.json'),JSON.stringify(final));
    expect(stock(final,'pemmican')).toBe(16-quantity);expect(final.piles.some(p=>p.id===cargo.id)).toBe(false);expect(final.pawns.find(p=>p.id===f.pawnId)!.hunger).toBeGreaterThan(reserved.pawns.find(p=>p.id===f.pawnId)!.hunger);
    expect(validateWorld(final)).toEqual([]);expect(errors).toEqual([]);
    expect(await page.evaluate(()=>({backend:window.__lisiere.backend,...window.__lisiere.incident}))).toMatchObject({backend:'WebGPU',simulationStopped:false,graphicsFault:false,waiting:0});
    await writeFile(info.outputPath('native-summary.json'),JSON.stringify({notice:f.notice,start:f.world.tick,researchWorkedAt:researchWitness.tick,researchPausedAt:researchWork.tick,researchedAt:researched.tick,workingAt:working.tick,resumedAt:resumed.tick,storedAt:stored.tick,ingestAt:ingest.tick,final:final.tick,productId:product.id,cargoId:cargo.id,produced:16,consumed:quantity,remaining:16-quantity,errors,scope:'One prepared32² camp,499 research points declared prior, final point and5+5 production/stock/ingestion real. Exact reload while cooking. No whole research campaign, natural stocks, winter, journey, spoilage-duration or performance qualification.'},null,2));
  } catch(error){const state=await world(page).catch(()=>undefined);if(state)await writeFile(info.outputPath('failure-world.json'),JSON.stringify(state));throw error;}
});
