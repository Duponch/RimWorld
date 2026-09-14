import os from 'node:os';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { serializeWorld } from '../src/sim/index.ts';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('@playwright/test');
const variant = process.argv[2] ?? 'current';
if (!/^[a-z0-9-]+$/.test(variant)) throw new Error('Use a simple report label (a-z, 0-9, hyphen).');
const scenario=process.argv[3]??'transfer';
if(!['transfer','logistics'].includes(scenario))throw new Error('Choose transfer or logistics.');
const fixture = JSON.parse(await readFile('artifacts/furniture-'+scenario+'-load.json','utf8'));
const probe = `
window.__furnitureBench={view:null,active:false,frames:[],events:[],updates:[],pipelines:[],previous:null};
for (const method of ['frame','setWorld','buildStructures','buildJobs','updatePiles']) {
 const original=ColonyRenderer.prototype[method]; if(!original) continue;
 ColonyRenderer.prototype[method]=function(...args) {
  const b=window.__furnitureBench; b.view=this;
  const count=w=>${scenario==='logistics'?'w?.packed.filter(p=>p.owner.type===\'ground\').length':'w?.structures.length'};
  const before=method==='setWorld'?count(this.world):null;
  const start=performance.now(), result=original.apply(this,args), elapsed=performance.now()-start;
  if(b.active) {
   if(method==='frame') { b.frames.push({at:start,cpu:elapsed,calls:this.stats.drawCalls,triangles:this.stats.triangles,interval:b.previous===null?null:args[0]-b.previous}); b.previous=args[0]; }
   else { b.updates.push({at:start,method,ms:elapsed}); if(method==='setWorld' && before!==count(args[0])) b.events.push({at:start,tick:args[0].tick,removed:before-count(args[0])}); }
  }
  return result;
 };
}
`;
const stats = values => { if(!values.length) return null; const s=[...values].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p99:s[Math.ceil(s.length*.99)-1],p95:s[Math.ceil(s.length*.95)-1],max:s.at(-1),mean:s.reduce((a,b)=>a+b,0)/s.length}; };
const browser=await chromium.launch({channel:'chromium'});
const report={timestamp:new Date().toISOString(),cpu:os.cpus()[0].model,variant,map:250,pawns:100,buildings:100,protocol:'Normal Chromium WebGPU; synthetic 100 builders relocating 100 whole furniture objects; actual worker at 6x; 60 warmup frames; no world serialization during timed frames.',errors:[]};
if(scenario==='logistics')report.protocol='Normal Chromium WebGPU; synthetic 100 haulers storing 100 whole furniture parcels; actual worker at 6x; 60 warmup and 60 post-completion frames; no world serialization during timing. Signed event counts describe ground ownership changes, not destruction.';
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>report.errors.push(e.message)); page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
 await page.addInitScript(value=>localStorage.setItem('lisiere.save.v1',value),serializeWorld(fixture));
 await page.goto('http://127.0.0.1:5173/?e2e&size=250&seed=42');
 await page.waitForFunction(()=>!!window.__furnitureBench.view && !!window.__lisiere);
 await page.locator('[data-speed="0"]').click(); await page.locator('[data-panel="menu"]').click(); await page.locator('#load').click();
 report.backend=await page.evaluate(()=>window.__lisiere.backend);
 report.adapter=await page.evaluate(()=>{const d=window.__furnitureBench.view.renderer.getContext().getConfiguration().device;const info=d.adapterInfo;const original=d.createRenderPipeline.bind(d); d.createRenderPipeline=(...args)=>{const start=performance.now();const result=original(...args);if(window.__furnitureBench.active)window.__furnitureBench.pipelines.push({at:start,ms:performance.now()-start});return result;};return {vendor:info.vendor,architecture:info.architecture};});
 await page.evaluate(()=>new Promise(resolve=>{let n=0;function f(){if(++n===60)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);}));
 await page.evaluate(()=>{window.__furnitureBench.active=true;}); await page.locator('[data-speed="6"]').click();
 await page.waitForFunction(mode=>{const w=window.__lisiere.world;return mode==='transfer'?!w.jobs.some(j=>j.kind==='install')&&!w.packed.length:w.packed.length===100&&w.packed.every(p=>p.owner.type==='ground'&&w.stockpiles.some(z=>p.owner.type==='ground'&&z.x===p.owner.x&&z.z===p.owner.z));},scenario,{timeout:60000,polling:250});
 await page.evaluate(()=>new Promise(resolve=>{let n=0;function f(){if(++n===60)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);}));
 await page.locator('[data-speed="0"]').click();
 const b=await page.evaluate(()=>{const b=window.__furnitureBench;b.active=false;return {frames:b.frames,events:b.events,updates:b.updates,pipelines:b.pipelines};});
 report.frames=stats(b.frames.flatMap(f=>f.interval===null?[]:[f.interval]));report.frameCpu=stats(b.frames.map(f=>f.cpu));report.drawCalls=stats(b.frames.map(f=>f.calls));report.triangles=stats(b.frames.map(f=>f.triangles));
 report.removalFrames=stats(b.frames.filter(f=>b.events.some(e=>f.at>=e.at && f.at<e.at+250)).flatMap(f=>f.interval===null?[]:[f.interval]));
 report.updates=Object.fromEntries([...new Set(b.updates.map(u=>u.method))].map(method=>[method,stats(b.updates.filter(u=>u.method===method).map(u=>u.ms))]));
 report.pipelines=stats(b.pipelines.map(p=>p.ms));report.events=b.events.map(e=>({tick:e.tick,removed:e.removed}));
 report.slowFrames=b.frames.filter(f=>f.interval>32||f.cpu>32).map(f=>({interval:f.interval,cpu:f.cpu,nearRemoval:b.events.some(e=>Math.abs(f.at-e.at)<250)}));
 report.outcome=await page.evaluate(()=>{const w=window.__lisiere.world;return {tick:w.tick,wood:w.stock.wood,pending:w.jobs.filter(j=>j.kind==='install').length,packed:w.packed.length,installed:w.structures.length,stored:w.packed.filter(p=>p.owner.type==='ground'&&w.stockpiles.some(z=>p.owner.type==='ground'&&z.x===p.owner.x&&z.z===p.owner.z)).length};});
 if(report.errors.length||report.outcome.pending||(scenario==='transfer'?report.outcome.packed||report.outcome.installed!==100:report.outcome.stored!==100))throw new Error(JSON.stringify(report));
} finally {await browser.close();}
await writeFile('artifacts/furniture-'+scenario+'-render-'+variant+'.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
