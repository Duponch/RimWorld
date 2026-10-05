import { expect,test,type Browser,type Page,type TestInfo } from '@playwright/test';
import { prepareMiniTurretDemo,MINI_TURRET_CELLS } from '../../scripts/create-mini-turret-v212-test-save.ts';
import { stepWorld } from '../../src/sim/engine.ts';
import { backgroundWorkRefusal } from '../../src/sim/colonist-backgrounds.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../../src/sim/serialization.ts';
import type { World } from '../../src/sim/types.ts';
import { producedTurretServiceCheckpoint,turretCombatNativeFixture } from '../helpers/mini-turret-v212.ts';
import { turretDangerNativeFixture } from '../helpers/mini-turret-danger-v212.ts';
import { writeTestFileSync } from '../test-output.ts';
import { cell,expectWorld,observeErrors,panel,pause,saveKey,tool,world } from './helpers.ts';
import { inspectPerson,perform,revealCells } from './player-actions.ts';

const gun=(w:World,id:number)=>{const s=w.structures.find(s=>s.id===id);if(!s?.turret)throw Error(`Missing installed gun ${id}`);return s;};
async function evidence(page:Page){
  expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
  const hardware=await page.evaluate(async()=>{
    const adapter=await navigator.gpu?.requestAdapter(),info=adapter?.info;
    return {adapterAvailable:!!adapter,vendor:info?.vendor??null,architecture:info?.architecture??null,device:info?.device??null,description:info?.description??null,
      fallback:(info as unknown as {isFallbackAdapter?:boolean}|undefined)?.isFallbackAdapter??(adapter as unknown as {isFallbackAdapter?:boolean}|null)?.isFallbackAdapter??null};
  });
  expect(hardware.fallback).not.toBe(true);expect(JSON.stringify(hardware)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software adapter|basic render driver/i);
  return {backend:'WebGPU',hardware,limit:hardware.fallback===null?'Indicateur de repli indisponible : identité relevée, absence de repli non certifiée par cet indicateur.':null};
}
async function execute(browser:Browser,initial:World,label:string,info:TestInfo,run:(page:Page,proof:Record<string,unknown>)=>Promise<void>){
  expect(validateWorld(initial)).toEqual([]);
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  page.setDefaultTimeout(15_000);const proof:Record<string,unknown>={label,complete:false,prepared:{tick:initial.tick,structures:initial.structures.map(s=>({id:s.id,kind:s.kind,damage:s.damage,turret:s.turret})),projectiles:initial.projectiles,notice:'Préparation ou checkpoint réellement produit explicitement identifié par le parcours.'}};
  try{
    // Fresh browser migration only. All subsequent persistence uses IndexedDB
    // through the actual save/load/import controls.
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');proof.gpu=await evidence(page);
    await run(page,proof);await pause(page);expect(validateWorld(await world(page))).toEqual([]);expect(errors).toEqual([]);
    expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false,waiting:0});
    proof.complete=true;await page.screenshot({path:info.outputPath('native.png')});
  }catch(error){proof.error=error instanceof Error?error.message:String(error);proof.incident=await page.evaluate(()=>window.__lisiere.incident).catch(()=>null);
    const last=await page.evaluate(()=>JSON.stringify(window.__lisiere.world)).catch(()=>null);if(last)writeTestFileSync(info.outputPath('last-world.json'),last);throw error;
  }finally{proof.errors=errors;writeTestFileSync(info.outputPath('proof.json'),JSON.stringify(proof,null,2));await info.attach('proof',{path:info.outputPath('proof.json'),contentType:'application/json'});await browser.close();}
}
async function inspectGun(page:Page,id:number){
  const current=await world(page),s=gun(current,id);await page.keyboard.press('Escape');await tool(page,'select');await revealCells(page,[s]);
  for(let attempt=0;attempt<=current.pawns.length;attempt++){await cell(page,s.x,s.z);if(await page.locator(`[data-turret-id="${id}"]`).isVisible())return;}
  throw Error('Real cell selection did not reveal the gun.');
}
async function saveAndReload(page:Page){
  await pause(page);const expected=await world(page);await panel(page,'menu');await page.locator('#save').click();
  await expect.poll(()=>page.evaluate(key=>{const raw=window.__lisiere.saveRepository.peekItem(key);return raw?JSON.parse(raw).tick:null;},saveKey)).toBe(expected.tick);
  const raw=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);expect(deserializeWorld(raw!)).toEqual(expected);
  await page.locator('#load').click();await expectWorld(page,expected);await page.keyboard.press('Escape');return expected;
}
async function twoViewsAndKeyboard(page:Page,id:number,proof:Record<string,unknown>){
  await inspectGun(page,id);const card=page.locator(`[data-turret-id="${id}"]`),target=card.locator('[data-turret-fact="target"]');
  await target.focus();await expect(page.locator('#game-tooltip')).toBeVisible();await expect(page.locator('#game-tooltip')).toContainText('Cible acquise');await page.keyboard.press('Escape');
  const before=await world(page);await page.locator('#camera-mode').click();await expectWorld(page,before);await page.locator('#camera-mode').click();await expectWorld(page,before);
  await page.setViewportSize({width:1280,height:768});
  for(const speed of [0,1,3,6]){const reachable=await page.locator(`[data-speed="${speed}"]`).evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===el;});expect(reachable,`Speed ${speed} must remain reachable with gun inspection open.`).toBe(true);}
  proof.twoViews=true;proof.compactViewport={width:1280,height:768};await page.setViewportSize({width:1440,height:1000});
}

