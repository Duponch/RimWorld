import os from 'node:os';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { serializeWorld } from '../src/sim/index.ts';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('@playwright/test');
const variant = process.argv[2] ?? 'current';
if (!/^[a-z0-9-]+$/.test(variant)) throw new Error('Use a simple report label (a-z, 0-9, hyphen).');
const fixture = JSON.parse(await readFile('artifacts/deconstruction-load.json','utf8'));
const probe = `
window.__removalBench={view:null,active:false,frames:[],events:[],updates:[],pipelines:[],previous:null};
for (const method of ['frame','setWorld','buildStructures','buildJobs','updatePiles']) {
 const original=ColonyRenderer.prototype[method]; if(!original) continue;
 ColonyRenderer.prototype[method]=function(...args) {
  const b=window.__removalBench; b.view=this;
  const before=method==='setWorld'?this.world?.structures.length:null;
  const start=performance.now(), result=original.apply(this,args), elapsed=performance.now()-start;
  if(b.active) {
   if(method==='frame') { b.frames.push({at:start,cpu:elapsed,calls:this.stats.drawCalls,triangles:this.stats.triangles,interval:b.previous===null?null:args[0]-b.previous}); b.previous=args[0]; }
   else { b.updates.push({at:start,method,ms:elapsed}); if(method==='setWorld' && before>args[0].structures.length) b.events.push({at:start,tick:args[0].tick,removed:before-args[0].structures.length}); }
  }
  return result;
 };
}
`;
const stats = values => { if(!values.length) return null; const s=[...values].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p99:s[Math.ceil(s.length*.99)-1],p95:s[Math.ceil(s.length*.95)-1],max:s.at(-1),mean:s.reduce((a,b)=>a+b,0)/s.length}; };
const browser=await chromium.launch({channel:'chromium'});
const report={timestamp:new Date().toISOString(),cpu:os.cpus()[0].model,variant,map:250,pawns:100,buildings:100,protocol:'Normal Chromium WebGPU; synthetic 100 builders, 100 buildings designated and 100 trees; actual worker at 6x; 60 warmup frames; no world serialization during timed frames.',errors:[]};
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>report.errors.push(e.message)); page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
 await page.addInitScript(value=>localStorage.setItem('lisiere.save.v1',value),serializeWorld(fixture));
 await page.goto('http://127.0.0.1:5173/?scenario=camp&e2e&size=250&seed=42');
 await page.waitForFunction(()=>!!window.__removalBench.view && !!window.__lisiere);
 await page.locator('[data-speed="0"]').click(); await page.locator('[data-panel="menu"]').click(); await page.locator('#load').click();
 if(variant==='prewarmed')await page.evaluate(()=>window.__removalBench.view.preparePresentation());
 report.backend=await page.evaluate(()=>window.__lisiere.backend);
 report.adapter=await page.evaluate(()=>{const d=window.__removalBench.view.renderer.getContext().getConfiguration().device;const info=d.adapterInfo;const original=d.createRenderPipeline.bind(d); d.createRenderPipeline=(...args)=>{const start=performance.now();const result=original(...args);if(window.__removalBench.active)window.__removalBench.pipelines.push({at:start,ms:performance.now()-start});return result;};return {vendor:info.vendor,architecture:info.architecture};});
 await page.evaluate(()=>new Promise(resolve=>{let n=0;function f(){if(++n===60)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);}));
 await page.evaluate(()=>{window.__removalBench.active=true;}); await page.locator('[data-speed="6"]').click();
 await page.waitForFunction(()=>window.__removalBench.events.reduce((n,e)=>n+e.removed,0)>=100,undefined,{timeout:60000,polling:250});
 await page.evaluate(()=>new Promise(resolve=>{let n=0;function f(){if(++n===60)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);}));
 await page.locator('[data-speed="0"]').click();
 const b=await page.evaluate(()=>{const b=window.__removalBench;b.active=false;return {frames:b.frames,events:b.events,updates:b.updates,pipelines:b.pipelines};});
 report.frames=stats(b.frames.flatMap(f=>f.interval===null?[]:[f.interval]));report.frameCpu=stats(b.frames.map(f=>f.cpu));report.drawCalls=stats(b.frames.map(f=>f.calls));report.triangles=stats(b.frames.map(f=>f.triangles));
 report.removalFrames=stats(b.frames.filter(f=>b.events.some(e=>f.at>=e.at && f.at<e.at+250)).flatMap(f=>f.interval===null?[]:[f.interval]));
 report.updates=Object.fromEntries([...new Set(b.updates.map(u=>u.method))].map(method=>[method,stats(b.updates.filter(u=>u.method===method).map(u=>u.ms))]));
 report.pipelines=stats(b.pipelines.map(p=>p.ms));report.events=b.events.map(e=>({tick:e.tick,removed:e.removed}));
 report.slowFrames=b.frames.filter(f=>f.interval>32||f.cpu>32).map(f=>({interval:f.interval,cpu:f.cpu,nearRemoval:b.events.some(e=>Math.abs(f.at-e.at)<250)}));
 report.outcome=await page.evaluate(()=>{const w=window.__lisiere.world;return {tick:w.tick,wood:w.stock.wood,remainingRemoval:w.jobs.filter(j=>j.kind==='deconstruct').length,removed:w.deconstructed.count};});
 if(report.errors.length||report.outcome.remainingRemoval)throw new Error(JSON.stringify(report));
} finally {await browser.close();}
await writeFile('artifacts/deconstruction-render-'+variant+'.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
