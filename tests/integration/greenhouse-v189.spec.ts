import { readFileSync } from 'node:fs';
import { expect,test } from '@playwright/test';
import { GREENHOUSE_LAMP_CELL,GREENHOUSE_CROP_CELLS } from '../../scripts/generate-greenhouse-demo-v189.ts';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization.ts';
import { plantGrowth } from '../../src/sim/plants.ts';
import type { World } from '../../src/sim/types.ts';
import { cell,expectWorld,observeErrors,panel,pause,tool,world } from './helpers.ts';
import { revealCells } from './player-actions.ts';
import { TEST_COLONY_COUNT } from '../test-colony-count.ts';
import { testOutputPath,writeTestFile } from '../test-output.ts';

test('V189 public greenhouse builds and powers a lamp, physically switches it, resumes a carried save, and harvests covered rice in native WebGPU',async({playwright})=>{
  test.setTimeout(150_000);
  const prepared=deserializeWorld(readFileSync('public/test-saves/v189/serre-electrique.json','utf8'));
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.addInitScript(()=>{
      const probe={pipelines:0,compiled:[] as unknown[]};const shaderCode=new WeakMap<GPUShaderModule,string>();const shaderOriginal=GPUDevice.prototype.createShaderModule;GPUDevice.prototype.createShaderModule=function(descriptor:GPUShaderModuleDescriptor){const module=shaderOriginal.call(this,descriptor);shaderCode.set(module,descriptor.code);return module;};Object.assign(window,{greenhouseProbe:probe});
      for(const name of ['createRenderPipeline','createRenderPipelineAsync'] as const){const original=GPUDevice.prototype[name];(GPUDevice.prototype[name] as unknown)=function(this:GPUDevice,...args:unknown[]){probe.pipelines++;const d=args[0] as GPURenderPipelineDescriptor;probe.compiled.push(JSON.parse(JSON.stringify({name,descriptor:{...d,vertex:{...d.vertex,code:shaderCode.get(d.vertex.module)},fragment:d.fragment?{...d.fragment,code:shaderCode.get(d.fragment.module)}:undefined}})));return (original as Function).apply(this,args);};}
    });
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.getByRole('button',{name:'Colonies de test'}).click();
    await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);
    await front.locator('input[name="test-colony"][value="serre-electrique-v189"]').check();await front.getByRole('button',{name:'Charger cette colonie'}).click();
    await expectWorld(page,prepared);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    await tool(page,'sun-lamp');await expect(page.locator('[data-tool="sun-lamp"]')).toHaveAttribute('aria-pressed','true');
    await tool(page,'select');await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>window.__lisiere.world.piles.some(p=>p.item==='steel'&&p.owner.type==='pawn'),undefined,{polling:'raf'});
    await pause(page);const carried=await world(page);expect(validateWorld(carried)).toEqual([]);
    expect(carried.structures.some(s=>s.kind==='sun-lamp')).toBe(false);expect(carried.piles.reduce((n,p)=>n+(p.item==='steel'?p.quantity:0),0)).toBe(40);
    await panel(page,'menu');await page.locator('#save').click();await expect(page.locator('#notice')).toContainText('Colonie sauvegardée');
    await page.locator('#load').click();await expect(page.locator('#notice')).toContainText('Sauvegarde rechargée');await expectWorld(page,carried);await page.keyboard.press('Escape');
    const stagePipelines:Record<string,number>={};
    const pipelinesBefore=await page.evaluate(()=>(window as unknown as {greenhouseProbe:{pipelines:number}}).greenhouseProbe.pipelines);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).structures.some(s=>s.kind==='sun-lamp'&&s.power?.on),{timeout:45_000}).toBe(true);
    await pause(page);stagePipelines.lit=await page.evaluate(()=>(window as unknown as {greenhouseProbe:{pipelines:number}}).greenhouseProbe.pipelines);const lit=await world(page),lamp=lit.structures.find(s=>s.kind==='sun-lamp')!;
    expect(validateWorld(lit)).toEqual([]);expect(lamp.power!.parentId).not.toBeNull();expect(lit.piles.some(p=>p.item==='steel')).toBe(false);
    expect(lit.resources.every(p=>p.growthLight==='artificial-full')).toBe(true);
    await revealCells(page,[GREENHOUSE_LAMP_CELL]);await cell(page,GREENHOUSE_LAMP_CELL.x,GREENHOUSE_LAMP_CELL.z);
    stagePipelines.preview=await page.evaluate(()=>(window as unknown as {greenhouseProbe:{pipelines:number}}).greenhouseProbe.pipelines);const card=page.locator(`[data-power-id="${lamp.id}"]`);await expect(card).toContainText('2 900 W');await expect(card).toContainText('Allumée');await expect(card).toContainText('couverture prévue');
    await page.screenshot({path:testOutputPath('artifacts/greenhouse-v189-powered-iso.png')});
    await card.locator('[data-power-flick]').click();await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===lamp.id)?.power?.switchOn).toBe(false);
    await pause(page);const off=await world(page),held=off.resources.map(p=>({id:p.id,growth:plantGrowth(off,p)}));expect(off.resources.every(p=>p.growthLight==='dark')).toBe(true);
    await expect(card).toContainText('Arrêt manuel');await card.locator('[data-power-flick]').click();await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>{const w=await world(page);return w.structures.find(s=>s.id===lamp.id)?.power?.on;}).toBe(true);
    await pause(page);const resumed=await world(page);for(const p of resumed.resources){const previous=held.find(r=>r.id===p.id);if(previous)expect(plantGrowth(resumed,p)).toBeGreaterThanOrEqual(previous.growth);}
    stagePipelines.switched=await page.evaluate(()=>(window as unknown as {greenhouseProbe:{pipelines:number}}).greenhouseProbe.pipelines);await page.locator('#camera-mode').click();await page.keyboard.press('Escape');await revealCells(page,[GREENHOUSE_LAMP_CELL]);
    await page.screenshot({path:testOutputPath('artifacts/greenhouse-v189-powered-perspective.png')});
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).piles.filter(p=>p.item==='rice').reduce((n,p)=>n+p.quantity,0),{timeout:45_000}).toBe(18);
    await pause(page);const final=await world(page);expect(final.resources).toHaveLength(0);expect(validateWorld(final)).toEqual([]);
    expect(final.structures.filter(s=>s.kind==='sun-lamp')).toHaveLength(1);expect(final.piles.some(p=>p.item==='steel')).toBe(false);
    await revealCells(page,[...GREENHOUSE_CROP_CELLS]);await page.screenshot({path:testOutputPath('artifacts/greenhouse-v189-harvested.png')});
    stagePipelines.final=await page.evaluate(()=>(window as unknown as {greenhouseProbe:{pipelines:number}}).greenhouseProbe.pipelines);const pipelinesAfter=await page.evaluate(()=>(window as unknown as {greenhouseProbe:{pipelines:number}}).greenhouseProbe.pipelines);
    await writeTestFile('artifacts/greenhouse-v189-pipelines.json',JSON.stringify({before:pipelinesBefore,stages:stagePipelines,probe:await page.evaluate(()=>(window as unknown as {greenhouseProbe:unknown}).greenhouseProbe)},null,2));
    expect(pipelinesAfter).toBe(pipelinesBefore);expect(errors).toEqual([]);
    await writeTestFile('artifacts/greenhouse-v189-browser.json',JSON.stringify({prepared:true,backend:'native WebGPU',carriedTick:carried.tick,litTick:lit.tick,offTick:off.tick,resumedTick:resumed.tick,finalTick:final.tick,
      lampId:lamp.id,coverage:lit.resources.map(p=>({id:p.id,cell:{x:p.x,z:p.z},mode:p.growthLight,growth:plantGrowth(lit,p)})),rice:18,newPipelines:pipelinesAfter-pipelinesBefore,errors},null,2));
  }finally{await browser.close();}
});
