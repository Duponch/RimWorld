const proofVersion=process.env.VALIDATION_VERSION??'v69';
import { expect,test } from '@playwright/test';
import { readFileSync,writeFileSync } from 'node:fs';
import { deserializeWorld,serializeWorld,validateWorld } from '../../src/sim/serialization';
import { applyCommand,stepWorld } from '../../src/sim/engine';
import { raidDefenseDecisions } from '../scenarios/raid-player';
import { isColonist,distanceSquared } from '../../src/sim/affiliation';
import { enableRaids,stopRaidEngagement } from '../../src/sim/raids';
import { deconstructionCamp } from '../scenarios/deconstruction';
import { world,observeErrors,panel,expectWorld,saveKey } from './helpers';

// Produced by raid-colony.test.ts through real player commands and the ordinary
// calendar. Reuse its checkpoint instead of repeating five days of preparation.
test('native ordinary-camp raid: letter, rally, visible combat, saved continuation and return to civilian life at 1×/6×',async({playwright})=>{
  test.setTimeout(150000);
  const initial=deserializeWorld(readFileSync(`tmp/raid-camp-${proofVersion}.json`,'utf8'));
  for(let i=0;i<1200;i++){
    for(const d of raidDefenseDecisions(initial))expect(applyCommand(initial,d.command).ok).toBe(true);
    if(initial.pawns.some(p=>p.shooting||p.melee))break;
    stepWorld(initial);
  }
  expect(initial.raids?.active).toBeDefined();
  const enemy=initial.pawns.find(p=>p.raid)!;expect(Math.min(...initial.pawns.filter(isColonist).map(p=>distanceSquared(p,enemy)))).toBeLessThan(56**2);
  for(const p of initial.pawns.filter(isColonist))if(p.draft)applyCommand(initial,{type:'draft',pawnIds:[p.id],enabled:false});
  expect(validateWorld(initial)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]}),reports=[];
  try{const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);page.setDefaultTimeout(15000);
    await page.goto('/?e2e&size=250');await expect(page.locator('[data-speed="0"]')).toBeVisible({timeout:15000});await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#save').click();await page.keyboard.press('Escape');
    for(const speed of [1,6]){
      await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
      await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
      await expect(page.locator('#raid-letter')).toContainText('Raid');await page.locator('#raid-letter').click();await expect(page.locator('#raid-dialog')).toContainText('Mobilisez');await page.locator('#locate-raid').click();
      for(const p of initial.pawns.filter(isColonist)){await page.locator(`[data-pawn="${p.id}"]`).click();await page.locator('#toggle-draft').click();}
      await expect.poll(async()=>(await world(page)).pawns.filter(p=>isColonist(p)&&p.draft).length).toBe(4);
      await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>(await world(page)).pawns.some(p=>p.shooting||p.melee),{timeout:20000}).toBe(true);
      await page.locator('[data-speed="0"]').click();const battle=await world(page);expect(validateWorld(battle)).toEqual([]);
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,battle);await page.keyboard.press('Escape');
      await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(async()=>(await world(page)).raids?.last?.id,{timeout:50000}).toBe(1);await page.locator('[data-speed="0"]').click();
      const end=await world(page);expect(validateWorld(end)).toEqual([]);await expect(page.locator('#raid-letter')).toContainText('Assaut terminé');
      for(const p of end.pawns.filter(p=>isColonist(p)&&p.draft)){await page.locator(`[data-pawn="${p.id}"]`).click();await page.locator('#toggle-draft').click();}
      await page.locator('[data-speed="6"]').click();await page.waitForFunction(t=>window.__lisiere.tick>=t,end.tick+160,{timeout:15000});await page.locator('[data-speed="0"]').click();
      const civilian=await world(page);expect(validateWorld(civilian)).toEqual([]);expect(civilian.pawns.filter(isColonist).every(p=>!p.draft)).toBe(true);expect(civilian.pawns.some(p=>p.id===enemy.id)||civilian.raids!.departed.some(d=>d.pawnId===enemy.id)).toBe(true);
      await page.screenshot({path:`artifacts/raid-${proofVersion}-${speed}x.png`});reports.push({speed,start:initial.tick,end:end.tick,outcome:end.raids!.last,states:civilian.pawns.map(p=>({id:p.id,state:p.state}))});
    }
    expect(errors).toEqual([]);writeFileSync(`artifacts/raid-ui-${proofVersion}.json`,JSON.stringify({reports,errors},null,2));
  }finally{await browser.close();}
});

test('native retirement: saved edge finishes and GPU body/cargo/selection counts shrink together after real border exit',async({playwright})=>{
  test.setTimeout(45000);const initial=deconstructionCamp(3);enableRaids(initial);initial.raids!.nextCheck=1;stepWorld(initial,40);
  const enemy=initial.pawns.find(p=>p.raid)!;initial.raids!.active!.phase='withdraw';initial.raids!.active!.reason='losses';initial.raids!.active!.lost=[enemy.id];enemy.raid!.exiting=true;stopRaidEngagement(enemy);
  expect(validateWorld(initial)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  try{const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);page.setDefaultTimeout(15000);
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\nconst raidFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(...args){const r=raidFrame.apply(this,args);if(!this.preparing)window.__raidView=this;return r;};`});});
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?e2e&size=32');await expect(page.locator('[data-speed="0"]')).toBeVisible({timeout:15000});await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await page.locator('#raid-letter').click();await expect(page.locator('#raid-dialog')).toContainText('Retraite');await page.locator('#locate-raid').click();await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{const w=window.__lisiere.world,p=w.pawns.find((p:any)=>p.id===id);return (p?.motion?.end??0)>w.tick;},enemy.id);await page.locator('[data-speed="0"]').click();const walking=await world(page);expect(walking.pawns.some(p=>p.id===enemy.id)).toBe(true);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,walking);await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(id=>!window.__lisiere.world.pawns.some((p:any)=>p.id===id),enemy.id,{timeout:15000});await page.locator('[data-speed="0"]').click();
    await expect.poll(()=>page.evaluate(()=>{const r=(window as any).__raidView;return [r.world.pawns.length,r.pawns.pawnMesh.geometry.instanceCount,r.pawns.cargoMesh.geometry.instanceCount,r.pawns.selectionMesh.geometry.instanceCount];})).toEqual([3,3,3,3]);
    const end=await world(page);expect(validateWorld(end)).toEqual([]);expect(end.raids!.departed).toHaveLength(1);expect(end.raids!.departed[0]!.items[0]!.owner).toEqual({type:'apparel',pawnId:enemy.id});expect(errors).toEqual([]);
    writeFileSync(`artifacts/raid-retreat-ui-${proofVersion}.json`,JSON.stringify({from:walking.tick,to:end.tick,departure:end.raids!.departed[0],counts:[3,3,3,3],errors},null,2));
  }finally{await browser.close();}
});
