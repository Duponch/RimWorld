import { test,expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { meleeCamp } from '../scenarios/melee';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { world,panel,expectWorld,observeErrors,saveKey } from './helpers';
import { revealCells } from './player-actions';

const probe=`window.__melee={screen:[],poses:0,frames:[],previous:0};
const meleeFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const r=meleeFrame.call(this,now),b=window.__melee;if(this.preparing||!this.world)return r;
b.screen=this.screenPawns();if(b.previous)b.frames.push(now-b.previous);b.previous=now;
const g=this.pawns.pawnMesh.geometry;for(let i=0;i<this.world.pawns.length;i++)if(g.getAttribute('aMotion').getZ(i)===8)b.poses++;return r;};`;

test('native UI: choose melee, approach, GPU strike, wounds and exact save/load at 1×/6×',async({playwright})=>{
  test.setTimeout(90000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page),reports=[];
  page.setDefaultTimeout(15000);
  try {
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.goto('/?e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#save').click();await page.keyboard.press('Escape');
    for(const speed of [1,6]){
      const initial=meleeCamp(),actor=initial.pawns[0],target=initial.pawns[3];
      await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
      await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
      await page.locator(`[data-pawn="${actor.id}"]`).click();await revealCells(page,[actor,target]);await page.locator('#target-melee').click();
      const point=await page.evaluate(id=>(window as any).__melee.screen.find((p:any)=>p.id===id),target.id);expect(point).toBeDefined();await page.mouse.click(point.x,point.y);
      await expect.poll(async()=>(await world(page)).pawns[0].melee?.order?.targetId).toBe(target.id);
      await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>(await world(page)).pawns.some(p=>(p.health?.injuries.length??0)>0),{timeout:18000}).toBe(true);
      await page.locator('[data-speed="0"]').click();const fought=await world(page);expect(validateWorld(fought)).toEqual([]);expect(fought.pawns[0].skills.melee.dailyXp).toBeGreaterThan(0);
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,fought);await page.keyboard.press('Escape');
      await page.locator(`[data-pawn="${actor.id}"]`).click();await expect(page.locator('#inspector')).toContainText('Mêlée');
      reports.push({speed,tick:fought.tick,actors:fought.pawns.map(p=>({id:p.id,state:p.state,melee:p.melee,injuries:p.health?.injuries.length??0}))});
    }
    const presentation=await page.evaluate(()=>(window as any).__melee);expect(presentation.poses).toBeGreaterThan(0);expect(errors).toEqual([]);
    await page.screenshot({path:`artifacts/melee-${process.env.VALIDATION_VERSION??'v59'}.png`});writeFileSync(`artifacts/melee-ui-${process.env.VALIDATION_VERSION??'v59'}.json`,JSON.stringify({reports,poses:presentation.poses,frames:presentation.frames,errors},null,2));
  }finally{await browser.close();}
});
