import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { careCamp } from '../scenarios/care';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { expectWorld,observeErrors,panel,pawnTab,saveKey,world } from './helpers';
import { perform } from './player-actions';

const probe=`
window.__careFrames=[];
const careFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const result=careFrame.apply(this,args);window.__careView=this;if(this.preparing)return result;
const g=this.pawns.pawnMesh?.geometry;if(!g)return result;const m=g.getAttribute('aMotion'),to=g.getAttribute('aTo');
this.world.pawns.forEach((d,i)=>{if(d.tend?.phase==='tend'){const j=this.world.pawns.findIndex(p=>p.id===d.tend.patientId),p=this.world.pawns[j];window.__careFrames.push({tick:this.world.tick,play:this.timeline.tick,work:m.getY(i),patientPose:m.getZ(j),distance:Math.abs(d.x-p.x)+Math.abs(d.z-p.z),yaw:to.getW(i),expectedYaw:Math.atan2(p.x-d.x,p.z-d.z)});}});return result;};
`;
test('player enables treatment, orders at bedside, saves mid-care and observes actual GPU work and wound quality',async({playwright})=>{
  test.setTimeout(90000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    const initial=careCamp(),doctor=initial.pawns[0]!,patient=initial.pawns[1]!;doctor.priorities.doctor=0;
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).pawns[1]!.state).toBe('resting');await page.locator('[data-speed="0"]').click();
    await page.locator(`[data-pawn="${patient.id}"]`).click();await pawnTab(page,'health');await page.locator('#medical-policy').selectOption('none');await expect.poll(async()=>(await world(page)).pawns[1]!.medicalCare).toBe('none');
    await page.locator('#medical-policy').selectOption('dry');await expect.poll(async()=>(await world(page)).pawns[1]!.medicalCare).toBe('dry');
    // Policy cancellation released the service; let the patient physically settle again.
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).pawns[1]!.state).toBe('resting');await page.locator('[data-speed="0"]').click();
    await perform(page,{reason:'Activer le médecin.',command:{type:'priority',pawnId:doctor.id,work:'doctor',value:1}},{value:0});
    await perform(page,{reason:'Traiter physiquement au chevet.',command:{type:'order-tend',pawnId:doctor.id,patientId:patient.id,queue:false}},{value:0});
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.tend?.phase).toBe('tend');await page.locator('[data-speed="0"]').click();
    const during=await world(page);expect(validateWorld(during)).toEqual([]);expect(during.pawns[1]!.health!.injuries.every(i=>i.tended===undefined)).toBe(true);expect(during.pawns[0]!.skills.medicine.xp).toBe(0);
    await page.screenshot({path:process.env.CARE_BEDSIDE_IMAGE??'artifacts/care-bedside-v47.png'});await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,during);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.skills.medicine.xp).toBe(175000);await page.locator('[data-speed="0"]').click();
    const finished=await world(page);expect(validateWorld(finished)).toEqual([]);expect(finished.pawns[1]!.health!.injuries.every(i=>i.tended!==undefined)).toBe(true);
    await page.locator(`[data-pawn="${patient.id}"]`).click();await pawnTab(page,'health');await expect(page.locator('#health-inspection')).toContainText('qualité');await expect(page.locator('#fps-counter')).toHaveText(/\d+ FPS/);await page.screenshot({path:process.env.CARE_TREATED_IMAGE??'artifacts/care-treated-v47.png'});
    const frames=await page.evaluate(()=>(window as any).__careFrames as {tick:number;play:number;work:number;patientPose:number;distance:number;yaw:number;expectedYaw:number}[]);
    expect(frames.length).toBeGreaterThan(5);for(const f of frames){expect(f.work).toBe(1);expect(f.patientPose).toBe(1);expect(f.distance).toBe(1);expect(Math.cos(f.yaw-f.expectedYaw)).toBeCloseTo(1,5);expect(f.tick).toBeLessThanOrEqual(f.play);}
    expect(errors).toEqual([]);writeFileSync(process.env.CARE_UI_REPORT??'artifacts/care-ui-v47.json',JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',frames:frames.length,first:frames[0],last:frames.at(-1),duringTick:during.tick,finishedTick:finished.tick,quality:finished.pawns[1]!.health!.injuries.map(i=>i.tended),xp:finished.pawns[0]!.skills.medicine.xp,errors},null,2)+'\n');
  }finally{await browser.close();}
});
