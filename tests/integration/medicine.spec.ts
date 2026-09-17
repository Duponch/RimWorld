import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { medicineCamp } from '../scenarios/medicine';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { expectWorld,observeErrors,panel,saveKey,world } from './helpers';
import { perform } from './player-actions';

const probe=`
window.__medicineFrames=[];
const medicineFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const result=medicineFrame.apply(this,args);if(this.preparing)return result;
const g=this.pawns.pawnMesh?.geometry;if(!g||!this.world.pawns[1]?.health)return result;const m=g.getAttribute('aMotion'),cargo=g.getAttribute('aCargo');
const d=this.world.pawns[0],p=this.world.pawns[1];window.__medicineFrames.push({tick:this.world.tick,play:this.timeline.tick,phase:d.tend?.phase??d.state,work:m.getY(0),cargo:cargo.getX(0),patientPose:m.getZ(1),held:!!d.tend?.medicine?.carryPileId,xp:d.skills.medicine.xp,treated:p.health.injuries.filter(i=>i.tended!==undefined).length,units:this.world.piles.reduce((n,s)=>n+(s.kind==='medicine'?s.quantity:0),0)});return result;};
`;
test('patient chooses medicine ceiling; doctor collects, carries, cancels without loss and treats a batch visibly',async({playwright})=>{
  test.setTimeout(90000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    const initial=medicineCamp(),doctor=initial.pawns[0]!,patient=initial.pawns[1]!;doctor.priorities.doctor=0;patient.medicalCare='dry';initial.piles[0]!.owner={type:'ground',x:20,z:4};
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).pawns[1]!.state).toBe('resting');await page.locator('[data-speed="0"]').click();
    await page.locator(`[data-pawn="${patient.id}"]`).click();await expect(page.locator('#medical-policy option')).toHaveCount(5);await page.locator('#medical-policy').selectOption('industrial');
    await perform(page,{reason:'Activer les soins.',command:{type:'priority',pawnId:doctor.id,work:'doctor',value:1}},{value:0});
    await perform(page,{reason:'Prendre le médicament puis soigner.',command:{type:'order-tend',pawnId:doctor.id,patientId:patient.id,queue:false}},{value:0});
    const pickup=await world(page);expect(pickup.pawns[0]!.tend?.phase).toBe('pickup');expect(pickup.pawns[0]!.skills.medicine.xp).toBe(0);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,pickup);await page.keyboard.press('Escape');
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.tend?.phase).toBe('approach');await page.locator('[data-speed="0"]').click();
    const carried=await world(page);expect(carried.pawns[0]!.tend?.medicine?.carryPileId).toBeTruthy();expect(carried.piles.reduce((n,p)=>n+p.quantity,0)).toBe(4);expect(carried.pawns[1]!.health!.injuries.every(i=>i.tended===undefined)).toBe(true);expect(validateWorld(carried)).toEqual([]);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,carried);await page.keyboard.press('Escape');
    await page.locator(`[data-pawn="${patient.id}"]`).click();await page.locator('#medical-policy').selectOption('none');
    const cancelled=await world(page);expect(cancelled.pawns[0]!.tend).toBeUndefined();expect(cancelled.piles.reduce((n,p)=>n+p.quantity,0)).toBe(4);expect(cancelled.pawns[0]!.skills.medicine.xp).toBe(0);
    await page.locator('#medical-policy').selectOption('industrial');await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.tend?.phase).toBe('tend');await page.locator('[data-speed="0"]').click();
    const work=await world(page);expect(work.pawns[0]!.skills.medicine.xp).toBe(0);await page.screenshot({path:'artifacts/medicine-v51.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,work);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.skills.medicine.xp).toBe(122500);await page.locator('[data-speed="0"]').click();
    const final=await world(page);expect(validateWorld(final)).toEqual([]);expect(final.pawns[1]!.health!.injuries.every(i=>i.tended!==undefined)).toBe(true);expect(final.piles.reduce((n,p)=>n+p.quantity,0)).toBe(3);await expect(page.locator('#medicine')).toHaveText('3');await expect(page.locator('#fps-counter')).toHaveText(/\d+ FPS/);
    const frames=await page.evaluate(()=>(window as any).__medicineFrames as {tick:number;play:number;phase:string;work:number;cargo:number;patientPose:number;held:boolean;xp:number;treated:number;units:number}[]);
    const carrying=frames.filter(f=>f.held&&f.phase==='approach'),working=frames.filter(f=>f.phase==='tend'),completed=frames.filter(f=>f.xp===122500);
    expect(carrying.length).toBeGreaterThan(5);expect(working.length).toBeGreaterThan(5);expect(completed.length).toBeGreaterThan(1);
    for(const f of [...carrying,...working]){expect(f.cargo).toBe(19);expect(f.xp).toBe(0);expect(f.treated).toBe(0);expect(f.units).toBe(4);expect(f.work).toBe(f.phase==='tend'?1:0);expect(f.tick).toBeLessThanOrEqual(f.play);}
    for(const f of completed){expect(f.units).toBe(3);expect(f.treated).toBe(2);expect(f.cargo).toBe(0);}
    expect(errors).toEqual([]);writeFileSync('artifacts/medicine-ui-v51.json',JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',frames:frames.length,carrying:carrying.length,working:working.length,firstCarry:carrying[0],firstWork:working[0],firstResult:completed[0],savedTicks:[pickup.tick,carried.tick,work.tick],finishedTick:final.tick,remainingMedicine:3,errors},null,2)+'\n');
  }finally{await browser.close();}
});
