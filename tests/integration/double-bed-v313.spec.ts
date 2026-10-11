import {expect,test} from '@playwright/test';
import {doubleBedAulnes} from '../helpers/double-bed-v313.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {decodeStoredSave} from '../../src/ui/save-storage-codec.ts';
import {bedSlotCell,bedSlotBodyCenter} from '../../src/sim/bed-slots.ts';
import {cell,expectWorld,observeErrors,panel,pause,saveKey,world} from './helpers.ts';
import {perform,revealCells} from './player-actions.ts';
import {writeTestFile} from '../test-output.ts';
import {readFile} from 'node:fs/promises';
import {constructionRecipe,constructionSupplied,deliveredMaterial} from '../../src/sim/construction-materials.ts';

test('V313 native Aulnes: real construction, two civil owners, distinct physical sleepers and independent release',async({playwright})=>{
  test.setTimeout(360000);const fixture=await doubleBedAulnes(),original=fixture.world;
  const resumePath=process.env.DOUBLE_BED_V313_RESUME;
  const initial=resumePath?deserializeWorld(await readFile(resumePath,'utf8')):original;
  const browser=await playwright.chromium.launch({channel:'chrome',args:[]});
  const page=await browser.newPage({baseURL:process.env.DOUBLE_BED_V313_BASE_URL??'http://127.0.0.1:5384',viewport:{width:2560,height:1440}});
  page.setDefaultTimeout(15000);
  const errors=observeErrors(page),checkpoints:{label:string;tick:number}[]=[],rotation={value:0};const blueprintId=original.nextId;let bedId=initial.structures.find(s=>s.kind==='double-bed'&&s.x===fixture.cell.x&&s.z===fixture.cell.z)?.id??blueprintId;
  let owners:number[]=[],restBefore:number[]=[];
  const bed=(w:typeof initial)=>w.structures.find(s=>s.id===bedId)!;
  async function checkpoint(label:string){
    await pause(page);const current=await world(page);expect(validateWorld(current)).toEqual([]);
    await page.keyboard.press('Escape');await panel(page,'menu');await page.locator('#save').click();
    await expect.poll(async()=>{const raw=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);return raw?serializeWorld(deserializeWorld(await decodeStoredSave(raw))):null;}).toBe(serializeWorld(current));
    await page.locator('#load').click();await expectWorld(page,current);await page.keyboard.press('Escape');
    checkpoints.push({label,tick:current.tick});await writeTestFile(test.info().outputPath(`checkpoint-${label}.json`),serializeWorld(current));return current;
  }
  async function inspectBed(){
    await page.keyboard.press('Escape');const w=await world(page),b=bed(w);await revealCells(page,[b]);
    for(let n=0;n<=w.pawns.length+3;n++){await cell(page,b.x,b.z);if(await page.locator('#bed-owner-second').isVisible())break;}
    await expect(page.locator('#bed-owner-second')).toBeVisible();
  }
  try{
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);await pause(page);
    await page.evaluate(async({key,data})=>window.__lisiere.saveRepository.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await checkpoint(resumePath?'continuation':'baseline');
    if(!resumePath){
      await perform(page,{command:{type:'designate',kind:'double-bed',material:'wood',orientation:0,...fixture.cell},reason:'Construire le nouveau lit avec les stocks finis du village.'},rotation);
      await expect.poll(async()=>(await world(page)).jobs.find(j=>j.id===blueprintId)?.kind).toBe('double-bed');await checkpoint('blueprint');
    }
    // Prioritize genuine deliveries through the player's context menu. Village
    // maintenance and personal needs otherwise make a short native window
    // an unsuitable oracle for autonomous completion.
    for(let n=0;n<12;n++){
      await pause(page);const w=await world(page),job=w.jobs.find(j=>j.id===blueprintId);
      if(!job||constructionSupplied(w,job))break;
      const missing=constructionRecipe(job).ingredients.reduce((sum,c)=>sum+c.quantity-deliveredMaterial(w,job,c.item),0);
      const inbound=w.pawns.filter(p=>p.haul?.destination.type==='job'&&p.haul.destination.jobId===blueprintId).reduce((sum,p)=>sum+p.haul!.quantity,0);
      const actor=w.pawns.filter(p=>p.priorities.build>0&&p.state!=='dead'&&p.state!=='downed'&&!p.prisoner&&p.hunger>30&&p.rest>20)
        .sort((a,b)=>Math.hypot(a.x-job.x,a.z-job.z)-Math.hypot(b.x-job.x,b.z-job.z)||a.id-b.id)[0]!;
      if(missing>inbound&&!(actor.haul?.destination.type==='job'&&actor.haul.destination.jobId===blueprintId))
        await perform(page,{command:{type:'order-haul',pawnId:actor.id,target:{type:'job',jobId:blueprintId},queue:false},reason:'Prioriser une livraison réelle de matériaux par le menu du joueur.'},rotation);
      const supplied=deliveredMaterial(w,job,'wood');await page.locator('[data-speed="6"]').click();
      await page.waitForFunction(({id,supplied})=>{const w=window.__lisiere.world,j=w.jobs.find(j=>j.id===id);if(j&&(j.escrow.wood??0)<=supplied)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},{id:blueprintId,supplied},{polling:20,timeout:45000});
    }
    const suppliedWorld=await world(page),suppliedJob=suppliedWorld.jobs.find(j=>j.id===blueprintId);
    if(suppliedJob){expect(constructionSupplied(suppliedWorld,suppliedJob)).toBe(true);
      if(suppliedJob.reservedBy===null){const actor=suppliedWorld.pawns.find(p=>p.priorities.build>0&&p.state!=='dead'&&p.state!=='downed'&&!p.prisoner&&p.hunger>30&&p.rest>20)!;
        await perform(page,{command:{type:'order-job',pawnId:actor.id,jobId:blueprintId,queue:false},reason:'Finir le chantier réellement approvisionné.'},rotation);
      }
    }
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(site=>{const w=window.__lisiere.world;if(!w.structures.some(s=>s.kind==='double-bed'&&s.x===site.x&&s.z===site.z))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},fixture.cell,{polling:20,timeout:120000});
    bedId=(await world(page)).structures.find(s=>s.kind==='double-bed'&&s.x===fixture.cell.x&&s.z===fixture.cell.z)!.id;
    const built=await checkpoint('built');expect(bed(built)).toMatchObject({kind:'double-bed',material:'wood',footprint:'standard'});expect(bed(built).quality).toBeDefined();
    const available=built.pawns.filter(p=>p.state!=='dead'&&!p.prisoner&&!p.visitor&&!p.raid&&!p.podRescue&&p.state!=='downed'&&!p.health?.death&&!p.mental?.crisis&&p.rest<74&&p.hunger>30);
    available.sort((a,b)=>Math.hypot(a.x-bed(built).x,a.z-bed(built).z)-Math.hypot(b.x-bed(built).x,b.z-bed(built).z)||a.id-b.id);
    expect(available.length,'Two actual existing colonists must need sleep.').toBeGreaterThanOrEqual(2);owners=available.slice(0,2).map(p=>p.id);
    await inspectBed();await page.locator('#bed-owner').selectOption(String(owners[0]));await page.locator('#bed-owner-second').selectOption(String(owners[1]));
    await expect.poll(async()=>{const w=await world(page);return owners.map(id=>{const p=w.pawns.find(p=>p.id===id)!;return [p.bedId,p.bedSlot];});}).toEqual([[bedId,0],[bedId,1]]);
    await expect(page.locator('#bed-medical')).not.toBeVisible();await expect(page.locator('#bed-prisoner')).not.toBeVisible();
    await page.screenshot({path:test.info().outputPath('two-owners-ui.png')});await checkpoint('two-assigned');
    for(const id of owners)await perform(page,{command:{type:'schedule-paint',pawnId:id,hours:Array.from({length:24},(_,i)=>i),assignment:'sleep'},reason:'Deux colons existants utilisent leurs deux places civiles sans créer de relation.'},rotation);
    await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(({ids,bedId})=>{const w=window.__lisiere.world;if(!ids.some(id=>{const p=w.pawns.find(p=>p.id===id);return p?.need?.kind==='sleep'&&p.need.bedId===bedId&&p.need.phase==='travel';}))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},{ids:owners,bedId},{polling:20,timeout:60000});
    await checkpoint('sleep-travel');await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(({ids,bedId})=>{const w=window.__lisiere.world;if(!ids.every(id=>{const p=w.pawns.find(p=>p.id===id);return p?.need?.kind==='sleep'&&p.need.bedId===bedId&&p.need.phase==='sleep'&&p.moveCooldown===0&&(p.motion?.end??0)<=w.tick;}))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},{ids:owners,bedId},{polling:20,timeout:60000});
    const sleeping=await checkpoint('two-asleep');restBefore=owners.map(id=>sleeping.pawns.find(p=>p.id===id)!.rest);
    for(const [slot,id] of owners.entries()){const p=sleeping.pawns.find(p=>p.id===id)!;expect({x:p.x,z:p.z}).toEqual(bedSlotCell(bed(sleeping),slot as 0|1));}
    const centers=owners.map((_,slot)=>bedSlotBodyCenter(bed(sleeping),slot as 0|1));expect(centers[0]).not.toEqual(centers[1]);
    await revealCells(page,[bed(sleeping)]);await page.screenshot({path:test.info().outputPath('two-physical-sleepers.png')});
    await page.locator('[data-speed="1"]').click();await page.waitForFunction(({ids,rest})=>{const w=window.__lisiere.world;if(!ids.every((id,i)=>(w.pawns.find(p=>p.id===id)?.rest??0)>rest[i]!))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},{ids:owners,rest:restBefore},{polling:20,timeout:30000});
    const rested=await checkpoint('both-restored'),sibling=rested.pawns.find(p=>p.id===owners[1])!;
    const state=structuredClone({bedId:sibling.bedId,bedSlot:sibling.bedSlot,need:sibling.need,motion:sibling.motion,path:sibling.path});
    await inspectBed();await page.locator('#bed-owner').selectOption('');await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===owners[0])!.bedId).toBeNull();
    const released=await checkpoint('only-slot0-released'),kept=released.pawns.find(p=>p.id===owners[1])!;
    expect({bedId:kept.bedId,bedSlot:kept.bedSlot,need:kept.need,motion:kept.motion,path:kept.path}).toEqual(state);
    expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false});
    await writeTestFile(test.info().outputPath('report.json'),JSON.stringify({source:fixture.source,sha:fixture.sha,resumePath:resumePath??null,declaredDotation:[],backend:'WebGPU',viewport:{width:2560,height:1440},blueprintId,bedId,cell:fixture.cell,owners,restBefore,restAfter:owners.map(id=>rested.pawns.find(p=>p.id===id)!.rest),centers,checkpoints,errors,scope:'real construction and independent sleep in actual Aulnes; prioritized deliveries and construction, manual assignments, no forced romance, no performance or natural-campaign claim'},null,2));
  }catch(error){await writeTestFile(test.info().outputPath('failed-world.json'),serializeWorld(await world(page)));await writeTestFile(test.info().outputPath('failed-diagnostic.json'),JSON.stringify({checkpoints,errors,notice:await page.locator('#notice').textContent()},null,2));throw error;}
  finally{await page.close();await browser.close();}
});
