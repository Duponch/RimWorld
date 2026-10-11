import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {expect,test} from '@playwright/test';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {decodeStoredSave} from '../../src/ui/save-storage-codec.ts';
import {KIBBLE_INPUTS} from '../../src/sim/fodder-recipes.ts';
import type {Command} from '../../src/sim/types.ts';
import {cell,expectWorld,observeErrors,panel,pause,saveKey,tool,world} from './helpers.ts';
import {perform,revealCells} from './player-actions.ts';
import {writeTestFile} from '../test-output.ts';

test('V316 actual Aulnes: prospective sowing, two physical quotas, kibble output and exact reloads',async({playwright})=>{
 test.setTimeout(480000);
 const source='public/test-saves/v284/les-aulnes-integrees.json',raw=await readFile(source,'utf8');
 expect(createHash('sha256').update(raw).digest('hex')).toBe('6d75f98d4435e8b4569f11fce1969a71d31ba523fcf36ad864f35ba3191eedb1');
 const historical=deserializeWorld(await decodeStoredSave(raw)),resumePath=process.env.FODDER_V316_RESUME;
 const resumeRaw=resumePath?await readFile(resumePath,'utf8'):null,resumeSha256=resumeRaw?createHash('sha256').update(resumeRaw).digest('hex'):null;
 if(resumePath)expect(resumeSha256).toBe(process.env.FODDER_V316_RESUME_SHA256);
 const initial=resumeRaw?deserializeWorld(resumeRaw):historical;
 expect(historical.tick).toBe(8434);expect(initial.tick).toBeGreaterThanOrEqual(8434);expect(initial.pawns).toHaveLength(15);expect(validateWorld(initial)).toEqual([]);
 const browser=await playwright.chromium.launch({channel:'chrome'}),page=await browser.newPage({baseURL:'http://127.0.0.1:5387',viewport:{width:2560,height:1440}});
 page.setDefaultTimeout(20000);
 const errors=observeErrors(page),rotation={value:0},checkpoints:{label:string;tick:number}[]=[];
 const act=(command:Command,reason:string)=>perform(page,{command,reason},rotation);
 const stationId=20858,cookId=20343,growerId=19871;
 let billId=0,zoneId=0,productId=0;
 async function checkpoint(label:string){
  await pause(page);const w=await world(page);expect(validateWorld(w)).toEqual([]);
  await page.keyboard.press('Escape');await panel(page,'menu');await page.locator('#save').click();
  await expect.poll(async()=>{const stored=await page.evaluate(k=>window.__lisiere.saveRepository.peekItem(k),saveKey);return stored?serializeWorld(deserializeWorld(await decodeStoredSave(stored))):null;}).toBe(serializeWorld(w));
  await page.locator('#load').click();await expectWorld(page,w);await page.keyboard.press('Escape');
  checkpoints.push({label,tick:w.tick});await writeTestFile(test.info().outputPath(`checkpoint-${label}.json`),serializeWorld(w));return w;
 }
 async function gate(predicate:string,args:Record<string,number>={},speed='1',timeout=120000){
  await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();
  await page.waitForFunction(({predicate,args})=>{const w=window.__lisiere.world;const ready=Function('w','a',`return (${predicate});`)(w,args);if(ready)document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return ready;},{predicate,args},{polling:20,timeout});
  await pause(page);
 }
 try{
  await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);await pause(page);
  await page.evaluate(({key,data})=>window.__lisiere.saveRepository.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
  await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
  expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await checkpoint('baseline');
  const resumedTask=initial.pawns.find(p=>p.id===cookId)?.cooking;
  if(resumedTask?.recipe==='make-kibble'){
   billId=resumedTask.billId!;zoneId=initial.growingZones.find(z=>z.cells.includes(110*initial.width+104))!.id;
  }else{
  for(const p of initial.pawns.filter(p=>!p.prisoner)){
   if(p.id!==cookId&&p.priorities.cook)await act({type:'priority',pawnId:p.id,work:'cook',value:0},'Réserver cette fabrication à Salomé par le réglage de travail.');
   if(p.id!==growerId&&p.priorities.grow)await act({type:'priority',pawnId:p.id,work:'grow',value:0},'Confier le semis témoin à Noé.');
  }
  if(!initial.growingZones.some(z=>z.cells.includes(110*initial.width+104))){
   await tool(page,'growing');await revealCells(page,[{x:104,z:110}]);await cell(page,104,110);await page.keyboard.press('Escape');
  }
  await expect.poll(async()=>(await world(page)).growingZones.some(z=>z.cells.includes(110*initial.width+104))).toBe(true);
  zoneId=(await world(page)).growingZones.find(z=>z.cells.includes(110*initial.width+104))!.id;
  await act({type:'growing-policy',zoneId,plant:'haygrass',allowSow:true,allowCut:true},'Choisir la nouvelle culture sur une vraie case fertile.');await checkpoint('haygrass-policy');
  for(const existing of initial.structures.find(s=>s.id===stationId)!.bills??[]){
   const {id,recipe:_,...settings}=existing;
   await act({type:'bill-update',structureId:stationId,billId:id,settings:{...settings,suspended:true}},'Suspendre la facture concurrente par ses réglages réels.');
  }
  await act({type:'bill-add',structureId:stationId,recipe:'make-kibble'},'Ajouter une facture sur la table de boucher existante.');
  billId=(await world(page)).structures.find(s=>s.id===stationId)!.bills!.find(b=>b.recipe==='make-kibble')!.id;
  await act({type:'bill-update',structureId:stationId,billId,settings:{mode:'times',target:1,suspended:false,radius:32,destination:'drop',filters:Object.fromEntries(KIBBLE_INPUTS.map(item=>[item,item==='rice'||item==='milk']))}},'Utiliser seulement le riz et le lait réellement présents.');await checkpoint('bill');
  await act({type:'order-cook',pawnId:cookId,structureId:stationId,queue:false},'Prioriser la collecte et la fabrication physiques.');
  }
  await gate("w.pawns.find(p=>p.id===a.cook).cooking?.recipe==='make-kibble'&&w.pawns.find(p=>p.id===a.cook).cooking.ingredients.some(i=>i.stage==='held')",{cook:cookId},'6');
  const held=await checkpoint('ingredient-carried');expect(held.pawns.find(p=>p.id===cookId)!.cooking!.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(40);
  await gate("w.pawns.find(p=>p.id===a.cook).cooking?.recipe==='make-kibble'&&w.pawns.find(p=>p.id===a.cook).cooking.phase==='work'",{cook:cookId},'3');
  const staged=await checkpoint('two-quotas-staged'),task=staged.pawns.find(p=>p.id===cookId)!.cooking!;
  expect(task.ingredients.every(i=>i.stage==='placed')).toBe(true);
  expect(task.ingredients.filter(i=>i.item==='milk').reduce((n,i)=>n+i.quantity,0)).toBe(20);expect(task.ingredients.filter(i=>i.item==='rice').reduce((n,i)=>n+i.quantity,0)).toBe(20);
  await gate("w.piles.some(p=>p.item==='kibble')",{},'1');const output=await checkpoint('product');
  const product=output.piles.find(p=>p.item==='kibble')!;productId=product.id;expect(product.quantity).toBe(50);expect(product.foodPoison).toBeUndefined();
  const current=await world(page),sow=current.jobs.find(j=>j.kind==='sow'&&j.x===104&&j.z===110);
  if(sow&&!current.resources.some(r=>r.kind==='haygrass'))await act({type:'order-job',pawnId:growerId,jobId:sow.id,queue:false},'Prioriser par le menu réel le semis déjà planifié sur la nouvelle zone.');
  await gate("w.resources.some(r=>r.kind==='haygrass')",{},'6');const sown=await checkpoint('haygrass-sown');
  expect(sown.resources.some(r=>r.kind==='haygrass'&&r.x===104&&r.z===110)).toBe(true);
  await tool(page,'select');await page.keyboard.press('Escape');await revealCells(page,[{x:104,z:110}]);await page.screenshot({path:test.info().outputPath('actual-fodder.png')});
  expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false});
  await writeTestFile(test.info().outputPath('report.json'),JSON.stringify({source,resumePath:resumePath??null,resumeSha256,declaredDotation:[],stationId,cookId,growerId,zoneId,billId,productId,checkpoints,errors,limits:'Real crop sowing and milk/rice kibble fabrication; full hay growth/harvest, hay recipe and animal ingestion qualified by permanent simulation tests. No natural campaign or FPS claim.'},null,2));
 }catch(error){await pause(page);await writeTestFile(test.info().outputPath('failed-world.json'),serializeWorld(await world(page)));await writeTestFile(test.info().outputPath('failed-diagnostic.json'),JSON.stringify({billId,zoneId,productId,checkpoints,errors,notice:await page.locator('#notice').textContent()},null,2));throw error;}
 finally{await page.close();await browser.close();}
});
