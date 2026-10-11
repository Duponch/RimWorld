import { expect,test } from '@playwright/test';
import { allowedAreaAulnes } from '../helpers/allowed-area-v312.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../../src/sim/serialization.ts';
import { decodeStoredSave } from '../../src/ui/save-storage-codec.ts';
import { cell,dragRectangle,expectWorld,observeErrors,panel,pause,saveKey,world } from './helpers.ts';
import { perform,revealCells } from './player-actions.ts';
import { writeTestFile } from '../test-output.ts';

const probe=`
const allowedAreaFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
 const result=allowedAreaFrame.call(this,now);if(this.preparing||!this.world)return result;
 const a=this.world.allowedAreas?.find(a=>a.id===this.allowedAreaTarget);
 window.__allowedAreaPresentation={target:this.allowedAreaTarget,tool:this.tool,zoneActive:this.surfaceTint.zoneActive.value,
 surfaces:this.allowedAreaLayer.surfaces.map(p=>({x:p.x,z:p.z,color:p.color})),
 records:a?a.cells.map(i=>({cell:i,rgba:Array.from(this.surfaceTint.zones.image.data.slice(i*4,i*4+4))})):[]};
 return result;
};`;

test('V312 native Aulnes: area UI, paint, real interrupted work, physical return, assignment and strict reloads',async({playwright})=>{
  test.setTimeout(300000);const fixture=await allowedAreaAulnes(),initial=fixture.world;
  const browser=await playwright.chromium.launch({channel:'chrome',args:[]});
  const page=await browser.newPage({baseURL:process.env.ALLOWED_AREA_V312_BASE_URL??'http://127.0.0.1:5383',viewport:{width:2560,height:1440}});
  const errors=observeErrors(page),checkpoints:{label:string;tick:number}[]=[],rotation={value:0};let areaId=initial.nextId;
  const actor=(w:typeof initial)=>w.pawns.find(p=>p.id===fixture.pawnId)!;
  async function checkpoint(label:string){
    await pause(page);const current=await world(page);expect(validateWorld(current)).toEqual([]);
    await page.keyboard.press('Escape');await panel(page,'menu');await page.locator('#save').click();
    await expect.poll(async()=>{const raw=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);return raw?serializeWorld(deserializeWorld(await decodeStoredSave(raw))):null;}).toBe(serializeWorld(current));
    await page.locator('#load').click();await expectWorld(page,current);await page.keyboard.press('Escape');
    checkpoints.push({label,tick:current.tick});await writeTestFile(test.info().outputPath(`checkpoint-${label}.json`),serializeWorld(current));return current;
  }
  const manager=async()=>{await page.keyboard.press('Escape');const heading=page.locator('#zones-open');if(await heading.getAttribute('aria-expanded')!=='true')await heading.click();await page.locator('[data-allowed-areas-open]').click();await expect(page.locator('#allowed-area-dialog')).toBeVisible();};
  try{
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);await pause(page);
    await page.evaluate(async({key,data})=>window.__lisiere.saveRepository.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await checkpoint('baseline');
    await manager();await page.locator('#allowed-area-new').click();await expect.poll(async()=>(await world(page)).allowedAreas?.[0]?.id).toBe(areaId);
    const row=()=>page.locator(`[data-allowed-area-id="${areaId}"]`);
    await row().locator('input:not([type=color])').fill('Couloir Ada');await row().locator('input:not([type=color])').press('Tab');
    await expect.poll(async()=>(await world(page)).allowedAreas?.[0]?.label).toBe('Couloir Ada');
    await row().locator('input[type=color]').fill('#629ad8');await row().locator('input[type=color]').dispatchEvent('change');
    await expect.poll(async()=>(await world(page)).allowedAreas?.[0]?.color).toBe(0x629ad8);
    await page.screenshot({path:test.info().outputPath('allowed-area-manager.png')});
    await row().locator('[data-allowed-area-paint="true"]').click();await expect(page.locator('#allowed-area-dialog')).not.toBeVisible();
    await revealCells(page,[fixture.from,fixture.to]);await dragRectangle(page,fixture.from,fixture.to,false);
    await page.screenshot({path:test.info().outputPath('allowed-area-drag.png')});await page.mouse.up();
    const cells=[fixture.from.z*250+fixture.from.x,fixture.to.z*250+fixture.to.x];
    await expect.poll(async()=>(await world(page)).allowedAreas?.[0]?.cells).toEqual(cells);
    await expect.poll(async()=>page.evaluate(()=>{const p=(window as any).__allowedAreaPresentation;return p?.target===window.__lisiere.world.allowedAreas?.[0]?.id&&p.surfaces.length===2&&p.records.every((r:any)=>r.rgba[3]>0);})).toBe(true);
    await page.screenshot({path:test.info().outputPath('allowed-area-committed.png')});await page.keyboard.press('Escape');
    await perform(page,{command:{type:'schedule-paint',pawnId:fixture.pawnId,hours:Array.from({length:24},(_,i)=>i),assignment:'work'},reason:'Un créneau de travail permet de qualifier le retour civil sans créer une activité de loisir.'},rotation);
    await panel(page,'assign');await page.locator(`[data-allowed-area-pawn="${fixture.pawnId}"]`).selectOption(String(areaId));
    await expect.poll(async()=>actor(await world(page)).allowedAreaId).toBe(areaId);
    const assigned=await checkpoint('assigned-during-original-edge');expect(actor(assigned).motion).toEqual(actor(initial).motion);expect(actor(assigned).cooking).toBeNull();
    expect(assigned.piles.reduce((n,p)=>n+p.quantity,0)).toBe(initial.piles.reduce((n,p)=>n+p.quantity,0));
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{const w=window.__lisiere.world,p=w.pawns.find(p=>p.id===id);if(!p?.allowedAreaReturn||!p.motion||p.motion.end<=w.tick)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},fixture.pawnId,{polling:20,timeout:60000});
    const moving=await checkpoint('return-edge');expect(actor(moving).allowedAreaReturn).toBeDefined();
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(({id,cells})=>{const w=window.__lisiere.world,p=w.pawns.find(p=>p.id===id);if(!p||p.allowedAreaReturn||!cells.includes(p.z*w.width+p.x)||(p.motion?.end??0)>w.tick)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},{id:fixture.pawnId,cells},{polling:20,timeout:60000});
    const arrived=await checkpoint('inside-area');expect(cells).toContain(actor(arrived).z*250+actor(arrived).x);
    await panel(page,'assign');await page.locator(`[data-allowed-area-pawn="${fixture.pawnId}"]`).selectOption('0');
    await expect.poll(async()=>actor(await world(page)).allowedAreaId).toBeUndefined();await page.keyboard.press('Escape');
    await manager();await row().locator('[data-allowed-area-delete]').click();await expect.poll(async()=>(await world(page)).allowedAreas).toBeUndefined();await page.locator('#allowed-area-close').click();await checkpoint('deleted-unlimited');
    expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false});
    await writeTestFile(test.info().outputPath('report.json'),JSON.stringify({source:fixture.source,sha:fixture.sha,declaredDotation:[],backend:'WebGPU',viewport:{width:2560,height:1440},areaId,pawnId:fixture.pawnId,cells,checkpoints,errors,scope:'fresh integrated UI, existing work interruption, return and reloads; no natural campaign or performance claim'},null,2));
  }catch(error){await writeTestFile(test.info().outputPath('failed-world.json'),serializeWorld(await world(page)));await writeTestFile(test.info().outputPath('failed-diagnostic.json'),JSON.stringify({checkpoints,errors,notice:await page.locator('#notice').textContent()},null,2));throw error;}
  finally{await page.close();await browser.close();}
});
