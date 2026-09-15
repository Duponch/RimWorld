import { furnitureTrafficFixture } from '../scenarios/furniture-traffic';
import { expect, test } from '@playwright/test';
import { createWorld, serializeWorld, deserializeWorld, refreshStock, applyCommand, validateWorld } from '../../src/sim/index';
import { observeErrors, panel, saveKey, world, expectWorld } from './helpers';
import { civilCrossingFixture } from '../scenarios/civil-traffic';

test('civil crossing in the real worker: shared cell, save/reload, three exclusive beds',async({playwright},testInfo)=>{
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const fixture=civilCrossingFixture(),old=JSON.parse(serializeWorld(fixture));old.schemaVersion=13;for(const a of old.pawns)delete a.priorities.mine;delete old.deconstructed;delete old.packed;for(const pawn of old.pawns){delete pawn.orders;delete pawn.recreation;}
    const migrated=deserializeWorld(JSON.stringify(old));expect(migrated).toEqual(fixture);
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:JSON.stringify(old)});
    await page.goto('/?size=16&e2e');await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();
    await expectWorld(page,migrated);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(()=>{
      const w=window.__lisiere.world;
      if(new Set(w.pawns.map(p=>p.z*w.width+p.x)).size===w.pawns.length)return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },undefined,{timeout:12000,polling:'raf'});
    await expect(page.locator('#pause-banner')).toBeVisible();
    const crossing=await world(page);expect(validateWorld(crossing)).toEqual([]);
    expect(new Set(crossing.pawns.map(p=>p.z*crossing.width+p.x)).size).toBeLessThan(3);
    expect(crossing.pawns[2]).toMatchObject({x:8,z:8,state:'sleeping'});
    await panel(page,'menu');await page.locator('#save').click();
    await expect.poll(async()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).tick,saveKey)).toBe(crossing.tick);
    await page.locator('#load').click();await expectWorld(page,crossing);
    await page.keyboard.press('Escape');await page.screenshot({path:'artifacts/civil-crossing-paused.png'});
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>window.__lisiere.world.pawns.every(p=>p.state==='sleeping'),undefined,{timeout:10000});
    await page.locator('[data-speed="0"]').click();const final=await world(page);
    expect(final.pawns.map(p=>[p.x,p.z])).toEqual([[14,8],[1,8],[8,8]]);expect(validateWorld(final)).toEqual([]);
    expect(new Set(final.pawns.map(p=>p.bedId)).size).toBe(3);expect(errors).toEqual([]);
    await testInfo.attach('civil-crossing',{contentType:'application/json',body:JSON.stringify({sharedTick:crossing.tick,finalTick:final.tick,positions:final.pawns.map(p=>({id:p.id,x:p.x,z:p.z,bedId:p.bedId})),errors})});
  } finally {await browser.close();}
});

