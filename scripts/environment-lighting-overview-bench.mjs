import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';
import { fixtureFire } from '../tests/scenarios/work-environment.ts';
import { createWorld, serializeWorld } from '../src/sim/index.ts';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('@playwright/test');
const report={date:new Date().toISOString(),cpu:os.cpus()[0].model,viewport:{width:1440,height:1000},protocol:'Natural seed 42, 250² at noon, native WebGPU, verified distant LOD. 120 warmup frames then 1200 samples; shading-only control. Three starting pawns paused; one campfire near the camp, so the spatial lighting branch is active locally. No heavy concurrency. Native backend verifies no idle scenery uploads, then one tree/rock removal and restoration with actual GPU uploads and return to idle.',runs:[]};
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const w=createWorld(42,250,250);w.tick=3000;fixtureFire(w,w.pawns[0].x+3,w.pawns[0].z);
const browser=await chromium.launch({channel:'chromium',args:[]});
try{for(const enabled of [false,true]){
 const page=await browser.newPage({viewport:report.viewport}),errors=[];page.setDefaultTimeout(30000);
 try{
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GPUValidationError/i.test(m.text()))errors.push(m.text());});
  await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:`const oldFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(...args){window.__lightView=this;return oldFrame.apply(this,args);};\n`+await response.text()});});
  if(!enabled)await page.route('**/src/render/EnvironmentLighting.ts*',async route=>{const response=await route.fetch(),body=await response.text(),needle='if (this.configured.has(material))';if(!body.includes(needle))throw new Error('Control hook missing');await route.fulfill({response,body:body.replace(needle,'return; '+needle)});});
  await page.addInitScript(data=>localStorage.setItem('lisiere.save.v1',data),serializeWorld(w));
  await page.goto('http://127.0.0.1:5173/?scenario=camp&size=32&e2e');await page.waitForFunction(()=>window.__lisiere);
  await page.locator('[data-speed="0"]').click();await page.locator('[data-panel="menu"]').click();await page.locator('#load').click();
  await page.waitForFunction(()=>window.__lightView.world?.width===250&&!window.__lightView.preparing);await page.keyboard.press('Escape');
  await page.evaluate(()=>{const v=window.__lightView;v.rig.orthographic.zoom=v.rig.controls.minZoom*1.5;v.rig.orthographic.updateProjectionMatrix();});
  await page.waitForFunction(()=>window.__lightView.overview.group.visible);
  await page.evaluate(()=>{
   const v=window.__lightView, arrays=new Map(), backend=v.renderer.backend, original=backend.updateAttribute.bind(backend);
   for(const [name,a] of Object.entries(v.rocks.mesh.geometry.attributes))arrays.set(a.array,'rock-'+name);
   arrays.set(v.rocks.mesh.geometry.index.array,'rock-index');
   for(const [kind,m] of v.overview.batches)arrays.set(m.instanceMatrix.array,'instances-'+kind);
   window.__sceneryUploads={};
   backend.updateAttribute=a=>{const name=arrays.get((a.data??a).array);if(name)window.__sceneryUploads[name]=(window.__sceneryUploads[name]??0)+1;return original(a);};
  });
  const samples=await page.evaluate(()=>new Promise(resolve=>{const intervals=[],calls=[],triangles=[];let warm=120,previous=null;const watchdog=setTimeout(()=>resolve({error:'30-second frame watchdog'}),30000);function f(now){if(warm){warm--;previous=now;if(!warm)window.__sceneryUploads={};}else{intervals.push(now-previous);previous=now;calls.push(window.__lightView.stats.drawCalls);triangles.push(window.__lightView.stats.triangles);}if(intervals.length<1200)requestAnimationFrame(f);else{clearTimeout(watchdog);const a=window.__lightView.renderer.getContext().getConfiguration().device.adapterInfo;resolve({intervals,calls,triangles,idleUploads:{...window.__sceneryUploads},adapter:{vendor:a.vendor,architecture:a.architecture}});}}requestAnimationFrame(f);}));
  if(samples.error)throw new Error(samples.error);
  const mutation=await page.evaluate(async()=>{
   const v=window.__lightView,w=v.world,tree=w.resources.find(r=>r.kind==='tree'),rock=w.tiles.findIndex(t=>t.terrain==='rock');
   const changed={...w,resources:w.resources.filter(r=>r.id!==tree.id),tiles:w.tiles.map((t,i)=>i===rock?{terrain:'rough-stone',stone:t.stone}:t)};
   const frames=()=>new Promise(resolve=>{let n=20;function f(){if(!--n)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);});
   window.__sceneryUploads={};v.setWorld(changed,false,0);await frames();const removed={...window.__sceneryUploads};
   window.__sceneryUploads={};v.setWorld(w,false,0);await frames();const restored={...window.__sceneryUploads};
   window.__sceneryUploads={};await frames();return {removed,restored,settled:{...window.__sceneryUploads}};
  });
  if(Object.values(samples.idleUploads).some(n=>n>0)||Object.values(mutation.settled).some(n=>n>0)||!mutation.removed['instances-tree']||!mutation.restored['instances-tree']||!mutation.removed['rock-position']||!mutation.restored['rock-position'])throw new Error('Scenery upload lifecycle failed: '+JSON.stringify({samples:samples.idleUploads,mutation}));
  report.runs.push({enabled,errors,resources:w.resources.length,idleUploads:samples.idleUploads,mutation,adapter:samples.adapter,frames:stats(samples.intervals),drawCalls:stats(samples.calls),triangles:stats(samples.triangles)});
  if(errors.length)throw new Error(errors.join('\n'));
 }finally{await page.close();}
}}finally{await browser.close();await writeFile('artifacts/environment-lighting-overview.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
