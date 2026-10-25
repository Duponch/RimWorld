// ROOT only. Actual paused GameSession and native input, private browser;
// the observation hook never writes to a World or bypasses a game command.
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const base='http://127.0.0.1:5196',folder=resolve('tmp/ui3d-density-v477',`game-${new Date().toISOString().replaceAll(':','-')}`);
await mkdir(folder,{recursive:true});
const bytes=await readFile('public/test-saves/v419/les-eclaircies.json','utf8');
const hook=String.raw`
window.__density={get ready(){return !!window.__lisiere&&!session.busy&&!replacingWorld&&!presentationPreparation&&!graphicsRecovering},
 load:data=>replaceColony(()=>session.loadExternal(async()=>data)),select:selectPawn,panel:setPanel,
 get docks(){return {preferences:{...nativeDockPreferences},rightOpen:nativeHud?.getRightDockOpen(),right:nativeHud?.getRightDockBounds()}},
 get view(){return {walls:wallCutaway,roofs:nativeRoofsVisible,foliage:foliageVisible,zones:nativeZonesVisible,camera:nativePerspective}}};
`;
const report={folder,inputSHA:createHash('sha256').update(bytes).digest('hex'),checks:[],captures:[],errors:[]};
const browser=await chromium.launch({executablePath:resolve('.playwright/chromium-1243/chrome-win64/chrome.exe'),headless:false,args:['--mute-audio','--enable-unsafe-webgpu']});
const timer=setTimeout(()=>{console.error('Density game check exceeded its bounded budget');void browser.close();},process.argv.includes('--native-only')?240000:360000);
let context,page;
const save=()=>writeFile(resolve(folder,'report.json'),JSON.stringify(report,null,2));
try{
 if(process.argv.includes('--native-only')){const previous=process.argv.find(arg=>arg.startsWith('--legacy-report='))?.slice('--legacy-report='.length);assert.ok(previous,'--legacy-report required');const witness=JSON.parse(await readFile(previous,'utf8'));assert.equal(witness.inputSHA,report.inputSHA);report.legacy=witness.legacy;report.legacyReport=previous;}
 for(const mode of process.argv.includes('--native-only')?['native']:['legacy','native']){
  context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  await context.addInitScript(()=>{localStorage.setItem('lisiere.audio.effects.enabled.v1','false');localStorage.setItem('lisiere.audio.music.enabled.v1','false');});
  page=await context.newPage();page.on('pageerror',error=>report.errors.push(mode+': '+String(error)));
  await page.route('**/src/main.ts*',async route=>{const response=await route.fetch(),body=await response.text();await route.fulfill({response,body:body+hook});});
  await page.goto(`${base}/?e2e&ui=${mode}`,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>window.__density?.ready,null,{timeout:60000});
  await page.evaluate(data=>window.__density.load(data),bytes);console.log(JSON.stringify({mode,phase:'loaded'}));
  await page.waitForFunction(()=>window.__density.ready&&window.__lisiere.hasActiveMap&&window.__lisiere.backend==='WebGPU'&&!window.__lisiere.nativeUi?.front,null,{timeout:90000});
  assert.equal(await page.evaluate(()=>window.__lisiere.speed),0);
  const world=await page.evaluate(()=>window.__lisiere.world),pawn=world.pawns[0];
  const shot=async name=>{await page.waitForTimeout(220);const path=resolve(folder,`${mode}-${name}.png`);await page.screenshot({path});report.captures.push(path);};
  if(mode==='legacy'){
   await page.evaluate(id=>window.__density.select(id),pawn.id);
   report.legacy={};
   for(const tab of ['bio','needs','health']){
    await page.locator(`[data-colonist-tab="${tab}"]`).click();
    report.legacy[tab]=await page.locator('#inspector').evaluate(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,scroll:el.scrollHeight-el.clientHeight};});
    await shot(tab);
   }
   await context.close();context=undefined;continue;
  }
  const ui=()=>page.evaluate(()=>window.__lisiere.nativeUi);
  const find=async id=>{await page.waitForFunction(id=>window.__lisiere.nativeUi.controls.some(row=>row.id===id&&!row.disabled),id,{timeout:12000});return page.evaluate(id=>window.__lisiere.nativeUi.controls.find(row=>row.id===id),id);};
  const click=async id=>{const point=await find(id);await page.mouse.click(point.x,point.y);await page.waitForTimeout(180);};
  const target=async id=>{const point=await page.evaluate(id=>window.__lisiere.nativeUi.targets.find(row=>row.nativeId===id),id);assert.ok(point,id);await page.mouse.click(point.x,point.y);await page.waitForTimeout(180);};
  const management=async id=>{const point=(await ui()).management.find(row=>row.id===id);assert.ok(point);await page.mouse.click(point.x,point.y);await page.waitForTimeout(200);};
  const close=async()=>{await page.keyboard.press('Escape');await page.waitForTimeout(180);};
  assert.equal(await page.locator('button,select,dialog,input').count(),0);
  await page.mouse.move(700,450);await page.waitForTimeout(500);
  let current=await ui();
  const resources=current.targets.filter(row=>row.nativeId?.startsWith('hud:resource:'));
  assert.ok(resources.length);assert.ok(resources.every(row=>row.paper===false));
  if(current.readout?.visible){assert.equal(current.readout.paper,false);assert.ok(current.readout.height<=current.readout.lines.length*34+8);}
  for(const id of ['walls','roofs','foliage','zones','home','camera'])assert.ok(current.targets.some(row=>row.nativeId===`hud:view:${id}`));
  assert.ok(!current.targets.some(row=>row.nativeId==='hud:colonists:summary'));
  await shot('hud');report.checks.push('HUD ink only, direct view controls, no added roster strip');
  await target(`hud:pawn:${pawn.id}`);
  report.native={};
  for(const tab of ['bio','needs','health']){
   await click(`pawn-tab-${tab}`);current=await ui();const bounds=current.pageBounds;
   assert.ok(bounds.width<=report.legacy[tab].width+2,`${tab} width ${bounds.width} exceeds legacy ${report.legacy[tab].width}`);
   assert.ok(bounds.height<=report.legacy[tab].height+2,`${tab} height ${bounds.height} exceeds legacy ${report.legacy[tab].height}`);
   if(tab==='bio'){assert.equal(current.rows.filter(row=>row.id.startsWith('skill-')).length,12);assert.ok(current.rows.filter(row=>row.id.startsWith('skill-')).every(row=>row.visible&&row.meter));}
   if(current.maxScroll>0)assert.ok(current.targets.some(row=>row.nativeId==='native-scroll-thumb'));
   report.native[tab]={bounds,maxScroll:current.maxScroll,rows:current.rows};await shot(tab);
  }
  await close();
  if(process.argv.includes('--inspect-only')){assert.equal(report.native.health.maxScroll,0,'ordinary health overview fits without extra scrolling');for(const id of ['animals','history','menu']){await management(id);await shot(id);await close();}await page.setViewportSize({width:2557,height:1440});await target(`hud:pawn:${pawn.id}`);await click('pawn-tab-bio');assert.equal((await ui()).pageBounds.width,514);await shot('bio-wide');report.checks.push('Compact health overview fits without scrolling; small panels remain bounded');await context.close();context=undefined;continue;}
  await management('work');current=await ui();assert.equal(current.page,'work');
  await click(`work-${pawn.id}-build`);current=await ui();assert.equal(current.page,'work');assert.equal(current.dropdown.owner,`work-${pawn.id}-build`);
  assert.equal(current.controls.filter(row=>row.id.startsWith('select-option:')).length,5);await shot('work-dropdown');
  await click(`select-option:work-${pawn.id}-build:3`);
  await page.waitForFunction(id=>window.__lisiere.world.pawns.find(pawn=>pawn.id===id).priorities.build===3,pawn.id);
  assert.equal((await ui()).page,'work');await close();report.checks.push('Work local dropdown acknowledges actual priority command');console.log('Native work priority acquired');
  await management('schedule');await click('brush-sleep');
  const start=await find(`hour-${pawn.id}-2`),end=await find(`hour-${pawn.id}-6`);
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:16});await page.mouse.up();
  await page.waitForFunction(id=>window.__lisiere.world.pawns.find(pawn=>pawn.id===id).schedule.slice(2,7).every(value=>value==='sleep'),pawn.id);
  await shot('schedule');await close();report.checks.push('Planning paints five hours with native drag');
  for(const kind of ['orders','zones']){await target(`map-dock:${kind}`);assert.equal((await ui()).page,`map-tools-${kind}`);await shot(kind);await close();}
  for(const id of ['assign','animals','research','history','architect']){await management(id);current=await ui();assert.ok(current.page);await shot(id);await close();}
  report.checks.push('Separate Orders/Zones palettes and compact management pages');
  const viewBefore=await page.evaluate(()=>window.__density.view);await target('hud:view:foliage');assert.equal((await page.evaluate(()=>window.__density.view)).foliage,!viewBefore.foliage);await target('hud:view:foliage');
  await management('menu');await click('native-options');await click('auto-hide-bottom');await click('auto-hide-notifications');
  const preferences=await page.evaluate(()=>({stored:JSON.parse(localStorage.getItem('elsewhere.ui3d.auto-hide.v1')),actual:window.__density.docks.preferences}));
  assert.deepEqual(preferences,{stored:{bottom:true,notifications:true},actual:{bottom:true,notifications:true}});await shot('options');
  await close();await click('resume');await page.mouse.move(700,450);await page.waitForTimeout(1100);
  assert.equal((await ui()).bottomDock.offset,-.72);assert.equal((await page.evaluate(()=>window.__density.docks)).rightOpen,false);await shot('hidden-docks');
  await page.mouse.move(700,999);await page.waitForTimeout(1000);assert.equal((await ui()).bottomDock.offset,0);
  await page.mouse.move(1439,120);await page.waitForTimeout(1000);assert.equal((await page.evaluate(()=>window.__density.docks)).rightOpen,true);await shot('revealed-notifications');
  await page.setViewportSize({width:2557,height:1440});await page.mouse.move(1000,1439);await page.waitForTimeout(800);await target(`hud:pawn:${pawn.id}`);await click('pawn-tab-bio');
  assert.equal((await ui()).pageBounds.width,514);assert.ok((await ui()).pageBounds.height<=489);await shot('bio-wide');
  console.log('Native interactions and dock animation acquired; checking reload');
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__density?.ready,null,{timeout:60000});
  assert.deepEqual(await page.evaluate(()=>window.__density.docks.preferences),{bottom:true,notifications:true});assert.equal((await ui()).bottomDock.autoHide,true);
  report.checks.push('Both docks animated at screen edges, persisted after reload, Bio fixed at wide resolution');
  await context.close();context=undefined;
 }
 assert.deepEqual(report.errors,[]);report.ok=true;await save();console.log(JSON.stringify({folder,checks:report.checks,errors:report.errors}));
}catch(error){report.failure=String(error?.stack??error);if(page&&!page.isClosed()){await page.screenshot({path:resolve(folder,'failure.png')}).catch(()=>{});report.ui=await page.evaluate(()=>window.__lisiere?.nativeUi).catch(()=>null);}await save();throw error;
}finally{clearTimeout(timer);await context?.close().catch(()=>{});await browser.close();}
