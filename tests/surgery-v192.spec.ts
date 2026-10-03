import { readFileSync } from 'node:fs';
import { expect,test,type Page } from '@playwright/test';
import { SURGERY_DEMO_ID } from '../scripts/create-test-save-surgery-v192.ts';
import { deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import type { World } from '../src/sim/types.ts';
import { expectWorld,observeErrors,panel,pause,pawnTab,world } from './integration/helpers.ts';
import { revealCells } from './integration/player-actions.ts';
import { testOutputPath,writeTestFile } from './test-output.ts';
import { TEST_COLONY_COUNT } from './test-colony-count.ts';

interface Frame {tick:number;clock:number;geometry:number;instances:number;shapes:{id:number;word:number}[]}
interface Probe {pipelines:number;compiled:{name:string;label?:string}[];frames:Frame[]}
const frameProbe=`
const surgeryFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
 const result=surgeryFrame.call(this,now);
 if(this.preparing||!this.world||!window.surgeryProbe)return result;
 const geometry=this.pawns.feedbackSource,shape=geometry?.getAttribute('aShape');
 if(!shape)return result;
 const frames=window.surgeryProbe.frames;
 frames.push({tick:this.world.tick,clock:this.timeline.tick,geometry:geometry.id,instances:geometry.instanceCount,
  shapes:this.world.pawns.map((p,i)=>({id:p.id,word:shape.getX(i)}))});
 if(frames.length>4096)frames.shift();return result;
};`;
async function frame(page:Page,tick:number):Promise<Frame>{
  await expect.poll(()=>page.evaluate(tick=>{const f=(window as unknown as {surgeryProbe:Probe}).surgeryProbe.frames.at(-1);return !!f&&f.tick===tick&&Math.abs(f.clock-tick)<.001;},tick)).toBe(true);
  return page.evaluate(()=>(window as unknown as {surgeryProbe:Probe}).surgeryProbe.frames.at(-1)!);
}
async function saveResume(page:Page,expected:World){
  await panel(page,'menu');await page.locator('#save').click();await expect(page.locator('#notice')).toContainText('Colonie sauvegardée');
  await page.locator('#load').click();await expect(page.locator('#notice')).toContainText('Sauvegarde rechargée');
  await expectWorld(page,expected);await page.keyboard.press('Escape');
}
const medicineCount=(w:World)=>w.piles.reduce((n,p)=>n+(p.item==='medicine'?p.quantity:0),0);

/** Real wheel zoom with screen feedback, independent of renderer internals.
 * Both actors must remain visible; tiny portraits are not a visual anatomy proof. */
async function anatomyCloseup(page:Page,actors:{id:number;x:number;z:number}[]){
  await revealCells(page,actors);
  for(let attempt=0;attempt<18;attempt++){
    const view=await page.evaluate(ids=>{
      const canvas=document.querySelector<HTMLCanvasElement>('#viewport canvas')!,bounds=canvas.getBoundingClientRect();
      const projected=ids.map(id=>window.__lisiere.projectPawn(id));
      if(projected.some(p=>!p))throw new Error('Anatomy close-up actor is outside the camera.');
      const points=projected.map(p=>p!);
      const center={x:points.reduce((n,p)=>n+p.x,0)/points.length,y:points.reduce((n,p)=>n+p.y,0)/points.length};
      const anchor={x:bounds.left+bounds.width*.55,y:bounds.top+bounds.height*.35};
      if(document.elementFromPoint(anchor.x,anchor.y)!==canvas){anchor.x=bounds.left+bounds.width*.7;anchor.y=bounds.top+bounds.height*.2;}
      if(document.elementFromPoint(anchor.x,anchor.y)!==canvas)throw new Error('No clear canvas anchor for anatomy zoom.');
      return {anchor,center,radii:points.map((p,i)=>({id:ids[i]!,radius:p.radius})),large:points.every(p=>p.radius>=40)};
    },actors.map(p=>p.id));
    if(view.large)return view.radii;
    const dx=Math.max(-150,Math.min(150,view.anchor.x-view.center.x)),dy=Math.max(-100,Math.min(100,view.anchor.y-view.center.y));
    await page.mouse.move(view.anchor.x,view.anchor.y);await page.mouse.down({button:'middle'});
    await page.mouse.move(view.anchor.x+dx,view.anchor.y+dy,{steps:6});await page.mouse.up({button:'middle'});await page.waitForTimeout(200);
    await page.mouse.move(view.anchor.x,view.anchor.y);await page.mouse.wheel(0,-350);await page.waitForTimeout(200);
    await revealCells(page,actors);
  }
  throw new Error('Real camera zoom did not produce the required anatomy close-up (projected radius ≥40px).');
}

test('V192 prepared therapeutic surgery uses the Health UI, actual bed/dose/work and postoperative care, with native resident anatomy and phase reloads',async({playwright})=>{
  test.setTimeout(180_000);
  const raw=readFileSync('public/test-saves/v192/chirurgie-therapeutique.json','utf8'),prepared=deserializeWorld(raw);
  const patient=prepared.pawns.find(p=>p.name==='Basile')!,doctor=prepared.pawns.find(p=>p.name==='Ada')!,control=prepared.pawns.find(p=>p.name==='Céleste')!;
  expect(validateWorld(prepared)).toEqual([]);expect(prepared.width).toBe(32);expect(prepared.pawns).toHaveLength(3);
  expect(patient.surgeryRequest).toBeUndefined();expect(patient.health!.missing).toEqual([]);expect(patient.health!.anesthetic).toBeUndefined();
  expect(patient.health!.infections!.cases.map(c=>c.part)).toEqual(['left-arm']);expect(medicineCount(prepared)).toBe(3);
  expect(control.health!.missing).toEqual([{part:'right-leg',bornAt:prepared.tick-1000,tended:true}]);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  const stages:Record<string,{tick:number;pipelines:number;frame:Frame}>={},closeups:Record<string,{id:number;radius:number}[]>={};
  try{
    await page.addInitScript(()=>{
      const probe:Probe={pipelines:0,compiled:[],frames:[]};Object.assign(window,{surgeryProbe:probe});
      for(const name of ['createRenderPipeline','createRenderPipelineAsync'] as const){
        const original=GPUDevice.prototype[name];(GPUDevice.prototype[name] as unknown)=function(this:GPUDevice,...args:unknown[]){
          probe.pipelines++;probe.compiled.push({name,label:(args[0] as GPURenderPipelineDescriptor).label});return (original as Function).apply(this,args);
        };
      }
    });
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:frameProbe+await response.text()});});
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.getByRole('button',{name:'Colonies de test'}).click();
    expect(TEST_COLONY_COUNT).toBeGreaterThanOrEqual(42);await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);
    await front.locator(`input[name="test-colony"][value="${SURGERY_DEMO_ID}"]`).check();await front.getByRole('button',{name:'Charger cette colonie'}).click();
    await expectWorld(page,prepared);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const capture=async(name:string,w:World)=>{const rendered=await frame(page,w.tick);stages[name]={tick:w.tick,pipelines:await page.evaluate(()=>(window as unknown as {surgeryProbe:Probe}).surgeryProbe.pipelines),frame:rendered};};
    await capture('prepared',prepared);
    const resident=stages.prepared!.frame;expect(resident.instances).toBe(3);
    expect(Math.floor(resident.shapes.find(s=>s.id===control.id)!.word/100)).toBe(8);
    await page.locator(`[data-pawn="${patient.id}"]`).click();await pawnTab(page,'health');await page.locator('[data-health-tab="operations"]').click();
    const health=page.locator('[data-colonist-panel="health"]');
    await expect(health.locator('[data-surgery-part="left-arm"]')).toBeEnabled();
    for(const part of ['right-arm','left-leg','right-leg'])await expect(health.locator(`[data-surgery-part="${part}"]`)).toBeDisabled();
    await health.locator('[data-surgery-part="left-arm"]').click();
    await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===patient.id)?.surgeryRequest?.part).toBe('left-arm');
    await expect(health.locator('[data-health="surgery-request"]')).toContainText('bras gauche');
    // First prove that cancellation is a command, without manufacturing a result.
    await health.locator('[data-surgery-cancel]').click();await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===patient.id)?.surgeryRequest).toBeUndefined();
    expect((await world(page)).pawns.find(p=>p.id===patient.id)!.health!.missing).toEqual([]);
    await health.locator('[data-surgery-part="left-arm"]').click();await page.keyboard.press('Escape');
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{const p=window.__lisiere.world.pawns.find(p=>p.id===id);if(!p?.surgeryRequest||p.need?.kind!=='sleep'||p.need.phase!=='travel'||!p.motion)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},patient.id,{polling:'raf'});
    await pause(page);const travelling=await world(page);expect(validateWorld(travelling)).toEqual([]);expect(medicineCount(travelling)).toBe(3);
    await saveResume(page,travelling);await capture('patientTravelReload',travelling);
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{const w=window.__lisiere.world,d=w.pawns.find(p=>p.id===id);if(d?.surgery?.phase!=='approach'||!d.surgery.medicine||!w.piles.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===id&&p.item==='medicine'))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},doctor.id,{polling:'raf'});
    await pause(page);const carried=await world(page);expect(validateWorld(carried)).toEqual([]);expect(medicineCount(carried)).toBe(3);
    expect(carried.pawns.find(p=>p.id===patient.id)!.health!.anesthetic).toBeUndefined();await saveResume(page,carried);await capture('medicineCarryReload',carried);
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{const d=window.__lisiere.world.pawns.find(p=>p.id===id);if(d?.surgery?.phase!=='work'||d.surgery.workCore<=0)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},doctor.id,{polling:'raf'});
    await pause(page);const working=await world(page),task=working.pawns.find(p=>p.id===doctor.id)!.surgery!,sedated=working.pawns.find(p=>p.id===patient.id)!;
    expect(validateWorld(working)).toEqual([]);expect(task.consumedMedicine).toBe('medicine');expect(task.medicine).toBeUndefined();expect(task.workCore).toBeGreaterThan(0);expect(task.progress).toBeGreaterThan(0);
    expect(medicineCount(working)).toBe(2);expect(sedated.health!.anesthetic).toBeDefined();expect(sedated.need?.kind).toBe('sleep');expect(sedated.health!.missing).toEqual([]);
    const bed=working.structures.find(s=>s.id===task.bedId)!,operator=working.pawns.find(p=>p.id===doctor.id)!;
    expect({x:sedated.x,z:sedated.z}).toEqual({x:bed.x,z:bed.z});expect(sedated.need?.phase).toBe('sleep');
    expect({x:operator.x,z:operator.z}).toEqual(task.spot);expect(Math.abs(operator.x-bed.x)+Math.abs(operator.z-bed.z)).toBe(1);
    await saveResume(page,working);await capture('workReload',working);
    await page.locator(`[data-pawn="${patient.id}"]`).click();await pawnTab(page,'health');await expect(health.locator('[data-health="anesthetic"]')).toContainText('sédation');await page.keyboard.press('Escape');
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{const p=window.__lisiere.world.pawns.find(p=>p.id===id);if(!p?.health?.missing.some(m=>m.part==='left-arm'))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},patient.id,{polling:'raf',timeout:60_000});
    await pause(page);const amputated=await world(page),result=amputated.pawns.find(p=>p.id===patient.id)!;
    expect(validateWorld(amputated)).toEqual([]);expect(result.surgeryRequest).toBeUndefined();expect(result.health!.missing.find(m=>m.part==='left-arm')!.tended).not.toBe(true);expect(result.health!.infections!.cases.some(c=>c.part==='left-arm')).toBe(false);expect(medicineCount(amputated)).toBe(2);
    await capture('amputated',amputated);expect(Math.floor(stages.amputated!.frame.shapes.find(s=>s.id===patient.id)!.word/100)).toBe(1);
    await saveResume(page,amputated);await capture('amputatedReload',amputated);
    await page.locator(`[data-pawn="${patient.id}"]`).click();await pawnTab(page,'health');await expect(health).toContainText('Partie perdue');await page.keyboard.press('Escape');
    const visibleActors=[result,amputated.pawns.find(p=>p.id===control.id)!];
    closeups.iso=await anatomyCloseup(page,visibleActors);await page.screenshot({path:testOutputPath('artifacts/surgery-v192-arm-leg-iso.png')});
    await page.locator('#camera-mode').click();await page.keyboard.press('Escape');closeups.perspective=await anatomyCloseup(page,visibleActors);
    await page.screenshot({path:testOutputPath('artifacts/surgery-v192-arm-leg-perspective.png')});await capture('perspective',amputated);
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(id=>{const p=window.__lisiere.world.pawns.find(p=>p.id===id);if(!p?.health?.missing.some(m=>m.part==='left-arm'&&m.tended))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},patient.id,{polling:'raf',timeout:30_000});
    await pause(page);const treated=await world(page);expect(validateWorld(treated)).toEqual([]);expect(medicineCount(treated)).toBe(1);
    expect(treated.pawns.find(p=>p.id===patient.id)!.health!.anesthetic).toBeDefined();await saveResume(page,treated);await capture('postoperativeReload',treated);
    const probe=await page.evaluate(()=>(window as unknown as {surgeryProbe:Probe}).surgeryProbe);
    await writeTestFile('artifacts/surgery-v192-native.json',JSON.stringify({prepared:true,catalogueEntries:TEST_COLONY_COUNT,protocol:'Actual public catalogue and save, native Chromium WebGPU, real Health commands and worker transitions; preexisting leg control is explicitly prepared. Real wheel zoom and projected actor radius >=40 pixels for both anatomy close-ups. No GPU timing or general performance claim.',browser:browser.version(),stages,closeups,probe,errors},null,2));
    for(const stage of Object.values(stages)){expect(stage.pipelines).toBe(stages.prepared!.pipelines);expect(stage.frame.instances).toBe(3);expect(stage.frame.geometry).toBe(resident.geometry);}
    expect(errors).toEqual([]);
  }finally{await browser.close();}
});
