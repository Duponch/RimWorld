import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createWorld, applyCommand, serializeWorld } from '../src/sim/index.ts';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('@playwright/test');
const variant = process.argv[2] ?? 'current';
if (!/^[a-z0-9-]+$/.test(variant)) throw new Error('Use a simple report label (a-z, 0-9, hyphen).');
const fixture = createWorld(42, 250, 250);
const center = fixture.pawns[0];
const trees = fixture.resources.filter(r => r.kind === 'tree').sort((a,b) => (a.x-center.x)**2+(a.z-center.z)**2-((b.x-center.x)**2+(b.z-center.z)**2)).slice(0, 12);
for (const tree of trees) if (!applyCommand(fixture, {type:'designate',kind:'chop',x:tree.x,z:tree.z}).ok) throw new Error('Fixture order refused');
const probe = `
window.__treeBench={view:null,active:false,frames:[],events:[],updates:[],pipelines:[],previous:null};
for (const method of ['frame','setWorld','updateResources','buildJobs','updatePiles']) {
 const original=ColonyRenderer.prototype[method]; if(!original) continue;
 ColonyRenderer.prototype[method]=function(...args) {
  const b=window.__treeBench; b.view=this;
  const before=method==='setWorld'?this.world?.resources.length:null;
  const start=performance.now(), result=original.apply(this,args), elapsed=performance.now()-start;
  if(b.active) {
   if(method==='frame') { b.frames.push({at:start,cpu:elapsed,interval:b.previous===null?null:args[0]-b.previous}); b.previous=args[0]; }
   else { b.updates.push({at:start,method,ms:elapsed}); if(method==='setWorld' && before>args[0].resources.length) b.events.push({at:start,tick:args[0].tick,removed:before-args[0].resources.length}); }
  }
  return result;
 };
}
`;
const stats = values => { if(!values.length) return null; const s=[...values].sort((a,b)=>a-b);return {count:s.length,p95:s[Math.ceil(s.length*.95)-1],max:s.at(-1),mean:s.reduce((a,b)=>a+b,0)/s.length}; };
const browser=await chromium.launch({channel:'chromium'});
const report={timestamp:new Date().toISOString(),variant,map:250,pawns:3,trees:12,protocol:'Normal Chromium WebGPU; generated seed 42; twelve nearest trees designated; actual worker at 6x; 60 warmup frames; no world serialization during timed frames.',errors:[]};
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>report.errors.push(e.message)); page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
 await page.addInitScript(value=>localStorage.setItem('lisiere.save.v1',value),serializeWorld(fixture));
 await page.goto('http://127.0.0.1:5173/?e2e&size=250&seed=42');
 await page.waitForFunction(()=>!!window.__treeBench.view && !!window.__lisiere);
 await page.locator('[data-speed="0"]').click(); await page.locator('[data-panel="menu"]').click(); await page.locator('#load').click();
 report.backend=await page.evaluate(()=>window.__lisiere.backend);
 report.adapter=await page.evaluate(()=>{const d=window.__treeBench.view.renderer.getContext().getConfiguration().device;const info=d.adapterInfo;const original=d.createRenderPipeline.bind(d); d.createRenderPipeline=(...args)=>{const start=performance.now();const result=original(...args);if(window.__treeBench.active)window.__treeBench.pipelines.push({at:start,ms:performance.now()-start});return result;};return {vendor:info.vendor,architecture:info.architecture};});
 await page.evaluate(()=>new Promise(resolve=>{let n=0;function f(){if(++n===60)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);}));
 await page.evaluate(()=>{window.__treeBench.active=true;}); await page.locator('[data-speed="6"]').click();
 await page.waitForFunction(()=>window.__treeBench.events.reduce((n,e)=>n+e.removed,0)>=12,undefined,{timeout:60000,polling:250});
 await page.evaluate(()=>new Promise(resolve=>{let n=0;function f(){if(++n===60)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);}));
 await page.locator('[data-speed="0"]').click();
 const b=await page.evaluate(()=>{const b=window.__treeBench;b.active=false;return {frames:b.frames,events:b.events,updates:b.updates,pipelines:b.pipelines};});
 report.frames=stats(b.frames.flatMap(f=>f.interval===null?[]:[f.interval]));report.frameCpu=stats(b.frames.map(f=>f.cpu));
 report.removalFrames=stats(b.frames.filter(f=>b.events.some(e=>f.at>=e.at && f.at<e.at+250)).flatMap(f=>f.interval===null?[]:[f.interval]));
 report.updates=Object.fromEntries([...new Set(b.updates.map(u=>u.method))].map(method=>[method,stats(b.updates.filter(u=>u.method===method).map(u=>u.ms))]));
 report.pipelines=stats(b.pipelines.map(p=>p.ms));report.events=b.events.map(e=>({tick:e.tick,removed:e.removed}));
 report.slowFrames=b.frames.filter(f=>f.interval>32||f.cpu>32).map(f=>({interval:f.interval,cpu:f.cpu,nearRemoval:b.events.some(e=>Math.abs(f.at-e.at)<250)}));
 report.outcome=await page.evaluate(()=>{const w=window.__lisiere.world;return {tick:w.tick,wood:w.stock.wood,remainingChop:w.jobs.filter(j=>j.kind==='chop').length};});
 if(report.errors.length||report.outcome.remainingChop)throw new Error(JSON.stringify(report));
} finally {await browser.close();}
await writeFile('artifacts/tree-render-'+variant+'.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
