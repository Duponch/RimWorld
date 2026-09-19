import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { apparelCamp } from '../scenarios/apparel';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { observeErrors,panel,saveKey,world,expectWorld } from './helpers';
import { perform } from './player-actions';

const probe=`
window.__apparelFrames=[];
const apparelFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const result=apparelFrame.apply(this,args);if(this.preparing)return result;
const g=this.pawns.pawnMesh?.geometry;if(!g||!this.world.pawns[0])return result;
const p=this.world.pawns[0],vest=this.world.piles.find(i=>i.item==='flak-vest'),shirt=this.world.piles.find(i=>i.item==='cloth-shirt');
window.__apparelFrames.push({tick:this.world.tick,play:this.timeline.tick,vest:g.getAttribute('aEquipment').getZ(0),shirt:g.getAttribute('aEquipment').getY(0),cargo:g.getAttribute('aCargo').getX(0),phase:p.equipmentTask?.action,progress:p.equipmentTask?.progress,owner:vest?.owner.type,shirtOwner:shirt?.owner.type});return result;};
`;
test('physical clothing UI at 1x and 6x: floor, dressing, layered GPU attachment, portrait, persistence and removal',async({playwright})=>{
  test.setTimeout(120000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const evidence=[];
  try{for(const speed of [1,6]){
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    const initial=apparelCamp(1),p=initial.pawns[0]!,vest=initial.piles[0]!,shirt=initial.piles[1]!;
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    for(const garment of [vest,shirt]){
      await perform(page,{reason:'Enfiler le vêtement au sol.',command:{type:'order-equipment',pawnId:p.id,itemId:garment.id,action:'wear',queue:false}},{value:0});
      const walking=await world(page);expect(walking.piles.find(i=>i.id===garment.id)!.owner.type).toBe('ground');
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,walking);await page.keyboard.press('Escape');
      await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(async()=>(await world(page)).piles.find(i=>i.id===garment.id)!.owner.type).toBe('apparel');await page.locator('[data-speed="0"]').click();
    }
    const dressed=await world(page);expect(validateWorld(dressed)).toEqual([]);
    await expect(page.locator(`[data-pawn="${p.id}"]`)).toHaveAttribute('data-apparel','cloth-shirt flak-vest');
    await page.locator(`[data-pawn="${p.id}"]`).click();await page.locator('#equipment-details summary').click();await expect(page.locator('#equipment-apparel')).toContainText('Gilet pare-balles');
    await page.screenshot({path:`artifacts/apparel-v63-${speed}x.png`});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,dressed);await page.keyboard.press('Escape');
    await perform(page,{reason:'Retirer le gilet.',command:{type:'order-equipment',pawnId:p.id,itemId:vest.id,action:'remove',queue:false}},{value:0});
    await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(async()=>(await world(page)).piles.find(i=>i.id===vest.id)!.owner.type).toBe('ground');await page.locator('[data-speed="0"]').click();
    const final=await world(page);expect(final.piles.find(i=>i.id===vest.id)!.apparel!.forbidden).toBe(true);expect(validateWorld(final)).toEqual([]);
    await expect(page.locator(`[data-pawn="${p.id}"]`)).toHaveAttribute('data-apparel','cloth-shirt');
    const frames=await page.evaluate(()=>(window as any).__apparelFrames as any[]);
    expect(frames.some(f=>f.phase==='wear'&&f.progress>0&&f.owner==='ground')).toBe(true);expect(frames.some(f=>f.phase==='remove'&&f.progress>0&&f.owner==='apparel')).toBe(true);
    for(const f of frames){expect(f.vest).toBe(f.owner==='apparel'?1:0);expect(f.shirt).toBe(f.shirtOwner==='apparel'?1:0);expect(f.cargo).toBe(0);expect(f.tick).toBeLessThanOrEqual(f.play);}
    expect(errors).toEqual([]);evidence.push({speed,frames:frames.length,dressing:frames.filter(f=>f.phase==='wear'&&f.progress>0).length,removal:frames.filter(f=>f.phase==='remove'&&f.progress>0).length,finalTick:final.tick,errors});await page.close();
  }}finally{await browser.close();}
  writeFileSync('artifacts/apparel-ui-v63.json',JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',evidence},null,2)+'\n');
});
