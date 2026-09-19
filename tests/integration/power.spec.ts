import { expect,test } from '@playwright/test';
import { powerFixture } from '../scenarios/power';
import { serializeWorld,validateWorld } from '../../src/sim/index';
import { WorkEnvironmentCache } from '../../src/sim/work-environment';
import { woodAccount } from '../scenarios/colony-player';
import { world,observeErrors,panel,tool,cell,expectWorld,saveKey } from './helpers';
import { writeFileSync } from 'node:fs';

test('electricity: build and fuel through UI, visible lamp, lost supply and exact reload on native WebGPU',async({playwright})=>{
  test.setTimeout(75000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  page.setDefaultTimeout(15000);
  try {
    await page.addInitScript(()=>{
      const p={pipelines:0};Object.assign(window,{powerProbe:p});
      for(const name of ['createRenderPipeline','createRenderPipelineAsync'] as const){const original=GPUDevice.prototype[name];(GPUDevice.prototype[name] as unknown)=function(this:GPUDevice,...args:unknown[]){p.pipelines++;return (original as Function).apply(this,args);};}
    });
    const initial=powerFixture();initial.tick=0;initial.pawns[0]!.schedule.fill('anything');
    initial.structures.push({id:initial.nextId++,kind:'wall',material:'wood',x:21,z:16,orientation:0,footprint:'standard'});
    initial.roofing={cursor:0,constructed:[15*32+20,16*32+20,17*32+20],build:[],remove:[]};
    const total=woodAccount(initial);expect(validateWorld(initial)).toEqual([]);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
    const start=await page.evaluate(()=>(window as any).powerProbe.pipelines as number);
    await tool(page,'table');await page.keyboard.press('e');await tool(page,'wood-generator');await cell(page,16,16);
    expect((await world(page)).jobs[0]).toMatchObject({kind:'wood-generator',orientation:0,material:'steel'});
    await tool(page,'standing-lamp');await cell(page,20,16);await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.some(s=>s.kind==='standing-lamp'&&s.power?.on),{timeout:20000}).toBe(true);
    await page.locator('[data-speed="0"]').click();await tool(page,'select');await cell(page,20,16);
    await expect(page.locator('#cell-description')).toContainText('Allumée');await expect(page.locator('#cell-description')).toContainText('30 W');
    const lit=await world(page),env=new WorkEnvironmentCache();expect(env.read(lit).lightAt({x:20,z:16})).toBe(.5);
    expect(woodAccount(lit)).toBe(total);expect(validateWorld(lit)).toEqual([]);
    expect(lit.piles.some(p=>p.item==='steel'||p.item==='component')).toBe(false);
    await expect(page.locator('#fps-counter')).toBeVisible();await page.screenshot({path:'artifacts/power-lit.png'});
    const built=await page.evaluate(()=>(window as any).powerProbe.pipelines as number);expect(built).toBe(start);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,lit);
    const restoredPipelines=await page.evaluate(()=>(window as any).powerProbe.pipelines as number);
    await tool(page,'select');await cell(page,16,16);await expect(page.locator('#fire-fuel')).toContainText('22 bois/jour');
    await page.locator('#cell-deconstruct').click();await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.some(s=>s.kind==='wood-generator')).toBe(false);
    await page.locator('[data-speed="0"]').click();await tool(page,'select');await cell(page,20,16);
    await expect(page.locator('#cell-description')).toContainText('Non raccordée');
    const final=await world(page);expect(env.read(final).lightAt({x:20,z:16})).toBeLessThan(.3);
    expect(woodAccount(final)).toBe(total);expect(validateWorld(final)).toEqual([]);
    await page.screenshot({path:'artifacts/power-dark.png'});
    const end=await page.evaluate(()=>(window as any).powerProbe.pipelines as number);expect(end).toBe(restoredPipelines);expect(errors).toEqual([]);
    writeFileSync('artifacts/power-ui-v42.json',JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',viewport:'1440x1000',size:32,pawns:1,newPipelines:{construction:built-start,loss:end-restoredPipelines},litTick:lit.tick,finalTick:final.tick,light:{on:.5,off:env.read(final).lightAt({x:20,z:16})},deconstructed:final.deconstructed,errors},null,2)+'\n');
  }finally{await browser.close();}
});
