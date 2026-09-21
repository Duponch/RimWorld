import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { firingCamp } from '../scenarios/shooting';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { observeErrors,panel,pawnTab,saveKey,world,expectWorld } from './helpers';
import { revealCells,perform } from './player-actions';

const probe=`window.__stagger={frames:[],edges:{},impacts:0,epoch:0};
const staggerSet=ColonyRenderer.prototype.setWorld;ColonyRenderer.prototype.setWorld=function(...args){const b=window.__stagger;if(args[1])b.epoch++;for(const p of args[0].pawns){if(p.stagger)b.impacts++;if(p.motion)b.edges[b.epoch+':'+p.id+':'+p.motion.start]=JSON.parse(JSON.stringify(p.motion));}return staggerSet.apply(this,args);};
const staggerFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const result=staggerFrame.call(this,now);if(this.preparing||!this.world)return result;const b=window.__stagger;b.targets=this.screenPawns();const g=this.pawns.pawnMesh.geometry,a=g.getAttribute('aFrom'),z=g.getAttribute('aTo'),t=g.getAttribute('aTravel'),clock=this.pawns.travelTime.value;
for(let i=0;i<this.world.pawns.length;i++){const p=this.world.pawns[i],s=this.timeline.segment(p.id);if(!s)continue;const start=t.getX(i),end=t.getY(i),f=end>start?Math.max(0,Math.min(1,(clock-start)/(end-start))):1;b.frames.push({epoch:b.epoch,id:p.id,now,clock:this.timeline.tick,edge:s.edgeStart??s.start,x:a.getX(i)+(z.getX(i)-a.getX(i))*f,z:a.getZ(i)+(z.getZ(i)-a.getZ(i))*f,shared:['aFrom','aTo','aTravel'].every(k=>g.getAttribute(k)===this.pawns.selectionMesh.geometry.getAttribute(k)&&g.getAttribute(k)===this.pawns.cargoMesh.geometry.getAttribute(k))});}return result;};`;

test('real UI shot slows an already moving target without jumps, including save/load and speed changes',async({playwright})=>{
  test.setTimeout(90000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page),initial=firingCamp(),target=initial.pawns[1];
  const reports=[];
  try {
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    for(const speed of [1,6]) {
      await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
      await page.evaluate(()=>{const b=(window as any).__stagger;b.frames=[];b.edges={};b.impacts=0;});
      await perform(page,{reason:'Marcher pendant le tir.',command:{type:'draft-move',pawnIds:[target.id],target:{x:target.x,z:20},queue:false}},{value:0});
      await revealCells(page,[initial.pawns[0],target]);await page.locator(`[data-pawn="${initial.pawns[0].id}"]`).click();await page.locator('#target-shot').click();
      const aim=await page.evaluate(id=>(window as any).__stagger.targets.find((p:any)=>p.id===id),target.id);expect(aim).toBeDefined();await page.mouse.click(aim.x,aim.y);
      await expect.poll(async()=>(await world(page)).pawns[0].shooting?.order?.targetId).toBe(target.id);
      await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(()=>page.evaluate(()=>(window as any).__stagger.impacts),{timeout:10000}).toBeGreaterThan(0);
      await page.locator('[data-speed="0"]').click();await page.locator('#stop-draft').click();
      const hit=await world(page);expect(validateWorld(hit)).toEqual([]);expect(hit.pawns[1].health).toBeDefined();
      if(speed===1){expect(hit.pawns[1].stagger).toBeDefined();await page.locator(`[data-pawn="${target.id}"]`).click();await pawnTab(page,'health');await expect(page.locator('#health-inspection summary')).toHaveText('Santé');await expect(page.locator('#health-inspection')).toContainText('Ralenti');await page.locator('[data-health="stagger"]').scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/stagger-v57.png'});await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,hit);await page.keyboard.press('Escape');}
      await page.locator('[data-speed="6"]').click();await expect.poll(async()=>{const p=(await world(page)).pawns[1];return p.z===20&&p.moveCooldown===0;},{timeout:12000}).toBe(true);await page.locator('[data-speed="0"]').click();
      const observed=await page.evaluate(()=>(window as any).__stagger),samples=observed.frames.filter((f:any)=>f.id===target.id);let checked=0,slow=0,maxError=0;
      for(const f of samples){const m=observed.edges[`${f.epoch}:${f.id}:${f.edge}`];if(!m||f.clock<m.start||f.clock>=m.end)continue;
        const duration=3*Math.hypot(m.to.x-m.from.x,m.to.z-m.from.z)/(m.speedFactor??1)+(m.terrainDelay??0),factor=Math.max(.17,duration/45);
        const lost=(m.stagger??[]).reduce((sum:number,s:any)=>sum+Math.max(0,Math.min(f.clock,s.end)-Math.max(m.start,s.start))*(1-factor),0),a=Math.min(1,Math.max(0,(f.clock-m.start-lost)/duration));
        const expected={x:m.from.x+(m.to.x-m.from.x)*a,z:m.from.z+(m.to.z-m.from.z)*a};maxError=Math.max(maxError,Math.hypot(expected.x-f.x,expected.z-f.z));expect(f.shared).toBe(true);checked++;if(m.stagger?.some((s:any)=>f.clock>=s.start&&f.clock<s.end))slow++;
      }
      expect(checked).toBeGreaterThan(20);expect(slow).toBeGreaterThan(5);expect(maxError).toBeLessThan(.002);
      reports.push({speed,frames:samples.length,checked,slow,maxError,arrived:true});
    }
    expect(errors).toEqual([]);writeFileSync('artifacts/stagger-ui-v57.json',JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',reports,errors},null,2)+'\n');
  }finally{await browser.close();}
});
