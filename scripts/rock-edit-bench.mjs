import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';
process.env.PLAYWRIGHT_BROWSERS_PATH ??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const output=process.argv[2]??'artifacts/rock-edit-benchmark.json';
const legacy=process.argv[3]==='legacy';
const imagePrefix=output.replace(/\.json$/, '');
const browser=await chromium.launch({channel:'chromium'});
const report={legacyColors:legacy,timestamp:new Date().toISOString(),cpu:os.cpus()[0].model,viewport:{width:1440,height:1000},errors:[],protocol:'Hardware WebGPU, 250x250 seed 42, paused, focused outcrop. Twelve diagnostic rock-to-soil edits at 300 ms spacing after 90 warmup frames, one browser promise. These are presentation tests, not playable mining.'};
try {
  const page=await browser.newPage({viewport:report.viewport});
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
  await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:`window.__rockView=null;const rockFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(t){window.__rockView=this;return rockFrame.call(this,t);};\n`+await response.text()});});
  await page.goto('http://127.0.0.1:5173/?scenario=camp&e2e&size=250&seed=42');await page.waitForFunction(()=>window.__rockView?.world);
  await page.locator('[data-speed="0"]').click();
  if(legacy)await page.evaluate(()=>{const v=window.__rockView,w=structuredClone(v.world);for(const t of w.tiles)delete t.stone;for(const r of w.resources)delete r.stone;v.setWorld(w,false,0);});
  report.adapter=await page.evaluate(()=>{const i=window.__rockView.renderer.getContext().getConfiguration().device.adapterInfo;return {vendor:i.vendor,architecture:i.architecture,description:i.description};});
  await page.evaluate(()=>{
    const v=window.__rockView,w=v.world,cx=w.width/2,cz=w.height/2;
    const cells=w.tiles.flatMap((t,i)=>t.terrain==='rock'?[i]:[]);
    cells.sort((a,b)=>Math.hypot(a%w.width-cx,Math.floor(a/w.width)-cz)-Math.hypot(b%w.width-cx,Math.floor(b/w.width)-cz));
    const i=cells[0],x=i%w.width,z=Math.floor(i/w.width);
    const delta=v.controls.target.clone().set(x+3,0,z+3).sub(v.controls.target);v.controls.target.add(delta);v.camera.position.add(delta);v.camera.zoom=.8;v.camera.updateProjectionMatrix();v.controls.update();
  });
  await page.evaluate(()=>new Promise(resolve=>{let frames=90;function next(){if(--frames===0)resolve();else requestAnimationFrame(next);}requestAnimationFrame(next);}));
  await page.screenshot({path:imagePrefix+'-close.png'});
  report.edits=await page.evaluate(()=>new Promise(resolve=>{
    const v=window.__rockView,initial=v.world,geometry=v.rocks.mesh.geometry,position=geometry.getAttribute('position'),index=geometry.index;
    const camera=v.camera.position.clone(),target=v.controls.target.clone(),records=[],intervals=[];
    const candidates=initial.tiles.flatMap((t,i)=>t.terrain==='rock'?[i]:[]).sort((a,b)=>Math.hypot(a%initial.width-target.x,Math.floor(a/initial.width)-target.z)-Math.hypot(b%initial.width-target.x,Math.floor(b/initial.width)-target.z)).slice(0,12);
    let last=0,previous=0,world=initial;
    function frame(now){
      if(previous)intervals.push(now-previous);previous=now;
      if(now-last>=300&&records.length<candidates.length){
        last=now;const cell=candidates[records.length],tiles=world.tiles.slice();tiles[cell]={terrain:'soil'};world={...world,tiles};
        const started=performance.now();v.setWorld(world,false,0);records.push({cell,cpuMs:performance.now()-started,updatedCells:v.rocks.stats.updatedCells,indexCount:v.rocks.stats.indexCount,drawCalls:v.stats.drawCalls,triangles:v.renderer.info.render.triangles});
      }
      if(records.length===candidates.length&&now-last>300){
        resolve({records,intervals,stableBuffers:v.rocks.mesh.geometry===geometry&&geometry.getAttribute('position')===position&&geometry.index===index,stableCamera:v.camera.position.distanceTo(camera)<1e-9&&v.controls.target.distanceTo(target)<1e-9,bufferBytes:v.rocks.stats.bufferBytes});return;
      }requestAnimationFrame(frame);
    }requestAnimationFrame(frame);
  }));
  await page.screenshot({path:imagePrefix+'-excavated.png'});
  if(report.errors.length||!report.edits.stableBuffers||!report.edits.stableCamera||report.edits.records.some(r=>r.updatedCells>9))throw new Error(JSON.stringify(report));
} finally {await browser.close();}
const intervals=report.edits.intervals.sort((a,b)=>a-b);report.frameMs={count:intervals.length,p95:intervals[Math.ceil(intervals.length*.95)-1],max:intervals.at(-1)};delete report.edits.intervals;
await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
