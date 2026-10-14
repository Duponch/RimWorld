import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {preparedTreeExpiryCarrier} from '../scenarios/tree-expiry-v353';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {world,pause,panel,expectWorld,observeErrors,cell} from './helpers';
import {perform,revealCells} from './player-actions';
import type {World} from '../../src/sim/types';

// Declared late-epoch carried checkpoint, genuine prior pickup in preparation.
// The following deadline, waits, UI floor work and output are played at x1.
// This does not attest 42,000 natural ticks or the player's historical camp.
test.use({channel:'chrome'});
test('V353 held tree dies once, waits, then deposits all real rests after paid floor work',async({page},info)=>{
 test.skip(process.env.V353!=='1','ROOT opt-in, prepared physical boundary only.');
 test.setTimeout(240000);page.setDefaultTimeout(12000);
 const started=Date.now(),deadline=started+200000,{w:initial,pile,source}=preparedTreeExpiryCarrier(),wrapperId=pile.id,sourceId=source.id,errors=observeErrors(page),rotation={value:0};
 const checkpoints:{name:string;tick:number;sha256:string;reloaded:boolean}[]=[],ring:unknown[]=[];let loaded=false,last:World|undefined,backend:unknown,failure:unknown,complete=false;
 const front=()=>page.locator('.front-menu');
 const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();await expect(page.locator('#menu-panel')).not.toBeVisible();};
 const read=async()=>{expect(errors).toEqual([]);if(Date.now()>deadline)throw Error('V353 bounded body expired');const w=await world(page);last=w;backend=await page.evaluate(()=>window.__lisiere.backend);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false});expect(w.pawns.every(p=>!['dead','downed'].includes(p.state)&&!p.mental?.crisis)).toBe(true);ring.push({tick:w.tick,pawns:w.pawns,jobs:w.jobs,piles:w.piles});if(ring.length>12)ring.shift();return w;};
 const wait=async(done:(w:World)=>boolean)=>{await expect.poll(async()=>done(await read()),{timeout:60000,intervals:[100]}).toBe(true);};
 const run=async()=>{await closeMenu();await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();};
 const capture=async(name:string,reload=true,screenshot=true)=>{
  await pause(page);await closeMenu();if(screenshot)await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(null)))));const before=await read();expect(validateWorld(before)).toEqual([]);if(screenshot)await page.screenshot({path:info.outputPath(name+'-map.png')});await panel(page,'menu');
  const manager=page.locator('[data-save-manager]'),label='V353 '+name;await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const raw=await readFile(path,'utf8');expect(deserializeWorld(raw)).toEqual(before);const record={name,tick:before.tick,sha256:createHash('sha256').update(raw).digest('hex'),reloaded:false};checkpoints.push(record);
  if(reload){await page.locator('#browse-saves').click();const row=front().locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front().getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);record.reloaded=true;}
  await info.attach(name,{contentType:'application/json',path});await closeMenu();return before;
 };
 try{
  expect(validateWorld(initial)).toEqual([]);expect(pile.owner).toMatchObject({type:'pawn',pawnId:initial.pawns[0]!.id});expect(pile.plantPack.pendingExpiry).toBeUndefined();const input=info.outputPath('prepared-input.json');await writeFile(input,serializeWorld(initial));
  await page.goto('/?e2e');await front().getByRole('button',{name:'Charger une partie',exact:true}).click();await front().locator('input[type=file]').setInputFiles(input);await expectWorld(page,initial);loaded=true;await pause(page);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await capture('carried-before-expiry',true,false);
  await run();await wait(w=>!!w.piles.find(p=>p.id===wrapperId)?.plantPack?.pendingExpiry);const dead=await capture('dead-held'),pending=dead.piles.find(p=>p.id===wrapperId)!;
  expect(pending.plantPack).toMatchObject({packedAt:pile.plantPack.packedAt,expiresAt:pile.plantPack.expiresAt,pendingExpiry:{quantity:23}});expect(pending.innerResource).toEqual(source);expect(pending.owner).toMatchObject({type:'pawn',pawnId:initial.pawns[0]!.id});expect(dead.jobs.some(j=>j.tree?.resourceId===sourceId)).toBe(false);
  const xp=dead.pawns[0]!.skills.plants!.xp,rng=dead.rng,ids=dead.nextId;await run();await wait(w=>w.tick>=dead.tick+25);const waiting=await capture('dead-waiting',true,false);
  expect(waiting.piles.find(p=>p.id===wrapperId)?.plantPack?.pendingExpiry?.quantity).toBe(23);expect(waiting.rng).toBe(rng);expect(waiting.nextId).toBe(ids);expect(waiting.pawns[0]!.skills.plants!.xp).toBe(xp);
  // Twenty actual wood-floor plans release compatible capacity through pickup
  // and payment; there is no console mutation, pile deletion or bonus stock.
  const carrier=waiting.pawns[0]!,floorX=Math.max(1,Math.min(waiting.width-6,carrier.x-4)),floorZ=Math.max(1,Math.min(waiting.height-5,carrier.z-4));
  const floorCells=Array.from({length:20},(_,i)=>({x:floorX+i%5,z:floorZ+Math.floor(i/5)}));
  for(const at of floorCells)await perform(page,{reason:'Créer la capacité physique par un sol payé',command:{type:'designate',kind:'lay-floor',floor:'wood-planks',x:at.x,z:at.z}},rotation);
  const floors=await capture('floor-plans',true,false);expect(floors.jobs.filter(j=>j.kind==='lay-floor')).toHaveLength(20);
  await run();await wait(w=>!w.piles.some(p=>p.id===wrapperId));const resolved=await capture('rests-deposited');
  expect(resolved.resources.some(r=>r.id===sourceId)).toBe(false);expect(resolved.jobs.some(j=>j.tree?.resourceId===sourceId)).toBe(false);expect(resolved.pawns[0]!.skills.plants!.xp).toBe(xp);
  const paid= floorCells.filter(at=>resolved.tiles[at.z*resolved.width+at.x]!.floor==='wood-planks').length;
  const total=(w:World)=>w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);
  expect(paid).toBeGreaterThan(0);expect(total(resolved)).toBe(total(initial)-3*paid+23);
  expect(checkpoints.every(c=>c.reloaded)).toBe(true);expect(errors).toEqual([]);complete=true;
 }catch(error){failure=error;throw error;}
 finally{
  let exportFailure:unknown;if(loaded&&failure&&!errors.length)try{await capture('failure-outcome',false);}catch(error){exportFailure=error;}
  const path=info.outputPath('tree-expiry-v353-summary.json');await writeFile(path,JSON.stringify({version:353,channel:'chrome',backend,qualification:'Prepared32² late-epoch carried boundary; genuine expiry/UI work/output/save; no natural seven days, player save, campaign or FPS certified.',result:failure||exportFailure?'partial-failure':complete?'prepared-regression':'not-loaded',elapsedMs:Date.now()-started,failure:String(failure??''),exportFailure:String(exportFailure??''),checkpoints,errors,ring,last},null,2));await info.attach('tree-expiry-v353-summary',{contentType:'application/json',path});
 }
});
