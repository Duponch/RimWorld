import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { nightEncounter } from '../scenarios/disturbance';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { world,panel,expectWorld,observeErrors,saveKey } from './helpers';
import { revealCells } from './player-actions';

const probe=`window.__wake={active:false,samples:[]};
const wakeFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const r=wakeFrame.call(this,now),b=window.__wake;if(!b.active||this.preparing||!this.world)return r;
const p=this.world.pawns[0],g=this.pawns.pawnMesh.geometry,m=g.getAttribute('aMotion');
b.samples.push({tick:this.timeline.tick,state:p.state,pose:m.getZ(0),walking:m.getX(0),rest:p.rest,disturbed:!!p.disturbance,events:this.world.events.some(e=>e.message.includes('impact'))});return r;};`;

test('native night attack at 1×/6×: real impact, sleeping GPU pose, physical wake/escape and saved deadline',async({playwright})=>{
  test.setTimeout(90000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]}),reports=[];
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.goto('/?e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#save').click();await page.keyboard.press('Escape');
    for(const speed of [1,6]){
      const initial=nightEncounter();await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
      await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');await revealCells(page,[initial.pawns[0],initial.pawns[3]]);
      await page.evaluate(()=>Object.assign((window as any).__wake,{active:true,samples:[]}));
      await expect.poll(()=>page.evaluate(()=>(window as any).__wake.samples.filter((s:any)=>s.pose===1&&s.state==='sleeping').length)).toBeGreaterThan(3);
      await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>(await world(page)).pawns[0].disturbance?.sleepUntilCore??0,{timeout:18000,intervals:[50,100]}).toBeGreaterThan(initial.tick*10);
      await expect.poll(()=>page.evaluate(()=>(window as any).__wake.samples.some((s:any)=>s.walking>0&&s.disturbed)),{timeout:15000}).toBe(true);
      await page.locator('[data-speed="0"]').click();const awake=await world(page);expect(validateWorld(awake)).toEqual([]);expect(awake.pawns[0].need?.kind).not.toBe('sleep');
      const samples=await page.evaluate(()=>{const b=(window as any).__wake;b.active=false;return b.samples;});
      expect(samples.some((s:any)=>s.events&&s.pose!==1)).toBe(true);
      for(const s of samples)if(s.state==='sleeping')expect(s.pose).toBe(1);
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,awake);await page.keyboard.press('Escape');
      reports.push({speed,awakeTick:awake.tick,deadline:awake.pawns[0].disturbance,sleepFrames:samples.filter((s:any)=>s.state==='sleeping').length,escapeFrames:samples.filter((s:any)=>s.walking>0&&s.disturbed).length});
    }
    expect(errors).toEqual([]);await expect(page.locator('#fps-counter')).toBeVisible();await page.screenshot({path:'artifacts/disturbance-v62.png'});
    writeFileSync('artifacts/disturbance-ui-v62.json',JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',reports,errors},null,2)+'\n');
  }catch(error){writeFileSync('tmp/disturbance-ui-failed-checkpoint.json',serializeWorld(await world(page)));throw error;}
  finally{await browser.close();}
});
