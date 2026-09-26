import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { applyCommand, serializeWorld, stepWorld, validateWorld } from '../../src/sim/index';
import type { World } from '../../src/sim/types';
import { miningCamp } from '../scenarios/mining';
import { expectWorld, observeErrors, panel, pause, saveKey, world } from './helpers';

type Kind='mine'|'chop';
const probe=`
window.__contact118={view:null,active:false,frames:[]};
const original=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
  const result=original.call(this,now),b=window.__contact118;b.view=this;
  if(!b.active||this.preparing||!this.world?.pawns[0])return result;
  const pawn=this.world.pawns[0],g=this.pawns.pawnMesh?.geometry;
  if(!g)return result;
  const from=g.getAttribute('aFrom'),to=g.getAttribute('aTo'),travel=g.getAttribute('aTravel'),motion=g.getAttribute('aMotion');
  const start=travel.getX(0),end=travel.getY(0),clock=this.pawns.travelTime.value;
  const alpha=end>start?Math.max(0,Math.min(1,(clock-start)/(end-start))):this.pawns.blend.value;
  b.frames.push({now,tick:this.world.tick,presented:this.timeline.tick,state:pawn.state,
    logicalX:pawn.x,fromX:from.getX(0),toX:to.getX(0),poseX:from.getX(0)+(to.getX(0)-from.getX(0))*alpha,
    walk:motion.getX(0),phase:motion.getZ(0)});
  return result;
};`;

function prepared(kind:Kind):World {
  const w=miningCamp(1),pawn=w.pawns[0]!;
  pawn.x=9;pawn.z=12;pawn.schedule.fill('anything');
  pawn.priorities.mine=kind==='mine'?1:0;pawn.priorities.gather=kind==='chop'?1:0;
  const target={x:11,z:12};
  if(kind==='mine')w.tiles[target.z*w.width+target.x]={terrain:'rock',stone:'granite'};
  else w.resources.push({id:w.nextId++,kind:'tree',...target,amount:12});
  expect(applyCommand(w,{type:'designate',kind,...target}).ok).toBe(true);
  for(let i=0;i<12;i++){
    stepWorld(w,1);
    const edge=pawn.motion;
    if(pawn.jobId!==null&&edge?.from.x===9&&edge.to.x===10&&edge.to.z===12&&pawn.moveCooldown>0&&pawn.path.length===0){
      expect(validateWorld(w)).toEqual([]);return w;
    }
  }
  throw new Error(`${kind}: no reserved cardinal final edge`);
}

async function load(page:Page,initial:World):Promise<void> {
  await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
  await page.route('**/src/main.ts*',async route=>{
    const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});
  });
  await page.goto('/?scenario=camp&size=32&e2e');
  await expect(page.locator('#loading')).toHaveCount(0);
  await pause(page);await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!!(window as any).__contact118?.view&&!(window as any).__contact118.view.preparing);
  await page.evaluate(()=>{
    const v=(window as any).__contact118.view;
    v.controls.enableDamping=false;v.rig.setMode('orthographic');
    v.controls.target.set(10,0,12);v.camera.position.set(10,5,6);
    v.camera.zoom=6;v.camera.updateProjectionMatrix();v.controls.update();
    (window as any).__contact118.active=true;
  });
  expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
}

test('V118: final work edge walks directly to a safe mine/tree contact',async ({playwright})=>{
  test.setTimeout(120_000);mkdirSync('artifacts',{recursive:true});
  const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
  const results:unknown[]=[];
  try {
    for(const kind of ['mine','chop'] as const){
      const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
      const initial=prepared(kind),errors=observeErrors(page);
      try {
        await load(page,initial);
        await page.locator('[data-speed="1"]').click();
        await page.waitForFunction(kind=>{
          const frames=(window as any).__contact118.frames as any[],phase=kind==='mine'?11:12;
          return frames.some(f=>f.state==='working'&&f.phase===phase&&f.fromX>10&&Math.abs(f.toX-f.fromX)<.001);
        },kind,{timeout:30_000,polling:'raf'});
        await pause(page);
        const frames=await page.evaluate(()=>(window as any).__contact118.frames as any[]);
        const edge=frames.filter(f=>f.walk===1&&f.logicalX===10&&f.fromX<9.1&&f.toX>10);
        expect(edge.length).toBeGreaterThan(3);
        const expected=kind==='mine'?10.1:10.18;
        expect(edge.at(-1)!.toX).toBeCloseTo(expected,2);
        const settled=frames.filter(f=>f.state==='working'&&f.phase===(kind==='mine'?11:12)&&f.fromX>10);
        expect(settled.length).toBeGreaterThan(0);
        expect(settled.at(-1)!.poseX).toBeCloseTo(expected,2);
        const steps=frames.slice(1).flatMap((f,i)=>{
          const prior=frames[i]!;
          return f.now-prior.now<100&&f.presented>=prior.presented?[f.poseX-prior.poseX]:[];
        });
        expect(Math.min(...steps)).toBeGreaterThan(-.06);
        expect(11-settled.at(-1)!.poseX).toBeGreaterThanOrEqual(kind==='mine' ? .89 : .81);
        const saved=await world(page);expect(validateWorld(saved)).toEqual([]);
        await page.screenshot({path:`artifacts/work-contact-v118-${kind}-side.png`});
        results.push({kind,edgeFrames:edge.length,edgeEndX:edge.at(-1)!.toX,
          contactX:settled.at(-1)!.poseX,minFrameStep:Math.min(...steps),errors});
        expect(errors).toEqual([]);
      } finally {await page.close();}
    }
    writeFileSync('artifacts/work-contact-v118.json',JSON.stringify({protocol:'Native Chromium WebGPU, two reserved cardinal final edges prepared by the real simulation. 1x motion, side view, saved-world validation; no GPU timer.',results},null,2)+'\n');
  } finally {await browser.close();}
});
