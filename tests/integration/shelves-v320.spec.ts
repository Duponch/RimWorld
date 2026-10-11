import { expect,test,type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { shelvesAulnes } from '../helpers/shelves-v320';
import { deserializeWorld,serializeWorld,validateWorld } from '../../src/sim/serialization';
import { decodeStoredSave } from '../../src/ui/save-storage-codec';
import { constructionRecipe,constructionSupplied,constructionCapacity,deliveredMaterial } from '../../src/sim/construction-materials';
import { newCookingBill } from '../../src/sim/cooking-bills';
import { ITEM_DEFINITIONS } from '../../src/sim/items';
import { readShelfInspection,shelfControlOptions } from '../../src/ui/shelf-inspection';
import { storageTreeSelection } from '../../src/ui/storage-filter-tree';
import type { Cell,Command,Structure,World } from '../../src/sim/types';
import type { StorageControlSettings } from '../../src/ui/storage-item-controls';
import { cell,expectWorld,observeErrors,panel,pause,saveKey,tool,world } from './helpers';
import { perform,revealCells } from './player-actions';
import { writeTestFile } from '../test-output';

async function inspectShelf(page:Page,shelf:Structure){
  await tool(page,'select');await page.keyboard.press('Escape');await revealCells(page,[shelf]);
  for(let n=0;n<32;n++){await cell(page,shelf.x,shelf.z);if(await page.locator(`[data-shelf-controls="${shelf.id}"]`).isVisible())return;}
  await expect(page.locator(`[data-shelf-controls="${shelf.id}"]`)).toBeVisible();
}
async function inspectZone(page:Page,position:Cell){
  await tool(page,'select');await page.keyboard.press('Escape');await revealCells(page,[position]);
  for(let n=0;n<32;n++){await cell(page,position.x,position.z);if(await page.locator('#inspector [data-zone-action="expand"]').isVisible())return;}
  await expect(page.locator('#inspector [data-zone-action="expand"]')).toBeVisible();
}
let shelfPolicyProofSerial=0;
async function policy(page:Page,shelf:Structure,settings:StorageControlSettings){
  const proof=++shelfPolicyProofSerial,geometry:unknown[]=[];
  const prior=(await world(page)).structures.find(s=>s.id===shelf.id)!.shelf!.settings;
  const expected=new Set([...storageTreeSelection(prior.filters,prior.items)].filter(item=>!shelfControlOptions.fixedAllows!(item)));
  for(const item of storageTreeSelection(settings.filters,settings.items))if(shelfControlOptions.fixedAllows!(item))expected.add(item);
  await inspectShelf(page,shelf);const root=page.locator(`[data-shelf-controls="${shelf.id}"]`),search=root.locator('[data-storage-search]');
  await root.locator('[data-storage-all="false"]').click();
  for(const item of storageTreeSelection(settings.filters,settings.items)){
    if(!shelfControlOptions.fixedAllows!(item))continue;
    await search.fill(item);const check=root.locator(`[data-storage-item="${item}"]`);await check.setChecked(true);
    const hit=await check.evaluate(input=>{const r=input.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {item:input.getAttribute('data-storage-item'),rect:{x:r.x,y:r.y,width:r.width,height:r.height},target:top?.getAttribute('data-storage-item'),viewport:{width:innerWidth,height:innerHeight}};});
    expect(hit.target).toBe(item);geometry.push(hit);
    await page.screenshot({path:test.info().outputPath(`policy-${proof}-${shelf.id}-${item}.png`)});
  }
  await search.fill('');await root.locator('[data-storage-priority]').selectOption(String(settings.priority));
  await expect(root.locator('[data-storage-item="furniture"]')).toBeDisabled();
  await expect(root.locator('[data-storage-item="human-corpse"]')).toBeDisabled();
  await expect(page.locator('#inspector [data-zone-action="expand"],#inspector [data-zone-action="shrink"],#inspector [data-zone-action="delete"]')).toHaveCount(0);
  await expect(page.locator('#inspector button').filter({hasText:'Appliquer'})).toHaveCount(0);
  await expect.poll(async()=>{const current=(await world(page)).structures.find(s=>s.id===shelf.id)!.shelf!.settings;return {priority:current.priority,items:[...storageTreeSelection(current.filters,current.items)].sort()};}).toEqual({priority:settings.priority,items:[...expected].sort()});
  await writeTestFile(test.info().outputPath(`policy-${proof}-${shelf.id}-geometry.json`),JSON.stringify(geometry,null,2));
  await page.screenshot({path:test.info().outputPath(`policy-${proof}-${shelf.id}-confirmed.png`)});
}

test('V320 actual Aulnes: paid shelves, three physical piles, recipe pickup, exact reloads and same-ID packing',async({playwright})=>{
  test.setTimeout(720000);const fixture=await shelvesAulnes(),resume=process.env.SHELVES_V320_RESUME;
  const initial=resume?deserializeWorld(await readFile(resume,'utf8')):fixture.world;expect(validateWorld(initial)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chrome'}),page=await browser.newPage({baseURL:process.env.SHELVES_V320_BASE_URL??'http://127.0.0.1:5173',viewport:{width:2560,height:1440}});
  page.setDefaultTimeout(15000);const errors=observeErrors(page),checkpoints:{label:string;tick:number}[]=[],rotation={value:0};
  const act=(command:Command,reason:string)=>perform(page,{command,reason},rotation);let smallId=0,normalId=0,workerId=0,billId=0;
  async function checkpoint(label:string){await pause(page);const w=await world(page);expect(validateWorld(w)).toEqual([]);
    await page.keyboard.press('Escape');await panel(page,'menu');await page.locator('#save').click();
    await expect.poll(async()=>{const raw=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);return raw?serializeWorld(deserializeWorld(await decodeStoredSave(raw))):null;}).toBe(serializeWorld(w));
    await page.locator('#load').click();await expectWorld(page,w);await page.keyboard.press('Escape');checkpoints.push({label,tick:w.tick});await writeTestFile(test.info().outputPath(`checkpoint-${label}.json`),serializeWorld(w));return w;
  }
  async function gate(predicate:string,args:Record<string,unknown>={},timeout=90000,speed='6'){
    await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();
    await page.waitForFunction(({predicate,args})=>{const w=window.__lisiere.world;if(!Function('w','a',`return (${predicate});`)(w,args))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},{predicate,args},{polling:20,timeout});await pause(page);
  }
  async function build(kind:'shelf'|'small-shelf',position:Cell){
    let w=await world(page),built=w.structures.find(s=>s.kind===kind&&s.x===position.x&&s.z===position.z);if(built)return built;
    let job=w.jobs.find(j=>j.kind===kind&&j.x===position.x&&j.z===position.z);
    if(!job){await act({type:'designate',kind,...position,material:'wood',orientation:1},'Construire avec le bois historique, sans dotation.');w=await checkpoint(`plan-${kind}`);job=w.jobs.find(j=>j.kind===kind&&j.x===position.x&&j.z===position.z)!;}
    const id=job.id;expect(constructionRecipe(job).ingredients.find(i=>i.item==='wood')!.quantity).toBe(kind==='shelf'?20:10);
    for(let n=0;n<24;n++){w=await world(page);job=w.jobs.find(j=>j.id===id);if(!job||constructionSupplied(w,job))break;
      const worker=w.pawns.filter(p=>!p.prisoner&&p.state!=='dead'&&p.state!=='downed'&&p.priorities.build>0).sort((a,b)=>Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z)||a.id-b.id)[0]!;
      if(constructionRecipe(job).ingredients.some(i=>constructionCapacity(w,job!,i.item)>0))await act({type:'order-haul',pawnId:worker.id,target:{type:'job',jobId:id},queue:false},'Livrer au chantier physiquement.');
      const delivered=constructionRecipe(job).ingredients.reduce((sum,i)=>sum+deliveredMaterial(w,job!,i.item),0);
      await gate('!w.jobs.some(j=>j.id===a.id)||w.piles.filter(p=>p.owner.type===\'job\'&&p.owner.jobId===a.id).reduce((s,p)=>s+p.quantity,0)>a.delivered',{id,delivered});
    }
    w=await world(page);job=w.jobs.find(j=>j.id===id);
    if(job&&job.reservedBy===null){expect(constructionSupplied(w,job)).toBe(true);const worker=w.pawns.find(p=>!p.prisoner&&p.priorities.build>0&&p.state!=='dead'&&p.state!=='downed')!;await act({type:'order-job',pawnId:worker.id,jobId:id,queue:false},'Terminer Construction par son ordre réel.');}
    await gate('w.structures.some(s=>s.kind===a.kind&&s.x===a.x&&s.z===a.z)',{kind,...position},180000);
    w=await checkpoint(`built-${kind}`);return w.structures.find(s=>s.kind===kind&&s.x===position.x&&s.z===position.z)!;
  }
  try{
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);await pause(page);
    await page.evaluate(async({key,data})=>window.__lisiere.saveRepository.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await checkpoint('baseline');
    const small=await build('small-shelf',fixture.small),normal=await build('shelf',fixture.normal);smallId=small.id;normalId=normal.id;
    await policy(page,normal,{priority:1,filters:{wood:true,food:false,steel:false}});
    await policy(page,small,{priority:5,filters:{wood:true,food:true,steel:true},items:{wood:true,rice:true,steel:true}});await checkpoint('policy');
    const historicalZone=(await world(page)).stockpiles[0]!;
    await inspectZone(page,historicalZone);await page.locator('#inspector [data-zone-action="copy"]').click();
    await inspectShelf(page,normal);await page.locator('#inspector [data-zone-action="paste"]').click();
    await expect.poll(async()=>{const policy=(await world(page)).structures.find(s=>s.id===normal.id)!.shelf!.settings;return {priority:policy.priority,items:[...storageTreeSelection(policy.filters,policy.items)].sort()};}).toEqual({priority:historicalZone.priority,items:[...storageTreeSelection(historicalZone.filters,historicalZone.items)].sort()});
    // Round trip through the real shared clipboard, then restore the original
    // zone policy using its copy still held by the normal shelf.
    await inspectShelf(page,small);await page.locator('#inspector [data-zone-action="copy"]').click();
    await inspectZone(page,historicalZone);await page.locator('#inspector [data-zone-action="paste"]').click();
    await expect.poll(async()=>(await world(page)).stockpiles.find(c=>c.id===historicalZone.id)!.priority).toBe(5);
    await inspectShelf(page,normal);await page.locator('#inspector [data-zone-action="copy"]').click();
    await inspectZone(page,historicalZone);await page.locator('#inspector [data-zone-action="paste"]').click();
    await expect.poll(async()=>{const policy=(await world(page)).stockpiles.find(c=>c.id===historicalZone.id)!;return {priority:policy.priority,items:[...storageTreeSelection(policy.filters,policy.items)].sort()};}).toEqual({priority:historicalZone.priority,items:[...storageTreeSelection(historicalZone.filters,historicalZone.items)].sort()});
    await inspectShelf(page,small);await page.locator('#inspector [data-zone-action="copy"]').click();await inspectShelf(page,normal);await page.locator('#inspector [data-zone-action="paste"]').click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===normal.id)!.shelf!.settings.priority).toBe(5);
    await policy(page,normal,{priority:1,filters:{wood:false,food:false}});await checkpoint('copied-policy');
    let w=await world(page);
    const witnessCook=w.pawns.find(p=>!p.prisoner&&p.state!=='dead'&&p.state!=='downed'&&fixture.world.pawns.some(original=>original.id===p.id&&original.priorities.cook>0))!;
    expect(witnessCook).toBeDefined();
    // Background recipes legitimately use shelf contents. Pause those workers
    // through ordinary priorities while collecting the three visual witnesses;
    // then re-enable an originally capable cook for the real pickup below.
    for(const pawn of w.pawns.filter(p=>!p.prisoner))for(const work of ['cook','craft','art'] as const)
      if(pawn.priorities[work]>0)await act({type:'priority',pawnId:pawn.id,work,value:0},'Réserver temporairement les piles témoins aux transports, sans figer les besoins ou les règles.');
    w=await world(page);const carriers=w.pawns.filter(p=>!p.prisoner&&p.priorities.haul>0&&p.state!=='dead'&&p.state!=='downed').sort((a,b)=>Math.hypot(a.x-small.x,a.z-small.z)-Math.hypot(b.x-small.x,b.z-small.z)||a.id-b.id);
    const worker=carriers.find(p=>p.hunger>30&&p.rest>30)??carriers[0]!;expect(worker).toBeDefined();workerId=worker.id;
    for(const pawn of w.pawns.filter(p=>!p.prisoner&&p.id!==workerId&&p.priorities.haul>0))await act({type:'priority',pawnId:pawn.id,work:'haul',value:0},'Réserver ce témoin de transport à un colon réel.');
    // Ordinary workers used the new preferred storage during paid construction.
    // Changing its filters leaves those real objects in place. Move the refused
    // contents to their historical zones before requesting the three witnesses.
    for(let n=0;n<12;n++){
      w=await world(page);const contents=readShelfInspection(w,w.structures.find(s=>s.id===smallId)!)!.piles;
      const refused=contents.find(p=>!['wood','rice','steel'].includes(p.item));if(!refused)break;
      await act({type:'order-haul',pawnId:workerId,target:{type:'pile',pileId:refused.id},queue:false},'Ranger le contenu refusé dans une réserve existante, sans suppression ni dotation.');
      await gate('!w.piles.some(p=>p.id===a.id&&p.owner.type===\'ground\'&&p.owner.x===a.x&&p.owner.z===a.z)',{id:refused.id,x:small.x,z:small.z});
      await gate('w.pawns.find(p=>p.id===a.worker).haul?.sourcePileId!==a.id',{worker:workerId,id:refused.id});await checkpoint(`cleared-${n}-${refused.item}-${refused.id}`);
    }
    for(const item of ['wood','rice','steel'] as const){w=await world(page);if(readShelfInspection(w,w.structures.find(s=>s.id===smallId)!)!.piles.some(p=>p.item===item))continue;
      const pile=w.piles.filter(p=>p.item===item&&p.owner.type==='ground').sort((a,b)=>{const ao=a.owner as Cell,bo=b.owner as Cell;return Math.hypot(ao.x-small.x,ao.z-small.z)-Math.hypot(bo.x-small.x,bo.z-small.z)||a.id-b.id;})[0]!;expect(pile).toBeDefined();
      await act({type:'order-haul',pawnId:workerId,target:{type:'pile',pileId:pile.id},queue:false},'Transporter cette pile historique vers le stockage prioritaire.');
      // Observe the short pickup phase at ×1: an adjacent source can complete
      // before a ×6 browser observation, despite its physical delivery being correct.
      await gate('w.pawns.find(p=>p.id===a.worker).haul?.phase===\'deliver\'',{worker:workerId},90000,'1');await checkpoint(`carried-${item}`);
      await gate('w.piles.some(p=>p.item===a.item&&p.owner.type===\'ground\'&&p.owner.x===a.x&&p.owner.z===a.z)',{item,...small});await checkpoint(`stored-${item}`);
    }
    w=await world(page);const view=readShelfInspection(w,w.structures.find(s=>s.id===smallId)!)!;expect(view.piles).toHaveLength(3);expect(new Set(view.piles.map(p=>p.item))).toEqual(new Set(['wood','rice','steel']));
    await inspectShelf(page,w.structures.find(s=>s.id===smallId)!);await expect(page.locator('[data-shelf-slots]')).toHaveText('3 / 3 emplacements occupés');await expect(page.locator('[data-shelf-pile]')).toHaveCount(3);await page.screenshot({path:test.info().outputPath('filled-shelf.png')});
    for(const pile of view.piles){
      await page.locator(`[data-shelf-pile="${pile.id}"]`).click();
      await expect(page.locator('#cell-title')).toHaveText(ITEM_DEFINITIONS[pile.item].label);
      await expect(page.locator('#cell-description')).toContainText(new RegExp(`Quantité\\s*:\\s*${pile.quantity}(?!\\d)`));
      await inspectShelf(page,w.structures.find(s=>s.id===smallId)!);
    }
    const rice=view.piles.find(p=>p.item==='rice')!,station=w.structures.find(s=>s.id===fixture.stationId)!;
    for(const bill of station.bills??[]){const {id,recipe:_,...settings}=bill;await act({type:'bill-update',structureId:station.id,billId:id,settings:{...settings,suspended:true}},'Suspendre les factures concurrentes du poste.');}
    const cook=w.pawns.find(p=>p.id===witnessCook.id)!;
    await act({type:'priority',pawnId:cook.id,work:'cook',value:1},'Réactiver le travail du cuisinier d’origine pour son vrai prélèvement.');
    for(const pawn of w.pawns.filter(p=>!p.prisoner&&p.id!==cook.id&&p.priorities.cook>0))await act({type:'priority',pawnId:pawn.id,work:'cook',value:0},'Confier cette cuisson à un seul colon.');
    await act({type:'bill-add',structureId:station.id,recipe:'simple-meal'},'Ajouter une cuisson ordinaire pour prélever le riz rangé.');billId=(await world(page)).structures.find(s=>s.id===station.id)!.bills!.filter(b=>b.recipe==='simple-meal').at(-1)!.id;
    const defaults=newCookingBill(billId);const {id:_,recipe:__,...settings}=defaults;
    await act({type:'bill-update',structureId:station.id,billId,settings:{...settings,target:1,destination:'drop',radius:Math.ceil(Math.hypot(station.x-small.x,station.z-small.z))+1,filters:Object.fromEntries(Object.keys(settings.filters).map(item=>[item,item==='rice']))}},'Utiliser le riz proche réellement stocké.');
    await act({type:'order-cook',pawnId:cook.id,structureId:station.id,queue:false},'Prélever au contact puis cuire.');
    const task=(await world(page)).pawns.find(p=>p.id===cook.id)!.cooking!;expect(task.ingredients.some(i=>i.pileId===rice.id)).toBe(true);
    // Ingredient.cell is the exclusive staging destination, not its source.
    expect(task.ingredients.every(i=>i.cell.x!==small.x||i.cell.z!==small.z)).toBe(true);
    await gate('w.pawns.find(p=>p.id===a.cook).cooking?.phase===\'work\'',{cook:cook.id});await checkpoint('rice-staged');
    await gate('w.structures.find(s=>s.id===a.station).bills.find(b=>b.id===a.bill).target===0',{station:station.id,bill:billId});w=await checkpoint('cooked');expect(w.piles.find(p=>p.id===rice.id)?.quantity??0).toBeLessThan(rice.quantity);
    const installed=w.structures.find(s=>s.id===smallId)!,cellIds=[...installed.shelf!.cells],contents=readShelfInspection(w,installed)!.piles.map(p=>structuredClone(p));
    await act({type:'designate',kind:'uninstall',targetId:smallId,x:installed.x,z:installed.z},'Minifier le meuble en laissant les objets physiques sur la carte.');
    const job=(await world(page)).jobs.find(j=>j.furniture?.structureId===smallId)!,builder=(await world(page)).pawns.find(p=>!p.prisoner&&p.priorities.build>0&&p.state!=='dead'&&p.state!=='downed')!;
    await act({type:'order-job',pawnId:builder.id,jobId:job.id,queue:false},'Payer le travail de désinstallation.');await gate('w.packed.some(p=>p.building.id===a.id)',{id:smallId});w=await checkpoint('packed');
    expect(w.packed.find(p=>p.building.id===smallId)!.building.shelf!.cells).toEqual(cellIds);
    for(const original of contents){const retained=w.piles.find(p=>p.id===original.id)!;expect(retained).toBeDefined();expect(retained.owner.type).toBe('ground');expect(retained.item).toBe(original.item);expect(retained.quantity).toBe(original.quantity);}
    await act({type:'install',structureId:smallId,...fixture.destination,orientation:1},'Réinstaller le même meuble et les mêmes identités de cellule.');const install=(await world(page)).jobs.find(j=>j.kind==='install'&&j.furniture?.structureId===smallId)!;
    await act({type:'order-job',pawnId:builder.id,jobId:install.id,queue:false},'Transporter puis réinstaller physiquement.');await gate('w.structures.some(s=>s.id===a.id&&s.x===a.x&&s.z===a.z)',{id:smallId,...fixture.destination},180000);w=await checkpoint('reinstalled');expect(w.structures.find(s=>s.id===smallId)!.shelf!.cells).toEqual(cellIds);
    expect(errors).toEqual([]);await writeTestFile(test.info().outputPath('report.json'),JSON.stringify({source:fixture.source,sha:fixture.sha,declaredDotation:[],smallId,normalId,workerId,billId,cellIds,checkpoints,errors,limits:'Actual paid construction, three item types, original rice pickup and same-ID packing/reinstallation. Concurrent reservations, same-type piles and fatal destruction covered by simulation tests; no natural campaign or FPS claim.'},null,2));
  }catch(error){await writeTestFile(test.info().outputPath('failed-world.json'),serializeWorld(await world(page)));await writeTestFile(test.info().outputPath('failed-diagnostic.json'),JSON.stringify({smallId,normalId,workerId,billId,checkpoints,errors,notice:await page.locator('#notice').textContent()},null,2));throw error;}
  finally{await page.close();await browser.close();}
});
