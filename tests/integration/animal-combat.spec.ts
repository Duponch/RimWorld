import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { animalCombatCamp } from '../scenarios/animal-combat';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { observeErrors,panel,saveKey,world,expectWorld,pause } from './helpers';
import { perform } from './player-actions';

const probe=`window.__animalFrames=[];
const animalFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const result=animalFrame.call(this,now);if(this.preparing||!this.world)return result;
const layer=this.wildlife,g=layer.mesh.geometry,f=g.getAttribute('aFrom'),t=g.getAttribute('aTo'),travel=g.getAttribute('aTravel'),s=g.getAttribute('aAnimal');
const samples=(this.world.wildlife?.animals??[]).map((a,i)=>{const span=travel.getY(i)-travel.getX(i),alpha=span>0?Math.max(0,Math.min(1,(layer.travelTime.value-travel.getX(i))/span)):1;return {id:a.id,x:f.getX(i)+(t.getX(i)-f.getX(i))*alpha,z:f.getZ(i)+(t.getZ(i)-f.getZ(i))*alpha,state:a.state,fallen:s.getZ(i),walk:s.getX(i),health:!!a.health,stagger:!!a.stagger,attack:s.getY(i),yaw:f.getW(i),strike:!!a.strike};});
window.__animalFrames.push({now,clock:this.timeline.tick,samples,calls:this.stats.drawCalls});return result;};`;

test('native fauna targeting, real injury/flight, continuous GPU travel and save at 1×/6×',async({playwright})=>{
  test.setTimeout(120000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page),initial=animalCombatCamp(),reports=[];initial.rng=300001;
  try {
    await page.addInitScript(()=>{(window as any).__animalPipelines=0;for(const key of ['createRenderPipeline','createRenderPipelineAsync'] as const){const fn=GPUDevice.prototype[key];(GPUDevice.prototype as any)[key]=function(...args:any[]){(window as any).__animalPipelines++;return (fn as any).apply(this,args);};}});
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    for(const speed of [1,6]){
      await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
      await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
      const a=initial.wildlife!.animals[0]!,p=initial.pawns[0]!;
      await perform(page,{reason:'Tir dirigé sur un lièvre par la liste Faune.',command:{type:'shoot',pawnIds:[p.id],targetId:a.id}},{value:0});
      await expect.poll(async()=>(await world(page)).pawns[0]!.shooting?.stance?.phase).toBe('aim');
      const aim=await world(page);expect(validateWorld(aim)).toEqual([]);
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,aim);
      await panel(page,'wildlife');await page.locator(`[data-animal="${a.id}"] button`).first().click();
      const pipelines=await page.evaluate(()=>{(window as any).__animalFrames=[];return (window as any).__animalPipelines;});
      await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>!!(await world(page)).wildlife!.animals[0]!.health,{timeout:40000}).toBe(true);
      await pause(page);const injured=await world(page);expect(validateWorld(injured)).toEqual([]);
      await expect(page.locator(`[data-animal-health="${a.id}"]`)).toContainText(/PV|perdu/);
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,injured);
      await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>(await world(page)).tick,{timeout:15000}).toBeGreaterThan(injured.tick+65);
      await pause(page);const after=await world(page);expect(validateWorld(after)).toEqual([]);
      const frames=await page.evaluate(()=>(window as any).__animalFrames as {clock:number;samples:{x:number;z:number;health:boolean;fallen:number;state:string;walk:number}[]}[]);
      let maxJump=0,intervals=0,moved=0;
      for(let i=1;i<frames.length;i++){
        const before=frames[i-1]!,f=frames[i]!,dt=f.clock-before.clock;
        if(dt<=0||dt>2)continue;const a=before.samples[0]!,b=f.samples[0]!;const distance=Math.hypot(a.x-b.x,a.z-b.z);
        moved+=distance;maxJump=Math.max(maxJump,distance);expect(distance).toBeLessThanOrEqual(dt*1.01+.02);intervals++;
      }
      expect(intervals).toBeGreaterThan(10);expect(moved).toBeGreaterThan(.5);expect(frames.some(f=>f.samples.some(a=>a.health))).toBe(true);
      for(const f of frames)for(const a of f.samples)if(a.state==='dead'||a.state==='downed'){expect(a.fallen).toBeGreaterThanOrEqual(1);expect(a.walk).toBe(0);}
      expect(await page.evaluate(()=>(window as any).__animalPipelines)-pipelines).toBe(0);
      await panel(page,'wildlife');await page.screenshot({path:`artifacts/animal-combat-${speed}x-${process.env.VALIDATION_VERSION??'v77'}.png`});
      reports.push({speed,injuredAt:injured.tick,ended:after.tick,state:after.wildlife!.animals[0]!.state,frames:frames.length,intervals,maxJump,moved});
    }
    expect(errors).toEqual([]);writeFileSync(`artifacts/animal-combat-ui-${process.env.VALIDATION_VERSION??'v77'}.json`,JSON.stringify({date:new Date().toISOString(),reports,errors},null,2));
  } finally {await browser.close();}
});


