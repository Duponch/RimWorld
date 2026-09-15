import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';
import { roofTraffic } from '../tests/scenarios/roofing.ts';
import { serializeWorld } from '../src/sim/serialization.ts';
import { installGpuCallProbe } from './gpu-call-probe.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const probe=`
window.__miningBench={active:false,view:null,previous:null,frames:[],adoptions:[],pipelines:[],peakWorkers:0};
for(const method of ['frame','setWorld']){const original=ColonyRenderer.prototype[method];ColonyRenderer.prototype[method]=function(...args){
 const b=window.__miningBench;b.view=this;const start=performance.now();const result=original.apply(this,args),elapsed=performance.now()-start;
 if(b.active){if(method==='frame'){b.frames.push({cpu:elapsed,interval:b.previous===null?null:args[0]-b.previous,calls:this.stats.drawCalls});b.previous=args[0];}
 else {b.adoptions.push(elapsed);b.peakWorkers=Math.max(b.peakWorkers,args[0].pawns.filter(p=>p.jobId!==null).length);}}return result;};}
`;
const report={date:new Date().toISOString(),cpu:os.cpus()[0].model,viewport:{width:1440,height:1000},protocol:'Native WebGPU, 250², 100 builders, 2500 constructed roofs and 100 trees cleared physically. Roofs visible, worker 6x, 90-frame warmup, native pipeline instrumentation. No concurrent CPU benchmark; 90-second watchdog.'};
const browser=await chromium.launch({channel:'chromium',args:[]});
try {
 const page=await browser.newPage({viewport:report.viewport}),errors=[];page.setDefaultTimeout(20000);
 await page.addInitScript(installGpuCallProbe,false);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))errors.push(m.text());});
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
 await page.addInitScript(data=>localStorage.setItem('lisiere.save.v1',data),serializeWorld(roofTraffic(100)));
 await page.goto('http://127.0.0.1:5173/?size=32&e2e');await page.waitForFunction(()=>window.__lisiere);
 await page.locator('[data-speed="0"]').click();await page.locator('[data-panel="menu"]').click();await page.locator('#load').click();
 await page.waitForFunction(()=>window.__miningBench.view.world?.width===250&&!window.__miningBench.view.preparing);await page.keyboard.press('Escape');
 await page.locator('#roof-toggle').click();await page.mouse.move(900,350);await page.mouse.wheel(0,900);
 await page.evaluate(()=>new Promise(resolve=>{let n=90;function f(){if(!--n)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);}));
 report.adapter=await page.evaluate(()=>{const a=window.__miningBench.view.renderer.getContext().getConfiguration().device.adapterInfo;return {vendor:a.vendor,architecture:a.architecture,description:a.description};});
 await page.evaluate(()=>window.__miningBench.active=true);await page.locator('[data-speed="6"]').click();
 await page.waitForFunction(()=>{const w=window.__miningBench.view.world;return w.roofing.constructed.length===2500&&!w.jobs.length;},{},{timeout:90000,polling:500});
 await page.locator('[data-speed="0"]').click();
 const data=await page.evaluate(()=>{const b=window.__miningBench,w=b.view.world;b.active=false;return {frames:b.frames,adoptions:b.adoptions,pipelines:b.pipelines,peakWorkers:b.peakWorkers,tick:w.tick,roofs:w.roofing.constructed.length,trees:w.resources.length,wood:w.piles.reduce((n,p)=>n+p.quantity,0)};});
 Object.assign(report,{errors,tick:data.tick,roofCells:data.roofs,trees:data.trees,wood:data.wood,peakWorkers:data.peakWorkers,pipelines:data.pipelines,frames:stats(data.frames.flatMap(f=>f.interval===null?[]:[f.interval])),frameCpu:stats(data.frames.map(f=>f.cpu)),adoptions:stats(data.adoptions),drawCalls:stats(data.frames.map(f=>f.calls))});
 await page.screenshot({path:'artifacts/roofing-render-100.png'});
 if(errors.length||data.pipelines.length||data.roofs!==2500||data.trees||data.wood!==1200)throw new Error('Roof load did not satisfy outcome/GPU invariants.');
}catch(error){report.error=String(error);throw error;}finally{await browser.close();await writeFile('artifacts/roofing-render.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
