import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {world,pause,panel,expectWorld,observeErrors,cell,tool} from './helpers';
import {perform,revealCells} from './player-actions';
import type {World} from '../../src/sim/types';

// Literal already-reloaded V347 reserve branch, migration changes schema only.
// No world mutation or reconstruction of the separate wounded V344 branch.
const INPUT='tmp/early-access-v347/native/colony-reserve-use-v347-V3-11420-istinct-literal-V345-branch/consumed.json';
const INPUT_SHA='8d931f493fe03abaacd275b341fd994a56727f5f1836dc29ccd2c9b1a0c93a81';
const IRIS=18530,SOURCE=18975,DEST={x:123,z:114};
test.use({channel:'chrome'});
test('V354 one existing medicine dose reaches the indoor reserve from the literal V347 branch',async({page},info)=>{
 test.skip(process.env.V354!=='1','ROOT opt-in natural branch, no recovery of separate incident branch.');test.setTimeout(180000);page.setDefaultTimeout(12000);
 const started=Date.now(),deadline=started+120000,errors=observeErrors(page),rotation={value:0},raw=await readFile(INPUT,'utf8');expect(createHash('sha256').update(raw).digest('hex')).toBe(INPUT_SHA);
 const old=JSON.parse(raw),initial=deserializeWorld(raw);expect(initial).toEqual({...old,schemaVersion:initial.schemaVersion});expect(initial.tick).toBe(58168);expect(initial.pawns.filter(p=>[18530,18532,18534].includes(p.id)).map(p=>p.id).sort()).toEqual([18530,18532,18534]);
 const checkpoints:{name:string;tick:number;sha256:string;reloaded:boolean}[]=[],ring:unknown[]=[];let loaded=false,complete=false,failure:unknown,last:World|undefined,backend:unknown,zoneId:number|undefined,carryId:number|undefined;
 const front=()=>page.locator('.front-menu');
 const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();await expect(page.locator('#menu-panel')).not.toBeVisible();};
 const guard=(w:World)=>{if(w.pawns.some(p=>[18530,18532,18534].includes(p.id)&&(['dead','downed'].includes(p.state)||p.mental?.crisis))||w.pawns.some(p=>p.faction==='outlaws'&&!p.prisoner&&!['dead','downed'].includes(p.state))||w.wildlife?.animals.some(a=>a.manhunter&&!a.manhunter.exhausted&&!['dead','downed'].includes(a.state)))throw Error('Natural danger/incapacity interrupts the bounded medicine branch');};
 const read=async(conserve=false)=>{expect(errors).toEqual([]);if(!conserve&&Date.now()>deadline)throw Error('V354 bounded body expired');const w=await world(page);last=w;if(!conserve)guard(w);backend=await page.evaluate(()=>window.__lisiere.backend);if(!conserve)expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false});ring.push({tick:w.tick,pawns:w.pawns,jobs:w.jobs,piles:w.piles.filter(p=>p.kind==='medicine'),stockpiles:w.stockpiles});if(ring.length>16)ring.shift();return w;};
 const wait=async(done:(w:World)=>boolean)=>{await expect.poll(async()=>done(await read()),{timeout:60000,intervals:[100]}).toBe(true);};
 const capture=async(name:string,reload=true,screenshot=true,conserve=false)=>{
  await pause(page);await closeMenu();if(screenshot)await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(null)))));const before=await read(conserve);expect(validateWorld(before)).toEqual([]);if(screenshot)await page.screenshot({path:info.outputPath(name+'-map.png')});await panel(page,'menu');const manager=page.locator('[data-save-manager]'),label='V354 '+name;
  await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const text=await readFile(path,'utf8');expect(deserializeWorld(text)).toEqual(before);const record={name,tick:before.tick,sha256:createHash('sha256').update(text).digest('hex'),reloaded:false};checkpoints.push(record);
  if(reload){await page.locator('#browse-saves').click();const row=front().locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front().getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);record.reloaded=true;}
  await info.attach(name,{contentType:'application/json',path});await closeMenu();return before;
 };
 const run=async()=>{await closeMenu();await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();};
 try{
  expect(validateWorld(initial)).toEqual([]);expect(initial.stockpiles.some(s=>s.x===DEST.x&&s.z===DEST.z)).toBe(false);expect(initial.piles.find(p=>p.id===SOURCE)).toMatchObject({kind:'medicine',item:'medicine',quantity:1,owner:{type:'ground',x:127,z:114}});expect(initial.roofing?.constructed.includes(DEST.z*initial.width+DEST.x)).toBe(true);
  const input=info.outputPath('literal-migrated-input.json');await writeFile(input,serializeWorld(initial));await page.goto('/?e2e');await front().getByRole('button',{name:'Charger une partie',exact:true}).click();await front().locator('input[type=file]').setInputFiles(input);await expectWorld(page,initial);loaded=true;await pause(page);await capture('literal',true,false);
  await perform(page,{reason:'Créer une cellule intérieure de médecine',command:{type:'area',action:'stockpile',from:DEST,to:DEST}},rotation);await page.keyboard.press('Escape');await tool(page,'select');
  for(let n=0;n<6;n++){await revealCells(page,[DEST]);await cell(page,DEST.x,DEST.z);if(await page.locator('#cell-storage').isVisible())break;}
  await expect(page.locator('#cell-storage')).toBeVisible();const storage=page.locator('#selected-stockpile-items');await storage.locator('[data-storage-all="false"]').click();await storage.locator('[data-storage-search]').fill('medicine');await storage.locator('[data-storage-item="medicine"]').setChecked(true);await storage.locator('[data-storage-search]').fill('');await storage.locator('[data-storage-priority]').selectOption('3');await page.keyboard.press('Escape');
  const configured=await capture('configured');const zone=configured.stockpiles.find(s=>s.x===DEST.x&&s.z===DEST.z)!;zoneId=zone.id;expect(zone.priority).toBe(3);expect(Object.entries(zone.items??{}).filter(([,enabled])=>enabled).map(([key])=>key)).toEqual(['medicine']);
  await perform(page,{reason:'Démobiliser Iris par le bouton réel',command:{type:'draft',pawnIds:[IRIS],enabled:false}},rotation);await perform(page,{reason:'Transporter cette dose exacte vers la réserve',command:{type:'order-haul',pawnId:IRIS,queue:false,target:{type:'pile',pileId:SOURCE}}},rotation);
  const ordered=await capture('ordered',true,false);expect(ordered.pawns.find(p=>p.id===IRIS)?.haul).toMatchObject({sourcePileId:SOURCE,quantity:1,phase:'pickup',carryPileId:null,destination:{type:'stockpile',stockpileId:zoneId}});
  await run();await wait(w=>{const task=w.pawns.find(p=>p.id===IRIS)?.haul;return task?.sourcePileId===SOURCE&&task.carryPileId!==null&&w.piles.some(p=>p.id===task.carryPileId&&p.owner.type==='pawn'&&p.owner.pawnId===IRIS);});const held=await capture('held'),task=held.pawns.find(p=>p.id===IRIS)!.haul!;expect(task).toMatchObject({sourcePileId:SOURCE,quantity:1,phase:'deliver',pickupCell:{x:127,z:114},destination:{type:'stockpile',stockpileId:zoneId}});carryId=task.carryPileId!;expect(carryId).not.toBe(SOURCE);expect(held.piles.some(p=>p.id===SOURCE)).toBe(false);expect(held.piles.find(p=>p.id===carryId)).toMatchObject({item:'medicine',quantity:1,owner:{type:'pawn',pawnId:IRIS}});
  await run();await wait(w=>w.piles.some(p=>p.id===carryId&&p.owner.type==='ground'&&p.owner.x===DEST.x&&p.owner.z===DEST.z));const delivered=await capture('delivered');expect(delivered.piles.find(p=>p.id===carryId)).toMatchObject({item:'medicine',quantity:1,owner:{type:'ground',...DEST}});
  expect(delivered.piles.filter(p=>p.item==='medicine').reduce((n,p)=>n+p.quantity,0)).toBe(26);expect(delivered.piles.find(p=>p.id===18695)).toEqual(initial.piles.find(p=>p.id===18695));expect(delivered.roofing?.constructed.includes(DEST.z*delivered.width+DEST.x)).toBe(true);expect(checkpoints.every(c=>c.reloaded)).toBe(true);expect(errors).toEqual([]);complete=true;
 }catch(error){failure=error;throw error;}
 finally{
  let exportFailure:unknown;if(loaded&&failure&&!errors.length)try{await capture('failure-outcome',false,true,true);}catch(error){exportFailure=error;}
  const path=info.outputPath('medicine-reserve-v354-summary.json');await writeFile(path,JSON.stringify({version:354,inputPath:INPUT,inputSha:INPUT_SHA,channel:'chrome',backend,qualification:'Literal distinct V347 reserve branch; one medicine delivery only, no use/tending, recovery of V344, full reserve, durable safety or FPS.',result:failure||exportFailure?'partial-failure':complete?'natural-delivery':'not-loaded',elapsedMs:Date.now()-started,failure:String(failure??''),exportFailure:String(exportFailure??''),zoneId,sourceId:SOURCE,carryId,checkpoints,errors,ring,last},null,2));await info.attach('medicine-reserve-v354-summary',{contentType:'application/json',path});
 }
});
