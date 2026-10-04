import { readFileSync } from 'node:fs';
import { test,expect,type Page } from '@playwright/test';
import { HOSPITAL_BED_CELLS,HOSPITAL_BED_DEMO_ID,HOSPITAL_BED_DEMO_PATH } from '../../scripts/create-hospital-bed-v205-test-save';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization';
import { footprintCells } from '../../src/sim/definitions';
import { hospitalBedParts } from '../../src/render/hospital-bed-parts';
import type { World } from '../../src/sim/types';
import { TEST_COLONY_COUNT } from '../test-colony-count';
import { testOutputPath,writeTestFile } from '../test-output';
import { cell,expectWorld,observeErrors,panel,pause,saveKey,tool,world } from './helpers';
import { revealCells } from './player-actions';

type RenderedFrame={tick:number;clock:number;furnitureGeometry:number;furnitureInstances:number;pawnGeometry:number;poses:{id:number;to:number[];pose:number}[]};
const frameProbe=`
const hospitalFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
 const result=hospitalFrame.call(this,now),probe=window.hospitalBedProbe;
 if(this.preparing||!this.world||!probe)return result;
 const pawn=this.pawns.feedbackSource,furniture=this.structureGroup.getObjectByName('furniture');if(!pawn||!furniture)return result;
 const to=pawn.getAttribute('aTo'),motion=pawn.getAttribute('aMotion');
 probe.frames.push({tick:this.world.tick,clock:this.timeline.tick,furnitureGeometry:furniture.geometry.id,furnitureInstances:furniture.geometry.instanceCount,pawnGeometry:pawn.id,
  poses:this.world.pawns.map((p,i)=>({id:p.id,to:[to.getX(i),to.getY(i),to.getZ(i)],pose:motion.getZ(i)}))});
 if(probe.frames.length>1024)probe.frames.shift();return result;
};`;

async function rendered(page:Page,tick:number):Promise<RenderedFrame>{
  await expect.poll(()=>page.evaluate(tick=>{
    const f=(window as any).hospitalBedProbe.frames.at(-1);return !!f&&f.tick===tick&&Math.abs(f.clock-tick)<.001;
  },tick)).toBe(true);
  return page.evaluate(()=>(window as any).hospitalBedProbe.frames.at(-1));
}
async function saveResume(page:Page,state:World){
  await panel(page,'menu');await page.locator('#save').click();
  await expect.poll(()=>page.evaluate(key=>{const raw=window.__lisiere.saveRepository.peekItem(key);return raw?JSON.parse(raw).tick:null;},saveKey)).toBe(state.tick);
  const saved=deserializeWorld((await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey))!);expect(saved).toEqual(state);
  await page.locator('#load').click();await expectWorld(page,state);await page.keyboard.press('Escape');
}