test('native animal melee command, visible retaliation, colonist injury and strict save at 1x/6x',async({playwright})=>{
  test.setTimeout(120000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page),initial=animalCombatCamp(),reports=[];
  initial.rng=97123;initial.pawns[0]!.x=9;
  try {
    await page.addInitScript(()=>{(window as any).__animalPipelines=0;for(const key of ['createRenderPipeline','createRenderPipelineAsync'] as const){const fn=GPUDevice.prototype[key];(GPUDevice.prototype as any)[key]=function(...args:any[]){(window as any).__animalPipelines++;return (fn as any).apply(this,args);};}});
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    for(const speed of [1,6]){
      await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
      await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
      const a=initial.wildlife!.animals[0]!,p=initial.pawns[0]!;
      await perform(page,{reason:'Le joueur engage un lièvre au contact.',command:{type:'melee',pawnIds:[p.id],targetId:a.id}},{value:0});
      await expect.poll(async()=>(await world(page)).pawns[0]!.melee?.order?.targetId).toBe(a.id);
      const ordered=await world(page);expect(validateWorld(ordered)).toEqual([]);
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,ordered);
      await panel(page,'wildlife');await page.locator(`[data-animal="${a.id}"] button`).first().click();
      const pipelines=await page.evaluate(()=>{(window as any).__animalFrames=[];return (window as any).__animalPipelines;});
      await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>!!(await world(page)).pawns[0]!.health?.injuries.some(i=>i.kind==='bite'),{timeout:15000,intervals:[50]}).toBe(true);
      await pause(page);const injured=await world(page);expect(validateWorld(injured)).toEqual([]);
      await expect(page.locator(`[data-animal-health="${a.id}"]`)).toContainText(/PV|perdu/);
      await page.screenshot({path:`artifacts/animal-melee-${speed}x-v78.png`});
      const frames=await page.evaluate(()=>(window as any).__animalFrames as {samples:{attack:number;yaw:number;strike:boolean}[]}[]);
      expect(frames.some(f=>f.samples.some(a=>a.attack===2&&a.strike))).toBe(true);
      expect(frames.flatMap(f=>f.samples).every(a=>Number.isFinite(a.yaw))).toBe(true);
      expect(await page.evaluate(()=>(window as any).__animalPipelines)-pipelines).toBe(0);
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,injured);
      reports.push({speed,tick:injured.tick,animalState:injured.wildlife!.animals[0]!.state,colonistInjuries:injured.pawns[0]!.health!.injuries,frames:frames.length});
    }
    expect(errors).toEqual([]);writeFileSync('artifacts/animal-melee-ui-v78.json',JSON.stringify({date:new Date().toISOString(),reports,errors},null,2));
  } finally {await browser.close();}
});
