const proofVersion=process.env.VALIDATION_VERSION??'v57';
import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { firingCamp } from '../scenarios/shooting';
import { fixtureBuilding } from '../scenarios/deconstruction';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { observeErrors,panel,pawnTab,saveKey,world,expectWorld } from './helpers';
import { revealCells,perform } from './player-actions';

const probe=`window.__shootFrames=[];window.__shootTargets=[];
const shootFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const result=shootFrame.call(this,now);if(this.preparing||!this.world)return result;
window.__shootTargets=this.screenPawns();const layer=this.projectiles,g=layer.mesh.geometry,t=g.getAttribute('bulletTime'),p=this.pawns.pawnMesh.geometry,clock=layer.tick.value;
const active=[];for(let i=0;i<g.instanceCount;i++)if(clock>=t.getX(i)&&clock<t.getY(i))active.push({start:t.getX(i),end:t.getY(i),alpha:Math.max(0,Math.min(1,(clock-t.getX(i)-t.getZ(i))/t.getW(i)))});
window.__shootFrames.push({now,tick:this.world.tick,clock:this.timeline.tick,active,phases:this.world.pawns.map((pawn,i)=>({id:pawn.id,stance:pawn.shooting?.stance??null,order:pawn.shooting?.order??null,pose:p.getAttribute('aMotion').getZ(i),yaw:p.getAttribute('aFrom').getW(i),equipped:p.getAttribute('aEquipment').getX(i),injuries:pawn.health?.injuries.length??0})),drawCalls:this.stats.drawCalls});return result;};`;

test('native UI: explicit target, cancel, saved aim, visible GPU flight/pose and health at 1×/6×',async({playwright})=>{
  test.setTimeout(90000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page),initial=firingCamp(),reports=[];
  Object.assign(fixtureBuilding(initial,'bed',14,13),{medical:true});initial.pawns[1].priorities.patient=1;initial.pawns[1].medicalCare='dry';
  try {
    await page.addInitScript(()=>{(window as any).__pipelines=0;for(const key of ['createRenderPipeline','createRenderPipelineAsync'] as const){const original=GPUDevice.prototype[key];(GPUDevice.prototype as any)[key]=function(...args:any[]){(window as any).__pipelines++;return (original as any).apply(this,args);};}});
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    for(const speed of [1,6]) {
      await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
      await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
      await revealCells(page,[initial.pawns[0],initial.pawns[1]]);
      await page.locator(`[data-pawn="${initial.pawns[0].id}"]`).click();await page.locator('#target-shot').click();await page.keyboard.press('Escape');
      await expect(page.locator('#target-shot')).toHaveAttribute('aria-pressed','false');expect((await world(page)).pawns[0].shooting).toBeUndefined();
      await page.locator('#target-shot').click();const target=await page.evaluate(id=>(window as any).__shootTargets.find((p:any)=>p.id===id),initial.pawns[1].id);
      expect(target).toBeDefined();await page.mouse.click(target.x,target.y);
      await expect.poll(async()=>(await world(page)).pawns[0].shooting?.stance?.phase).toBe('aim');
      const aiming=await world(page);expect(validateWorld(aiming)).toEqual([]);
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,aiming);await page.keyboard.press('Escape');
      await page.locator(`[data-pawn="${initial.pawns[0].id}"]`).click();
      await expect.poll(()=>page.evaluate(id=>(window as any).__shootFrames.at(-1).phases.find((p:any)=>p.id===id).pose,initial.pawns[0].id)).toBe(7);
      if(speed===1)await page.screenshot({path:`artifacts/shooting-${proofVersion}.png`});
      const pipelines=await page.evaluate(()=>{(window as any).__shootFrames=[];return (window as any).__pipelines;});
      await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>(await world(page)).pawns[1].health?.injuries.length??0,{timeout:10000}).toBeGreaterThan(0);
      await page.locator('[data-speed="0"]').click();await page.locator('#stop-draft').click();
      const after=await world(page);expect(validateWorld(after)).toEqual([]);expect(after.pawns[0].skills.shooting.xp).toBeGreaterThan(initial.pawns[0].skills.shooting.xp);
      await expect.poll(()=>page.evaluate(()=>(window as any).__shootFrames.at(-1).phases[1].injuries)).toBeGreaterThan(0);
      const frames=await page.evaluate(()=>(window as any).__shootFrames as any[]);
      expect(frames.some(f=>f.active.length>0),`Flight must actually be presented at ${speed}×`).toBe(true);
      // World/HUD phases are published at integer local ticks; the flight alone
      // resolves Core substeps. Do not confuse that contract with a delayed pose.
      const aimingFrames=frames.flatMap(f=>f.phases.filter((p:any)=>p.stance?.phase==='aim').map((p:any)=>({p,worldTick:f.tick,clock:f.clock})));
      for(const {p,worldTick,clock} of aimingFrames){expect(p.pose).toBe(7);expect(p.equipped).toBe(1);expect(p.stance.endsAtCore/10).toBeGreaterThan(worldTick);expect(clock).toBeLessThan(Math.ceil(p.stance.endsAtCore/10)+.001);expect(Math.abs(p.yaw-Math.PI/2)).toBeLessThan(.001);}
      expect(await page.evaluate(()=>(window as any).__pipelines)-pipelines).toBe(0);
      reports.push({speed,frames:frames.length,visibleFlightFrames:frames.filter(f=>f.active.length).length,aimingFrames:aimingFrames.length,finalTick:after.tick,injuries:after.pawns[1].health!.injuries.length,maxDrawCalls:Math.max(...frames.map(f=>f.drawCalls))});
      if(speed===6){
        const rotation={value:0};
        await perform(page,{reason:'Cesser le tir et rendre leur autonomie aux trois colons.',command:{type:'draft',pawnIds:initial.pawns.map(p=>p.id),enabled:false}},rotation);
        await perform(page,{reason:'Affecter le troisième colon aux soins du blessé réel.',command:{type:'priority',pawnId:initial.pawns[2].id,work:'doctor',value:1}},rotation);
        await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
        await expect.poll(async()=>(await world(page)).pawns[1].health!.injuries.some(i=>i.tended!==undefined),{timeout:25000}).toBe(true);
        await page.locator('[data-speed="0"]').click();const cared=await world(page);expect(validateWorld(cared)).toEqual([]);expect(cared.pawns[2].skills.medicine.xp).toBeGreaterThan(0);
        await page.locator(`[data-pawn="${initial.pawns[1].id}"]`).click();await pawnTab(page,'health');await expect(page.locator('#health-inspection')).toContainText('qualité');
        await page.screenshot({path:`artifacts/shooting-care-${proofVersion}.png`});
        await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,cared);
      }
    }
    expect(errors).toEqual([]);writeFileSync(`artifacts/shooting-ui-${proofVersion}.json`,JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',reports,errors},null,2)+'\n');
  } finally {await browser.close();}
});