test('V212 native research and physical construction, confirmed policies, full-canon refusal and actual circuit outage',async({playwright},info)=>{
  test.setTimeout(120_000);const initial=prepareMiniTurretDemo();
  expect(initial.structures.some(s=>s.turret)).toBe(false);expect(initial.projectiles).toBeUndefined();expect(initial.jobs).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  await execute(browser,initial,'construction',info,async(page,proof)=>{
    await panel(page,'research');await page.locator('[data-research-select="gun-turrets"]').click();await expect(page.locator('[data-research-selection-prerequisites]')).toContainText('Armurerie');
    await page.locator('[data-research-selected-start]').click();await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>window.__lisiere.world.research?.gunTurrets?.completedAt!==undefined);await pause(page);const researched=await world(page);proof.research={tick:researched.tick,progress:researched.research!.gunTurrets};
    await revealCells(page,[MINI_TURRET_CELLS.turret]);await tool(page,'mini-turret');await cell(page,16,16);
    await expect.poll(async()=>(await world(page)).jobs.filter(j=>j.kind==='mini-turret').length).toBe(1);
    await page.locator('[data-speed="1"]').click();await page.waitForFunction(()=>window.__lisiere.world.jobs.some(j=>j.kind==='mini-turret'&&j.construction==='frame'&&j.progress>0),null,{timeout:45_000});
    await pause(page);const building=await world(page),frame=building.jobs.find(j=>j.kind==='mini-turret')!;expect(building.structures.some(s=>s.turret)).toBe(false);expect(frame.progress).toBeGreaterThan(0);
    expect(frame.construction).toBe('frame');proof.frame={tick:building.tick,id:frame.id,status:frame.status,construction:frame.construction,progress:frame.progress,escrow:frame.escrow};await saveAndReload(page);
    await page.locator('[data-speed="6"]').click();await page.waitForFunction(()=>window.__lisiere.world.structures.some(s=>s.kind==='mini-turret'&&s.power?.on===true),null,{timeout:30_000});await pause(page);
    const built=await world(page),s=built.structures.find(s=>s.kind==='mini-turret')!;expect(s.turret!.ammoQ).toBe(240);expect(s.power!.on).toBe(true);expect(s.power!.parentId).not.toBeNull();expect(s.damage).toBeUndefined();
    await twoViewsAndKeyboard(page,s.id,proof);await inspectGun(page,s.id);
    const hold=page.locator('[data-turret-hold-fire]');await hold.focus();await page.keyboard.press('Enter');await expect(hold).toHaveAttribute('aria-pressed','true');expect(gun(await world(page),s.id).turret!.holdFire).toBe(true);
    const full=page.locator('[data-turret-rearm]');await expect(full).toHaveAttribute('aria-disabled','true');const before=await world(page);await full.focus();await expect(page.locator('#game-tooltip')).toContainText('plein');await page.keyboard.press('Enter');await expectWorld(page,before);await page.keyboard.press('Escape');
    await perform(page,{reason:'Demander la vraie coupure électrique.',command:{type:'power-flick',structureId:s.id,on:false}},{value:0});
    await page.locator('[data-speed="6"]').click();await page.waitForFunction(id=>window.__lisiere.world.structures.find(s=>s.id===id)?.power?.switchOn===false,s.id);await pause(page);
    const off=await saveAndReload(page);expect(gun(off,s.id).turret!.ammoQ).toBe(240);expect(gun(off,s.id).power!.on).toBe(false);proof.finished={tick:off.tick,id:s.id,canon:gun(off,s.id).turret,circuit:gun(off,s.id).power};
  });
});

