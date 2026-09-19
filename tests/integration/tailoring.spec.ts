import { expect,test } from '@playwright/test';
import { readFileSync,writeFileSync } from 'node:fs';
import { deserializeWorld,serializeWorld,validateWorld } from '../../src/sim/index';
import { observeErrors,panel,cell,world,expectWorld,saveKey } from './helpers';
import { perform } from './player-actions';

const probe=`
window.__tailoringFrames=[];
const tailoringFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const result=tailoringFrame.apply(this,args);if(this.preparing)return result;
const g=this.pawns.pawnMesh?.geometry;if(!g||!this.world.pawns[0])return result;
const p=this.world.pawns[0],u=this.world.piles.find(i=>i.unfinished),a=this.world.piles.find(i=>i.item==='cloth-tribalwear');
window.__tailoringFrames.push({at:args[0],tick:this.world.tick,play:this.timeline.tick,cloth:g.getAttribute('aEquipment').getY(0),cargo:g.getAttribute('aCargo').getX(0),phase:p.cooking?.phase,unfinished:u?.unfinished?.progress,owner:a?.owner.type});return result;};
`;
test('natural-cotton checkpoint: real architect, bill, interruption, saved unfinished, 1x/6x work, quality, wearing and portrait',async({playwright})=>{
  test.setTimeout(150000);
  const initial=deserializeWorld(readFileSync('artifacts/tailoring-cotton-checkpoint-v72.json','utf8')),p=initial.pawns[0]!,browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  try{
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await perform(page,{reason:'Confectionner le tissu récolté par cette colonie.',command:{type:'priority',pawnId:p.id,work:'craft',value:1}},{value:0});
    await perform(page,{reason:'Poser un emplacement gratuit.',command:{type:'designate',kind:'crafting-spot',x:8,z:10}},{value:0});
    const spot=(await world(page)).structures.find(s=>s.kind==='crafting-spot')!;
    await perform(page,{reason:'Fabriquer une tenue tribale.',command:{type:'bill-add',structureId:spot.id}},{value:0});
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{if(!window.__lisiere.world.piles.some(p=>(p.unfinished?.progress??0)>0))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},undefined,{timeout:45000});
    let w=await world(page);const u=w.piles.find(i=>i.unfinished)!,billId=w.structures.find(s=>s.id===spot.id)!.bills![0]!.id;
    await perform(page,{reason:'Suspendre sans perdre le tissu ni le travail.',command:{type:'bill-update',structureId:spot.id,billId,settings:{...w.structures.find(s=>s.id===spot.id)!.bills![0]!,suspended:true}}},{value:0});
    w=await world(page);expect(w.pawns[0]!.cooking).toBeNull();expect(w.piles.find(i=>i.id===u.id)!.unfinished!.progress).toBeGreaterThan(0);
    if(u.owner.type!=='ground')throw Error('Expected a staged unfinished garment');await page.keyboard.press('Escape');await cell(page,u.owner.x,u.owner.z);
    await expect(page.locator('[data-unfinished]')).toContainText(p.name);await page.screenshot({path:'artifacts/tailoring-unfinished-v72.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,w);
    await perform(page,{reason:'Reprendre le même ouvrage.',command:{type:'bill-update',structureId:spot.id,billId,settings:{...w.structures.find(s=>s.id===spot.id)!.bills![0]!,suspended:false}}},{value:0});
    await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
    const progress=w.piles.find(i=>i.id===u.id)!.unfinished!.progress;
    await expect.poll(async()=>(await world(page)).piles.find(i=>i.id===u.id)?.unfinished?.progress??0,{timeout:15000}).toBeGreaterThan(progress+30000);
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{if(!window.__lisiere.world.piles.some(p=>p.item==='cloth-tribalwear'&&p.owner.type==='ground'))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},undefined,{timeout:30000});
    w=await world(page);expect(validateWorld(w)).toEqual([]);const garment=w.piles.find(i=>i.item==='cloth-tribalwear')!;expect(w.tailoring?.completed).toBe(1);
    await perform(page,{reason:'Porter notre premier vêtement fabriqué.',command:{type:'order-equipment',pawnId:p.id,itemId:garment.id,action:'wear',queue:false}},{value:0});
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).piles.find(i=>i.id===garment.id)?.owner.type,{timeout:20000}).toBe('apparel');await page.locator('[data-speed="0"]').click();
    const final=await world(page);expect(validateWorld(final)).toEqual([]);await expect(page.locator(`[data-pawn="${p.id}"]`)).toHaveAttribute('data-apparel','cloth-tribalwear');
    await page.locator(`[data-pawn="${p.id}"]`).click();await page.locator('#equipment-details summary').click();await expect(page.locator('#equipment-apparel')).toContainText('Tenue tribale');await expect(page.locator('#fps-counter')).toBeVisible();
    await page.screenshot({path:'artifacts/tailoring-worn-v72.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,final);
    const frames=await page.evaluate(()=>(window as any).__tailoringFrames as any[]);
    expect(frames.some(f=>f.cargo===24)).toBe(true);expect(frames.some(f=>f.cargo===26)).toBe(true);expect(frames.some(f=>f.cloth===2)).toBe(true);
    for(const f of frames){expect(f.cloth).toBe(f.owner==='apparel'?2:0);expect(f.tick).toBeLessThanOrEqual(f.play);}
    expect(errors).toEqual([]);writeFileSync('artifacts/tailoring-ui-v72.json',JSON.stringify({date:new Date().toISOString(),source:'Natural cotton core checkpoint; all production/interrupt/wear actions through real UI',startTick:initial.tick,endTick:final.tick,garment:final.piles.find(i=>i.id===garment.id),frames:frames.length,cargoFrames:frames.filter(f=>f.cargo===24||f.cargo===26).length,errors},null,2));
  }finally{await browser.close();}
});
