import { test,expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { deconstructionCamp,fixtureBuilding } from '../scenarios/deconstruction';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { applyCommand } from '../../src/sim/engine';
import { world,panel,tool,cell,expectWorld,observeErrors,saveKey } from './helpers';
import { revealCells } from './player-actions';

const probe=`window.__barriers={strikes:0,repairs:0,misfacing:0};
const facesBarrier=(actual,expected)=>Math.abs(Math.atan2(Math.sin(actual-expected),Math.cos(actual-expected)))<.01;
const barrierFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const r=barrierFrame.call(this,now);if(this.preparing||!this.world)return r;
const g=this.pawns.pawnMesh.geometry;for(let i=0;i<this.world.pawns.length;i++){const p=this.world.pawns[i],m=g.getAttribute('aMotion'),pose=g.getAttribute('aTo');
if(m.getZ(i)===8&&p.melee?.strike?.structure){window.__barriers.strikes++;const c=p.melee.strike.structure,yaw=Math.atan2(c.x-p.x,c.z-p.z);if(!facesBarrier(pose.getW(i),yaw))window.__barriers.misfacing++;}
const job=this.world.jobs.find(j=>j.id===p.jobId&&j.kind==='repair');if(p.state==='working'&&job&&m.getY(i)===1){window.__barriers.repairs++;if(!facesBarrier(pose.getW(i),Math.atan2(job.x-p.x,job.z-p.z)))window.__barriers.misfacing++;}}return r;};`;

test('native barrier UI: direct strike, stop/load, home area and physical repair at 1×/6×',async({playwright})=>{
  test.setTimeout(100000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page),reports=[];
  try{
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.goto('/?e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#save').click();await page.keyboard.press('Escape');
    for(const speed of [1,6]){
      const initial=deconstructionCamp(),p=initial.pawns[0]!,s=fixtureBuilding(initial,'wall',p.x+4,p.z);
      applyCommand(initial,{type:'draft',pawnIds:[p.id],enabled:true});
      await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
      await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
      await page.locator(`[data-pawn="${p.id}"]`).click();await revealCells(page,[p,s]);await page.locator('#target-melee').click();await cell(page,s.x,s.z);
      await expect.poll(async()=>(await world(page)).pawns[0]!.melee?.order?.structure).toBe(true);
      await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(async()=>(await world(page)).structures[0]!.damage??0,{timeout:15000}).toBeGreaterThan(0);
      await page.locator('[data-speed="0"]').click();await page.locator('#stop-draft').click();
      const damaged=await world(page);expect(damaged.structures[0]!.damage).toBeGreaterThan(0);expect(validateWorld(damaged)).toEqual([]);
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,damaged);await page.keyboard.press('Escape');
      await tool(page,'home');await cell(page,s.x,s.z);await expect.poll(async()=>(await world(page)).home?.includes(s.z*initial.width+s.x)).toBe(true);await tool(page,'select');await page.keyboard.press('Escape');
      await cell(page,s.x,s.z);await expect(page.locator('#cell-description')).toContainText('Résistance');await expect(page.locator('#cell-description')).toContainText('Zone de foyer');
      await expect(page.locator('#cell-cancel')).toBeHidden();await expect(page.locator('#cell-deconstruct')).toBeVisible();
      await page.locator(`[data-pawn="${p.id}"]`).click();await page.locator('#toggle-draft').click();await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>(await world(page)).structures[0]!.damage??0,{timeout:15000}).toBe(0);
      await page.locator('[data-speed="0"]').click();const repaired=await world(page);expect(validateWorld(repaired)).toEqual([]);expect(repaired.piles).toEqual(initial.piles);expect(repaired.jobs).toEqual([]);
      await cell(page,s.x,s.z);await expect(page.locator('#cell-description')).toContainText('195/195');await page.screenshot({path:`artifacts/barrier-v67-${speed}x.png`});
      reports.push({speed,damage:damaged.structures[0]!.damage,ticks:repaired.tick,constructionXp:repaired.pawns[0]!.skills.construction.dailyXp});
    }
    const poses=await page.evaluate(()=>(window as any).__barriers);expect(poses.strikes).toBeGreaterThan(0);expect(poses.repairs).toBeGreaterThan(0);expect(poses.misfacing).toBe(0);expect(errors).toEqual([]);
    writeFileSync('artifacts/barrier-ui-v67.json',JSON.stringify({reports,poses,errors},null,2));
  }finally{await browser.close();}
});
