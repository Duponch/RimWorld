import { researchLoad } from '../tests/scenarios/research-load.ts';
import { serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';
import { installGpuCallProbe } from './gpu-call-probe.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {n:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const prefix=`
window.__miningBench={active:false,pipelines:[],frames:[],workers:[],snapshots:[],previous:null,view:null};
const tailoringFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const t=performance.now(),r=tailoringFrame.apply(this,args),b=window.__miningBench;b.view=this;
if(b.active){b.frames.push({interval:b.previous===null?null:args[0]-b.previous,cpu:performance.now()-t,calls:this.stats.drawCalls});b.previous=args[0];}return r;};
`;
const suffix=`
const tailoringSnapshot=client.onSnapshot;client.onSnapshot=(...args)=>{const b=window.__miningBench,t=performance.now();try{return tailoringSnapshot(...args);}finally{if(b.active){b.workers.push(args[1]);b.snapshots.push(performance.now()-t);}}};
`;
const report={date:new Date().toISOString(),cpu:os.cpus()[0].model,viewport:{width:1440,height:1000},protocol:'Native Chromium WebGPU; natural 250², worn tribalwear on 3/30/100 actors. One third research at physical benches; others gather/craft tribalwear or mine/chop. Real worker at requested 6× through tick 2650, 90 warmup frames, one run each; no full World export during timing. Worker samples are published batch step averages, not an independent per-tick percentile.',rows:[]};
const browser=await chromium.launch({channel:'chromium',args:[]});
try{for(const count of [3,30,100]){
  const page=await browser.newPage({viewport:report.viewport}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(installGpuCallProbe,false);
  await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:prefix+await response.text()+suffix});});
  await page.addInitScript(data=>localStorage.setItem('lisiere.save.v1',data),serializeWorld(researchLoad(count)));
  await page.goto('http://127.0.0.1:5173/?e2e&size=250');await page.waitForFunction(()=>window.__miningBench.view?.world);
  await page.locator('[data-speed="0"]').click();await page.locator('[data-panel="menu"]').click();await page.locator('#load').click();await page.keyboard.press('Escape');
  await page.waitForFunction(n=>window.__miningBench.view.world.tick===2000&&window.__miningBench.view.world.pawns.length===n&&!document.querySelector('.game-shell').inert,count);
  await page.evaluate(()=>new Promise(resolve=>{let n=90;function frame(){if(!--n)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);}));
  const adapter=await page.evaluate(()=>{const a=window.__miningBench.view.renderer.getContext().getConfiguration().device.adapterInfo;return {vendor:a.vendor,architecture:a.architecture,description:a.description};});
  await page.evaluate(()=>{const b=window.__miningBench;b.initial=b.view.pawns.pawnMesh.geometry;b.active=true;});
  const start=performance.now();await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(()=>window.__miningBench.view.world.tick>=2650,undefined,{timeout:90000,polling:250});await page.locator('[data-speed="0"]').click();const elapsed=performance.now()-start;
  const data=await page.evaluate(()=>{const b=window.__miningBench;b.active=false;return {frames:b.frames,workers:b.workers,snapshots:b.snapshots,pipelines:b.pipelines,stable:b.initial===b.view.pawns.pawnMesh.geometry,world:JSON.stringify(b.view.world)};});
  const w=JSON.parse(data.world),invalid=validateWorld(w),row={actors:count,adapter,elapsedMs:elapsed,simulatedTicks:w.tick-2000,completed:w.tailoring?.completed??0,research:w.research?.points,frameMs:stats(data.frames.flatMap(f=>f.interval===null?[]:[f.interval])),frameCpuMs:stats(data.frames.map(f=>f.cpu)),workerBatchStepMs:stats(data.workers),snapshotAdoptionMs:stats(data.snapshots),drawCalls:stats(data.frames.map(f=>f.calls)),pipelines:data.pipelines,stable:data.stable,errors,invalid};report.rows.push(row);
  await page.screenshot({path:`artifacts/research-load-v73-${count}.png`});await page.close();
  if(!w.research?.points||errors.length||invalid.length||data.pipelines.length||!data.stable||(w.tailoring?.completed??0)!==Array.from({length:count},(_,i)=>i).filter(i=>i%2===0&&i%3!==0).length)throw Error(JSON.stringify(row));
}}
catch(error){report.error=String(error);throw error;}
finally{await browser.close();await writeFile('artifacts/research-render-v73.json',JSON.stringify(report,null,2));}
console.log(JSON.stringify(report));
