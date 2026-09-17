import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { feedingCamp } from '../scenarios/feeding';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { expectWorld,observeErrors,panel,saveKey,world } from './helpers';
import { perform } from './player-actions';

const probe=`
window.__feedingFrames=[];
const feedingFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const result=feedingFrame.apply(this,args);if(this.preparing)return result;
const g=this.pawns.pawnMesh?.geometry;if(!g)return result;const m=g.getAttribute('aMotion'),to=g.getAttribute('aTo');
this.world.pawns.forEach((d,i)=>{if(d.feed){const j=this.world.pawns.findIndex(p=>p.id===d.feed.patientId),p=this.world.pawns[j];window.__feedingFrames.push({tick:this.world.tick,play:this.timeline.tick,phase:d.feed.phase,work:m.getY(i),patientPose:m.getZ(j),distance:Math.abs(d.x-p.x)+Math.abs(d.z-p.z),yaw:to.getW(i),expectedYaw:Math.atan2(p.x-d.x,p.z-d.z),hunger:p.hunger,held:this.world.piles.some(q=>q.owner.type==='pawn'&&q.owner.pawnId===d.id),food:this.world.piles.filter(p=>p.kind==='food').reduce((n,p)=>n+p.quantity,0)});}});return result;};
`;
test('player orders feeding, sees physical food and synchronized bedside poses, saves mid-meal and consumes once',async({playwright})=>{
  test.setTimeout(90000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    const initial=feedingCamp(),doctor=initial.pawns[0]!,patient=initial.pawns[1]!;doctor.priorities.doctor=0;
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await perform(page,{reason:'Activer le médecin.',command:{type:'priority',pawnId:doctor.id,work:'doctor',value:1}},{value:0});
    await perform(page,{reason:'Nourrir le blessé au lit.',command:{type:'order-feed',pawnId:doctor.id,patientId:patient.id,queue:false}},{value:0});
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.feed?.phase).toBe('feed');await page.locator('[data-speed="0"]').click();
    const during=await world(page);expect(validateWorld(during)).toEqual([]);expect(during.pawns[1]!.hunger).toBeLessThan(24);expect(during.pawns[0]!.skills.medicine.xp).toBe(0);
    expect(during.piles.find(p=>p.owner.type==='pawn')?.quantity).toBe(1);await page.screenshot({path:'artifacts/feeding-bedside-v48.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,during);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).pawns[1]!.hunger).toBeGreaterThan(95);await page.locator('[data-speed="0"]').click();
    const finished=await world(page);expect(validateWorld(finished)).toEqual([]);expect(finished.pawns[0]!.feed).toBeUndefined();expect(finished.piles.reduce((n,p)=>n+p.quantity,0)).toBe(4);expect(finished.pawns[0]!.skills.medicine.xp).toBe(0);
    await expect(page.locator('#fps-counter')).toHaveText(/\d+ FPS/);
    const frames=await page.evaluate(()=>(window as any).__feedingFrames as {tick:number;play:number;phase:string;work:number;patientPose:number;distance:number;yaw:number;expectedYaw:number;held:boolean;food:number;hunger:number}[]);
    const feeding=frames.filter(f=>f.phase==='feed');expect(feeding.length).toBeGreaterThan(5);expect(frames.some(f=>f.phase==='deliver'&&f.held)).toBe(true);
    for(const f of feeding){expect(f.work).toBe(1);expect(f.patientPose).toBe(1);expect(f.distance).toBe(1);expect(Math.cos(f.yaw-f.expectedYaw)).toBeCloseTo(1,5);expect(f.tick).toBeLessThanOrEqual(f.play);expect(f.food).toBe(5);expect(f.hunger).toBeLessThan(24);expect(f.held).toBe(true);}
    expect(errors).toEqual([]);writeFileSync('artifacts/feeding-ui-v48.json',JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',frames:frames.length,bedsideFrames:feeding.length,first:feeding[0],last:feeding.at(-1),duringTick:during.tick,finishedTick:finished.tick,remaining:finished.stock.food,medicineXp:finished.pawns[0]!.skills.medicine.xp,errors},null,2)+'\n');
  }finally{await browser.close();}
});
