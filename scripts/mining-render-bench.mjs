import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';
import { miningLoad } from '../tests/scenarios/mining.ts';
import { serializeWorld } from '../src/sim/index.ts';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const probe=`
window.__miningBench={active:false,view:null,previous:null,frames:[],adoptions:[],events:[],snapshots:[],longFrames:[]};
new PerformanceObserver(list=>{if(window.__miningBench.active)for(const entry of list.getEntries())window.__miningBench.longFrames.push(entry.toJSON());}).observe({type:'long-animation-frame'});
for(const method of ['frame','setWorld']){const original=ColonyRenderer.prototype[method];ColonyRenderer.prototype[method]=function(...args){
const b=window.__miningBench;b.view=this;
const before=method==='setWorld'?this.world?.jobs.filter(j=>j.kind==='mine').length??0:0,start=performance.now();
const result=original.apply(this,args),elapsed=performance.now()-start;
if(b.active){if(method==='frame'){b.frames.push({at:start,cpu:elapsed,interval:b.previous===null?null:args[0]-b.previous,calls:this.stats.drawCalls});b.previous=args[0];}
else {b.adoptions.push(elapsed);const after=args[0].jobs.filter(j=>j.kind==='mine').length;if(after<before)b.events.push({at:start,tick:args[0].tick,mined:before-after,dirty:this.rocks.stats.updatedCells});}}
return result;};}
`;
const report={date:new Date().toISOString(),cpu:os.cpus()[0].model,viewport:{width:1440,height:1000},protocol:'Native Chromium WebGPU, actual worker 6x, natural 250² with cleared mining patch; 3/30/100 miners × 4 sandstone walls and 1 tree. 90 warmup frames; no full-world serialization during timed frames. Ground/rock buffer identities checked after excavation.',phases:[]};
const browser=await chromium.launch({channel:'chromium'});
try {
 for(const count of (process.env.MINING_COUNTS??'3,30,100').split(',').map(Number)) {
  const page=await browser.newPage({viewport:report.viewport}),errors=[];page.setDefaultTimeout(15000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))errors.push(m.text());});
  await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()+`\nconst originalMiningSnapshot=client.onSnapshot;client.onSnapshot=(...args)=>{const start=performance.now();try{return originalMiningSnapshot(...args);}finally{if(window.__miningBench.active)window.__miningBench.snapshots.push(performance.now()-start);}};`});});
  await page.addInitScript(saved=>localStorage.setItem('lisiere.save.v1',saved),serializeWorld(miningLoad(count)));
  await page.goto('http://127.0.0.1:5173/?e2e&size=250&seed=42');await page.waitForFunction(()=>window.__miningBench.view?.world);
  await page.locator('[data-speed="0"]').click();await page.locator('[data-panel="menu"]').click();await page.locator('#load').click();await page.keyboard.press('Escape');
  await page.waitForFunction(n=>{const w=window.__miningBench.view.world;return w.tick===2000&&w.pawns.length===n&&w.jobs.filter(j=>j.kind==='mine').length===4*n;},count);
  await page.evaluate(()=>{const b=window.__miningBench,v=b.view;b.initial={rock:v.rocks.mesh.geometry,position:v.rocks.mesh.geometry.getAttribute('position'),index:v.rocks.mesh.geometry.index,ground:v.terrainGroup.children.map(g=>g.uuid)};});
  const adapter=await page.evaluate(()=>{const a=window.__miningBench.view.renderer.getContext().getConfiguration().device.adapterInfo;return {vendor:a.vendor,architecture:a.architecture,description:a.description};});
  await page.evaluate(()=>new Promise(resolve=>{let n=90;function f(){if(!--n)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);}));
  await page.evaluate(()=>window.__miningBench.active=true);await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(n=>window.__miningBench.events.reduce((sum,e)=>sum+e.mined,0)>=n,count*4,{timeout:45000,polling:250});
  await page.locator('[data-speed="0"]').click();
  const b=await page.evaluate(()=>{const b=window.__miningBench,v=b.view;b.active=false;return {frames:b.frames,adoptions:b.adoptions,snapshots:b.snapshots,longFrames:b.longFrames,events:b.events,stableRock:b.initial.rock===v.rocks.mesh.geometry&&b.initial.position===v.rocks.mesh.geometry.getAttribute('position')&&b.initial.index===v.rocks.mesh.geometry.index,stableGround:JSON.stringify(b.initial.ground)===JSON.stringify(v.terrainGroup.children.map(g=>g.uuid)),chunks:v.world.piles.filter(p=>p.kind==='chunk').length};});
  const phase={count,adapter,errors,frames:stats(b.frames.flatMap(f=>f.interval===null?[]:[f.interval])),frameCpu:stats(b.frames.map(f=>f.cpu)),adoptions:stats(b.adoptions),drawCalls:stats(b.frames.map(f=>f.calls)),excavationFrames:stats(b.frames.filter(f=>b.events.some(e=>f.at>=e.at&&f.at<e.at+150)).flatMap(f=>f.interval===null?[]:[f.interval])),mined:b.events.reduce((n,e)=>n+e.mined,0),chunks:b.chunks,stableRock:b.stableRock,stableGround:b.stableGround};
  phase.snapshots=stats(b.snapshots);phase.longFrames=b.longFrames;
  report.phases.push(phase);await page.screenshot({path:`artifacts/mining-render-${count}.png`});await page.close();
  if(errors.length||!b.stableRock||!b.stableGround)throw new Error(JSON.stringify(phase));
 }
}finally{await browser.close();await writeFile(process.argv[2]??'artifacts/mining-render.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
