import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {medicalCamp} from '../scenarios/health';
import {fixtureBuilding} from '../scenarios/deconstruction';
import {prepareConstructionFlora} from '../scenarios/construction-flora-v348';
import {addMaterial,refreshStock} from '../../src/sim/materials';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {world,pause,panel,expectWorld,observeErrors} from './helpers';
import {perform} from './player-actions';
import type {World} from '../../src/sim/types';

function prepared(mode:'light'|'blocked'){
 const w=medicalCamp(2);w.tick=2000;Object.assign(w.pawns[0]!,{x:8,z:10,name:'Salomé'});Object.assign(w.pawns[1]!,{x:16,z:8,name:'Bâtisseur'});for(const p of w.pawns)p.priorities.build=1;
 if(mode==='light'){
  w.pawns[1]!.priorities.build=0;
  w.resources=[{id:w.nextId++,kind:'wild-plant',species:'grass',x:12,z:10,amount:0,growth:.6,growthTick:w.tick},{id:w.nextId++,kind:'rice',x:14,z:10,amount:10,growth:1,growthTick:w.tick},{id:w.nextId++,kind:'wild-plant',species:'grass',x:15,z:12,amount:0,growth:.6,growthTick:w.tick}];
  addMaterial(w,'wood',8,{type:'ground',x:7,z:10},'wood');
 }else{
  w.resources=[{id:w.nextId++,kind:'tree',species:'oak',x:12,z:10,amount:46,growth:1,growthTick:w.tick}];Object.assign(fixtureBuilding(w,'wall',11,10),{material:'wood'});
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(!w.structures.some(s=>s.x===x&&s.z===z))w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:75,owner:{type:'ground',x,z}});
 }
 refreshStock(w);prepareConstructionFlora(w);return w;
}
const wood=(w:World)=>w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);
const food=(w:World)=>w.piles.filter(p=>p.kind==='food').reduce((n,p)=>n+p.quantity,0);
const sha=(raw:string)=>createHash('sha256').update(raw).digest('hex');
test.use({channel:'chrome'});
test.describe('V351 prepared physical plant boundaries',()=>{
 test.skip(process.env.V351!=='1','ROOT opt-in; prepared regressions, no player-save or campaign certification.');
 for(const mode of ['light','blocked'] as const)test('V351 '+mode+' actual work, payment and exact restart',async({page},info)=>{
  test.setTimeout(240000);page.setDefaultTimeout(12000);const started=Date.now(),deadline=started+180000,initial=prepared(mode),errors=observeErrors(page),rotation={value:0};
  const checkpoints:{name:string;tick:number;sha256:string;reloaded:boolean}[]=[],ring:unknown[]=[];let loaded=false,complete=false,failure:unknown,last:World|undefined,backend:unknown;
  const front=()=>page.locator('.front-menu');
  const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();await expect(page.locator('#menu-panel')).not.toBeVisible();};
  const run=async()=>{await closeMenu();await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();};
  const read=async()=>{expect(errors).toEqual([]);if(Date.now()>deadline)throw Error('V351 bounded body expired');const w=await world(page);last=w;backend=await page.evaluate(()=>window.__lisiere.backend);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false});expect(w.pawns.every(p=>!['dead','downed'].includes(p.state)&&!p.mental?.crisis)).toBe(true);ring.push({tick:w.tick,jobs:w.jobs,pawns:w.pawns,resources:w.resources,piles:w.piles});if(ring.length>12)ring.shift();return w;};
  const wait=async(done:(w:World)=>boolean)=>{await expect.poll(async()=>done(await read()),{timeout:60000,intervals:[100]}).toBe(true);};
  const capture=async(name:string,reload=true,screenshot=true)=>{
   await pause(page);await closeMenu();const before=await read();expect(validateWorld(before)).toEqual([]);if(screenshot)await page.screenshot({path:info.outputPath(name+'-map.png')});await panel(page,'menu');
   const manager=page.locator('[data-save-manager]'),label='V351 '+mode+' '+name;await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
   const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const raw=await readFile(path,'utf8');expect(deserializeWorld(raw)).toEqual(before);const record={name,tick:before.tick,sha256:sha(raw),reloaded:false};checkpoints.push(record);
   if(reload){await page.locator('#browse-saves').click();const row=front().locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front().getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);record.reloaded=true;}
   await info.attach(name,{contentType:'application/json',path});await closeMenu();return before;
  };
  try{
   expect(validateWorld(initial)).toEqual([]);const input=info.outputPath('prepared-input.json');await writeFile(input,serializeWorld(initial));await page.goto('/?e2e');await front().getByRole('button',{name:'Charger une partie',exact:true}).click();await front().locator('input[type=file]').setInputFiles(input);await expectWorld(page,initial);loaded=true;await pause(page);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
   if(mode==='light'){
    const grassId=initial.resources[0]!.id,riceId=initial.resources[1]!.id,neighborId=initial.resources[2]!.id;
    await perform(page,{reason:'Plan mural sur petite herbe physique',command:{type:'designate',kind:'wall',material:'wood',x:12,z:10}},rotation);expect((await read()).resources.some(r=>r.id===grassId)).toBe(true);
    await run();await wait(w=>{expect(w.jobs.every(j=>!j.clearance)).toBe(true);return w.jobs.some(j=>j.kind==='wall'&&j.construction==='frame');});const frame=await capture('wall-frame');expect(frame.resources.some(r=>r.id===grassId)).toBe(false);expect(wood(frame)).toBe(8);expect(food(frame)).toBe(0);
    await run();await wait(w=>w.structures.some(s=>s.kind==='wall'));await pause(page);
    await perform(page,{reason:'Désignation de récolte indépendante',command:{type:'designate',kind:'harvest',x:14,z:10}},rotation);const harvest=(await read()).jobs.find(j=>j.kind==='harvest')!;expect(harvest).toBeDefined();
    await perform(page,{reason:'Plancher payé coexistant avec la récolte',command:{type:'designate',kind:'lay-floor',floor:'wood-planks',x:14,z:10}},rotation);await run();await wait(w=>w.jobs.some(j=>j.kind==='lay-floor'&&j.construction==='frame'));
    const floor=await capture('floor-frame');expect(floor.resources.some(r=>r.id===riceId)).toBe(true);expect(floor.jobs.some(j=>j.id===harvest.id)).toBe(true);expect(food(floor)).toBe(0);
    await run();await wait(w=>w.tiles[10*w.width+14]!.floor==='wood-planks');const finished=await capture('floor-finished');expect(finished.resources.some(r=>r.id===riceId)).toBe(false);expect(finished.resources.some(r=>r.id===neighborId)).toBe(true);expect(finished.jobs.some(j=>j.id===harvest.id)).toBe(false);expect(food(finished)).toBe(0);expect(wood(finished)).toBe(0);
   }else{
    const treeId=initial.resources[0]!.id,total=wood(initial);
    await perform(page,{reason:'Toit réel imposant le dégagement de son arbre',command:{type:'area',action:'build-roof',from:{x:12,z:10},to:{x:12,z:10}}},rotation);await run();await wait(w=>w.jobs.some(j=>j.kind==='build-roof'&&j.clearance?.progress===99&&j.clearance.workRemainder===9999));
    const blocked=await capture('blocked');const job=blocked.jobs.find(j=>j.kind==='build-roof')!,actor=blocked.pawns.find(p=>p.jobId===job.id)!;expect(actor).toBeDefined();await page.locator(`[data-pawn="${actor.id}"]`).click();await expect(page.locator('#selected-action')).toContainText('En attente · place pour les produits du dégagement');expect(wood(blocked)).toBe(total);expect(blocked.resources.some(r=>r.id===treeId)).toBe(true);
    await run();await wait(w=>w.tick>=blocked.tick+25);const waited=await capture('waiting',true,false),same=waited.jobs.find(j=>j.id===job.id)!;expect(same.clearance).toMatchObject({progress:99,workRemainder:9999});expect(same.reservedBy).toBe(actor.id);expect(waited.pawns.find(p=>p.id===actor.id)!.skills.plants!.xp).toBe(actor.skills.plants!.xp);expect(wood(waited)).toBe(total);
    // Actual paid floors can consume60wood away from the waiting cutter,
    // freeing enough physical capacity despite occupied cells. No fake
    // deletion, command injection, scheduler fast-forward or hidden World edit.
    await perform(page,{reason:'Vingt planchers payés libèrent la capacité par consommation réelle de bois',command:{type:'area',action:'lay-floor',floor:'wood-planks',from:{x:11,z:4},to:{x:14,z:8}}},rotation);await run();await wait(w=>w.roofing!.constructed.includes(10*w.width+12));
    const resolved=await capture('roof-resolved');expect(resolved.resources.some(r=>r.id===treeId)).toBe(false);expect(resolved.jobs.some(j=>j.id===job.id)).toBe(false);expect(resolved.events.filter(e=>e.message.includes('a dégagé le chantier'))).toHaveLength(1);expect(wood(resolved)).toBeGreaterThanOrEqual(total-60);expect(wood(resolved)).toBeLessThan(total);expect(resolved.tiles.filter(t=>t.floor==='wood-planks').length).toBeGreaterThan(0);
   }
   expect(checkpoints.every(c=>c.reloaded)).toBe(true);expect(errors).toEqual([]);complete=true;
  }catch(error){failure=error;throw error;}
  finally{
   let exportFailure:unknown;if(loaded&&failure&&!errors.length)try{await capture('failure-outcome',false);}catch(error){exportFailure=error;}
   const path=info.outputPath('construction-v351-summary.json');await writeFile(path,JSON.stringify({version:351,mode,channel:'chrome',backend,qualification:'Prepared32² feature regression, real UI/payment/work/save; no player save, natural campaign, seven-day journey or FPS certified.',result:failure||exportFailure?'partial-failure':complete?'prepared-regression':'not-loaded',elapsedMs:Date.now()-started,failure:String(failure??''),exportFailure:String(exportFailure??''),checkpoints,errors,ring,last},null,2));await info.attach('construction-v351-summary',{contentType:'application/json',path});
  }
 });
});