test('GPU travel preserves speed, corners and work-facing through real worker snapshots',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  const fixture=createWorld(42,32,32);fixture.tiles=fixture.tiles.map(()=>({terrain:'grass'}));fixture.resources=[];fixture.piles=[];fixture.pawns=fixture.pawns.slice(0,1);
  Object.assign(fixture.pawns[0]!,{x:10,z:10,hunger:100,rest:100});
  for(const [x,z] of [[16,10],[16,16],[10,16],[7,10]]) {fixture.resources.push({id:fixture.nextId++,kind:'tree',x:x!,z:z!,amount:12});applyCommand(fixture,{type:'designate',kind:'chop',x:x!,z:z!});}
  for(let z=9;z<15;z++)fixture.tiles[z*32+13]={terrain:'rock'};
  refreshStock(fixture);
  const probe=`window.__travel={frames:[],working:[],active:false,view:null};const originalTravelFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const result=originalTravelFrame.call(this,now),b=window.__travel;b.view=this;if(!b.active||!this.world)return result;const g=this.pawns.pawnMesh.geometry,a=g.getAttribute('aFrom'),z=g.getAttribute('aTo'),m=g.getAttribute('aMotion'),t=g.getAttribute('aTravel');const start=t.getX(0),end=t.getY(0),clock=this.pawns.travelTime.value,blend=end-start>0?Math.max(0,Math.min(1,(clock-start)/(end-start))):this.pawns.blend.value;const x=a.getX(0)+(z.getX(0)-a.getX(0))*blend,y=a.getZ(0)+(z.getZ(0)-a.getZ(0))*blend,yaw=a.getW(0)+(z.getW(0)-a.getW(0))*blend;b.frames.push({now,clock,start,end,x,z:y,yaw,dx:z.getX(0)-a.getX(0),dz:z.getZ(0)-a.getZ(0),walking:m.getX(0)});const p=this.world.pawns[0],job=this.world.jobs.find(j=>j.id===p.jobId);if(m.getY(0)>0&&job)b.working.push({id:job.id,error:Math.abs(Math.atan2(Math.sin(yaw-Math.atan2(job.x-x,job.z-y)),Math.cos(yaw-Math.atan2(job.x-x,job.z-y))))});return result;};\n`;
  try {
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(fixture)});
    await page.goto('/?size=32&e2e');await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();
    await page.evaluate(()=>{(window as any).__travel.active=true;});
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>window.__lisiere.world.jobs.length===0,undefined,{timeout:45000,polling:100});
    await page.locator('[data-speed="0"]').click();
    const result=await page.evaluate(()=>{const b=(window as any).__travel;b.active=false;return {frames:b.frames,working:b.working};});
    let samples=0,maxSpeedError=0,maxFacingError=0;const turns=new Set<number>();let worstSample:unknown;
    for(let i=1;i<result.frames.length;i++) {
      const a=result.frames[i-1],b=result.frames[i],dt=(b.now-a.now)/1000;
      if(a.start!==b.start||!a.walking||!b.walking||dt<=0||dt>0.05||b.clock>=b.end||a.clock<=a.start)continue;
      samples++;turns.add(Math.round(b.yaw*100));
      const speedError=Math.abs(Math.hypot(b.x-a.x,b.z-a.z)/dt-20);
      if(speedError>maxSpeedError){maxSpeedError=speedError;worstSample={a,b,dt};}
      maxFacingError=Math.max(maxFacingError,Math.abs(Math.atan2(Math.sin(b.yaw-Math.atan2(b.dx,b.dz)),Math.cos(b.yaw-Math.atan2(b.dx,b.dz)))));
    }
    const summary={worstSample,samples,turns:turns.size,maxSpeedError,maxFacingError,workTargets:new Set(result.working.map((w:any)=>w.id)).size,maxWorkFacingError:Math.max(...result.working.map((w:any)=>w.error)),errors};
    await testInfo.attach('movement-contract',{body:JSON.stringify(summary,null,2),contentType:'application/json'});
    expect(summary.samples).toBeGreaterThan(100);expect(summary.turns).toBeGreaterThan(2);
    expect(summary.maxSpeedError).toBeLessThan(.01);expect(summary.maxFacingError).toBeLessThan(.00001);
    expect(summary.workTargets).toBe(4);expect(summary.maxWorkFacingError).toBeLessThan(.00001);expect(errors).toEqual([]);
    await page.screenshot({path:'artifacts/movement-work-facing.png'});
  } finally {await browser.close();}
});


