import { readFileSync } from 'node:fs';
import { test,expect,type Page } from '@playwright/test';
import { PACKAGED_SURVIVAL_CELLS,PACKAGED_SURVIVAL_DEMO_ID,PACKAGED_SURVIVAL_DEMO_PATH } from '../../scripts/create-packaged-survival-v206-test-save';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization';
import type { World } from '../../src/sim/types';
import { TEST_COLONY_COUNT } from '../test-colony-count';
import { testOutputPath,writeTestFile } from '../test-output';
import { cell,expectWorld,observeErrors,panel,pause,saveKey,tool,world } from './helpers';
import { editBill,revealCells } from './player-actions';

type RenderedFrame={tick:number;clock:number;furnitureGeometry:number;pawnGeometry:number;furnitureInstances:number};
const frameProbe=`
const survivalFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
 const result=survivalFrame.call(this,now),probe=window.packagedSurvivalProbe;
 if(this.preparing||!this.world||!probe)return result;
 const pawn=this.pawns.feedbackSource,furniture=this.structureGroup.getObjectByName('furniture');if(!pawn||!furniture)return result;
 probe.frames.push({tick:this.world.tick,clock:this.timeline.tick,furnitureGeometry:furniture.geometry.id,furnitureInstances:furniture.geometry.instanceCount,pawnGeometry:pawn.id});
 if(probe.frames.length>1024)probe.frames.shift();return result;
};`;

async function rendered(page:Page,tick:number):Promise<RenderedFrame>{
  await expect.poll(()=>page.evaluate(tick=>{
    const f=(window as any).packagedSurvivalProbe.frames.at(-1);return !!f&&f.tick===tick&&Math.abs(f.clock-tick)<.001;
  },tick)).toBe(true);
  return page.evaluate(()=>(window as any).packagedSurvivalProbe.frames.at(-1));
}
async function saveResume(page:Page,state:World){
  await panel(page,'menu');await page.locator('#save').click();
  await expect.poll(()=>page.evaluate(key=>{const raw=localStorage.getItem(key);return raw?JSON.parse(raw).tick:null;},saveKey)).toBe(state.tick);
  const saved=deserializeWorld((await page.evaluate(key=>localStorage.getItem(key),saveKey))!);expect(saved).toEqual(state);
  await page.locator('#load').click();await expectWorld(page,state);await page.keyboard.press('Escape');
}