test('V212 native real firing, produced cooldown continuation and physical personal rearm by a drafted pacifist',async({playwright},info)=>{
  test.setTimeout(150_000);const intact=turretCombatNativeFixture(),browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  expect(intact.world.projectiles).toBeUndefined();expect(gun(intact.world,intact.turretId).turret!.ammoQ).toBe(240);
  await execute(browser,intact.world,'fire-service',info,async(page,proof)=>{
    await inspectGun(page,intact.turretId);const hold=page.locator('[data-turret-hold-fire]');await hold.focus();await page.keyboard.press('Enter');await expect(hold).toHaveAttribute('aria-pressed','false');
    await page.locator('[data-speed="1"]').click();const emitted=await page.waitForFunction(id=>{const w=window.__lisiere.world;return w.structures.find(s=>s.id===id)?.turret?.ammoQ!<240&&w.projectiles?.some(p=>p.weaponItem==='mini-turret-gun')?JSON.stringify(w):false;},intact.turretId);
    const fired=JSON.parse(await emitted.jsonValue() as string) as World;expect(validateWorld(fired)).toEqual([]);expect(fired.projectiles!.some(p=>p.flight.launcherKey===`structure:${intact.turretId}`)).toBe(true);
    proof.firing={tick:fired.tick,canon:gun(fired,intact.turretId).turret,projectiles:fired.projectiles};await pause(page);
    // This separate service branch is a real producer checkpoint, not a
    // fabricated 8-Core phase. Import uses the player's file control.
    const checkpoint=producedTurretServiceCheckpoint();expect(backgroundWorkRefusal(checkpoint.world.pawns[0]!,'hunt')).toBeDefined();proof.serviceCheckpoint={tick:checkpoint.world.tick,producedTicks:checkpoint.producedTicks,ammoQ:checkpoint.ammoQ};
    await panel(page,'menu');await page.locator('#browse-saves').click();await page.locator('.front-menu input[type="file"]').setInputFiles({name:'real-cooldown.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(checkpoint.world))});await expectWorld(page,checkpoint.world);
    await saveAndReload(page);await perform(page,{reason:'Mobiliser le pacifiste sans lui donner une attaque.',command:{type:'draft',pawnIds:[checkpoint.pawnId],enabled:true}},{value:0});
    await inspectGun(page,checkpoint.turretId);await page.locator('[data-turret-worker]').selectOption(String(checkpoint.pawnId));const rearm=page.locator('[data-turret-rearm]');await expect(rearm).toHaveAttribute('aria-disabled','false');await rearm.focus();await page.keyboard.press('Enter');
    await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===checkpoint.pawnId)?.haul?.destination.type).toBe('turret');
    await page.locator('[data-speed="1"]').click();await page.waitForFunction(id=>{const p=window.__lisiere.world.pawns.find(p=>p.id===id);return p?.haul?.destination.type==='turret'&&(p.haul.serviceProgress??0)>0;},checkpoint.pawnId,{timeout:40_000});await pause(page);
    const serving=await world(page),worker=serving.pawns.find(p=>p.id===checkpoint.pawnId)!;expect(worker.draft).toBeDefined();expect(worker.haul?.carryPileId).not.toBeNull();expect(worker.state).toBe('working');expect(gun(serving,checkpoint.turretId).turret!.ammoQ).toBe(checkpoint.ammoQ);
    proof.service={tick:serving.tick,task:worker.haul,canon:gun(serving,checkpoint.turretId).turret};await saveAndReload(page);
    await page.locator('[data-speed="1"]').click();await page.waitForFunction(id=>window.__lisiere.world.structures.find(s=>s.id===id)?.turret?.ammoQ===240,checkpoint.turretId,{timeout:20_000});await pause(page);
    const completed=await saveAndReload(page);expect(completed.pawns.find(p=>p.id===checkpoint.pawnId)!.haul).toBeNull();expect(gun(completed,checkpoint.turretId).turret!.holdFire).toBe(true);proof.completedService={tick:completed.tick,canon:gun(completed,checkpoint.turretId).turret};await twoViewsAndKeyboard(page,checkpoint.turretId,proof);
  });
});

