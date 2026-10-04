import { readFileSync } from 'node:fs';
import { test,expect,type Page } from '@playwright/test';
import { SANDBAGS_CELLS,SANDBAGS_DEMO_ID,SANDBAGS_DEMO_PATH } from '../../scripts/create-sandbags-v207-test-save';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization';
import type { Cell,World } from '../../src/sim/types';
import { TEST_COLONY_COUNT } from '../test-colony-count';
import { testOutputPath,writeTestFile } from '../test-output';
import { cell,expectWorld,observeErrors,panel,pause,saveKey,tool,world } from './helpers';
import { revealCells } from './player-actions';

type RenderedFrame={tick:number;clock:number;furnitureGeometry:number;pawnGeometry:number;furnitureInstances:number;flight:boolean};
const frameProbe=`
const sandbagsFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
 const result=sandbagsFrame.call(this,now),probe=window.sandbagsProbe;
 if(this.preparing||!this.world||!probe)return result;
 const pawn=this.pawns.feedbackSource,furniture=this.structureGroup.getObjectByName('furniture');if(!pawn||!furniture)return result;
 const projectile=this.projectiles.mesh.geometry,time=projectile.getAttribute('bulletTime'),clock=this.projectiles.tick.value;
 let flight=false;for(let i=0;i<projectile.instanceCount;i++)if(clock>=time.getX(i)&&clock<time.getY(i))flight=true;
 probe.frames.push({tick:this.world.tick,clock:this.timeline.tick,furnitureGeometry:furniture.geometry.id,furnitureInstances:furniture.geometry.instanceCount,pawnGeometry:pawn.id,flight});
 if(probe.frames.length>4096)probe.frames.shift();return result;
};`;

async function rendered(page:Page,tick:number):Promise<RenderedFrame>{
  await expect.poll(()=>page.evaluate(tick=>{const f=(window as any).sandbagsProbe.frames.at(-1);return !!f&&f.tick===tick&&Math.abs(f.clock-tick)<.001;},tick)).toBe(true);
  return page.evaluate(()=>(window as any).sandbagsProbe.frames.at(-1));
}
async function saveResume(page:Page,state:World){
  await panel(page,'menu');await page.locator('#save').click();
  await expect.poll(()=>page.evaluate(key=>{const raw=window.__lisiere.saveRepository.peekItem(key);return raw?JSON.parse(raw).tick:null;},saveKey)).toBe(state.tick);
  expect(deserializeWorld((await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey))!)).toEqual(state);
  await page.locator('#load').click();await expectWorld(page,state);await page.keyboard.press('Escape');
}
async function draftAt(page:Page,id:number,target:Cell){
  await page.locator(`[data-pawn="${id}"]`).click();await page.locator('#toggle-draft').click();
  await expect.poll(async()=>!!(await world(page)).pawns.find(p=>p.id===id)?.draft).toBe(true);
  if(await page.locator('#fire-at-will').getAttribute('aria-pressed')==='true')await page.locator('#fire-at-will').click();
  await revealCells(page,[target]);
  const point=await page.evaluate(p=>window.__lisiere.projectCell(p.x,p.z),target),bounds=(await page.locator('#viewport canvas').boundingBox())!;
  await page.mouse.click(bounds.x+point.x,bounds.y+point.y,{button:'right'});
  await page.locator('[data-speed="1"]').click();
  await page.waitForFunction(({id,target})=>{const p=window.__lisiere.world.pawns.find(p=>p.id===id);if(p&&p.x===target.x&&p.z===target.z&&p.path.length===0){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;},{id,target},{polling:20,timeout:25000});
  await pause(page);
}
async function aimAt(page:Page,shooter:number,target:number){
  const w=await world(page);await revealCells(page,[w.pawns.find(p=>p.id===shooter)!,w.pawns.find(p=>p.id===target)!]);
  await page.locator(`[data-pawn="${shooter}"]`).click();await page.locator('#target-shot').click();
  // The pawn's projected body is above its ground cell. A newly opened
  // inspector may cover that body even after revealCells verified the ground.
  for(let attempt=0;attempt<10;attempt++){
    const view=await page.evaluate(id=>{const p=window.__lisiere.projectPawn(id),b=document.querySelector('#viewport canvas')!.getBoundingClientRect();return {p,clear:!!p&&document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS',anchor:{x:b.x+b.width*.75,y:b.y+b.height*.32}};},target);
    if(view.clear)break;expect(view.p).toBeDefined();
    expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,view.anchor)).toBe('CANVAS');
    await page.mouse.move(view.anchor.x,view.anchor.y);await page.mouse.down({button:'middle'});
    await page.mouse.move(view.anchor.x+Math.max(-250,Math.min(250,view.anchor.x-view.p!.x)),view.anchor.y+Math.max(-180,Math.min(180,view.anchor.y-view.p!.y)),{steps:8});await page.mouse.up({button:'middle'});
    await page.waitForTimeout(200);
  }
  const point=await page.evaluate(id=>window.__lisiere.projectPawn(id),target);
  expect(point).toBeDefined();expect(await page.evaluate(p=>document.elementFromPoint(p!.x,p!.y)?.tagName,point)).toBe('CANVAS');await page.mouse.click(point!.x,point!.y);
  await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===shooter)?.shooting?.order?.targetId).toBe(target);
}

