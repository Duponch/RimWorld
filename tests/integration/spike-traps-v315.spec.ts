import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {spikeTrapAulnes} from '../helpers/spike-traps-v315.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {decodeStoredSave} from '../../src/ui/save-storage-codec.ts';
import {constructionSupplied,constructionRecipe,constructionCapacity,deliveredMaterial} from '../../src/sim/construction-materials.ts';
import {canStandAt} from '../../src/sim/furniture-travel.ts';
import type {Command,World,Cell} from '../../src/sim/types.ts';
import {cell,expectWorld,observeErrors,panel,pause,saveKey,world,settledCells} from './helpers.ts';
import {perform,revealCells} from './player-actions.ts';
import {writeTestFile} from '../test-output.ts';

test('V315 actual Aulnes: paid trap, durable physical entry, whole relocation and reconstruction policy',async({playwright})=>{
 test.setTimeout(480000);const fixture=await spikeTrapAulnes(),resumePath=process.env.SPIKE_TRAPS_V315_RESUME;
 const initial=resumePath?deserializeWorld(await readFile(resumePath,'utf8')):fixture.world;
 if(resumePath){expect(validateWorld(initial)).toEqual([]);expect(initial.width).toBe(250);expect(initial.pawns.length).toBe(15);expect(initial.structures.some(s=>s.kind==='spike-trap'&&s.x===fixture.cell.x&&s.z===fixture.cell.z)||serializeWorld(initial)===serializeWorld(fixture.world)).toBe(true);}
 const browser=await playwright.chromium.launch({channel:'chrome'});
 const page=await browser.newPage({baseURL:'http://127.0.0.1:5386',viewport:{width:2560,height:1440}});page.setDefaultTimeout(15000);
 const errors=observeErrors(page),checkpoints:{label:string;tick:number}[]=[],rotation={value:0};let trapId=0,blueprintId=0,workerId=0,sprung=false;
 const act=(command:Command,reason:string)=>perform(page,{command,reason},rotation);
 async function checkpoint(label:string){await pause(page);const w=await world(page);expect(validateWorld(w)).toEqual([]);
  await page.keyboard.press('Escape');await panel(page,'menu');await page.locator('#save').click();
  await expect.poll(async()=>{const raw=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);return raw?serializeWorld(deserializeWorld(await decodeStoredSave(raw))):null;}).toBe(serializeWorld(w));
  await page.locator('#load').click();await expectWorld(page,w);await page.keyboard.press('Escape');checkpoints.push({label,tick:w.tick});await writeTestFile(test.info().outputPath(`checkpoint-${label}.json`),serializeWorld(w));return w;}
 async function gate(predicate:string,args:Record<string,unknown>,timeout=90000,speed='6'){
  await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();
  await page.waitForFunction(({predicate,args})=>{const w=window.__lisiere.world;if(!new Function('w','a',`return (${predicate});`)(w,args))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},{predicate,args},{polling:20,timeout});await pause(page);}
 async function inspect(c:Cell,selector:string){await page.keyboard.press('Escape');await revealCells(page,[c]);for(let n=0;n<20;n++){await cell(page,c.x,c.z);if(await page.locator(selector).isVisible())return;}await expect(page.locator(selector)).toBeVisible();}
 async function build(id:number){for(let n=0;n<24;n++){const w=await world(page),j=w.jobs.find(j=>j.id===id);if(!j||constructionSupplied(w,j))break;
   const builders=w.pawns.filter(p=>!p.prisoner&&p.state!=='dead'&&p.state!=='downed'&&p.priorities.build>0&&p.hunger>30&&p.rest>20).sort((a,b)=>Math.hypot(a.x-j.x,a.z-j.z)-Math.hypot(b.x-j.x,b.z-j.z)||a.id-b.id).slice(0,2);expect(builders.length).toBeGreaterThan(0);
   for(const p of builders){const live=await world(page),current=live.jobs.find(j=>j.id===id);if(!current||!constructionRecipe(current).ingredients.some(i=>constructionCapacity(live,current,i.item)>0))break;
    const actor=live.pawns.find(a=>a.id===p.id)!;
    if(!(actor.haul?.destination.type==='job'&&actor.haul.destination.jobId===id))await act({type:'order-haul',pawnId:p.id,target:{type:'job',jobId:id},queue:false},'Livrer les matériaux au vrai chantier.');}
   const delivered=constructionRecipe(j).ingredients.reduce((n,i)=>n+deliveredMaterial(w,j,i.item),0);
   await gate('!w.jobs.some(j=>j.id===a.id)||w.piles.filter(p=>p.owner.type===\'job\'&&p.owner.jobId===a.id).reduce((n,p)=>n+p.quantity,0)>a.delivered',{id,delivered},60000);
  }
  const w=await world(page),j=w.jobs.find(j=>j.id===id);if(j&&j.reservedBy===null){expect(constructionSupplied(w,j)).toBe(true);const p=w.pawns.filter(p=>!p.prisoner&&p.priorities.build>0&&p.skills.construction.level>=3&&p.state!=='dead'&&p.state!=='downed').sort((a,b)=>Math.hypot(a.x-j.x,a.z-j.z)-Math.hypot(b.x-j.x,b.z-j.z)||a.id-b.id)[0]!;await act({type:'order-job',pawnId:p.id,jobId:id,queue:false},'Terminer le travail de Construction.');}
  await gate('!w.jobs.some(j=>j.id===a.id)',{id},180000);}
 try{
  await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);await pause(page);
  await page.evaluate(async({key,data})=>window.__lisiere.saveRepository.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await checkpoint(resumePath?'continuation':'baseline');
  if(!initial.structures.some(s=>s.kind==='spike-trap'&&s.x===fixture.cell.x&&s.z===fixture.cell.z)){
   await act({type:'designate',kind:'spike-trap',material:'wood',orientation:0,...fixture.cell},'Construire avec 45 bois réellement présents dans Les Aulnes.');blueprintId=(await world(page)).jobs.find(j=>j.kind==='spike-trap'&&j.x===fixture.cell.x&&j.z===fixture.cell.z)!.id;await checkpoint('blueprint');await build(blueprintId);
  }
  let built=await checkpoint('built');trapId=built.structures.find(s=>s.kind==='spike-trap'&&s.x===fixture.cell.x&&s.z===fixture.cell.z)!.id;
  await inspect(fixture.cell,'#spike-trap-auto-rebuild');expect(await page.locator('#spike-trap-auto-rebuild').isChecked()).toBe(!!built.home?.includes(fixture.cell.z*built.width+fixture.cell.x));
  await page.locator('#spike-trap-auto-rebuild').check();await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===trapId)?.spikeTrap?.autoRebuild).toBe(true);built=await checkpoint('policy');
  await revealCells(page,[fixture.cell]);const center=await page.evaluate(c=>window.__lisiere.projectCell(c.x,c.z),fixture.cell);await page.mouse.move(center.x,center.y);await page.mouse.wheel(0,-1700);await settledCells(page,[fixture.cell]);await inspect(fixture.cell,'#spike-trap-auto-rebuild');await page.screenshot({path:test.info().outputPath('actual-trap.png')});
  const worker=built.pawns.filter(p=>!p.prisoner&&p.state!=='dead'&&p.state!=='downed'&&p.hunger>30&&p.rest>20).sort((a,b)=>Math.hypot(a.x-fixture.cell.x,a.z-fixture.cell.z)-Math.hypot(b.x-fixture.cell.x,b.z-fixture.cell.z)||a.id-b.id)[0]!;workerId=worker.id;
  await act({type:'draft',pawnIds:[workerId],enabled:true},'Observer une seule entrée physique d’un colon qui connaît le piège.');await act({type:'draft-move',pawnIds:[workerId],target:fixture.cell,queue:false},'Rejoindre la case du piège avec un déplacement réellement payé.');
  await gate('!w.structures.some(s=>s.id===a.id)||w.structures.find(s=>s.id===a.id).spikeTrap.touching.includes(\'pawn:\'+a.worker)',{id:trapId,worker:workerId},90000,'1');const contacted=await checkpoint('contact');sprung=!contacted.structures.some(s=>s.id===trapId);
  if(sprung){const replacement=contacted.jobs.find(j=>j.kind==='spike-trap'&&j.x===fixture.cell.x&&j.z===fixture.cell.z);expect(replacement).toBeDefined();expect(replacement!.escrow).toEqual({wood:0,food:0});await act({type:'draft',pawnIds:[workerId],enabled:false},'Libérer le colon après l’accident réel.');await build(replacement!.id);const next=await checkpoint('rebuilt');trapId=next.structures.find(s=>s.kind==='spike-trap'&&s.x===fixture.cell.x&&s.z===fixture.cell.z)!.id;}
  else{await gate('w.tick>=a.tick+3',{tick:contacted.tick},30000,'1');const held=await checkpoint('standing');expect(held.structures.find(s=>s.id===trapId)!.spikeTrap!.touching).toContain(`pawn:${workerId}`);
   const exit=[{x:fixture.cell.x+1,z:fixture.cell.z},{x:fixture.cell.x-1,z:fixture.cell.z},{x:fixture.cell.x,z:fixture.cell.z+1},{x:fixture.cell.x,z:fixture.cell.z-1}].find(c=>canStandAt(held,c))!;await act({type:'draft-move',pawnIds:[workerId],target:exit,queue:false},'Quitter réellement la case sans retenter le contact.');await gate('!w.structures.find(s=>s.id===a.id).spikeTrap.touching.includes(\'pawn:\'+a.worker)',{id:trapId,worker:workerId},30000,'1');await checkpoint('departed');await act({type:'draft',pawnIds:[workerId],enabled:false},'Rendre le colon à ses tâches.');}
  const beforeUninstall=await world(page),trap=beforeUninstall.structures.find(s=>s.id===trapId)!;await act({type:'designate',kind:'uninstall',targetId:trapId,x:trap.x,z:trap.z},'Désinstaller le même piège, avec le travail ordinaire.');
  const job=(await world(page)).jobs.find(j=>j.furniture?.structureId===trapId)!;const builder=(await world(page)).pawns.filter(p=>!p.prisoner&&p.priorities.build>0&&p.state!=='downed'&&p.state!=='dead').sort((a,b)=>Math.hypot(a.x-trap.x,a.z-trap.z)-Math.hypot(b.x-trap.x,b.z-trap.z)||a.id-b.id)[0]!;
  await act({type:'order-job',pawnId:builder.id,jobId:job.id,queue:false},'Désinstaller sans détruire les matériaux.');await gate('w.packed.some(p=>p.building.id===a.id)',{id:trapId},90000);const packed=await checkpoint('packed');expect(packed.packed.find(p=>p.building.id===trapId)!.building.spikeTrap!.touching).toEqual([]);
  await act({type:'install',structureId:trapId,...fixture.destination,orientation:0},'Transporter et réinstaller le même ID, sans deuxième paiement de 45 bois.');const install=(await world(page)).jobs.find(j=>j.kind==='install'&&j.furniture?.structureId===trapId)!;await act({type:'order-job',pawnId:builder.id,jobId:install.id,queue:false},'Transporter le piège entier.');
  await gate('w.pawns.some(p=>w.packed.some(k=>k.building.id===a.id&&k.owner.type===\'pawn\'&&k.owner.pawnId===p.id))',{id:trapId},90000,'1');await checkpoint('carried');await gate('w.structures.some(s=>s.id===a.id&&s.x===a.x&&s.z===a.z)',{id:trapId,...fixture.destination},90000);const installed=await checkpoint('installed');
  expect(installed.structures.find(s=>s.id===trapId)!.spikeTrap!.autoRebuild).toBe(!!installed.home?.includes(fixture.destination.z*installed.width+fixture.destination.x));await inspect(fixture.destination,'#spike-trap-auto-rebuild');await page.locator('#spike-trap-auto-rebuild').uncheck();await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===trapId)?.spikeTrap?.autoRebuild).toBe(false);await checkpoint('manual-off');
  expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false});await writeTestFile(test.info().outputPath('report.json'),JSON.stringify({source:fixture.source,sha:fixture.sha,declaredDotation:[],blueprintId,trapId,workerId,sprung,checkpoints,errors,limits:'One real allied entry; hostile impacts, armour, saturation and mandatory paid rebuild qualified separately by permanent tests. No natural raid campaign, performance or FPS claim.'},null,2));
 }catch(error){await writeTestFile(test.info().outputPath('failed-world.json'),serializeWorld(await world(page)));await writeTestFile(test.info().outputPath('failed-diagnostic.json'),JSON.stringify({trapId,blueprintId,workerId,checkpoints,errors,notice:await page.locator('#notice').textContent()},null,2));throw error;}
 finally{await page.close();await browser.close();}
});
