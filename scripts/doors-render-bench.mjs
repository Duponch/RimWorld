import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';
import { doorTraffic } from '../tests/scenarios/doors.ts';
import { serializeWorld } from '../src/sim/index.ts';
import { installGpuCallProbe } from './gpu-call-probe.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const probe=`
window.__miningBench={active:false,view:null,previous:null,frames:[],adoptions:[],pipelines:[],doorChanges:0,prior:new Map()};
for(const method of ['frame','setWorld']){const original=ColonyRenderer.prototype[method];ColonyRenderer.prototype[method]=function(...args){
 const b=window.__miningBench;b.view=this;const start=performance.now();const result=original.apply(this,args),elapsed=performance.now()-start;
 if(b.active){if(method==='frame'){b.frames.push({cpu:elapsed,interval:b.previous===null?null:args[0]-b.previous,calls:this.stats.drawCalls});b.previous=args[0];}
 else {b.adoptions.push(elapsed);for(const s of args[0].structures)if(s.kind==='door'){const v=s.door.open+':'+s.door.changedAt;if(b.prior.has(s.id)&&b.prior.get(s.id)!==v)b.doorChanges++;b.prior.set(s.id,v);}}}return result;};}
`;
const report={date:new Date().toISOString(),cpu:os.cpus()[0].model,viewport:{width:1440,height:1000},protocol:'Native WebGPU, real worker 6x, clear 250², 100 builders construct doors then cut trees inside walled plots and haul 1200 wood outside. Frame and snapshot timing, runtime native pipeline calls. 90-frame warmup before first door. No concurrent CPU benchmark. 90s watchdog.',count:100};
const browser=await chromium.launch({channel:'chromium',args:[]});
try {
 const page=await browser.newPage({viewport:report.viewport}),errors=[];page.setDefaultTimeout(20000);
 await page.addInitScript(installGpuCallProbe,false);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))errors.push(m.text());});
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
 await page.addInitScript(data=>localStorage.setItem('lisiere.save.v1',data),serializeWorld(doorTraffic(100)));
 await page.goto('http://127.0.0.1:5173/?size=32&e2e');await page.waitForFunction(()=>window.__lisiere);
 await page.locator('[data-speed="0"]').click();await page.locator('[data-panel="menu"]').click();await page.locator('#load').click();
 await page.waitForFunction(()=>window.__miningBench.view.world?.width===250&&!window.__miningBench.view.preparing);await page.keyboard.press('Escape');
 await page.evaluate(()=>new Promise(resolve=>{let n=90;function f(){if(!--n)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);}));
 const adapter=await page.evaluate(()=>{const a=window.__miningBench.view.renderer.getContext().getConfiguration().device.adapterInfo;return {vendor:a.vendor,architecture:a.architecture,description:a.description};});report.adapter=adapter;
 await page.evaluate(()=>{const b=window.__miningBench;b.initialGeometry=b.view.doors.mesh.geometry;b.initialMatrix=b.view.doors.mesh.instanceMatrix;b.active=true;});await page.locator('[data-speed="6"]').click();
 await page.waitForFunction(()=>{const w=window.__miningBench.view.world;return w.tick>=2000+3200||w.structures.filter(s=>s.kind==='door').length===100&&!w.jobs.length&&!w.pawns.some(p=>p.haul);},{},{timeout:90000,polling:500});
 await page.locator('[data-speed="0"]').click();
 const data=await page.evaluate(()=>{const b=window.__miningBench,w=b.view.world;b.active=false;const storage=new Set(w.stockpiles.map(s=>s.z*w.width+s.x));return {frames:b.frames,adoptions:b.adoptions,pipelines:b.pipelines,changes:b.doorChanges,tick:w.tick,doors:w.structures.filter(s=>s.kind==='door').length,trees:w.resources.length,jobs:w.jobs.length,wood:w.piles.filter(p=>p.owner.type==='ground'&&storage.has(p.owner.z*w.width+p.owner.x)).reduce((n,p)=>n+p.quantity,0),stable:b.initialGeometry===b.view.doors.mesh.geometry&&b.initialMatrix===b.view.doors.mesh.instanceMatrix};});
 Object.assign(report,{errors,tick:data.tick,doors:data.doors,trees:data.trees,jobs:data.jobs,woodStored:data.wood,doorTransitions:data.changes,stableLeafBuffer:data.stable,pipelines:data.pipelines,frames:stats(data.frames.flatMap(f=>f.interval===null?[]:[f.interval])),frameCpu:stats(data.frames.map(f=>f.cpu)),adoptions:stats(data.adoptions),drawCalls:stats(data.frames.map(f=>f.calls))});
 await page.screenshot({path:'artifacts/doors-render-100.png'});
 if(errors.length||data.pipelines.length||!data.stable||data.doors!==100||data.jobs||data.trees||data.wood!==1200||data.changes<100)throw new Error('Door load did not satisfy outcome/GPU invariants.');
}catch(error){report.error=String(error);throw error;}finally{await browser.close();await writeFile('artifacts/doors-render.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