test('V207 builds real cloth cover, fires from behind it, receives a ballistic impact and repairs through native UI',async({playwright})=>{
  test.setTimeout(180_000);
  const prepared=deserializeWorld(readFileSync(SANDBAGS_DEMO_PATH,'utf8'));
  expect(validateWorld(prepared)).toEqual([]);expect(prepared.structures).toHaveLength(0);expect(prepared.jobs).toHaveLength(0);
  const [builder,defender,shooter]=prepared.pawns;
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page),stages:Record<string,unknown>={};
  try{
    await page.addInitScript(()=>{
      localStorage.setItem('lisiere.audio.effects.enabled.v1','false');localStorage.setItem('lisiere.audio.music.enabled.v1','false');
      const probe={pipelines:0,hooked:false,frames:[],samples:[]};(window as any).sandbagsProbe=probe;
      const device=(globalThis as any).GPUDevice?.prototype;
      if(device)for(const name of ['createRenderPipeline','createRenderPipelineAsync']){const original=device[name];device[name]=function(...args:any[]){probe.pipelines++;return Reflect.apply(original,this,args);};probe.hooked=true;}
    });
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:frameProbe+await response.text()});});
    await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    const catalogue=JSON.parse(readFileSync('public/test-saves/manifest.json','utf8')),published=catalogue.saves.some((s:{id:string})=>s.id===SANDBAGS_DEMO_ID);
    if(published){await front.getByRole('button',{name:'Colonies de test',exact:true}).click();await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);await front.locator(`input[name="test-colony"][value="${SANDBAGS_DEMO_ID}"]`).check();await front.getByRole('button',{name:'Charger cette colonie',exact:true}).click();}
    else await front.locator('input[type="file"]').setInputFiles(SANDBAGS_DEMO_PATH);
    await expectWorld(page,prepared);await pause(page);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const hardware=await page.evaluate(async()=>{const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('WebGPU adapter absent.');const info=adapter.info;return {vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description,fallback:(adapter as unknown as {isFallbackAdapter?:boolean}).isFallbackAdapter??null};});
    expect(hardware.fallback).not.toBe(true);expect(Object.values(hardware).join(' ')).not.toMatch(/swiftshader|llvmpipe|lavapipe/i);
    const initialFrame=await rendered(page,prepared.tick),pipelinesBefore=await page.evaluate(()=>(window as any).sandbagsProbe.pipelines);stages.prepared={tick:prepared.tick,frame:initialFrame};
    // All samples read adopted snapshots. No mutation or command bypass.
    await page.evaluate(()=>{(window as any).sandbagsSampleTimer=setInterval(()=>{
      const w=window.__lisiere?.world,probe=(window as any).sandbagsProbe;if(!w||probe.samples.at(-1)?.tick===w.tick)return;
      probe.samples.push(JSON.parse(JSON.stringify({tick:w.tick,cover:w.structures.filter(s=>s.kind==='sandbags'),jobs:w.jobs.filter(j=>j.kind==='sandbags'||j.kind==='repair'),
        pawns:w.pawns.map(p=>({id:p.id,x:p.x,z:p.z,state:p.state,jobId:p.jobId,haul:p.haul,shooting:p.shooting,injuries:p.health?.injuries.length})),
        cloth:w.piles.filter(p=>p.item==='cloth'),projectiles:w.projectiles})));if(probe.samples.length>4000)probe.samples.shift();
    },20);});
    await panel(page,'architect');await page.locator('[data-category="structure"]').click();await page.locator('[data-tool="sandbags"]').click();
    await expect(page.locator('#tool-instruction')).toContainText('5 Tissu à livrer');await expect(page.locator('#tool-instruction')).toContainText('55 %');
    await expect(page.locator('#construction-material-controls')).toBeHidden();await expect(page.locator('#placement-controls')).toBeHidden();
    await revealCells(page,[SANDBAGS_CELLS.cover]);await cell(page,SANDBAGS_CELLS.cover.x,SANDBAGS_CELLS.cover.z);await page.keyboard.press('Escape');
    await expect.poll(async()=>(await world(page)).jobs.filter(j=>j.kind==='sandbags').length).toBe(1);
    const planned=await world(page),plan=planned.jobs.find(j=>j.kind==='sandbags')!;
    expect(plan.material).toBe('cloth');expect(plan.orientation).toBe(0);expect(planned.structures).toHaveLength(0);expect(planned.piles.find(p=>p.item==='cloth')!.quantity).toBe(5);stages.planned={tick:planned.tick,plan};
    await panel(page,'work');await page.locator(`[data-owner="${builder!.id}"][data-work="build"]`).selectOption('1');await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(()=>{const j=window.__lisiere.world.jobs.find(j=>j.kind==='sandbags');if(j?.construction==='frame'&&j.progress>0){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;},undefined,{polling:20,timeout:30000});await pause(page);
    const building=await world(page),frame=building.jobs.find(j=>j.kind==='sandbags')!,worker=building.pawns.find(p=>p.id===builder!.id)!;
    expect(building.piles.filter(p=>p.item==='cloth'&&p.owner.type==='job'&&p.owner.jobId===frame.id).reduce((n,p)=>n+p.quantity,0)).toBe(5);
    expect(worker.state).toBe('working');expect(worker.jobId).toBe(frame.id);expect(Math.max(Math.abs(worker.x-frame.x),Math.abs(worker.z-frame.z))).toBe(1);
    expect(validateWorld(building)).toEqual([]);stages.building={tick:building.tick,frame,worker};await saveResume(page,building);
    await page.locator('[data-speed="1"]').click();await page.waitForFunction(()=>{if(window.__lisiere.world.structures.some(s=>s.kind==='sandbags')){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;},undefined,{polling:20,timeout:20000});await pause(page);
    const constructed=await world(page),cover=constructed.structures.find(s=>s.kind==='sandbags')!;
    expect(cover.material).toBe('cloth');expect(cover.quality).toBeUndefined();expect(cover.damage).toBeUndefined();expect(constructed.piles.some(p=>p.item==='cloth')).toBe(false);expect(validateWorld(constructed)).toEqual([]);
    const constructedFrame=await rendered(page,constructed.tick);expect(constructedFrame.furnitureGeometry).toBe(initialFrame.furnitureGeometry);expect(constructedFrame.furnitureInstances).toBeGreaterThan(0);stages.constructed={tick:constructed.tick,cover,frame:constructedFrame};
    await tool(page,'select');await page.keyboard.press('Escape');await cell(page,cover.x,cover.z);await expect(page.locator('#cell-title')).toContainText('Sacs de sable');await expect(page.locator('#cell-description')).toContainText('55 %');
    await page.screenshot({path:testOutputPath('artifacts/sandbags-v207-built-iso.png')});await page.locator('#camera-mode').click();await revealCells(page,[cover]);await page.screenshot({path:testOutputPath('artifacts/sandbags-v207-built-perspective.png')});await page.locator('#camera-mode').click();
    await draftAt(page,defender!.id,SANDBAGS_CELLS.defender);await draftAt(page,shooter!.id,SANDBAGS_CELLS.shooter);
    await aimAt(page,defender!.id,shooter!.id);const aim=await world(page);expect(aim.pawns.find(p=>p.id===defender!.id)!.shooting!.stance!.phase).toBe('aim');await saveResume(page,aim);
    await page.locator('[data-speed="1"]').click();await page.waitForFunction(id=>{const p=window.__lisiere.world.pawns.find(p=>p.id===id);if(p&&p.skills.shooting.xp>0){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;},defender!.id,{polling:20,timeout:15000});await pause(page);
    await page.locator(`[data-pawn="${defender!.id}"]`).click();await page.locator('#stop-draft').click();const outgoing=await world(page);stages.outgoing={tick:outgoing.tick,projectiles:outgoing.projectiles,defender:outgoing.pawns.find(p=>p.id===defender!.id)};
    await aimAt(page,shooter!.id,defender!.id);await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{if((window.__lisiere.world.structures.find(s=>s.id===id)?.damage??0)>0){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;},cover.id,{polling:20,timeout:40000});await pause(page);
    await page.locator(`[data-pawn="${shooter!.id}"]`).click();await page.locator('#stop-draft').click();const damaged=await world(page),damagedCover=damaged.structures.find(s=>s.id===cover.id)!;
    expect(damagedCover.damage).toBeGreaterThan(0);expect(damagedCover.damage).toBeLessThan(300);expect(validateWorld(damaged)).toEqual([]);stages.damaged={tick:damaged.tick,cover:damagedCover,projectiles:damaged.projectiles};await saveResume(page,damaged);
    await tool(page,'home');await revealCells(page,[cover]);await cell(page,cover.x,cover.z);await page.keyboard.press('Escape');await tool(page,'select');await page.keyboard.press('Escape');await cell(page,cover.x,cover.z);await expect(page.locator('#cell-description')).toContainText('Zone de foyer');
    await page.locator('[data-speed="1"]').click();await page.waitForFunction(()=>{const w=window.__lisiere.world,j=w.jobs.find(j=>j.kind==='repair');if(j?.progress&&w.pawns.some(p=>p.jobId===j.id&&p.state==='working')){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;},undefined,{polling:20,timeout:25000});await pause(page);
    const repairing=await world(page),repair=repairing.jobs.find(j=>j.kind==='repair')!,repairer=repairing.pawns.find(p=>p.jobId===repair.id)!;
    expect(Math.max(Math.abs(repairer.x-cover.x),Math.abs(repairer.z-cover.z))).toBe(1);expect(validateWorld(repairing)).toEqual([]);stages.repairing={tick:repairing.tick,repair,repairer};await saveResume(page,repairing);
    await page.locator('[data-speed="6"]').click();await page.waitForFunction(id=>{const w=window.__lisiere.world,s=w.structures.find(s=>s.id===id);if(s&&!s.damage&&!w.jobs.some(j=>j.repair?.structureId===id)){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;},cover.id,{polling:20,timeout:25000});await pause(page);
    const final=await world(page);expect(final.structures.filter(s=>s.id===cover.id)).toHaveLength(1);expect(final.piles.some(p=>p.item==='cloth')).toBe(false);expect(validateWorld(final)).toEqual([]);await saveResume(page,final);
    // A low cover must also be selectable by the same melee targeting UI as
    // a wall. Zoom through the player's wheel so nearby actor proxies cannot
    // intercept the structure click at overview scale.
    await page.locator(`[data-pawn="${builder!.id}"]`).click();await page.locator('#toggle-draft').click();await revealCells(page,[cover]);
    const zoomPoint=await page.evaluate(c=>{const p=window.__lisiere.projectCell(c.x,c.z),b=document.querySelector('#viewport canvas')!.getBoundingClientRect();return {x:b.x+p.x,y:b.y+p.y};},cover);
    await page.mouse.move(zoomPoint.x,zoomPoint.y);await page.mouse.wheel(0,-1200);await page.waitForTimeout(300);await revealCells(page,[cover]);
    await page.locator('#target-melee').click();await expect(page.locator('#shoot-help')).toContainText('sacs de sable');await cell(page,cover.x,cover.z);
    await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===builder!.id)?.melee?.order).toMatchObject({targetId:cover.id,structure:true});
    await page.locator('[data-speed="1"]').click();await page.waitForFunction(id=>{if((window.__lisiere.world.structures.find(s=>s.id===id)?.damage??0)>0){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;},cover.id,{polling:20,timeout:15000});await pause(page);
    const struck=await world(page);expect(validateWorld(struck)).toEqual([]);stages.melee={tick:struck.tick,cover:struck.structures.find(s=>s.id===cover.id),actor:struck.pawns.find(p=>p.id===builder!.id)};await saveResume(page,struck);
    await page.locator(`[data-pawn="${builder!.id}"]`).click();await page.locator('#toggle-draft').click();await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(id=>{const w=window.__lisiere.world,s=w.structures.find(s=>s.id===id);if(s&&!s.damage&&!w.pawns.some(p=>p.melee)&&!w.jobs.some(j=>j.repair?.structureId===id)){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;},cover.id,{polling:20,timeout:25000});await pause(page);
    const afterMelee=await world(page);expect(validateWorld(afterMelee)).toEqual([]);await saveResume(page,afterMelee);stages.meleeRepaired={tick:afterMelee.tick,cover:afterMelee.structures.find(s=>s.id===cover.id)};
    const finalFrame=await rendered(page,afterMelee.tick),proof=await page.evaluate(()=>{clearInterval((window as any).sandbagsSampleTimer);return (window as any).sandbagsProbe;});
    expect(proof.hooked).toBe(true);expect(proof.pipelines).toBe(pipelinesBefore);expect(finalFrame.furnitureGeometry).toBe(initialFrame.furnitureGeometry);expect(finalFrame.pawnGeometry).toBe(initialFrame.pawnGeometry);
    expect(proof.frames.some((f:RenderedFrame)=>f.flight)).toBe(true);expect(proof.samples.some((s:any)=>s.pawns.some((p:any)=>p.haul?.destination.type==='job'))).toBe(true);
    expect(proof.samples.some((s:any)=>s.projectiles?.some((p:any)=>p.arrival?.effect==='barrier'))).toBe(true);expect(errors).toEqual([]);stages.final={tick:afterMelee.tick,cover:afterMelee.structures.find(s=>s.id===cover.id),frame:finalFrame};
    await writeTestFile('artifacts/sandbags-v207-native.json',JSON.stringify({prepared:true,loadMode:published?'public-catalogue':'candidate-import',browser:browser.version(),hardware,stages,pipelinesBefore,pipelinesAfter:proof.pipelines,samples:proof.samples,visibleFlightFrames:proof.frames.filter((f:RenderedFrame)=>f.flight).length,errors,
      limits:'Prepared32² with five ground cloth and two existing revolvers. Construction, ballistic cover impact, physical repair and exact checkpoint reloads use player controls. No damage or delivery injected. Stable resident geometry and pipelines do not establish general CPU/GPU cost, natural raids or full combat parity.'},null,2));
  }catch(error){const state=await world(page).catch(()=>undefined);if(state)await writeTestFile('artifacts/sandbags-v207-failure-world.json',JSON.stringify(state));await page.screenshot({path:testOutputPath('artifacts/sandbags-v207-failure.png')}).catch(()=>{});await writeTestFile('artifacts/sandbags-v207-failure.json',JSON.stringify({error:String(error),tick:state?.tick,validation:state?validateWorld(state):undefined,stages,errors},null,2));throw error;
  }finally{await browser.close();}
});
