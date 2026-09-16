import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { rescueCamp } from '../scenarios/rescue';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { expectWorld,observeErrors,panel,saveKey,world,cell } from './helpers';
import { perform,revealCells } from './player-actions';

const probe=`
window.__rescueFrames=[];
const rescueFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){window.__rescueView=this;const result=rescueFrame.apply(this,args);const g=this.pawns.pawnMesh?.geometry;if(!this.preparing&&g){const m=g.getAttribute('aMotion'),from=g.getAttribute('aFrom'),to=g.getAttribute('aTo'),t=g.getAttribute('aTravel');for(const p of this.world.pawns)if(p.rescue?.phase==='carry'){const a=this.world.pawns.indexOf(p),b=this.world.pawns.findIndex(q=>q.id===p.rescue.patientId);const pose=i=>[from.getX(i),from.getY(i),from.getZ(i),from.getW(i),to.getX(i),to.getY(i),to.getZ(i),to.getW(i),t.getX(i),t.getY(i)];window.__rescueFrames.push({tick:this.world.tick,play:this.timeline.tick,carrier:pose(a),patient:pose(b),mode:m.getZ(b),work:m.getY(b),walk:m.getX(b)});}}return result;};
`;
test('player assigns a medical bed, orders rescue, observes a carried GPU body and reloads before physical placement',async({playwright})=>{
  test.setTimeout(90000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    const initial=rescueCamp(),actor=initial.pawns[0]!,patient=initial.pawns[1]!,bed=initial.structures[0]!;
    delete bed.medical;actor.priorities.doctor=0;
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await revealCells(page,[bed]);await cell(page,bed.x,bed.z);await page.locator('#bed-medical').check();await expect.poll(async()=>(await world(page)).structures[0]!.medical).toBe(true);await expect(page.locator('#bed-owner')).toBeDisabled();
    await expect.poll(()=>page.evaluate(()=>{const c=(window as any).__rescueView.boxes.batches.get('furniture').colorBuffer;return c.getZ(1)>c.getX(1);})).toBe(true);
    await perform(page,{reason:'Activer un vrai secouriste.',command:{type:'priority',pawnId:actor.id,work:'doctor',value:1}},{value:0});
    await perform(page,{reason:'Porter le blessé jusqu’au lit médical.',command:{type:'order-rescue',pawnId:actor.id,patientId:patient.id,queue:false}},{value:0});
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.rescue?.phase).toBe('carry');await page.locator('[data-speed="0"]').click();
    const carried=await world(page);expect(validateWorld(carried)).toEqual([]);expect(carried.pawns[0]!.rescue?.phase).toBe('carry');
    await page.screenshot({path:'artifacts/rescue-carry-v46.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,carried);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).pawns[1]!.need?.kind).toBe('sleep');await page.locator('[data-speed="0"]').click();
    const delivered=await world(page);expect(validateWorld(delivered)).toEqual([]);expect(delivered.pawns[1]!.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:bed.id});expect(delivered.pawns[0]!.rescue).toBeUndefined();
    await page.locator(`[data-pawn="${patient.id}"]`).click();await expect(page.locator('#health-inspection')).toContainText('À terre');await expect(page.locator('#fps-counter')).toHaveText(/\d+ FPS/);await page.screenshot({path:'artifacts/rescue-bed-v46.png'});
    const frames=await page.evaluate(()=> (window as unknown as {__rescueFrames:{tick:number;play:number;carrier:number[];patient:number[];mode:number;work:number;walk:number}[]}).__rescueFrames);
    expect(frames.length).toBeGreaterThan(5);for(const f of frames){expect(f.patient).toEqual(f.carrier);expect([f.mode,f.walk,f.work]).toEqual([6,0,0]);expect(f.tick).toBeLessThanOrEqual(f.play);}
    expect(errors).toEqual([]);writeFileSync('artifacts/rescue-ui-v46.json',JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',frames:frames.length,first:frames[0],last:frames.at(-1),carriedTick:carried.tick,deliveredTick:delivered.tick,errors},null,2)+'\n');
  }finally{await browser.close();}
});
