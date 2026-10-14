import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {medicalCamp} from '../scenarios/health';
import {preparedTreeWrapper} from '../scenarios/tree-transfer-v349';
import {prepareConstructionFlora} from '../scenarios/construction-flora-v348';
import {isMinifiedTree} from '../../src/sim/tree-transfer-state';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {world,pause,panel,expectWorld,observeErrors,settledCells,cell} from './helpers';
import {perform,revealCells} from './player-actions';
import {addMaterial,refreshStock} from '../../src/sim/materials';
import type {World,Resource} from '../../src/sim/types';

// Three declared physical feature scenes. No human save, natural campaign or
// retrospective recovery of lost products is represented by these fixtures.
function prepared(mode:'direct'|'replant'|'blocked'):World {
 const w=mode==='replant'?preparedTreeWrapper().w:medicalCamp(mode==='blocked'?2:1);
 if(mode!=='replant')w.tick=2000;
 const p=w.pawns[0]!;p.name='Salomé';p.priorities.gather=1;p.priorities.grow=1;
 if(mode==='direct'){
  Object.assign(p,{x:8,z:10});
  w.resources=[{id:w.nextId++,kind:'berries',species:'berry-bush',x:12,z:10,amount:10,growth:1,growthTick:w.tick},{id:w.nextId++,kind:'wild-plant',species:'agave',x:14,z:10,amount:10,growth:1,growthTick:w.tick},{id:w.nextId++,kind:'wild-plant',species:'grass',x:16,z:10,amount:0,growth:1,growthTick:w.tick}];
 }else if(mode==='replant'){
  w.resources=[{id:w.nextId++,kind:'berries',species:'berry-bush',x:20,z:14,amount:10,growth:1,growthTick:w.tick}];
 }
 if(mode==='blocked'){
  Object.assign(p,{x:8,z:10});Object.assign(w.pawns[1]!,{x:16,z:8,hunger:50,name:'Consommateur'});
  w.resources=[{id:w.nextId++,kind:'berries',species:'berry-bush',x:12,z:10,amount:10,growth:1,growthTick:w.tick}];
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)addMaterial(w,'food',75,{type:'ground',x,z},'berries');refreshStock(w);
 }
 prepareConstructionFlora(w);return w;
}
const wood=(w:World)=>w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);
const amount=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
const sha=(raw:string)=>createHash('sha256').update(raw).digest('hex');
test.use({channel:'chrome'});
test.describe('V352 prepared physical plant boundaries',()=>{
 test.skip(process.env.V352!=='1','ROOT opt-in; prepared regressions, no player-save or campaign certification.');
 for(const mode of ['direct','replant','blocked'] as const)test('V352 '+mode+' actual work, output and exact restart',async({page},info)=>{
  test.setTimeout(240000);page.setDefaultTimeout(12000);const started=Date.now(),deadline=started+200000,initial=prepared(mode),errors=observeErrors(page),rotation={value:0};
  const checkpoints:{name:string;tick:number;sha256:string;reloaded:boolean}[]=[],ring:unknown[]=[];let loaded=false,complete=false,failure:unknown,last:World|undefined,backend:unknown;
  const front=()=>page.locator('.front-menu');
  const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();await expect(page.locator('#menu-panel')).not.toBeVisible();};
  const run=async()=>{await closeMenu();await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();};
  const read=async()=>{expect(errors).toEqual([]);if(Date.now()>deadline)throw Error('V352 bounded body expired');const w=await world(page);last=w;backend=await page.evaluate(()=>window.__lisiere.backend);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false});expect(w.pawns.every(p=>!['dead','downed'].includes(p.state)&&!p.mental?.crisis)).toBe(true);ring.push({tick:w.tick,jobs:w.jobs,pawns:w.pawns,resources:w.resources,piles:w.piles});if(ring.length>12)ring.shift();return w;};
  const wait=async(done:(w:World)=>boolean)=>{await expect.poll(async()=>done(await read()),{timeout:60000,intervals:[100]}).toBe(true);};
  const capture=async(name:string,reload=true,screenshot=true)=>{
   await pause(page);await closeMenu();if(screenshot)await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(null)))));const before=await read();expect(validateWorld(before)).toEqual([]);if(screenshot)await page.screenshot({path:info.outputPath(name+'-map.png')});await panel(page,'menu');
   const manager=page.locator('[data-save-manager]'),label='V352 '+mode+' '+name;await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
   const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const raw=await readFile(path,'utf8');expect(deserializeWorld(raw)).toEqual(before);const record={name,tick:before.tick,sha256:sha(raw),reloaded:false};checkpoints.push(record);
   if(reload){await page.locator('#browse-saves').click();const row=front().locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front().getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);record.reloaded=true;}
   await info.attach(name,{contentType:'application/json',path});await closeMenu();return before;
  };
  try{
   expect(validateWorld(initial)).toEqual([]);const input=info.outputPath('prepared-input.json');await writeFile(input,serializeWorld(initial));await page.goto('/?e2e');await front().getByRole('button',{name:'Charger une partie',exact:true}).click();await front().locator('input[type=file]').setInputFiles(input);await expectWorld(page,initial);loaded=true;await pause(page);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
   if(mode==='direct'){
    for(const [species,item,label] of [['berry-bush','berries','berries'],['agave','agave-fruit','agave'],['grass',null,'grass']] as const){
     const source=initial.resources.find(r=>r.species===species)!,before=await read(),xp=before.pawns[0]!.skills.plants!.xp;
     await perform(page,{reason:'Couper la vraie plante '+species,command:{type:'designate',kind:'cut',x:source.x,z:source.z}},rotation);
     await run();await wait(w=>w.jobs.some(j=>j.kind==='cut'&&(j.progress>2)));const mid=await capture(label+'-work',true,species==='berry-bush');
     expect(mid.resources.some(r=>r.id===source.id)).toBe(true);expect(mid.pawns[0]!.skills.plants!.xp>xp).toBe(item!==null);
     await run();await wait(w=>!w.resources.some(r=>r.id===source.id));const finished=await capture(label+'-finished',true,species!=='agave');
     expect(finished.jobs.some(j=>j.kind==='cut'&&j.plantTarget?.resourceId===source.id)).toBe(false);
     if(item)expect(amount(finished,item)).toBe(10);else{expect(finished.pawns[0]!.skills.plants!.xp).toBe(xp);expect(amount(finished,'berries')).toBe(10);expect(amount(finished,'agave-fruit')).toBe(10);}
     expect(wood(finished)).toBe(0);
    }
   }else if(mode==='replant'){
    const wrapper=initial.piles.find(isMinifiedTree)!;expect(wrapper).toBeDefined();const sourceId=wrapper.innerResource.id,bushId=initial.resources[0]!.id;
    if(wrapper.owner.type!=='ground')throw Error('Prepared wrapper must have its real ground cell');
    await revealCells(page,[wrapper.owner]);
    for(let n=0;n<6;n++){await cell(page,wrapper.owner.x,wrapper.owner.z);if(await page.locator('#cell-replant').isVisible())break;}
    await expect(page.locator('#cell-replant')).toBeVisible();await page.locator('#cell-replant').click();
    await revealCells(page,[{x:20,z:14}]);await cell(page,20,14);await wait(w=>w.jobs.some(j=>j.kind==='replant-tree'&&j.tree?.resourceId===sourceId));
    await run();await wait(w=>w.piles.some(p=>p.id===wrapper.id&&p.owner.type==='pawn'));
    const carry=await capture('replant-carry',true,false);expect(carry.piles.find(p=>p.id===wrapper.id)).toMatchObject({innerResource:{id:sourceId},plantPack:wrapper.plantPack});expect(amount(carry,'berries')).toBe(0);
    await run();await wait(w=>w.jobs.some(j=>j.kind==='replant-tree'&&(j.clearance?.progress??0)>2));const clearing=await capture('replant-cut',true,true);expect(clearing.resources.some(r=>r.id===bushId)).toBe(true);expect(clearing.pawns[0]!.skills.plants!.xp).toBeGreaterThan(initial.pawns[0]!.skills.plants!.xp);
    await run();await wait(w=>w.resources.some(r=>r.id===sourceId&&r.x===20&&r.z===14));const finished=await capture('replanted',true,true);
    expect(finished.resources.some(r=>r.id===bushId)).toBe(false);expect(finished.piles.some(p=>p.id===wrapper.id)).toBe(false);expect(finished.resources.find(r=>r.id===sourceId)?.damage).toBe(wrapper.innerResource.damage);expect(amount(finished,'berries')).toBe(10);expect(wood(finished)).toBe(0);expect(finished.jobs.some(j=>j.kind==='replant-tree')).toBe(false);
   }
   if(mode==='blocked'){
    const source=initial.resources[0]!,total=amount(initial,'berries'),eaterId=initial.pawns[1]!.id;
    await perform(page,{reason:'Couper le buisson dans un monde de baies saturé',command:{type:'designate',kind:'cut',x:source.x,z:source.z}},rotation);await run();await wait(w=>w.jobs.some(j=>j.kind==='cut'&&j.progress===59&&j.workRemainder===9999));
    const blocked=await capture('cut-blocked'),job=blocked.jobs.find(j=>j.kind==='cut')!,xp=blocked.pawns[0]!.skills.plants!.xp;
    await page.locator(`[data-pawn="${blocked.pawns[0]!.id}"]`).click();await expect(page.locator('#selected-action')).toContainText('En attente · place pour les produits de la coupe');
    await run();await wait(w=>w.tick>=blocked.tick+25);const waiting=await capture('cut-waiting',true,false);expect(waiting.jobs.find(j=>j.id===job.id)).toMatchObject({progress:59,workRemainder:9999,reservedBy:blocked.pawns[0]!.id});expect(waiting.pawns[0]!.skills.plants!.xp).toBe(xp);expect(amount(waiting,'berries')).toBe(total);expect(waiting.rng).toBe(blocked.rng);
    // A second actor really picks a portion through the existing UI. Its held
    // food releases physical capacity; the cut producer does not fabricate it.
    const meal=waiting.piles.find(p=>p.owner.type==='ground'&&p.owner.x===16&&p.owner.z===8)!;
    await page.keyboard.press('Escape');await page.locator(`[data-pawn="${eaterId}"]`).click();await revealCells(page,[{x:16,z:8}]);await settledCells(page,[{x:16,z:8}]);
    const point=await page.evaluate(()=>{const b=document.querySelector('#viewport canvas')!.getBoundingClientRect(),p=window.__lisiere.projectCell(16,8);return {x:b.left+p.x,y:b.top+p.y};});expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,point)).toBe('CANVAS');await page.mouse.click(point.x,point.y,{button:'right'});await expect(page.locator('#order-menu')).toBeVisible();const consume=page.locator(`[data-order-consume="${meal.id}"]`);await expect(consume).toBeEnabled();await consume.click();
    expect((await read()).pawns.find(p=>p.id===eaterId)!.need).toMatchObject({kind:'eat',forced:true,sourcePileId:meal.id});
    await run();await wait(w=>!w.resources.some(r=>r.id===source.id));const resolved=await capture('cut-resolved');expect(resolved.jobs.some(j=>j.id===job.id)).toBe(false);expect(resolved.events.filter(e=>e.message.includes('Salomé a récolté 10'))).toHaveLength(1);
    const eater=resolved.pawns.find(p=>p.id===eaterId)!;expect(eater.need).toMatchObject({kind:'eat',forced:true});expect(eater.need?.kind==='eat'&&eater.need.carryPileId!==null).toBe(true);expect(amount(resolved,'berries')).toBe(total+10);expect(resolved.pawns[0]!.skills.plants!.xp).toBe(xp);
   }
   expect(checkpoints.every(c=>c.reloaded)).toBe(true);expect(errors).toEqual([]);complete=true;
  }catch(error){failure=error;throw error;}
  finally{
   let exportFailure:unknown;if(loaded&&failure&&!errors.length)try{await capture('failure-outcome',false);}catch(error){exportFailure=error;}
   const path=info.outputPath('cut-v352-summary.json');await writeFile(path,JSON.stringify({version:352,mode,channel:'chrome',backend,qualification:'Prepared32² feature regression, real UI/work/custody/save; no player save, natural campaign, exhaustive Core yield parity or FPS certified.',result:failure||exportFailure?'partial-failure':complete?'prepared-regression':'not-loaded',elapsedMs:Date.now()-started,failure:String(failure??''),exportFailure:String(exportFailure??''),checkpoints,errors,ring,last},null,2));await info.attach('cut-v352-summary',{contentType:'application/json',path});
  }
 });
});
