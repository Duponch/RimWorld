import { readFileSync } from 'node:fs';
import { test,expect,type Page } from '@playwright/test';
import { TELEVISION_CELLS,TELEVISION_DEMO_PATH,TELEVISION_DEMO_ID } from '../../scripts/create-television-v208-test-save';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization';
import { isTelevisionCell } from '../../src/sim/television-recreation';
import type { World } from '../../src/sim/types';
import { cell,expectWorld,observeErrors,panel,pause,pawnTab,saveKey,world } from './helpers';
import { revealCells } from './player-actions';

const probeSource=`
const televisionFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
 const result=televisionFrame.call(this,now),probe=window.televisionProbe;
 if(this.preparing||!this.world||!probe)return result;
 const pawn=this.pawns.feedbackSource,furniture=this.structureGroup.getObjectByName('furniture');if(!pawn||!furniture)return result;
 const to=pawn.getAttribute('aTo'),motion=pawn.getAttribute('aMotion');
 probe.frames.push({tick:this.world.tick,clock:this.timeline.tick,furnitureGeometry:furniture.geometry.id,instances:furniture.geometry.instanceCount,
  poses:this.world.pawns.map((p,i)=>({id:p.id,yaw:to.getW(i),pose:motion.getZ(i)}))});
 if(probe.frames.length>1024)probe.frames.shift();return result;
};`;
async function bounded<T>(operation:Promise<T>):Promise<T|null>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([operation,new Promise<null>(resolve=>{timer=setTimeout(()=>resolve(null),5000);})]);}
  finally{clearTimeout(timer);}
}
async function frame(page:Page,tick:number){
  await expect.poll(()=>page.evaluate(t=>{const f=(window as any).televisionProbe.frames.at(-1);return f?.tick===t&&Math.abs(f.clock-t)<.001;},tick)).toBe(true);
  return page.evaluate(()=>(window as any).televisionProbe.frames.at(-1));
}
async function saveResume(page:Page,state:World){
  await panel(page,'menu');await page.locator('#save').click();
  await expect.poll(()=>page.evaluate(key=>{const raw=localStorage.getItem(key);return raw?JSON.parse(raw).tick:null;},saveKey)).toBe(state.tick);
  expect(deserializeWorld((await page.evaluate(key=>localStorage.getItem(key),saveKey))!)).toEqual(state);
  await page.locator('#load').click();await expectWorld(page,state);await page.keyboard.press('Escape');
}