test('V206 researches and cooks renewable travel rations through native UI, then loads and returns the same scout',async({playwright})=>{
  test.setTimeout(210_000);
  const prepared=deserializeWorld(readFileSync(PACKAGED_SURVIVAL_DEMO_PATH,'utf8'));
  expect(validateWorld(prepared)).toEqual([]);expect(prepared.piles.some(p=>p.item==='survival-meal')).toBe(false);
  const [researcher,cook,explorer]=prepared.pawns,stove=prepared.structures.find(s=>s.kind==='fueled-stove')!;
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  const stages:Record<string,unknown>={};
  try{
    await page.addInitScript(()=>{
      localStorage.setItem('lisiere.audio.effects.enabled.v1','false');localStorage.setItem('lisiere.audio.music.enabled.v1','false');
      const probe={pipelines:0,hooked:false,frames:[]};(window as any).packagedSurvivalProbe=probe;
      const device=(globalThis as any).GPUDevice?.prototype;
      if(device)for(const name of ['createRenderPipeline','createRenderPipelineAsync']){
        const original=device[name];device[name]=function(...args:any[]){probe.pipelines++;return Reflect.apply(original,this,args);};probe.hooked=true;
      }
    });
    // Read only observations of resident geometry; simulation commands remain
    // the same menu, research, work, bill and scout controls used by a player.
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:frameProbe+await response.text()});});
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    const catalogue=JSON.parse(readFileSync('public/test-saves/manifest.json','utf8'));
    const published=catalogue.saves.some((s:{id:string})=>s.id===PACKAGED_SURVIVAL_DEMO_ID);
    if(published){
      await front.getByRole('button',{name:'Colonies de test',exact:true}).click();
      await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);
      await front.locator(`input[name="test-colony"][value="${PACKAGED_SURVIVAL_DEMO_ID}"]`).check();
      await front.getByRole('button',{name:'Charger cette colonie',exact:true}).click();
    }else await front.locator('input[type="file"]').setInputFiles(PACKAGED_SURVIVAL_DEMO_PATH);
    await expectWorld(page,prepared);await pause(page);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await expect(page.locator('#fps-counter')).toBeVisible();
    const hardware=await page.evaluate(async()=>{const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('WebGPU adapter absent.');const info=adapter.info;
      return {vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description,fallback:(adapter as unknown as {isFallbackAdapter?:boolean}).isFallbackAdapter??null};});
    expect(hardware.fallback).not.toBe(true);expect(Object.values(hardware).join(' ')).not.toMatch(/swiftshader|llvmpipe|lavapipe/i);
    const initialFrame=await rendered(page,prepared.tick),pipelinesBefore=await page.evaluate(()=>(window as any).packagedSurvivalProbe.pipelines);
    stages.prepared={tick:prepared.tick,frame:initialFrame};
    await revealCells(page,[stove]);await cell(page,stove.x,stove.z);
    await expect(page.locator('[data-add-recipe="cook-survival-meal"]')).toBeDisabled();
    await page.keyboard.press('Escape');await panel(page,'research');await page.locator('[data-research-select="packaged-survival-meals"]').click();
    await expect(page.locator('[data-research-selection-points]')).toHaveText('498.0 / 500 points');
    await expect(page.locator('[data-research-selection-detail]')).toContainText('Pâte nutritive');
    await page.locator('[data-research-selected-start]').click();
    await panel(page,'work');await page.locator(`[data-owner="${researcher!.id}"][data-work="research"]`).selectOption('1');await page.keyboard.press('Escape');
    await page.evaluate(({researcherId,cookId,explorerId})=>{
      const samples:any[]=[];(window as any).packagedSurvivalSamples=samples;
      (window as any).packagedSurvivalSampleTimer=setInterval(()=>{
        const w=window.__lisiere?.world;if(!w||samples.at(-1)?.tick===w.tick)return;
        const r=w.pawns.find(p=>p.id===researcherId),c=w.pawns.find(p=>p.id===cookId),e=w.pawns.find(p=>p.id===explorerId);
        samples.push({tick:w.tick,researchPoints:w.research?.packagedSurvivalMeals?.points,research:r?.research?{...r.research,x:r.x,z:r.z,state:r.state}:null,
          cooking:c?.cooking?{...c.cooking,x:c.x,z:c.z,state:c.state}:null,scout:w.scout?{phase:w.scout.phase,startedAt:w.scout.startedAt}:null,
          explorer:e?{x:e.x,z:e.z,state:e.state}:null,rations:w.piles.filter(p=>p.item==='survival-meal').map(p=>({id:p.id,quantity:p.quantity,owner:p.owner,foodPoison:p.foodPoison}))});
        if(samples.length>3000)samples.shift();
      },20);
    },{researcherId:researcher!.id,cookId:cook!.id,explorerId:explorer!.id});
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).research?.packagedSurvivalMeals?.completedAt,{timeout:25000}).toBeGreaterThan(prepared.tick);
    await pause(page);const researched=await world(page);stages.researched={tick:researched.tick,progress:researched.research!.packagedSurvivalMeals};
    expect(researched.piles.some(p=>p.item==='survival-meal')).toBe(false);
    await tool(page,'stockpile');await revealCells(page,[PACKAGED_SURVIVAL_CELLS.storage]);await cell(page,PACKAGED_SURVIVAL_CELLS.storage.x,PACKAGED_SURVIVAL_CELLS.storage.z);await page.keyboard.press('Escape');
    await expect.poll(async()=>(await world(page)).stockpiles.some(s=>s.x===PACKAGED_SURVIVAL_CELLS.storage.x&&s.z===PACKAGED_SURVIVAL_CELLS.storage.z&&s.filters.food)).toBe(true);
    await tool(page,'select');await page.keyboard.press('Escape');await revealCells(page,[stove]);await cell(page,stove.x,stove.z);
    const add=page.locator('[data-add-recipe="cook-survival-meal"]');await expect(add).toBeEnabled();await add.click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===stove.id)?.bills?.length).toBe(1);
    const bill=(await world(page)).structures.find(s=>s.id===stove.id)!.bills![0]!;
    await expect(page.locator(`[data-bill="${bill.id}"] .bill-cost`)).toContainText('6 protéines (viande ou lait) + 6 végétaux');
    await editBill(page,bill.id,{...bill,target:3,destination:'stockpile'});
    await panel(page,'work');await page.locator(`[data-owner="${cook!.id}"][data-work="cook"]`).selectOption('1');await page.keyboard.press('Escape');
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{
      const p=window.__lisiere.world.pawns.find(p=>p.id===id),t=p?.cooking;
      if(t?.recipe==='cook-survival-meal'&&t.phase==='work'&&t.progress>0){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;
    },cook!.id,{polling:20,timeout:45000});await pause(page);
    const cooking=await world(page),actualCook=cooking.pawns.find(p=>p.id===cook!.id)!,task=actualCook.cooking!;
    expect(task.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(12);expect(task.ingredients.every(i=>i.stage==='placed')).toBe(true);
    expect(actualCook.x).toBe(task.spot.x);expect(actualCook.z).toBe(task.spot.z);expect(cooking.piles.some(p=>p.item==='survival-meal')).toBe(false);
    expect(validateWorld(cooking)).toEqual([]);stages.cooking={tick:cooking.tick,task,cook:actualCook};await saveResume(page,cooking);
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(({id,stoveId})=>{
      const w=window.__lisiere.world,p=w.pawns.find(p=>p.id===id),b=w.structures.find(s=>s.id===stoveId)?.bills?.[0];
      if(b?.target===0&&!p?.cooking&&w.piles.filter(p=>p.item==='survival-meal').reduce((n,p)=>n+p.quantity,0)===3){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;
    },{id:cook!.id,stoveId:stove.id},{polling:20,timeout:45000});await pause(page);
    const cooked=await world(page),rations=cooked.piles.filter(p=>p.item==='survival-meal');
    expect(rations).toHaveLength(1);expect(rations[0]!.quantity).toBe(3);expect(rations[0]!.foodPoison).toBeUndefined();expect(rations[0]!.rot).toBeUndefined();
    expect(rations[0]!.owner).toEqual({type:'ground',...PACKAGED_SURVIVAL_CELLS.storage});
    expect(cooked.piles.some(p=>p.item==='hare-meat'||p.item==='rice')).toBe(false);
    expect(cooked.structures.find(s=>s.id===stove.id)!.fuel!.burned).toBeGreaterThan(0);expect(validateWorld(cooked)).toEqual([]);
    const cookedFrame=await rendered(page,cooked.tick);expect(cookedFrame.furnitureGeometry).toBe(initialFrame.furnitureGeometry);expect(cookedFrame.pawnGeometry).toBe(initialFrame.pawnGeometry);
    stages.cooked={tick:cooked.tick,rations,rendered:cookedFrame};
    await revealCells(page,[stove,PACKAGED_SURVIVAL_CELLS.storage]);await page.screenshot({path:testOutputPath('artifacts/packaged-survival-v206-produced-iso.png')});
    await page.locator('#camera-mode').click();await revealCells(page,[stove,PACKAGED_SURVIVAL_CELLS.storage]);await page.screenshot({path:testOutputPath('artifacts/packaged-survival-v206-produced-perspective.png')});
    await panel(page,'world');await page.locator('#scout-pawn').selectOption(String(explorer!.id));await page.locator('#scout-pile').selectOption(String(rations[0]!.id));await page.locator('#scout-quantity').selectOption('3');
    await page.locator('#scout-start').click();await expect(page.locator('#scout-status')).toContainText('pour charger 3 repas au contact');
    const loading=await world(page);expect(loading.scout?.phase).toBe('loading');expect(loading.piles.find(p=>p.id===rations[0]!.id)!.quantity).toBe(3);
    stages.loading={tick:loading.tick,scout:loading.scout};await saveResume(page,loading);
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(()=>{
      if(window.__lisiere.world.scout?.phase==='leaving'){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;
    },undefined,{polling:20,timeout:25000});await pause(page);
    const leaving=await world(page);expect(leaving.scout?.phase).toBe('leaving');
    const inventory=leaving.piles.filter(p=>p.owner.type==='inventory'&&p.owner.pawnId===explorer!.id);
    expect(inventory).toHaveLength(1);expect(inventory[0]!.quantity).toBe(3);expect(inventory[0]!.item).toBe('survival-meal');expect(validateWorld(leaving)).toEqual([]);
    stages.leaving={tick:leaving.tick,scout:leaving.scout,inventory};await saveResume(page,leaving);
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{
      if(window.__lisiere.world.scout?.phase==='travelling'){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;
    },undefined,{polling:20,timeout:25000});await pause(page);
    const travelling=await world(page);expect(travelling.scout?.phase).toBe('travelling');expect(travelling.pawns.some(p=>p.id===explorer!.id)).toBe(false);expect(validateWorld(travelling)).toEqual([]);
    if(!travelling.scout||travelling.scout.phase!=='travelling')throw Error('Trip not observed');
    expect(travelling.scout.pawn.id).toBe(explorer!.id);expect(travelling.scout.items.filter(p=>p.item==='survival-meal').reduce((n,p)=>n+p.quantity,0)).toBe(3);
    stages.travelling={tick:travelling.tick,scout:travelling.scout};await saveResume(page,travelling);
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(id=>{
      const w=window.__lisiere.world;if(!w.scout&&w.pawns.some(p=>p.id===id)){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;
    },explorer!.id,{polling:20,timeout:65000});await pause(page);
    const final=await world(page);expect(validateWorld(final)).toEqual([]);expect(final.pawns.filter(p=>p.id===explorer!.id)).toHaveLength(1);
    // Initially full needs make this short circuit possible without eating;
    // keep the real rule and assert conservation instead of inventing hunger.
    expect(final.piles.filter(p=>p.item==='survival-meal').reduce((n,p)=>n+p.quantity,0)).toBe(3);
    await saveResume(page,final);const finalFrame=await rendered(page,final.tick);
    const proof=await page.evaluate(()=>{clearInterval((window as any).packagedSurvivalSampleTimer);return {pipelines:(window as any).packagedSurvivalProbe.pipelines,hooked:(window as any).packagedSurvivalProbe.hooked,samples:(window as any).packagedSurvivalSamples};});
    expect(proof.hooked).toBe(true);expect(proof.pipelines).toBe(pipelinesBefore);expect(finalFrame.furnitureGeometry).toBe(initialFrame.furnitureGeometry);expect(finalFrame.pawnGeometry).toBe(initialFrame.pawnGeometry);expect(errors).toEqual([]);
    expect(proof.samples.some((s:any)=>s.research?.state==='working'&&s.researchPoints>prepared.research!.packagedSurvivalMeals!.points)).toBe(true);
    expect(proof.samples.some((s:any)=>s.cooking?.phase==='gather')).toBe(true);expect(proof.samples.some((s:any)=>s.cooking?.phase==='work'&&s.cooking.progress>0)).toBe(true);
    stages.final={tick:final.tick,rendered:finalFrame,rations:final.piles.filter(p=>p.item==='survival-meal')};
    await writeTestFile('artifacts/packaged-survival-v206-native.json',JSON.stringify({prepared:true,loadMode:published?'public-catalogue':'candidate-import',catalogueEntries:catalogue.saves.length,browser:browser.version(),hardware,stages,samples:proof.samples,pipelinesBefore,pipelinesAfter:proof.pipelines,errors,
      limits:'Prepared32², research498/500 and existing infrastructure supplied explicitly. Physical research, three individual recipes, ingredient collection, cooking, storage, loading, exit, ownership and exact reloads are real. Full initial needs mean no trail consumption is claimed. Stable resident geometry and pipeline observations do not prove general CPU/GPU cost or natural campaign.'},null,2));
  }catch(error){
    const state=await world(page).catch(()=>undefined);if(state)await writeTestFile('artifacts/packaged-survival-v206-failure-world.json',JSON.stringify(state));
    await page.screenshot({path:testOutputPath('artifacts/packaged-survival-v206-failure.png')}).catch(()=>{});
    await writeTestFile('artifacts/packaged-survival-v206-failure.json',JSON.stringify({error:String(error),tick:state?.tick,validation:state?validateWorld(state):undefined,stages,errors},null,2));throw error;
  }finally{await browser.close();}
});
