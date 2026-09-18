import { startTravel } from '../../src/sim/movement';
import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const proofVersion=process.env.VALIDATION_VERSION??'v53';
import { equipmentCamp } from '../scenarios/equipment';
import { addMaterial } from '../../src/sim/materials';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { observeErrors,panel,saveKey,world,expectWorld } from './helpers';
import { perform } from './player-actions';

const probe=`window.__draftFrames=[];window.__draftEpoch=0;
const draftSetWorld=ColonyRenderer.prototype.setWorld;ColonyRenderer.prototype.setWorld=function(...args){if(args[1])window.__draftEpoch++;return draftSetWorld.apply(this,args);};
const draftFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const result=draftFrame.call(this,now);if(this.preparing||!this.world)return result;
const g=this.pawns.pawnMesh?.geometry;if(!g)return result;const a=g.getAttribute('aFrom'),z=g.getAttribute('aTo'),t=g.getAttribute('aTravel'),clock=this.pawns.travelTime.value;
for(let i=0;i<this.world.pawns.length;i++){const p=this.world.pawns[i];if(!p.draft)continue;const start=t.getX(i),end=t.getY(i),alpha=end>start?Math.max(0,Math.min(1,(clock-start)/(end-start))):1;
window.__draftFrames.push({epoch:window.__draftEpoch,id:p.id,now,clock,start,end,alpha,x:a.getX(i)+(z.getX(i)-a.getX(i))*alpha,z:a.getZ(i)+(z.getZ(i)-a.getZ(i))*alpha,dx:z.getX(i)-a.getX(i),dz:z.getZ(i)-a.getZ(i),yaw:a.getW(i)+(z.getW(i)-a.getW(i))*alpha,cargo:g.getAttribute('aCargo').getX(i),carrying:this.world.piles.some(q=>q.owner.type==='pawn'&&q.owner.pawnId===p.id),equipped:g.getAttribute('aEquipment').getX(i),shared:['aFrom','aTo','aTravel'].every(k=>g.getAttribute(k)===this.pawns.selectionMesh.geometry.getAttribute(k)&&g.getAttribute(k)===this.pawns.cargoMesh.geometry.getAttribute(k))});}return result;};`;

test('native tactical UI: R, group button, physical queued movement, saved travel, stop and civilian return',async({playwright})=>{
  test.setTimeout(90000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    const initial=equipmentCamp(3),p=initial.pawns[0]!;initial.piles=[];addMaterial(initial,'weapon',1,{type:'equipment',pawnId:p.id},'revolver');
    const zone={id:initial.nextId++,x:20,z:20,filters:{wood:true,food:false},priority:2,capacity:75};initial.stockpiles.push(zone);
    addMaterial(initial,'wood',7,{type:'pawn',pawnId:p.id},'wood');const cargo=initial.piles.at(-1)!;
    p.haul={sourcePileId:cargo.id,carryPileId:cargo.id,quantity:7,phase:'deliver',pickupCell:{x:2,z:4},destination:{type:'stockpile',stockpileId:zone.id}};p.orders.active='haul';p.state='moving';p.x=2;p.z=4;expect(startTravel(initial,p,{x:3,z:5})).toBe(true);expect(validateWorld(initial)).toEqual([]);

    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await page.locator(`[data-pawn="${p.id}"]`).click();await page.keyboard.press('r');await expect(page.locator('#toggle-draft')).toHaveText('Démobiliser · R');expect((await world(page)).piles.find(i=>i.id===cargo.id)!.owner.type).toBe('pawn');await expect(page.locator(`[data-pawn="${p.id}"]`)).toHaveAttribute('data-drafted','true');
    const rotation={value:0};
    await perform(page,{reason:'Mobiliser le groupe.',command:{type:'draft',pawnIds:initial.pawns.map(p=>p.id),enabled:true}},rotation);
    await perform(page,{reason:'Déplacer le groupe.',command:{type:'draft-move',pawnIds:initial.pawns.map(p=>p.id),target:{x:15,z:14},queue:false}},rotation);
    await perform(page,{reason:'Ajouter un détour.',command:{type:'draft-move',pawnIds:[p.id],target:{x:10,z:18},queue:true}},rotation);
    const queued=await world(page);expect(queued.pawns[0]!.draft!.queue).toHaveLength(1);expect(new Set(queued.pawns.map(p=>JSON.stringify(p.draft!.target))).size).toBe(3);
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.x).toBeGreaterThan(5);await page.locator('[data-speed="0"]').click();
    const walking=await world(page);expect(validateWorld(walking)).toEqual([]);await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,walking);await page.keyboard.press('Escape');
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>{const w=await world(page);return w.pawns.every(p=>p.draft?.target&&p.x===p.draft.target.x&&p.z===p.draft.target.z&&!p.moveCooldown&&!p.draft.queue.length);},{timeout:20000}).toBe(true);await page.locator('[data-speed="0"]').click();
    await perform(page,{reason:'Arrêter le groupe.',command:{type:'draft-stop',pawnIds:initial.pawns.map(p=>p.id)}},rotation);await page.screenshot({path:`artifacts/drafting-${proofVersion}.png`});
    await perform(page,{reason:'Reprendre la vie civile.',command:{type:'draft',pawnIds:initial.pawns.map(p=>p.id),enabled:false}},rotation);expect(validateWorld(await world(page))).toEqual([]);
    const frames=await page.evaluate(()=>(window as any).__draftFrames as any[]);let samples=0,maxSpeedError=0,maxFacingError=0;
    const previous=new Map<number,any>();
    expect(frames.some(f=>f.carrying)).toBe(true);expect(frames.some(f=>f.id===p.id&&!f.carrying)).toBe(true);
    for(const f of frames){expect(f.cargo>0).toBe(f.carrying);expect(f.shared).toBe(true);expect(f.equipped).toBe(f.id===p.id?1:0);const a=previous.get(f.id);previous.set(f.id,f);
      if(f.alpha>.1&&f.alpha<.9){const expected=Math.atan2(f.dx,f.dz);maxFacingError=Math.max(maxFacingError,Math.abs(Math.atan2(Math.sin(f.yaw-expected),Math.cos(f.yaw-expected))));}
      if(!a||a.epoch!==f.epoch||a.start!==f.start||a.end!==f.end||a.alpha<=0||f.alpha>=1||f.clock<=a.clock)continue;
      samples++;const actual=Math.hypot(f.x-a.x,f.z-a.z)/(f.clock-a.clock),expected=Math.hypot(f.dx,f.dz)/(f.end-f.start);maxSpeedError=Math.max(maxSpeedError,Math.abs(actual-expected));
    }
    expect(samples).toBeGreaterThan(100);expect(maxSpeedError).toBeLessThan(.001);expect(maxFacingError).toBeLessThan(.12);expect(errors).toEqual([]);
    writeFileSync(`artifacts/drafting-ui-${proofVersion}.json`,JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',frames:frames.length,samples,maxSpeedError,maxFacingError,savedTick:walking.tick,errors},null,2)+'\n');
  }finally{await browser.close();}
});