test('V212 native future physical damage, engaged fuse, actual refuge, captured Bomb wave and exact imported continuation',async({playwright},info)=>{
  test.setTimeout(180_000);const fixture=turretDangerNativeFixture(),initial=fixture.world;
  expect(initial.structures.every(s=>!s.damage&&!s.turret?.wick)).toBe(true);expect(initial.bombWaves).toBeUndefined();expect(initial.pawns.every(p=>!p.bombRefuge&&!p.mental?.crisis)).toBe(true);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  await execute(browser,initial,'danger',info,async(page,proof)=>{
    await perform(page,{reason:'Engager le travail réel avant l’exposition mentale future.',command:{type:'order-job',pawnId:fixture.aggressorId,jobId:fixture.jobId,queue:false}},{value:0});
    await page.locator('[data-speed="3"]').click();await page.waitForFunction(id=>window.__lisiere.world.structures.find(s=>s.id===id)?.turret?.wick!==undefined,fixture.turretId,{timeout:60_000});await pause(page);
    const wicked=await world(page),s=gun(wicked,fixture.turretId);expect(s.damage).toBeGreaterThanOrEqual(80);expect(s.turret!.ammoQ).toBe(240);expect(s.power!.on).toBe(false);proof.wick={tick:wicked.tick,damage:s.damage,wick:s.turret!.wick};
    await inspectGun(page,s.id);await expect(page.locator('[data-turret-fact="danger"]')).toContainText('Mèche engagée');await expect(page.locator('#alerts')).toContainText('mèche engagée');
    await twoViewsAndKeyboard(page,s.id,proof);await saveAndReload(page);await page.locator('[data-speed="1"]').click();
    const recorded=await page.waitForFunction(()=>{const w=window.__lisiere.world;return w.bombWaves?.length?JSON.stringify(w):false;},null,{timeout:15_000});
    const birth=JSON.parse(await recorded.jsonValue() as string) as World;expect(validateWorld(birth)).toEqual([]);expect(birth.structures.some(t=>t.id===fixture.turretId)).toBe(false);expect(birth.bombWaves![0]!.sourceId).toBe(fixture.turretId);
    expect(birth.projectiles).toBeUndefined();proof.bomb={tick:birth.tick,wave:birth.bombWaves![0],refuges:birth.pawns.map(p=>({id:p.id,position:{x:p.x,z:p.z},refuge:p.bombRefuge,motion:p.motion}))};await pause(page);
    // A one-tick retained wave need not still be displayed when the UI pause is
    // acknowledged. Restore the exact frame observed from the actual browser
    // producer through import, then exercise its save and physical suffix.
    await panel(page,'menu');await page.locator('#browse-saves').click();await page.locator('.front-menu input[type="file"]').setInputFiles({name:'observed-bomb-wave.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(birth))});await expectWorld(page,birth);await saveAndReload(page);
    await page.locator('[data-speed="1"]').click();await page.waitForFunction(tick=>window.__lisiere.tick>tick&&!window.__lisiere.world.bombWaves,birth.tick);await pause(page);
    const after=await world(page),suffix=after.tick-birth.tick;expect(suffix).toBeGreaterThan(0);expect(suffix).toBeLessThanOrEqual(20);
    const oracle=structuredClone(birth);stepWorld(oracle,suffix);expect(after).toEqual(oracle);expect(validateWorld(after)).toEqual([]);proof.continuation={ticks:suffix,tick:after.tick,exact:true};await saveAndReload(page);
  });
});
