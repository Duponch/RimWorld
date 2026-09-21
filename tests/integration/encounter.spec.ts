import { medicalCarrier } from '../scenarios/health';
import { startingPawn } from '../../src/sim/starting-pawns';
import { clearQueuedOrders } from '../../src/sim/player-orders';
import { startTravel } from '../../src/sim/movement';
import { test,expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { rescueEncounter } from '../scenarios/encounter';
import { fixtureBuilding } from '../scenarios/deconstruction';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { world,panel,pawnTab,expectWorld,observeErrors,saveKey } from './helpers';
import { revealCells } from './player-actions';

const probe=`window.__encounter={screen:[],flights:0,poses:0,frames:0,fleeFrames:0,cargoFleeFrames:0,jumps:[],lastFlee:null};
const encounterFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const r=encounterFrame.call(this,now),b=window.__encounter;if(this.preparing||!this.world)return r;
b.screen=this.screenPawns();b.frames++;const g=this.projectiles.mesh.geometry,t=g.getAttribute('bulletTime');for(let i=0;i<g.instanceCount;i++)if(this.projectiles.tick.value>=t.getX(i)&&this.projectiles.tick.value<t.getY(i))b.flights++;
const p=this.pawns.pawnMesh.geometry;for(let i=0;i<this.world.pawns.length;i++)if(this.world.pawns[i].faction==='outlaws'&&p.getAttribute('aMotion').getZ(i)===7)b.poses++;
const i=this.world.pawns.findIndex(p=>p.flee),actor=this.world.pawns[i];
if(actor){const f=p.getAttribute('aFrom'),t=p.getAttribute('aTo'),travel=p.getAttribute('aTravel'),duration=travel.getY(i)-travel.getX(i),a=duration>0?Math.min(1,Math.max(0,(this.pawns.travelTime.value-travel.getX(i))/duration)):this.pawns.blend.value;
const x=f.getX(i)+(t.getX(i)-f.getX(i))*a,z=f.getZ(i)+(t.getZ(i)-f.getZ(i))*a,old=b.lastFlee;
if(old&&old.id===actor.id&&now>old.now&&now-old.now<100&&Math.hypot(x-old.x,z-old.z)>(now-old.now)*.021+.02)b.jumps.push({x,z,old,now});
b.lastFlee={id:actor.id,x,z,now};b.fleeFrames++;if(p.getAttribute('aCargo').getX(i)!==0&&p.getAttribute('aMotion').getX(i)>0)b.cargoFleeFrames++;
}else b.lastFlee=null;return r;};`;

test('native encounter UI: opt-in creation, ownership, reaction policy, hostile shots, rescue/care and saved continuation at 1×/6×',async({playwright})=>{
  test.setTimeout(150000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page),reports=[];
  page.setDefaultTimeout(15000);
  try {
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.goto('/?scenario=camp&e2e&size=64');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#new-colony').click();await page.locator('#world-size').selectOption('64');await page.locator('#world-scenario').selectOption('sentry');await page.locator('#new-world-form [type="submit"]').click();
    await expect(page.locator('#new-world-dialog')).not.toBeVisible();await expect.poll(async()=>(await world(page)).pawns.length).toBe(4);
    const created=await world(page);expect(validateWorld(created)).toEqual([]);expect(created.pawns.filter(p=>p.faction==='outlaws')).toHaveLength(1);
    await expect(page.locator('#colonists [data-pawn]')).toHaveCount(3);await expect(page.locator('#population')).toHaveText('3');
    await page.locator('#inspect-threat').click();await expect(page.locator('#inspector')).toContainText('Hors-la-loi');await expect(page.locator('#toggle-draft')).toHaveCount(0);await expect(page.locator('#drop-equipment')).not.toBeVisible();
    await panel(page,'work');await expect(page.locator('#work-rows tr')).toHaveCount(3);
    await panel(page,'assign');await expect(page.locator('#food-policy-rows tr')).toHaveCount(3);
    const name=created.pawns[0].name;await page.getByLabel(`Réaction hostile de ${name}`,{exact:true}).selectOption('ignore');await expect.poll(async()=>(await world(page)).pawns[0].hostilityResponse).toBe('ignore');await page.keyboard.press('Escape');
    await panel(page,'menu');await page.locator('#save').click();await page.keyboard.press('Escape');
    for(const speed of [1,6]) {
      const initial=rescueEncounter();initial.pawns[2].priorities.doctor=0;Object.assign(fixtureBuilding(initial,'bed',5,25),{medical:true});Object.assign(fixtureBuilding(initial,'bed',8,25),{medical:true});
      await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
      await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
      await page.locator(`[data-pawn="${initial.pawns[0].id}"]`).click();
      await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>(await world(page)).pawns[0].health?.injuries.length??0,{timeout:20000}).toBeGreaterThan(0);
      if(speed===1){await page.locator('[data-speed="0"]').click();const injured=await world(page);await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,injured);await page.keyboard.press('Escape');reports.push({speed,injuries:injured.pawns[0].health!.injuries.length});continue;}
      await expect.poll(async()=>(await world(page)).pawns[0].state,{timeout:15000}).toBe('downed');await page.locator('[data-speed="0"]').click();
      const defender=initial.pawns[1],enemy=initial.pawns[3];await page.locator(`[data-pawn="${defender.id}"]`).click();await page.locator('#toggle-draft').click();
      await revealCells(page,[defender,enemy]);await page.locator('#target-shot').click();
      const target=await page.evaluate(id=>(window as any).__encounter.screen.find((p:any)=>p.id===id),enemy.id);expect(target).toBeDefined();await page.mouse.click(target.x,target.y);
      await expect.poll(async()=>(await world(page)).pawns[1].shooting?.order?.targetId).toBe(enemy.id);
      await page.locator('[data-speed="6"]').click();await expect.poll(async()=>['downed','dead'].includes((await world(page)).pawns[3].state),{timeout:25000}).toBe(true);await page.locator('[data-speed="0"]').click();
      await page.locator(`[data-pawn="${defender.id}"]`).click();await page.locator('#toggle-draft').click();await panel(page,'work');await page.getByLabel(`Priorité médecin ${initial.pawns[2].name}`,{exact:true}).selectOption('1');await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
      await expect.poll(async()=>(await world(page)).pawns[2].rescue?.phase,{timeout:15000,intervals:[50,100]}).toBe('carry');await page.locator('[data-speed="0"]').click();const carried=await world(page);
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,carried);await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
      await expect.poll(async()=>(await world(page)).pawns[0].health!.injuries.some(i=>i.tended!==undefined),{timeout:25000}).toBe(true);await page.locator('[data-speed="0"]').click();
      const treated=await world(page);expect(validateWorld(treated)).toEqual([]);await page.locator(`[data-pawn="${initial.pawns[0].id}"]`).click();await pawnTab(page,'health');await expect(page.locator('#health-inspection')).toContainText('qualité');await page.screenshot({path:'artifacts/encounter-care-v58.png'});
      reports.push({speed,patient:treated.pawns[0].state,enemy:treated.pawns[3].state,medicineXp:treated.pawns[2].skills.medicine.xp,carrySavedAt:carried.tick});
    }
    const fleeing=medicalCarrier(),civil=fleeing.pawns[0],hostile=startingPawn(fleeing.nextId++,'Menace',civil.x+6,civil.z,0,100);hostile.faction='outlaws';fleeing.pawns.push(hostile);
    clearQueuedOrders(fleeing,civil);civil.orders.active=null;delete civil.priorityWork;expect(startTravel(fleeing,civil,{x:civil.x,z:civil.z+1})).toBe(true);
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(fleeing)});
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fleeing);await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(()=>page.evaluate(()=>(window as any).__encounter.cargoFleeFrames),{timeout:12000}).toBeGreaterThan(20);
    await expect.poll(async()=>!(await world(page)).pawns[0].flee,{timeout:12000}).toBe(true);await page.locator('[data-speed="0"]').click();expect(validateWorld(await world(page))).toEqual([]);
    const presentation=await page.evaluate(()=>{const b=(window as any).__encounter;return {frames:b.frames,flights:b.flights,hostileAimPoses:b.poses,fleeFrames:b.fleeFrames,cargoFleeFrames:b.cargoFleeFrames,fleeJumps:b.jumps};});
    expect(presentation.flights).toBeGreaterThan(0);expect(presentation.hostileAimPoses).toBeGreaterThan(0);expect(presentation.fleeJumps).toEqual([]);expect(errors).toEqual([]);
    writeFileSync('artifacts/encounter-ui-v58.json',JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',reports,presentation,errors},null,2)+'\n');
  }finally{await browser.close();}
});
