import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { pursuitCamp } from '../scenarios/pursuit';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { world,panel,expectWorld,observeErrors,saveKey } from './helpers';
import { revealCells,perform } from './player-actions';

const probe=`window.__pursuit={active:false,samples:[],shots:0};
const pursuitFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const r=pursuitFrame.call(this,now),b=window.__pursuit;if(!b.active||this.preparing||!this.world)return r;
const i=this.world.pawns.findIndex(p=>p.tactics),actor=this.world.pawns[i];if(!actor)return r;
const g=this.pawns.pawnMesh.geometry,f=g.getAttribute('aFrom'),t=g.getAttribute('aTo'),travel=g.getAttribute('aTravel'),motion=g.getAttribute('aMotion'),duration=travel.getY(i)-travel.getX(i),a=duration>0?Math.min(1,Math.max(0,(this.pawns.travelTime.value-travel.getX(i))/duration)):this.pawns.blend.value;
b.samples.push({tick:this.timeline.tick,x:f.getX(i)+(t.getX(i)-f.getX(i))*a,z:f.getZ(i)+(t.getZ(i)-f.getZ(i))*a,walking:motion.getX(i),pose:motion.getZ(i),heading:t.getW(i),dx:t.getX(i)-f.getX(i),dz:t.getZ(i)-f.getZ(i)});
const bullets=this.projectiles.mesh.geometry,time=bullets.getAttribute('bulletTime');for(let j=0;j<bullets.instanceCount;j++)if(this.projectiles.tick.value>=time.getX(j)&&this.projectiles.tick.value<time.getY(j))b.shots++;
return r;};`;

test('native pursuit at 1×/6×: approach on GPU, actual shots, player retreat and saved movement',async({playwright})=>{
  test.setTimeout(120000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]}),reports=[];
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.goto('/?scenario=camp&e2e&size=64');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#save').click();await page.keyboard.press('Escape');
    for(const speed of [1,6]) {
      const initial=pursuitCamp();await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
      await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
      await revealCells(page,[initial.pawns[0],initial.pawns[3]]);await page.locator('#inspect-threat').click();await expect(page.locator('#inspector')).toContainText('approche autonome');
      await page.evaluate(()=>Object.assign((window as any).__pursuit,{active:true,samples:[],shots:0}));
      await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>(await world(page)).pawns[3].x,{timeout:15000,intervals:[50]}).toBeLessThan(48);
      await page.locator('[data-speed="0"]').click();const travelling=await world(page);expect(travelling.pawns[3].path.length).toBeGreaterThan(0);expect(validateWorld(travelling)).toEqual([]);
      await page.evaluate(()=>(window as any).__pursuit.active=false);
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,travelling);await page.keyboard.press('Escape');
      await page.evaluate(()=>Object.assign((window as any).__pursuit,{active:true,samples:[],shots:0}));
      await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>(await world(page)).pawns[3].lastAttack?.targetId,{timeout:20000}).toBe(initial.pawns[0].id);
      await page.locator('[data-speed="0"]').click();const fought=await world(page);expect(validateWorld(fought)).toEqual([]);
      const captured=await page.evaluate(()=>{const b=(window as any).__pursuit;b.active=false;return {samples:b.samples,shots:b.shots};});
      const moving=captured.samples.filter((p:any)=>p.walking>0);expect(moving.length).toBeGreaterThan(15);expect(captured.shots).toBeGreaterThan(0);
      expect(captured.samples.some((p:any)=>p.pose===7)).toBe(true);
      for(const [i,p] of captured.samples.entries()) {
        if(p.walking>0){expect(p.pose).toBe(0);expect(Math.cos(p.heading-Math.atan2(p.dx,p.dz))).toBeCloseTo(1,5);}
        const before=captured.samples[i-1];if(before&&p.tick>=before.tick)expect(Math.hypot(p.x-before.x,p.z-before.z)).toBeLessThanOrEqual((p.tick-before.tick)*1.1+.04);
      }
      if(speed===6){
        await perform(page,{reason:'Reculer devant la poursuite.',command:{type:'draft-move',pawnIds:[initial.pawns[0].id],target:{x:6,z:40},queue:false}},{value:0});
        await expect.poll(async()=>(await world(page)).pawns[0].draft?.target).toEqual({x:6,z:40});
        await page.evaluate(()=>Object.assign((window as any).__pursuit,{active:true,samples:[],shots:0}));
        await page.locator('[data-speed="6"]').click();
        // A route can finish between snapshots at 6×. Observe actual translation
        // in every rendered frame instead of requiring a transient path array.
        await expect.poll(()=>page.evaluate(origin=>(window as any).__pursuit.samples.some((s:any)=>Math.hypot(s.x-origin.x,s.z-origin.z)>.5),fought.pawns[3]),{timeout:18000,intervals:[50,100]}).toBe(true);
        await page.locator('[data-speed="0"]').click();await page.evaluate(()=>(window as any).__pursuit.active=false);
      }
      reports.push({speed,saveTick:travelling.tick,firstShotTick:fought.tick,samples:captured.samples.length,walkingFrames:moving.length,visibleShotSamples:captured.shots,post:fought.pawns[3].tactics?.post});
    }
    await expect(page.locator('#fps-counter')).toBeVisible();expect(errors).toEqual([]);await page.screenshot({path:'artifacts/pursuit-v61.png'});
    writeFileSync('artifacts/pursuit-ui-v61.json',JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',reports,errors},null,2)+'\n');
  }catch(error){writeFileSync('tmp/pursuit-ui-failed-checkpoint.json',serializeWorld(await world(page)));throw error;}
  finally{await browser.close();}
});
