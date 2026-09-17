import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { selfTendingCamp } from '../scenarios/self-tending';
import { fixtureBuilding } from '../scenarios/deconstruction';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { expectWorld,observeErrors,panel,saveKey,world } from './helpers';
import { perform } from './player-actions';

const probe=`
window.__selfTendFrames=[];
const selfTendFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const result=selfTendFrame.apply(this,args);if(this.preparing)return result;
const g=this.pawns.pawnMesh?.geometry;if(!g)return result;const m=g.getAttribute('aMotion'),to=g.getAttribute('aTo');
this.world.pawns.forEach((p,i)=>{if(p.tend?.patientId===p.id)window.__selfTendFrames.push({tick:this.world.tick,play:this.timeline.tick,phase:p.tend.phase,x:p.x,z:p.z,work:m.getY(i),lying:m.getZ(i),yaw:to.getW(i),xp:p.skills.medicine.xp,treated:p.health.injuries.filter(q=>q.tended!==undefined).length});});return result;};
`;
test('player opts into self-treatment, leaves the bed, keeps facing, cancels and reloads without duplicate care',async({playwright})=>{
  test.setTimeout(90000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    const initial=selfTendingCamp(),p=initial.pawns[0]!,bed=fixtureBuilding(initial,'bed',p.x,p.z);p.bedId=bed.id;p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:p.x,z:p.z}};p.state='sleeping';p.priorities.doctor=0;
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await page.locator(`[data-pawn="${p.id}"]`).click();await expect(page.locator('#self-tend-policy')).not.toBeChecked();await page.locator('#self-tend-policy').check();
    await expect.poll(async()=>(await world(page)).pawns[0]!.selfTend).toBe(true);await expect(page.locator('[data-health="self-tend-hint"]')).toContainText('désactivé');
    await perform(page,{reason:'Activer Médecin pour les auto-soins.',command:{type:'priority',pawnId:p.id,work:'doctor',value:1}},{value:0});
    await perform(page,{reason:'Soigner ses propres blessures.',command:{type:'order-tend',pawnId:p.id,patientId:p.id,queue:false}},{value:0});
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.tend?.phase).toBe('tend');await page.locator('[data-speed="0"]').click();
    const during=await world(page);expect(validateWorld(during)).toEqual([]);expect(Math.abs(during.pawns[0]!.x-bed.x)+Math.abs(during.pawns[0]!.z-bed.z)).toBe(1);expect(during.pawns[0]!.skills.medicine.xp).toBe(0);
    await page.screenshot({path:'artifacts/self-tending-v49.png'});
    await page.locator('#self-tend-policy').uncheck();await expect.poll(async()=>(await world(page)).pawns[0]!.tend).toBeUndefined();expect((await world(page)).pawns[0]!.skills.medicine.xp).toBe(0);
    await page.locator('#self-tend-policy').check();await perform(page,{reason:'Reprendre après annulation.',command:{type:'order-tend',pawnId:p.id,patientId:p.id,queue:false}},{value:0});
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.tend?.phase).toBe('tend');await page.locator('[data-speed="0"]').click();
    const saved=await world(page);await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,saved);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.skills.medicine.xp).toBe(175000);await page.locator('[data-speed="0"]').click();
    const final=await world(page);expect(validateWorld(final)).toEqual([]);expect(final.pawns[0]!.tend).toBeUndefined();expect(final.pawns[0]!.health!.injuries.every(i=>i.tended!==undefined)).toBe(true);await expect(page.locator('#fps-counter')).toHaveText(/\d+ FPS/);
    const frames=await page.evaluate(()=>(window as any).__selfTendFrames as {tick:number;play:number;phase:string;x:number;z:number;work:number;lying:number;yaw:number;xp:number;treated:number}[]),working=frames.filter(f=>f.phase==='tend');
    expect(working.length).toBeGreaterThan(5);const yaw=Math.atan2(during.pawns[0]!.x-bed.x,during.pawns[0]!.z-bed.z);
    for(const f of working){expect(f.work).toBe(1);expect(f.lying).toBe(0);expect(f.x).toBe(during.pawns[0]!.x);expect(f.z).toBe(during.pawns[0]!.z);expect(Math.cos(f.yaw-yaw)).toBeCloseTo(1,5);expect(f.tick).toBeLessThanOrEqual(f.play);expect(f.xp).toBe(f.treated*87500);}
    expect(errors).toEqual([]);writeFileSync('artifacts/self-tending-ui-v49.json',JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',frames:frames.length,working:working.length,first:working[0],last:working.at(-1),savedTick:saved.tick,finishedTick:final.tick,quality:final.pawns[0]!.health!.injuries.map(i=>i.tended),xp:final.pawns[0]!.skills.medicine.xp,errors},null,2)+'\n');
  }finally{await browser.close();}
});
