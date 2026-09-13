import { expect, test } from '@playwright/test';
import { createWorld, serializeWorld, refreshStock, applyCommand } from '../../src/sim/index';
import { observeErrors, panel, saveKey } from './helpers';

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
    let samples=0,maxSpeedError=0,maxFacingError=0;const turns=new Set<number>();
    for(let i=1;i<result.frames.length;i++) {
      const a=result.frames[i-1],b=result.frames[i],dt=(b.now-a.now)/1000;
      if(a.start!==b.start||!a.walking||!b.walking||dt<=0||dt>0.05||b.clock>=b.end||a.clock<=a.start)continue;
      samples++;turns.add(Math.round(b.yaw*100));
      maxSpeedError=Math.max(maxSpeedError,Math.abs(Math.hypot(b.x-a.x,b.z-a.z)/dt-20));
      maxFacingError=Math.max(maxFacingError,Math.abs(Math.atan2(Math.sin(b.yaw-Math.atan2(b.dx,b.dz)),Math.cos(b.yaw-Math.atan2(b.dx,b.dz)))));
    }
    const summary={samples,turns:turns.size,maxSpeedError,maxFacingError,workTargets:new Set(result.working.map((w:any)=>w.id)).size,maxWorkFacingError:Math.max(...result.working.map((w:any)=>w.error)),errors};
    await testInfo.attach('movement-contract',{body:JSON.stringify(summary,null,2),contentType:'application/json'});
    expect(summary.samples).toBeGreaterThan(100);expect(summary.turns).toBeGreaterThan(2);
    expect(summary.maxSpeedError).toBeLessThan(.01);expect(summary.maxFacingError).toBeLessThan(.00001);
    expect(summary.workTargets).toBe(4);expect(summary.maxWorkFacingError).toBeLessThan(.00001);expect(errors).toEqual([]);
    await page.screenshot({path:'artifacts/movement-work-facing.png'});
  } finally {await browser.close();}
});