test('V205 prepared hospital scene researches, constructs, admits and tends through real UI with resident WebGPU presentation',async({playwright})=>{
  test.setTimeout(180_000);
  const prepared=deserializeWorld(readFileSync(HOSPITAL_BED_DEMO_PATH,'utf8'));
  expect(validateWorld(prepared)).toEqual([]);expect(prepared.jobs).toHaveLength(0);
  expect(prepared.structures.some(s=>s.kind==='hospital-bed')).toBe(false);
  expect(prepared.research!.hospitalBed!.completedAt).toBeUndefined();
  const [doctor,builder,patient]=prepared.pawns,target=HOSPITAL_BED_CELLS.hospital;
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  const stages:Record<string,unknown>={};
  try{
    await page.addInitScript(()=>{
      localStorage.setItem('lisiere.audio.effects.enabled.v1','false');localStorage.setItem('lisiere.audio.music.enabled.v1','false');
      const probe={pipelines:0,hooked:false,frames:[]};(window as any).hospitalBedProbe=probe;
      const device=(globalThis as any).GPUDevice?.prototype;
      if(device)for(const name of ['createRenderPipeline','createRenderPipelineAsync']){
        const original=device[name];device[name]=function(...args:any[]){probe.pipelines++;return Reflect.apply(original,this,args);};probe.hooked=true;
      }
    });
    // Observe resident geometry and actual GPU pose attributes without changing
    // any world, command, recipe or frame result.
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:frameProbe+await response.text()});});
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    const catalogue=JSON.parse(readFileSync('public/test-saves/manifest.json','utf8'));
    const published=catalogue.saves.some((s:{id:string})=>s.id===HOSPITAL_BED_DEMO_ID);
    if(published){
      await front.getByRole('button',{name:'Colonies de test',exact:true}).click();
      await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);
      await front.locator(`input[name="test-colony"][value="${HOSPITAL_BED_DEMO_ID}"]`).check();
      await front.getByRole('button',{name:'Charger cette colonie',exact:true}).click();
    }else{
      // Validate the candidate through the normal import flow before appending
      // its public catalogue entry. The same test covers that entry after publish.
      await front.locator('input[type="file"]').setInputFiles(HOSPITAL_BED_DEMO_PATH);
    }
    await expectWorld(page,prepared);await pause(page);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await expect(page.locator('#fps-counter')).toBeVisible();
    const hardware=await page.evaluate(async()=>{const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('WebGPU adapter absent.');const info=adapter.info;
      return {vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description,fallback:(adapter as unknown as {isFallbackAdapter?:boolean}).isFallbackAdapter??null};});
    expect(hardware.fallback).not.toBe(true);expect(Object.values(hardware).join(' ')).not.toMatch(/swiftshader|llvmpipe|lavapipe/i);
    const initialFrame=await rendered(page,prepared.tick),pipelinesBefore=await page.evaluate(()=>(window as any).hospitalBedProbe.pipelines);
    stages.prepared={tick:prepared.tick,frame:initialFrame};
    await panel(page,'research');await page.locator('[data-research-select="hospital-bed"]').click();
    await expect(page.locator('[data-research-selection-points]')).toHaveText('1198.0 / 1200 points');
    await expect(page.locator('[data-research-selection-prerequisites]')).toContainText('Microélectronique');
    await expect(page.locator('[data-research-selection-prerequisites]')).toContainText('Mobilier complexe');
    await expect(page.locator('[data-research-selection-detail]')).toContainText('Matériaux stériles');
    await page.locator('[data-research-selected-start]').click();
    await panel(page,'work');await page.locator(`[data-owner="${doctor!.id}"][data-work="research"]`).selectOption('1');await page.keyboard.press('Escape');
    await page.evaluate(({doctorId,builderId,patientId})=>{
      const samples:any[]=[];(window as any).hospitalSamples=samples;
      (window as any).hospitalSampleTimer=setInterval(()=>{
        const w=window.__lisiere?.world;if(!w||samples.at(-1)?.tick===w.tick)return;
        const d=w.pawns.find(p=>p.id===doctorId)!,b=w.pawns.find(p=>p.id===builderId)!,p=w.pawns.find(p=>p.id===patientId)!;
        const j=w.jobs.find(j=>j.id===b.jobId);
        samples.push({tick:w.tick,researchPoints:w.research?.hospitalBed?.points,research:d.research?{...d.research,x:d.x,z:d.z,state:d.state}:null,
          build:j?{id:j.id,x:b.x,z:b.z,state:b.state,progress:j.progress}:null,tending:d.tend?{...d.tend,x:d.x,z:d.z}:null,
          patient:{x:p.x,z:p.z,state:p.state,need:p.need},steel:w.piles.filter(p=>p.item==='steel').map(p=>({quantity:p.quantity,owner:p.owner}))});
        if(samples.length>2000)samples.shift();
      },20);
    },{doctorId:doctor!.id,builderId:builder!.id,patientId:patient!.id});
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).research?.hospitalBed?.completedAt,{timeout:25000}).toBeGreaterThan(prepared.tick);
    await pause(page);const researched=await world(page);stages.researched={tick:researched.tick,progress:researched.research!.hospitalBed};
    expect(researched.structures.some(s=>s.kind==='hospital-bed')).toBe(false);
    await panel(page,'architect');await page.locator('[data-category="furniture"]').click();
    await page.locator('[data-tool="hospital-bed"]').click();
    await expect(page.locator('#construction-material')).toHaveValue('steel');
    await expect(page.locator('#tool-instruction')).toContainText('120 Acier');
    await expect(page.locator('#tool-instruction')).toContainText('5 Composants');
    await revealCells(page,[target]);await cell(page,target.x,target.z);await page.keyboard.press('Escape');
    await expect.poll(async()=>(await world(page)).jobs.some(j=>j.kind==='hospital-bed'&&j.x===target.x&&j.z===target.z)).toBe(true);
    expect((await world(page)).structures.some(s=>s.kind==='hospital-bed')).toBe(false);
    // Deliveries need several round trips before the builder can work.
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{
      const j=window.__lisiere.world.jobs.find(j=>j.kind==='hospital-bed');
      if(j?.construction==='frame'&&j.progress>0){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;
    },undefined,{polling:20,timeout:45000});await pause(page);
    const constructing=await world(page);expect(validateWorld(constructing)).toEqual([]);
    stages.frame={tick:constructing.tick,job:constructing.jobs.find(j=>j.kind==='hospital-bed'),rendered:await rendered(page,constructing.tick)};
    await saveResume(page,constructing);await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.some(s=>s.kind==='hospital-bed'),{timeout:30000}).toBe(true);await pause(page);
    const constructed=await world(page),bed=constructed.structures.find(s=>s.kind==='hospital-bed')!;
    expect(validateWorld(constructed)).toEqual([]);expect(bed.medical).toBe(true);expect(bed.material).toBe('steel');expect(bed.quality).toBeDefined();
    expect(constructed.piles.filter(p=>p.item==='steel'||p.item==='component')).toEqual([]);expect(hospitalBedParts(constructed)).toHaveLength(18);
    const bedFrame=await rendered(page,constructed.tick);expect(bedFrame.furnitureGeometry).toBe(initialFrame.furnitureGeometry);
    expect(bedFrame.furnitureInstances-initialFrame.furnitureInstances).toBe(18);expect(bedFrame.pawnGeometry).toBe(initialFrame.pawnGeometry);
    stages.constructed={tick:constructed.tick,bed,rendered:bedFrame};
    await tool(page,'select');await page.keyboard.press('Escape');await revealCells(page,[bed]);await cell(page,bed.x,bed.z);
    await expect(page.locator('#cell-title')).toContainText('Lit d’hôpital');await expect(page.locator('#bed-medical')).toBeChecked();
    await page.locator('#bed-medical').uncheck();await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===bed.id)?.medical??false).toBe(false);
    await expect(page.locator('#bed-owner')).toBeEnabled();await page.locator('#bed-medical').check();await expect(page.locator('#bed-owner')).toBeDisabled();
    await panel(page,'work');await page.locator(`[data-owner="${patient!.id}"][data-work="patient"]`).selectOption('1');
    await page.locator(`[data-owner="${patient!.id}"][data-work="bedrest"]`).selectOption('3');await page.keyboard.press('Escape');
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(({id,bedId})=>{
      const p=window.__lisiere.world.pawns.find(p=>p.id===id)!;
      if(p.need?.kind==='sleep'&&p.need.phase==='sleep'&&p.need.bedId===bedId){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;
    },{id:patient!.id,bedId:bed.id},{polling:20,timeout:25000});await pause(page);
    const admitted=await world(page),actualPatient=admitted.pawns.find(p=>p.id===patient!.id)!,admittedFrame=await rendered(page,admitted.tick);
    expect(actualPatient.x).toBe(bed.x);expect(actualPatient.z).toBe(bed.z);
    const cells=footprintCells(bed),last=cells[cells.length-1]!,pose=admittedFrame.poses.find(p=>p.id===patient!.id)!;
    expect(pose.to).toEqual([(bed.x+last.x)/2,.5,(bed.z+last.z)/2]);expect(pose.pose).toBe(1);
    stages.admitted={tick:admitted.tick,patient:actualPatient,rendered:admittedFrame};
    await panel(page,'work');await page.locator(`[data-owner="${doctor!.id}"][data-work="doctor"]`).selectOption('1');await page.keyboard.press('Escape');
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{
      const p=window.__lisiere.world.pawns.find(p=>p.id===id);
      if(p?.tend?.phase==='tend'&&p.tend.progress>0){document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;}return false;
    },doctor!.id,{polling:20,timeout:25000});await pause(page);
    const tending=await world(page),caregiver=tending.pawns.find(p=>p.id===doctor!.id)!;
    expect(caregiver.tend!.patientId).toBe(patient!.id);expect(caregiver.x).toBe(caregiver.tend!.spot.x);expect(caregiver.z).toBe(caregiver.tend!.spot.z);
    expect(Math.abs(caregiver.x-bed.x)+Math.abs(caregiver.z-bed.z)).toBe(1);expect(caregiver.tend!.medicine).toBeDefined();
    const carriedDose=tending.piles.find(p=>p.id===caregiver.tend!.medicine!.carryPileId)!;
    expect(carriedDose.owner).toEqual({type:'pawn',pawnId:doctor!.id});expect(carriedDose.quantity).toBe(1);
    stages.tending={tick:tending.tick,doctor:caregiver};await saveResume(page,tending);
    await page.locator('[data-speed="1"]').click();
    await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===patient!.id)?.health?.injuries[0]?.tended,{timeout:20000}).toBeGreaterThan(0);
    await pause(page);const final=await world(page);expect(validateWorld(final)).toEqual([]);
    expect(final.piles.filter(p=>p.item==='medicine').reduce((n,p)=>n+p.quantity,0)).toBe(1);
    expect(final.pawns.find(p=>p.id===doctor!.id)!.skills.medicine.xp).toBeGreaterThan(doctor!.skills.medicine.xp);
    const samples=await page.evaluate(()=>(window as any).hospitalSamples as any[]);
    expect(samples.some(s=>s.research?.state==='working'&&s.researchPoints>prepared.research!.hospitalBed!.points)).toBe(true);
    expect(samples.some(s=>s.build?.state==='working'&&s.build.progress>0)).toBe(true);
    expect(samples.some(s=>s.tending?.phase==='pickup')).toBe(true);
    await revealCells(page,[bed]);await page.screenshot({path:testOutputPath('artifacts/hospital-v205-clinic-iso.png')});
    await page.locator('#camera-mode').click();await revealCells(page,[bed]);await page.screenshot({path:testOutputPath('artifacts/hospital-v205-clinic-perspective.png')});
    await saveResume(page,final);const finalFrame=await rendered(page,final.tick),probe=await page.evaluate(()=>{clearInterval((window as any).hospitalSampleTimer);return {pipelines:(window as any).hospitalBedProbe.pipelines,hooked:(window as any).hospitalBedProbe.hooked};});
    expect(probe.hooked).toBe(true);expect(probe.pipelines).toBe(pipelinesBefore);expect(finalFrame.furnitureGeometry).toBe(initialFrame.furnitureGeometry);expect(errors).toEqual([]);
    stages.final={tick:final.tick,patient:final.pawns.find(p=>p.id===patient!.id),rendered:finalFrame};
    await writeTestFile('artifacts/hospital-v205-native.json',JSON.stringify({prepared:true,loadMode:published?'public-catalogue':'candidate-import',catalogueEntries:catalogue.saves.length,browser:browser.version(),hardware,stages,samples,pipelinesBefore,pipelinesAfter:probe.pipelines,errors,
      limits:'Prepared32², near-completed research and existing infrastructure supplied explicitly. Research contact, physical deliveries/construction, medical role, admission, dose, tending and exact reloads are real. Resident geometry/pipeline observations are not general CPU/GPU performance or natural-campaign proof.'},null,2));
  }catch(error){
    const state=await world(page).catch(()=>undefined);if(state)await writeTestFile('artifacts/hospital-v205-failure-world.json',JSON.stringify(state));
    await page.screenshot({path:testOutputPath('artifacts/hospital-v205-failure.png')}).catch(()=>{});
    await writeTestFile('artifacts/hospital-v205-failure.json',JSON.stringify({error:String(error),tick:state?.tick,validation:state?validateWorld(state):undefined,stages,errors},null,2));throw error;
  }finally{await browser.close();}
});