test('V208 researches, delivers and builds the CRT, watches from a real seat and physically switches it through native UI',async({playwright})=>{
  test.setTimeout(180_000);
  const prepared=deserializeWorld(readFileSync(TELEVISION_DEMO_PATH,'utf8'));
  expect(validateWorld(prepared)).toEqual([]);expect(prepared.jobs).toEqual([]);
  expect(prepared.structures.some(s=>s.kind==='tube-television')).toBe(false);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page),stages:Record<string,unknown>={};
  page.setDefaultTimeout(15_000);
  try{
    await page.addInitScript(()=>{
      localStorage.setItem('lisiere.audio.effects.enabled.v1','false');localStorage.setItem('lisiere.audio.music.enabled.v1','false');
      const probe={pipelines:0,hooked:false,frames:[],samples:[]};(window as any).televisionProbe=probe;
      const device=(globalThis as any).GPUDevice?.prototype;
      if(device)for(const name of ['createRenderPipeline','createRenderPipelineAsync']){const original=device[name];device[name]=function(...args:any[]){probe.pipelines++;return Reflect.apply(original,this,args);};probe.hooked=true;}
    });
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probeSource+await response.text()});});
    await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    const catalogue=JSON.parse(readFileSync('public/test-saves/manifest.json','utf8'));
    if(catalogue.saves.some((s:{id:string})=>s.id===TELEVISION_DEMO_ID)){
      await front.getByRole('button',{name:'Colonies de test',exact:true}).click();
      await expect(front.locator('input[name="test-colony"]')).toHaveCount(catalogue.saves.length);
      await front.locator(`input[name="test-colony"][value="${TELEVISION_DEMO_ID}"]`).check();await front.getByRole('button',{name:'Charger cette colonie',exact:true}).click();
    }else await front.locator('input[type="file"]').setInputFiles(TELEVISION_DEMO_PATH);
    await expectWorld(page,prepared);await pause(page);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const hardware=await page.evaluate(async()=>{const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('WebGPU adapter absent.');const info=adapter.info;return {vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description,fallback:(adapter as unknown as {isFallbackAdapter?:boolean}).isFallbackAdapter??null};});
    expect(hardware.fallback).not.toBe(true);expect(Object.values(hardware).join(' ')).not.toMatch(/swiftshader|llvmpipe|lavapipe/i);
    const initial=await frame(page,prepared.tick),pipelinesBefore=await page.evaluate(()=>(window as any).televisionProbe.pipelines);
    await page.evaluate(()=>{(window as any).televisionSampleTimer=setInterval(()=>{
      const w=window.__lisiere?.world,probe=(window as any).televisionProbe;if(!w||probe.samples.at(-1)?.tick===w.tick)return;
      probe.samples.push(JSON.parse(JSON.stringify({tick:w.tick,tvs:w.structures.filter(s=>s.kind==='tube-television'),jobs:w.jobs.filter(j=>j.kind==='tube-television'||j.kind==='flick'),
        piles:w.piles.filter(p=>p.item==='steel'||p.item==='component'),pawns:w.pawns.map(p=>({id:p.id,x:p.x,z:p.z,task:p.recreation.task,tolerance:p.recreation.tolerance.television}))})));
      if(probe.samples.length>4000)probe.samples.shift();
    },10);});
    await panel(page,'research');await page.locator('[data-research-select="tube-television"]').click();
    await expect(page.locator('[data-research-selection-points]')).toHaveText('998.0 / 1000 points');
    await expect(page.locator('[data-research-selection-prerequisites]')).toContainText('Mobilier complexe');
    await page.locator('[data-research-selected-start]').click();await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
    await expect.poll(async()=>(await world(page)).research?.tubeTelevision?.completedAt,{timeout:25000}).toBeGreaterThan(prepared.tick);
    await pause(page);stages.researched=await world(page);
    await panel(page,'architect');await page.locator('[data-category="recreation"]').click();await page.locator('[data-tool="tube-television"]').click();
    await expect(page.locator('#tool-instruction')).toContainText('80 Acier');await expect(page.locator('#tool-instruction')).toContainText('4 Composant');
    await expect(page.locator('#placement-controls')).toBeVisible();await expect(page.locator('#construction-material-controls')).toBeHidden();
    await revealCells(page,[TELEVISION_CELLS.television]);await cell(page,12,12);await page.keyboard.press('Escape');
    await expect.poll(async()=>(await world(page)).jobs.filter(j=>j.kind==='tube-television').length).toBe(1);
    const plan=(await world(page)).jobs.find(j=>j.kind==='tube-television')!;expect(plan.material).toBe('steel');expect(plan.orientation).toBe(0);
    // The recipe takes 1 000 neutral work ticks plus hauling. Use a real UI
    // speed change instead of assuming it fits a 45-second wall-clock at 1×.
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.kind==='tube-television'),{timeout:45000}).toBeDefined();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.kind==='tube-television')?.power?.on).toBe(true);await pause(page);
    const built=await world(page),tv=built.structures.find(s=>s.kind==='tube-television')!;
    expect(tv.quality).toBeUndefined();expect(tv.power?.on).toBe(true);expect(validateWorld(built)).toEqual([]);
    expect(built.piles.filter(p=>p.item==='steel'||p.item==='component')).toEqual([]);
    const builtFrame=await frame(page,built.tick);expect(builtFrame.furnitureGeometry).toBe(initial.furnitureGeometry);
    // Eight fixed CRT parts and its existing saved electrical lead share this batch.
    expect(builtFrame.instances).toBe(initial.instances+9);
    expect(await page.evaluate(()=>(window as any).televisionProbe.pipelines)).toBe(pipelinesBefore);
    stages.built={tick:built.tick,tv,frame:builtFrame};
    // Native timetable changes leave the builder at work for the later switch.
    await panel(page,'schedule');await page.locator('[data-schedule-brush="recreation"]').click();
    for(const p of [prepared.pawns[0]!,prepared.pawns[2]!])for(let h=0;h<24;h++){
      const button=page.locator(`[data-schedule-pawn="${p.id}"][data-schedule-hour="${h}"]`);await button.focus();await page.keyboard.press('Enter');
      await expect.poll(async()=>(await world(page)).pawns.find(a=>a.id===p.id)?.schedule[h]).toBe('recreation');
    }
    // Escape from a focused timetable cell cancels painting; close the panel
    // with its actual button before clicking the clock behind it.
    await page.getByRole('button',{name:'Fermer Planning',exact:true}).click();await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>window.__lisiere.world.pawns.some(p=>p.recreation.task?.activity==='watch-television'&&p.recreation.task.phase==='active'&&p.recreation.tolerance.television>0),undefined,{timeout:25000});
    await pause(page);const watching=await world(page),viewer=watching.pawns.find(p=>p.recreation.task?.activity==='watch-television'&&p.recreation.task.phase==='active')!;
    expect(viewer).toBeDefined();expect(isTelevisionCell(tv,viewer)).toBe(true);expect(viewer.recreation.task!.seatId).toBeDefined();
    const watchingFrame=await frame(page,watching.tick),pose=watchingFrame.poses.find((p:{id:number})=>p.id===viewer.id);
    expect(pose.pose).toBe(3);
    // The renderer intentionally keeps turns continuous across ±π.
    const yawError=pose.yaw-Math.atan2(tv.x-viewer.x,tv.z-viewer.z);
    expect(Math.atan2(Math.sin(yawError),Math.cos(yawError))).toBeCloseTo(0);
    await page.locator(`[data-pawn="${viewer.id}"]`).click();await pawnTab(page,'needs');await expect(page.locator('#recreation-tolerance')).toContainText('Télévision');
    await saveResume(page,watching);stages.watching={tick:watching.tick,viewer,frame:watchingFrame};
    await revealCells(page,[tv]);await cell(page,tv.x,tv.z);await page.locator(`[data-power-id="${tv.id}"] [data-power-flick]`).click();
    await expect.poll(async()=>(await world(page)).jobs.some(j=>j.flick?.structureId===tv.id)).toBe(true);await page.locator('[data-speed="1"]').click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===tv.id)?.power?.switchOn,{timeout:25000}).toBe(false);
    await expect.poll(async()=>(await world(page)).pawns.some(p=>p.recreation.task?.activity==='watch-television')).toBe(false);await pause(page);
    const off=await world(page);expect(validateWorld(off)).toEqual([]);await saveResume(page,off);stages.off={tick:off.tick,tv:off.structures.find(s=>s.id===tv.id)};
    await revealCells(page,[tv]);await cell(page,tv.x,tv.z);await expect(page.locator('#cell-description')).toContainText('Écran éteint');
    await page.locator(`[data-power-id="${tv.id}"] [data-power-flick]`).click();await page.locator('[data-speed="1"]').click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===tv.id)?.power?.on,{timeout:25000}).toBe(true);
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>window.__lisiere.world.pawns.some(p=>p.recreation.task?.activity==='watch-television'&&p.recreation.task.phase==='active'),undefined,{timeout:25000});await pause(page);
    const resumed=await world(page);expect(validateWorld(resumed)).toEqual([]);stages.resumed={tick:resumed.tick,tv:resumed.structures.find(s=>s.id===tv.id),pawns:resumed.pawns.map(p=>({id:p.id,task:p.recreation.task,tolerance:p.recreation.tolerance.television}))};
    const samples=await page.evaluate(()=>(window as any).televisionProbe.samples);
    expect(samples.some((s:any)=>s.piles.some((p:any)=>p.owner.type==='job'&&p.owner.jobId===plan.id))).toBe(true);
    const travel=samples.flatMap((s:any)=>s.pawns.filter((p:any)=>p.task?.activity==='watch-television'&&p.task.phase==='travel'));
    expect(travel.length).toBeGreaterThan(0);expect(travel.some((p:any)=>p.tolerance===0)).toBe(true);
    for(let i=1;i<samples.length;i++)for(const p of samples[i].pawns){
      if(p.task?.activity!=='watch-television')continue;
      if(p.task.phase==='active'){
        expect({x:p.x,z:p.z}).toEqual(p.task.target);
        expect(built.structures.some(s=>s.id===p.task.seatId&&s.x===p.x&&s.z===p.z)).toBe(true);
      }else{
        const previous=samples[i-1].pawns.find((a:any)=>a.id===p.id);
        if(previous?.task?.activity==='watch-television'&&previous.task.phase==='travel')expect(p.tolerance).toBeLessThanOrEqual(previous.tolerance);
      }
    }
    for(const sample of samples.filter((s:any)=>s.tick>=off.tick&&s.tvs[0]?.power?.switchOn===false))for(const p of sample.pawns){
      expect(p.tolerance).toBeLessThanOrEqual(off.pawns.find(a=>a.id===p.id)!.recreation.tolerance.television);
    }
    expect(errors).toEqual([]);await test.info().attach('television-stages',{contentType:'application/json',body:JSON.stringify({hardware,stages,samples})});
    await page.screenshot({path:test.info().outputPath('television-v208.png')});
  }finally{
    if(!page.isClosed()){
      const checkpoint=await bounded(page.evaluate(()=>({world:window.__lisiere?.world,probe:(window as any).televisionProbe})).catch(()=>null));
      if(checkpoint)await test.info().attach('television-checkpoint',{contentType:'application/json',body:JSON.stringify({checkpoint,stages,errors})});
    }
    await bounded(browser.close());
  }
});
