import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';
import { stonecuttingLoad } from '../tests/scenarios/stonecutting.ts';
import { fixtureFire } from '../tests/scenarios/work-environment.ts';
import { serializeWorld } from '../src/sim/serialization.ts';
import { installGpuCallProbe } from './gpu-call-probe.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('@playwright/test');
const stats = a => { const s = [...a].sort((a,b)=>a-b); return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)}; };
const probe = `
window.__miningBench={active:false,view:null,previous:null,frames:[],adoptions:[],pipelines:[],peakWorkers:0};
for(const method of ['frame','setWorld']) {const original=ColonyRenderer.prototype[method];ColonyRenderer.prototype[method]=function(...args){
 const b=window.__miningBench;b.view=this;const start=performance.now();const result=original.apply(this,args),elapsed=performance.now()-start;
 if(b.active){if(method==='frame'){b.frames.push({cpu:elapsed,interval:b.previous===null?null:args[0]-b.previous,calls:this.stats.drawCalls});b.previous=args[0];}
 else{b.adoptions.push(elapsed);b.peakWorkers=Math.max(b.peakWorkers,args[0].pawns.filter(p=>p.cooking?.phase==='work').length);}}return result;};}
`;
const report={date:new Date().toISOString(),cpu:os.cpus()[0].model,node:process.version,viewport:{width:1440,height:1000},protocol:'Native WebGPU, 250², 100 real artisans, 100 campfires, 300 chunks into 6000 blocks. Same texture/cache cost in both runs; shading disabled in the control only. 90-frame warmup; no heavy concurrent tasks. Separate paused perspective/verified overview LOD and 8 simultaneous 100-emitter toggles. Diagnostic toggles preserve immutable terrain references, with no full-world cloning in timed frames. Each browser closes in finally; workload watchdog 90s.',runs:[]};
const browser=await chromium.launch({channel:'chromium',args:[]});
try {for(const enabled of [false,true]) {
 const page=await browser.newPage({viewport:report.viewport}), errors=[];page.setDefaultTimeout(20000);
 try {
  await page.addInitScript(installGpuCallProbe,false);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))errors.push(m.text());});
  await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
  if(!enabled)await page.route('**/src/render/EnvironmentLighting.ts*',async route=>{const response=await route.fetch(),body=await response.text(),needle='if (this.configured.has(material))';if(!body.includes(needle))throw new Error('Control hook missing');await route.fulfill({response,body:body.replace(needle,'return; '+needle)});});
  const w=stonecuttingLoad(100);for(const p of w.pawns)fixtureFire(w,p.x+3,p.z+3);
  await page.addInitScript(data=>localStorage.setItem('lisiere.save.v1',data),serializeWorld(w));
  await page.goto('http://127.0.0.1:5173/?scenario=camp&size=32&e2e');await page.waitForFunction(()=>window.__lisiere);
  await page.locator('[data-speed="0"]').click();await page.locator('[data-panel="menu"]').click();await page.locator('#load').click();
  await page.waitForFunction(()=>window.__miningBench.view.world?.width===250&&!window.__miningBench.view.preparing);await page.keyboard.press('Escape');
  const waitFrames=n=>page.evaluate(n=>new Promise(resolve=>{function f(){if(!--n)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);}),n);
  await page.mouse.move(900,350);await page.mouse.wheel(0,600);await waitFrames(90);
  const adapter=await page.evaluate(()=>{const a=window.__miningBench.view.renderer.getContext().getConfiguration().device.adapterInfo;return {vendor:a.vendor,architecture:a.architecture,description:a.description};});
  const start=()=>page.evaluate(()=>{const b=window.__miningBench;b.active=true;b.previous=null;b.frames=[];b.adoptions=[];b.pipelines=[];});
  const finish=async()=>{const d=await page.evaluate(()=>{const b=window.__miningBench;b.active=false;return {frames:b.frames,adoptions:b.adoptions,pipelines:b.pipelines};});return {frames:stats(d.frames.flatMap(f=>f.interval===null?[]:[f.interval])),frameCpu:stats(d.frames.map(f=>f.cpu)),drawCalls:stats(d.frames.map(f=>f.calls)),adoptions:stats(d.adoptions),pipelines:d.pipelines};};
  await start();await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(()=>{const w=window.__miningBench.view.world;return w.piles.filter(p=>p.kind==='blocks').reduce((n,p)=>n+p.quantity,0)===6000&&!w.pawns.some(p=>p.cooking);},{},{timeout:90000,polling:250});
  await page.locator('[data-speed="0"]').click();const active=await finish();await waitFrames(90);
  const outcome=await page.evaluate(()=>{const b=window.__miningBench,w=b.view.world;return {blocks:w.piles.filter(p=>p.kind==='blocks').reduce((n,p)=>n+p.quantity,0),peakWorkers:b.peakWorkers,tick:w.tick,fieldRevisions:b.view.environmentLighting.field.revision};});
  await start();await waitFrames(360);const iso=await finish();
  await page.locator('#camera-mode').click();await waitFrames(90);await start();await waitFrames(360);const perspective=await finish();
  await page.evaluate(()=>{const v=window.__miningBench.view;v.rig.setMode('orthographic');v.rig.orthographic.zoom=v.rig.controls.minZoom*1.5;v.rig.orthographic.updateProjectionMatrix();});await waitFrames(120);
  if(!await page.evaluate(()=>window.__miningBench.view.overview.group.visible))throw new Error('Overview LOD not reached');
  await start();await waitFrames(360);const overview=await finish();
  await start();const textureBefore=await page.evaluate(()=>window.__miningBench.view.environmentLighting.map.version);
  for(let i=0;i<8;i++){await page.evaluate(i=>{const view=window.__miningBench.view,w={...view.world,structures:view.world.structures.map(s=>s.kind==='campfire'?{...s,fuel:{...s.fuel,ticks:i%2?12000:0}}:s)};view.setWorld(w,false,0);},i);await waitFrames(60);}
  const toggles=await finish(),textureUploads=await page.evaluate(()=>window.__miningBench.view.environmentLighting.map.version)-textureBefore;
  report.runs.push({enabled,adapter,errors,outcome,active,iso,perspective,overview,toggles,textureUploads});
  if(errors.length||active.pipelines.length||iso.pipelines.length||perspective.pipelines.length||overview.pipelines.length||toggles.pipelines.length||outcome.blocks!==6000||textureUploads!==8)throw new Error('Lighting benchmark outcome/pipeline invariant failed');
 }finally{await page.close();}
}}catch(error){report.error=String(error);throw error;}finally{await browser.close();await writeFile('artifacts/environment-lighting-render.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