test('loaded furniture crossing shares GPU heights, preserves speed within each edge and resumes through the real worker',async({playwright},testInfo)=>{
  test.setTimeout(60000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  const fixture=furnitureTrafficFixture();
  // Observe the attributes actually submitted to native WebGPU. This is not a vertex readback.
  const probe=`window.__furniture={frames:[],active:false};const originalFurnitureFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const result=originalFurnitureFrame.call(this,now),b=window.__furniture;if(!b.active||!this.world)return result;const p=this.pawns,g=p.pawnMesh.geometry,a=g.getAttribute('aFrom'),z=g.getAttribute('aTo'),t=g.getAttribute('aTravel'),c=g.getAttribute('aCargo');b.shared=['aFrom','aTo','aTravel'].every(k=>g.getAttribute(k)===p.cargoMesh.geometry.getAttribute(k)&&g.getAttribute(k)===p.selectionMesh.geometry.getAttribute(k));for(let i=0;i<this.world.pawns.length;i++){const start=t.getX(i),end=t.getY(i),clock=p.travelTime.value,alpha=Math.max(0,Math.min(1,(clock-start)/(end-start)));if(end<=start||alpha<=0||alpha>=1)continue;b.frames.push({id:this.world.pawns[i].id,now,start,end,clock,alpha,x:a.getX(i)+(z.getX(i)-a.getX(i))*alpha,z:a.getZ(i)+(z.getZ(i)-a.getZ(i))*alpha,fromY:a.getY(i),toY:z.getY(i),load:c.getX(i),dx:z.getX(i)-a.getX(i),dz:z.getZ(i)-a.getZ(i)});}return result;};\n`;
  try {
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(fixture)});
    await page.goto('/?size=16&e2e');await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await page.keyboard.press('Escape');
    await page.locator(`[data-pawn="${fixture.pawns[0]!.id}"]`).click();
    await page.evaluate(()=>{(window as any).__furniture.active=true;});await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(()=>{
      const w=window.__lisiere.world;
      if(!w.pawns.some(p=>p.haul?.phase==='deliver'&&p.motion&&p.x===7&&p.motion.end>w.tick))return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },undefined,{timeout:22000,polling:'raf'});
    await expect(page.locator('#pause-banner')).toBeVisible();const crossing=await world(page);expect(validateWorld(crossing)).toEqual([]);
    expect(crossing.pawns.some(p=>p.haul?.phase==='deliver'&&[7,8].includes(p.x))).toBe(true);
    await page.screenshot({path:'artifacts/furniture-crossing-paused.png'});
    await panel(page,'menu');await page.locator('#save').click();await expect.poll(async()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).tick,saveKey)).toBe(crossing.tick);
    await page.locator('#load').click();await expectWorld(page,crossing);await page.keyboard.press('Escape');
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(()=>window.__lisiere.world.pawns.every(p=>!p.haul),undefined,{timeout:14000});
    await page.locator('[data-speed="0"]').click();const final=await world(page);
    const report=await page.evaluate(()=>{const b=(window as any).__furniture;b.active=false;return {frames:b.frames,shared:b.shared};});
    let samples=0,maxSpeedError=0;const previous=new Map<number,any>();
    for(const b of report.frames){const a=previous.get(b.id);previous.set(b.id,b);if(!a||a.start!==b.start||b.clock<=a.clock)continue;const dt=(b.now-a.now)/1000;if(dt<=0||dt>.05)continue;
      const expected=Math.hypot(b.dx,b.dz)/(b.end-b.start);maxSpeedError=Math.max(maxSpeedError,Math.abs(Math.hypot(b.x-a.x,b.z-a.z)/dt-expected));samples++;
    }
    const elevated=report.frames.filter((f:any)=>f.load&&f.fromY>.7&&f.toY>.7);
    const climbs=report.frames.filter((f:any)=>f.load&&f.fromY===0&&f.toY>.7);
    const summary={samples,maxSpeedError,shared:report.shared,loadedPlateauFrames:elevated.length,loadedClimbFrames:climbs.length,crossingTick:crossing.tick,finalTick:final.tick,errors};
    await testInfo.attach('furniture-gpu-contract',{contentType:'application/json',body:JSON.stringify(summary)});
    expect(samples).toBeGreaterThan(100);expect(maxSpeedError).toBeLessThan(.01);expect(report.shared).toBe(true);
    expect(elevated.length).toBeGreaterThan(5);expect(climbs.length).toBeGreaterThan(5);
    expect(final.piles.find(p=>p.item==='wood')?.owner).toEqual({type:'ground',x:2,z:8});expect(final.piles.find(p=>p.item==='rice')?.owner).toEqual({type:'ground',x:13,z:8});expect(validateWorld(final)).toEqual([]);expect(errors).toEqual([]);
  } finally {await browser.close();}
});
