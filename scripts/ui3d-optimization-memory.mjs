// Logical explicit GPU allocations, not physical VRAM; ROOT only, sequential.
import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const arg=name=>process.argv.find(x=>x.startsWith(name+'='))?.slice(name.length+1);
const out=resolve('tmp/ui3d-optimization-v478','memory-'+new Date().toISOString().replaceAll(':','-'));
await mkdir(out,{recursive:true});
// Reuse the already qualified observer exactly, avoiding a second byte model.
const observerSource=await readFile('scripts/ui3d-gpu-audit.mjs','utf8');
const observer=observerSource.slice(observerSource.indexOf('function observeRequestedGPUAllocations(){'),observerSource.indexOf('const hook=String.raw'));
assert.ok(observer.startsWith('function observeRequestedGPUAllocations()')&&observer.includes('window.__uiGpuAlloc='));
async function boot(THREE,NativeStage){
  const errors=[],stage=new NativeStage({onPanel:()=>{},onEscape:()=>{},onError:x=>errors.push(x)});
  await stage.ready;
  // Require a true front render before hiding: a lazily unallocated surface
  // would conceal the regression this diagnostic needs to exercise.
  stage.ownRenderer.render(stage.scene,stage.camera);
  const front=window.__uiGpuAlloc.snapshot(true);
  stage.setWorldVisible(true);stage.setFrontVisible(false);
  const renderer=new THREE.WebGPURenderer({antialias:true});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);
  await renderer.init();const bg=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
  const render=()=>{renderer.render(bg,camera);stage.renderOverlay(renderer);};
  render();stage.sceneRevision++;render();
  window.__memory={stage,renderer,front,errors,render,
    hover(){stage.animate=()=>{};stage.moving.clear();stage.setPose(stage.management[0],.8);render();},
    snapshot:()=>window.__uiGpuAlloc.snapshot(true),
    dispose(){stage.dispose();renderer.dispose();}};
}
const html='<!doctype html><meta charset="UTF-8"><link rel="icon" href="data:,"><script type="module">import * as THREE from "three/webgpu";import {NativeStage} from "/src/ui3d/NativeStage.ts";('+boot.toString()+')(THREE,NativeStage)</script>';
const fixture=resolve(out,'fixture.html'),fixtureRelative=relative(resolve('.'),fixture).replaceAll('\\','/');
await writeFile(fixture,html);
const baselineFixture=resolve(arg('--baseline-root')??'tmp/ui3d-optimization-v478/baseline',fixtureRelative);
await mkdir(resolve(baselineFixture,'..'),{recursive:true});await writeFile(baselineFixture,html);
const report={out,status:'RUN',observerSHA:createHash('sha256').update(observer).digest('hex'),contexts:[],errors:[],limits:['Explicit successful createTexture/createBuffer and destruction requests only. Canvas swapchain, driver overhead, implicit GC and physical VRAM excluded.','depth24plus physical size is opaque; its dimensions/sample counts are reported separately.','No CPU/FPS conclusion from this instrumented diagnostic.']};
const browser=await chromium.launch({executablePath:resolve('.playwright/chromium-1243/chrome-win64/chrome.exe'),headless:false,args:['--enable-unsafe-webgpu','--mute-audio']});
const timer=setTimeout(()=>void browser.close(),180000);
try{
  for(const [variant,origin]of [['baseline',arg('--baseline')??'http://127.0.0.1:5197'],['candidate',arg('--candidate')??'http://127.0.0.1:5196']]){
    for(const viewport of [{width:1440,height:1000},{width:2557,height:1440}]){
      const context=await browser.newContext({viewport,deviceScaleFactor:1});await context.addInitScript({content:observer+'\nobserveRequestedGPUAllocations();'});
      const page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
      await page.goto(origin+'/'+fixtureRelative,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__memory);
      const row={variant,viewport,...await page.evaluate(()=>({front:window.__memory.front,idle:window.__memory.snapshot(),ui:window.__memory.stage.diagnostics()}))};
      await page.evaluate(()=>window.__memory.hover());row.hover=await page.evaluate(()=>({allocations:window.__memory.snapshot(),ui:window.__memory.stage.diagnostics()}));
      report.contexts.push(row);await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));
      assert.equal(await page.evaluate(()=>window.__memory.stage.ownRenderer.domElement.style.display),'none');
      if(variant==='candidate'){assert.equal(row.ui.standby.parked,true);assert.deepEqual(row.ui.standby.drawingBuffer,{width:1,height:1});assert.ok(row.hover.ui.cache.partialCaptures>0);}
      await page.evaluate(()=>window.__memory.dispose());await context.close();
    }
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=String(e);throw e;}
finally{clearTimeout(timer);await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({out,status:report.status}));}
