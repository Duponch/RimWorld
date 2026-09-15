import { expect,test } from '@playwright/test';
import { passiveCoolingFixture } from '../scenarios/passive-cooling';
import { stepWorld,serializeWorld,validateWorld } from '../../src/sim/index';
import { rotAge } from '../../src/sim/food-preservation';
import { woodAccount } from '../scenarios/colony-player';
import { world,observeErrors,panel,tool,cell,expectWorld,saveKey } from './helpers';
import { perform } from './player-actions';
import { writeFileSync } from 'node:fs';

test('passive cooling: visible construction, temperature, manual refill and exact reload',async({playwright})=>{
  test.setTimeout(75000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  page.setDefaultTimeout(10000);
  try {
    // Count real native pipelines after preparation; no shader work is hidden
    // behind the first construction or the empty → refueled transition.
    await page.addInitScript(()=>{
      const state={pipelines:0,logs:[] as unknown[],frames:[] as number[],last:0,record:false};Object.assign(window,{coolingProbe:state});
      for(const name of ['createRenderPipeline','createRenderPipelineAsync'] as const){const original=GPUDevice.prototype[name];(GPUDevice.prototype[name] as unknown) = function(this:GPUDevice,...args:unknown[]){state.pipelines++;state.logs.push({name,label:(args[0] as GPURenderPipelineDescriptor).label,tick:(window as any).__lisiere?.tick});return (original as Function).apply(this,args);};}
      function frame(now:number){if(state.record&&state.last)state.frames.push(now-state.last);state.last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);
    });
    const initial=passiveCoolingFixture(),total=woodAccount(initial);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const pipelineStart=await page.evaluate(()=>{const p=(window as any).coolingProbe;p.record=true;return p.pipelines as number;});
    // Rotate a preceding tool to detect leaked orientation on this fixed object.
    await tool(page,'table');await page.keyboard.press('e');await tool(page,'passive-cooler');
    const preview=await page.evaluate(()=>window.__lisiere.projectCell(16,16));const canvas=(await page.locator('#viewport canvas').boundingBox())!;
    await page.mouse.move(canvas.x+preview.x,canvas.y+preview.y);await expect(page.locator('#viewport canvas')).toHaveAttribute('title','');
    await cell(page,16,16);
    expect((await world(page)).jobs[0]).toMatchObject({kind:'passive-cooler',orientation:0,material:'wood'});
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.some(s=>s.kind==='passive-cooler')).toBe(true);
    await tool(page,'select');await cell(page,16,16);
    await expect(page.locator('#cell-title')).toHaveText('Refroidisseur passif');
    await expect(page.locator('#fire-fuel')).toContainText('/ 50 bois');await expect(page.locator('#add-cooking-bill')).toHaveCount(0);
    await expect(page.locator('#room-description')).toContainText('17.0 °C',{timeout:15000});
    await page.locator('[data-speed="0"]').click();const cooled=await world(page);
    expect(cooled.thermal!.regions[0]!.temperature).toBe(17);expect(woodAccount(cooled)).toBe(total);expect(validateWorld(cooled)).toEqual([]);
    const control=structuredClone(initial);stepWorld(control,cooled.tick-initial.tick);
    expect(control.thermal!.regions[0]!.temperature).toBeGreaterThan(22);
    const rice=cooled.piles.find(p=>p.item==='rice')!;expect(rotAge(rice,cooled.tick)).toBe(rotAge(control.piles.find(p=>p.id===rice.id)!,control.tick));
    await expect(page.locator('#fire-fuel')).toContainText('ne réfrigère pas');await expect(page.locator('#fps-counter')).toBeVisible();
    await page.screenshot({path:'artifacts/passive-cooler-cooled.png'});
    const constructionPipelines=await page.evaluate(()=>(window as any).coolingProbe.pipelines as number);expect(constructionPipelines).toBe(pipelineStart);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,cooled);
    // Independent boundary episode: initial empty reservoir, no auto refuel.
    const empty=structuredClone(cooled),cooler=empty.structures.find(s=>s.kind==='passive-cooler')!;
    empty.tick+=cooler.fuel!.ticks;cooler.fuel!.burned+=cooler.fuel!.ticks;cooler.fuel!.ticks=0;cooler.fuel!.autoRefuel=false;
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(empty)});
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,empty);
    const refillPipelineStart=await page.evaluate(()=>(window as any).coolingProbe.pipelines as number);
    await tool(page,'select');await cell(page,16,16);await expect(page.locator('#fire-fuel')).toContainText('Vide');
    await perform(page,{reason:'Ravitailler manuellement le refroidisseur vide.',command:{type:'order-haul',pawnId:empty.pawns[0]!.id,target:{type:'fuel',structureId:cooler.id},queue:false}},{value:0});
    await page.locator('[data-speed="1"]').click();
    await expect(page.locator('#selected-action')).toContainText('Ravitaille le bâtiment',{timeout:10000});
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===cooler.id)!.fuel!.ticks).toBeGreaterThan(0);
    await page.locator('[data-speed="0"]').click();await tool(page,'select');await cell(page,16,16);
    await expect(page.locator('#fire-fuel')).toContainText('Alimenté');await expect(page.locator('#fire-auto-refuel')).not.toBeChecked();
    const final=await world(page);expect(woodAccount(final)).toBe(total);expect(validateWorld(final)).toEqual([]);
    await page.screenshot({path:'artifacts/passive-cooler-refueled.png'});
    const report=await page.evaluate(()=>{const p=(window as any).coolingProbe;p.record=false;const frames=p.frames.sort((a:number,b:number)=>a-b);return {pipelines:p.pipelines,frames:frames.length,p95:frames[Math.ceil(frames.length*.95)-1],p99:frames[Math.ceil(frames.length*.99)-1],max:frames.at(-1)};});
    expect(report.pipelines).toBe(refillPipelineStart);expect(errors).toEqual([]);
    writeFileSync('artifacts/passive-cooler-ui-v40.json',JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',viewport:'1440x1000',size:32,pawns:1,constructionNewPipelines:constructionPipelines-pipelineStart,refillNewPipelines:report.pipelines-refillPipelineStart,frameMsIncludingLoads:report,initialTick:initial.tick,cooledTick:cooled.tick,cooledTemperature:17,finalFuel:final.structures.find(s=>s.id===cooler.id)!.fuel,errors},null,2)+'\n');
  } finally {await browser.close();}
});
