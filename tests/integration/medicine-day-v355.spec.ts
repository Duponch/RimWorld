import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {stockpileZoneId} from '../../src/sim/stockpile-zones';
import {ITEM_DEFINITIONS} from '../../src/sim/items';
import {world,pause,panel,expectWorld,observeErrors,cell,tool} from './helpers';
import {perform,revealCells} from './player-actions';
import type {World} from '../../src/sim/types';

// Literal reloaded V354 continuation; no reconstructed goods or wounds.
// Real expansion, haul custody/merges and ordinary time progression.
const INPUT='tmp/early-access-v354/native-reprise/medicine-reserve-v354-V354-5ea2a-rom-the-literal-V347-branch/delivered.json';
const INPUT_SHA='4ca356d81a0646f1aff0e721f237a3f8679f802cac5ba307e5f11879f755cb39';
const IRIS=18530,SOURCE=18695,EXISTING=19676,ZONE=19675,DEST={x:123,z:114},EXTEND={x:124,z:114},END=60000,ORIGINALS=[18530,18532,18534];
const doses=(w:World)=>w.piles.filter(p=>p.item==='medicine').reduce((n,p)=>n+p.quantity,0);
const indoors=(w:World)=>w.piles.filter(p=>p.item==='medicine'&&p.owner.type==='ground'&&p.owner.z===114&&[123,124].includes(p.owner.x));
test.use({channel:'chrome'});
test('V355 existing26 medicines reach two indoor cells, then the same branch progresses naturally to tick60000',async({page},info)=>{
 test.skip(process.env.V355!=='1','ROOT opt-in distinct V354 branch; no prospective outcome.');test.setTimeout(300000);page.setDefaultTimeout(12000);
 const started=Date.now(),deadline=started+240000,errors=observeErrors(page),rotation={value:0},raw=await readFile(INPUT,'utf8');expect(createHash('sha256').update(raw).digest('hex')).toBe(INPUT_SHA);
 const literal=JSON.parse(raw),initial=deserializeWorld(raw);expect(initial).toEqual({...literal,schemaVersion:initial.schemaVersion});expect(initial.tick).toBe(58206);
 const checkpoints:{name:string;tick:number;sha256:string;reloaded:boolean;screenshot:boolean}[]=[],ring:unknown[]=[],journal:unknown[]=[],transfers:unknown[]=[];let loaded=false,complete=false,failure:unknown,last:World|undefined,backend:unknown,stage='input',journalKey='',journalTick=-1;
 const front=()=>page.locator('.front-menu');
 const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();await expect(page.locator('#menu-panel')).not.toBeVisible();};
 const guard=(w:World)=>{
  if(w.pawns.some(p=>ORIGINALS.includes(p.id)&&(['dead','downed'].includes(p.state)||p.mental?.crisis))||w.pawns.some(p=>p.faction==='outlaws'&&!p.prisoner&&!['dead','downed'].includes(p.state))||w.wildlife?.animals.some(a=>a.manhunter&&!a.manhunter.exhausted&&!['dead','downed'].includes(a.state)))throw Error('Natural danger/incapacity interrupts the bounded medicine day');
  expect(w.pawns.filter(p=>ORIGINALS.includes(p.id)).map(p=>p.id).sort()).toEqual(ORIGINALS);expect(doses(w)).toBe(26);
 };
 const read=async(conserve=false)=>{
  if(!conserve){expect(errors).toEqual([]);if(Date.now()>deadline)throw Error('V355 bounded body expired');}
  const w=await world(page);last=w;backend=await page.evaluate(()=>window.__lisiere.backend);
  if(!conserve){guard(w);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false});}
  const sample={elapsedMs:Date.now()-started,stage,tick:w.tick,pawns:w.pawns.map(p=>({id:p.id,state:p.state,hunger:p.hunger,rest:p.rest,draft:p.draft,need:p.need,haul:p.haul,jobId:p.jobId,cooking:p.cooking,mental:p.mental})),medicine:w.piles.filter(p=>p.item==='medicine'),events:w.events.slice(-12)};
  ring.push(sample);if(ring.length>32)ring.shift();const key=JSON.stringify([stage,...w.pawns.map(p=>[p.id,p.state,p.need?.kind,p.need?.phase,p.jobId,p.cooking?.phase,p.haul?.phase])]);
  if(key!==journalKey||w.tick-journalTick>=60){journal.push(sample);if(journal.length>512)journal.shift();journalKey=key;journalTick=w.tick;}return w;
 };
 const wait=async(done:(w:World)=>boolean)=>{await expect.poll(async()=>done(await read()),{timeout:Math.max(1,Math.min(90000,deadline-Date.now())),intervals:[100]}).toBe(true);};
 const capture=async(name:string,reload=true,screenshot=false,conserve=false)=>{
  await pause(page);await closeMenu();const before=await read(conserve);expect(validateWorld(before)).toEqual([]);
  if(screenshot){expect(checkpoints.filter(c=>c.screenshot).length).toBeLessThan(3);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(null)))));await page.screenshot({path:info.outputPath(name+'-map.png')});}
  await panel(page,'menu');const manager=page.locator('[data-save-manager]'),label='V355 '+name;await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const text=await readFile(path,'utf8');expect(deserializeWorld(text)).toEqual(before);
  const record={name,tick:before.tick,sha256:createHash('sha256').update(text).digest('hex'),reloaded:false,screenshot};checkpoints.push(record);
  if(reload){expect(checkpoints.filter(c=>c.reloaded).length).toBeLessThan(4);await page.locator('#browse-saves').click();const row=front().locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front().getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);record.reloaded=true;}
  await info.attach(name,{contentType:'application/json',path});await closeMenu();return before;
 };
 const run=async(speed:1|6)=>{await closeMenu();await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();};
 try{
  expect(validateWorld(initial)).toEqual([]);expect(initial.pawns.find(p=>p.id===IRIS)?.draft).toBeUndefined();expect(doses(initial)).toBe(26);
  expect(initial.piles.find(p=>p.id===EXISTING)).toMatchObject({item:'medicine',quantity:1,owner:{type:'ground',...DEST}});expect(initial.piles.find(p=>p.id===SOURCE)).toMatchObject({item:'medicine',quantity:25,owner:{type:'ground',x:129,z:114}});
  expect(initial.stockpiles.find(s=>s.x===DEST.x&&s.z===DEST.z)?.id).toBe(ZONE);expect(initial.stockpiles.some(s=>s.x===EXTEND.x&&s.z===EXTEND.z)).toBe(false);
  for(const c of [DEST,EXTEND])expect(initial.roofing?.constructed.includes(c.z*initial.width+c.x)).toBe(true);
  const input=info.outputPath('literal-migrated-input.json');await writeFile(input,serializeWorld(initial));await page.goto('/?e2e');await front().getByRole('button',{name:'Charger une partie',exact:true}).click();await front().locator('input[type=file]').setInputFiles(input);await expectWorld(page,initial);loaded=true;await pause(page);await read();
  // perform(area) omits explicit targetZoneId. Use the real targeted expansion button instead.
  stage='expand';await tool(page,'select');for(let n=0;n<10;n++){await revealCells(page,[DEST]);await cell(page,DEST.x,DEST.z);if(await page.locator('#inspector [data-zone-action="expand"]').isVisible())break;}
  await expect(page.locator('#inspector [data-zone-action="expand"]')).toBeVisible();await page.locator('#inspector [data-zone-action="expand"]').click();await revealCells(page,[EXTEND]);await cell(page,EXTEND.x,EXTEND.z);await page.keyboard.press('Escape');
  // A real pointer command is asynchronous; wait for confirmed worker adoption before the save witness.
  await expect.poll(async()=>{const w=await read();return w.stockpiles.filter(s=>stockpileZoneId(s)===ZONE).map(c=>`${c.x}:${c.z}`).sort();},{timeout:20000}).toEqual(['123:114','124:114']);
  const configured=await capture('configured');const cells=configured.stockpiles.filter(s=>stockpileZoneId(s)===ZONE);expect(cells.map(c=>`${c.x}:${c.z}`).sort()).toEqual(['123:114','124:114']);
  for(const s of cells){expect(s.priority).toBe(3);expect(Object.entries(s.items??{}).filter(([,v])=>v).map(([k])=>k)).toEqual(['medicine']);expect(Object.entries(s.filters).filter(([,v])=>v).map(([k])=>k)).toEqual(['medicine']);expect(configured.roofing?.constructed.includes(s.z*configured.width+s.x)).toBe(true);}
  for(const [index,quantity] of [10,10,5].entries()){
   stage='order-'+(index+1);await pause(page);await perform(page,{reason:'Transporter le lot physique de médecine restant',command:{type:'order-haul',pawnId:IRIS,queue:false,target:{type:'pile',pileId:SOURCE}}},rotation);
   const ordered=await read(),task=ordered.pawns.find(p=>p.id===IRIS)!.haul!;expect(task).toMatchObject({sourcePileId:SOURCE,quantity,phase:'pickup',carryPileId:null});expect(ordered.pawns.find(p=>p.id===IRIS)?.orders.queue).toEqual([]);
   if(task.destination.type!=='stockpile')throw Error('Medicine destination is not a physical storage cell');const destinationId=task.destination.stockpileId,dest=ordered.stockpiles.find(s=>s.id===destinationId)!;expect(stockpileZoneId(dest)).toBe(ZONE);
   const compatible=ordered.piles.find(p=>p.item==='medicine'&&p.owner.type==='ground'&&p.owner.x===dest.x&&p.owner.z===dest.z&&p.quantity+quantity<=ITEM_DEFINITIONS.medicine.stackLimit),beforeQuantity=compatible?.quantity??0;
   await run(1);await wait(w=>{const t=w.pawns.find(p=>p.id===IRIS)?.haul;return t?.sourcePileId===SOURCE&&t.phase==='deliver'&&t.carryPileId!==null&&w.piles.some(p=>p.id===t.carryPileId&&p.owner.type==='pawn'&&p.owner.pawnId===IRIS);});
   const held=index===0?await capture('first-cargo',true,true):await read(),heldTask=held.pawns.find(p=>p.id===IRIS)!.haul!;expect(heldTask).toMatchObject({sourcePileId:SOURCE,quantity,phase:'deliver',destination:{type:'stockpile',stockpileId:destinationId},pickupCell:{x:129,z:114}});
   const carryId=heldTask.carryPileId!;expect(carryId).not.toBe(SOURCE);expect(held.piles.find(p=>p.id===carryId)).toMatchObject({item:'medicine',quantity,owner:{type:'pawn',pawnId:IRIS}});expect(held.piles.find(p=>p.id===SOURCE)?.quantity??0).toBe([15,5,0][index]);
   stage='deliver-'+(index+1);await run(1);await wait(w=>!w.pawns.find(p=>p.id===IRIS)?.haul&&indoors(w).reduce((n,p)=>n+p.quantity,0)===[11,21,26][index]);const delivered=await read();
   if(compatible){expect(delivered.piles.find(p=>p.id===compatible.id)).toMatchObject({quantity:beforeQuantity+quantity,owner:{type:'ground',x:dest.x,z:dest.z}});expect(delivered.piles.some(p=>p.id===carryId)).toBe(false);}else expect(delivered.piles.find(p=>p.id===carryId)).toMatchObject({item:'medicine',quantity,owner:{type:'ground',x:dest.x,z:dest.z}});
   expect(delivered.piles.find(p=>p.id===EXISTING)?.owner).toEqual({type:'ground',...DEST});expect(doses(delivered)).toBe(26);expect(delivered.piles.find(p=>p.id===SOURCE)?.quantity??0).toBe([15,5,0][index]);
   transfers.push({index:index+1,quantity,sourceId:SOURCE,carryId,destinationId,destination:{x:dest.x,z:dest.z},mergeTargetId:compatible?.id??null,persistedId:compatible?.id??carryId,heldTick:held.tick,deliveredTick:delivered.tick,sourceRemaining:[15,5,0][index]});
  }
  stage='reserve26';const reserve=await capture('reserve26',true,true);expect(indoors(reserve).reduce((n,p)=>n+p.quantity,0)).toBe(26);expect(reserve.piles.some(p=>p.id===SOURCE)).toBe(false);
  stage='natural-day';await run(6);await wait(w=>w.tick>=END);const final=await capture('tick60000',true,true);expect(final.tick).toBeGreaterThanOrEqual(END);expect(indoors(final).reduce((n,p)=>n+p.quantity,0)).toBe(26);expect(final.pawns.find(p=>p.id===IRIS)?.draft).toBeUndefined();expect(checkpoints).toHaveLength(4);expect(checkpoints.every(c=>c.reloaded)).toBe(true);expect(errors).toEqual([]);complete=true;
 }catch(error){failure=error;throw error;}
 finally{
  let exportFailure:unknown;if(loaded&&failure)try{await capture('failure-outcome',false,false,true);}catch(error){exportFailure=error;}
  const path=info.outputPath('medicine-day-v355-summary.json');await writeFile(path,JSON.stringify({version:355,inputPath:INPUT,inputSha:INPUT_SHA,channel:'chrome',backend,qualification:'Literal V354 continuation;26 existing medicines moved via three real forced trips, then ordinary needs/rest/cooking/events. No invented usage, V344 recovery, durable safety, campaign or FPS/speed6 certification.',result:failure||exportFailure?'partial-failure':complete?'reserve-and-bounded-day':'not-loaded',elapsedMs:Date.now()-started,stage,failure:String(failure??''),exportFailure:String(exportFailure??''),checkpoints,transfers,errors,journal,ring,last},null,2));await info.attach('medicine-day-v355-summary',{contentType:'application/json',path});
 }
});