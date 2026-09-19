import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { equipmentCamp } from '../scenarios/equipment';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { observeErrors,panel,saveKey,world,expectWorld } from './helpers';
import { perform } from './player-actions';

const probe=`
window.__equipmentFrames=[];window.__equipmentPrevious=null;
const equipmentFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const result=equipmentFrame.apply(this,args);if(this.preparing)return result;
const g=this.pawns.pawnMesh?.geometry;if(!g||!this.world.pawns[0])return result;
const p=this.world.pawns[0],gun=this.world.piles.find(i=>i.kind==='weapon'),now=performance.now();
window.__equipmentFrames.push({tick:this.world.tick,play:this.timeline.tick,dt:window.__equipmentPrevious===null?0:now-window.__equipmentPrevious,equipped:g.getAttribute('aEquipment').getX(0),cargo:g.getAttribute('aCargo').getX(0),phase:p.equipmentTask?.action??p.state,progress:p.equipmentTask?.progress??null,owner:gun?.owner.type,x:p.x,z:p.z});window.__equipmentPrevious=now;return result;};
`;
test('real equipment UI: contact before ownership, GPU hip attachment, saved approach, delayed drop and portrait state',async({playwright})=>{
  test.setTimeout(90000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    const initial=equipmentCamp(1),p=initial.pawns[0]!,gun=initial.piles[0]!;
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await perform(page,{reason:'Équiper l’arme au sol.',command:{type:'order-equipment',pawnId:p.id,itemId:gun.id,action:'equip',queue:false}},{value:0});
    const walking=await world(page);expect(walking.piles[0]!.owner.type).toBe('ground');
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,walking);await page.keyboard.press('Escape');
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).piles[0]!.owner.type).toBe('equipment');await page.locator('[data-speed="0"]').click();
    const equipped=await world(page);expect(validateWorld(equipped)).toEqual([]);expect(equipped.piles[0]!.id).toBe(gun.id);
    await page.locator(`[data-pawn="${p.id}"]`).click();await page.locator('#equipment-details summary').click();await expect(page.locator('#equipment-primary')).toContainText('Revolver');
    await expect(page.locator(`[data-pawn="${p.id}"]`)).toHaveAttribute('data-equipment','revolver');await expect(page.locator('#equipment-cargo')).toHaveText('Aucune cargaison');
    await page.screenshot({path:'artifacts/equipment-v52.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,equipped);await page.keyboard.press('Escape');
    await page.locator(`[data-pawn="${p.id}"]`).click();await page.locator('#equipment-details summary').click();await page.locator('#drop-equipment').click();
    expect((await world(page)).piles[0]!.owner.type).toBe('equipment');await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).piles[0]!.owner.type).toBe('ground');await page.locator('[data-speed="0"]').click();
    const final=await world(page);expect(final.piles[0]!.weapon!.forbidden).toBe(true);expect(validateWorld(final)).toEqual([]);await expect(page.locator(`[data-pawn="${p.id}"]`)).toHaveAttribute('data-equipment','');
    const frames=await page.evaluate(()=>(window as any).__equipmentFrames as any[]),approach=frames.filter(f=>f.phase==='equip'),held=frames.filter(f=>f.owner==='equipment'),dropping=frames.filter(f=>f.phase==='drop');
    expect(approach.length).toBeGreaterThan(5);expect(held.length).toBeGreaterThan(5);expect(dropping.some(f=>f.progress===1||f.progress===2)).toBe(true);
    for(const f of frames){expect(f.equipped).toBe(f.owner==='equipment'?1:0);expect(f.cargo).toBe(0);expect(f.tick).toBeLessThanOrEqual(f.play);}
    for(const f of approach){expect(f.owner).toBe('ground');expect(f.equipped).toBe(0);}
    expect(errors).toEqual([]);writeFileSync('artifacts/equipment-ui-v52.json',JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',frames:frames.length,approach:approach.length,held:held.length,dropping:dropping.length,firstEquipped:held[0],savedTicks:[walking.tick,equipped.tick],finalTick:final.tick,errors},null,2)+'\n');
  }finally{await browser.close();}
});
