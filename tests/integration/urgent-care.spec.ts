import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { urgentBedCamp } from '../scenarios/urgent-care';
import { addMaterial,refreshStock } from '../../src/sim/materials';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { expectWorld,observeErrors,panel,saveKey,world } from './helpers';
import { perform } from './player-actions';

const probe=`
window.__urgentFrames=[];
const urgentFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const result=urgentFrame.apply(this,args);if(this.preparing)return result;
const g=this.pawns.pawnMesh?.geometry;if(!g)return result;const m=g.getAttribute('aMotion');const p=this.world.pawns[0];if(!p?.health)return result;
window.__urgentFrames.push({tick:this.world.tick,play:this.timeline.tick,phase:p.tend?.phase??(p.need?.kind==='eat'?'meal-'+p.need.phase:p.state),urgent:!!p.tend?.urgent,work:m.getY(0),lying:m.getZ(0),xp:p.skills.medicine.xp,treated:p.health.injuries.filter(q=>q.tended!==undefined).length});return result;};
`;
test('player priorities decide urgent self-care at bed review; one real treatment precedes a physical meal',async({playwright})=>{
  test.setTimeout(90000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    const initial=urgentBedCamp(),p=initial.pawns[0]!;delete p.selfTend;p.priorities.doctor=2;p.priorities.patient=1;p.hunger=25;
    addMaterial(initial,'food',10,{type:'ground',x:p.x+2,z:p.z},'survival-meal');refreshStock(initial);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await page.locator(`[data-pawn="${p.id}"]`).click();await page.locator('#self-tend-policy').check();
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).tick).toBeGreaterThan(initial.tick+30);await page.locator('[data-speed="0"]').click();
    const waiting=await world(page);expect(waiting.pawns[0]!.tend).toBeUndefined();expect(waiting.pawns[0]!.skills.medicine.xp).toBe(0);expect(waiting.pawns[0]!.state).toBe('resting');
    await perform(page,{reason:'Donner priorité à Médecin pour une auto-intervention urgente.',command:{type:'priority',pawnId:p.id,work:'doctor',value:1}},{value:0});
    await perform(page,{reason:'Passer Patient après Médecin.',command:{type:'priority',pawnId:p.id,work:'patient',value:2}},{value:0});
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.tend?.phase).toBe('tend');await page.locator('[data-speed="0"]').click();
    const saved=await world(page);expect(validateWorld(saved)).toEqual([]);expect(saved.pawns[0]!.tend?.urgent).toBe(true);expect(saved.pawns[0]!.skills.medicine.xp).toBe(0);
    await page.screenshot({path:'artifacts/urgent-care-v50.png'});await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,saved);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.need?.kind).toBe('eat');await page.locator('[data-speed="0"]').click();
    const meal=await world(page);expect(meal.pawns[0]!.skills.medicine.xp).toBe(87500);expect(meal.pawns[0]!.health!.injuries.filter(i=>i.tended!==undefined)).toHaveLength(1);expect(meal.pawns[0]!.tend).toBeUndefined();expect(validateWorld(meal)).toEqual([]);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.hunger).toBeGreaterThan(90);await page.locator('[data-speed="0"]').click();
    const final=await world(page);expect(final.piles.reduce((n,q)=>n+(q.kind==='food'?q.quantity:0),0)).toBe(9);expect(validateWorld(final)).toEqual([]);await expect(page.locator('#fps-counter')).toHaveText(/\d+ FPS/);
    const frames=await page.evaluate(()=>(window as any).__urgentFrames as {tick:number;play:number;phase:string;urgent:boolean;work:number;lying:number;xp:number;treated:number}[]),working=frames.filter(f=>f.phase==='tend'&&f.urgent),eating=frames.filter(f=>f.phase==='meal-ingest');
    expect(working.length).toBeGreaterThan(5);expect(eating.length).toBeGreaterThan(5);
    for(const f of working){expect(f.work).toBe(1);expect(f.lying).toBe(0);expect(f.xp).toBe(0);expect(f.treated).toBe(0);expect(f.tick).toBeLessThanOrEqual(f.play);}
    for(const f of eating){expect(f.xp).toBe(87500);expect(f.treated).toBe(1);expect(f.work).toBe(0);}
    expect(errors).toEqual([]);writeFileSync('artifacts/urgent-care-ui-v50.json',JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',frames:frames.length,working:working.length,eating:eating.length,firstWork:working[0],firstMeal:eating[0],savedTick:saved.tick,mealTick:meal.tick,finishedTick:final.tick,remainingFood:9,errors},null,2)+'\n');
  }finally{await browser.close();}
});
