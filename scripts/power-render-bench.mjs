import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';
import { miningLoad } from '../tests/scenarios/mining.ts';
import { fixturePower } from '../tests/scenarios/power.ts';
import { reconcilePower } from '../src/sim/power.ts';
import { serializeWorld } from '../src/sim/serialization.ts';
import { installGpuCallProbe } from './gpu-call-probe.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium }=await import('@playwright/test');
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const probe=`window.__miningBench={active:false,view:null,previous:null,frames:[],adoptions:[],pipelines:[],peakWorkers:0};
for(const method of ['frame','applyWorld']){const original=ColonyRenderer.prototype[method];ColonyRenderer.prototype[method]=function(...args){const b=window.__miningBench;b.view=this;const start=performance.now();const result=original.apply(this,args),elapsed=performance.now()-start;if(b.active){if(method==='frame'){b.frames.push({cpu:elapsed,interval:b.previous===null?null:args[0]-b.previous,calls:this.stats.drawCalls});b.previous=args[0];}else{b.adoptions.push(elapsed);b.peakWorkers=Math.max(b.peakWorkers,args[0].pawns.filter(p=>p.state==='working').length);}}return result;};}`;
const report={date:new Date().toISOString(),cpu:os.cpus()[0].model,node:process.version,viewport:{width:1440,height:1000},protocol:'Native WebGPU 250². 3/100 miners; 100 also has a same-map control without electrical devices. Actual applyWorld timings, not snapshot reception. Four machinery cells and one tree each; 3/100 fueled generators with one lamp each in a separate cleared patch. 6x, no simultaneous heavy tests, 90-frame warmup. Then 8 diagnostic simultaneous lamp on/off transitions on immutable snapshot copies; no worker mutation. Not a frame guarantee or full logistics benchmark.',runs:[]};
const browser=await chromium.launch({channel:'chromium',args:[]});
try {for(const [count,electrical] of [[3,true],[100,false],[100,true]]) {
 const page=await browser.newPage({viewport:report.viewport}),errors=[];page.setDefaultTimeout(20000);
 try {
  await page.addInitScript(installGpuCallProbe,false);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))errors.push(m.text());});
  await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
  const w=miningLoad(count,false,true);
  for(let z=150;z<191;z++)for(let x=150;x<191;x++)w.tiles[z*w.width+x]={terrain:'grass'};
  w.resources=w.resources.filter(r=>r.x<150||r.x>=191||r.z<150||r.z>=191);
  for(let i=0;i<(electrical?count:0);i++){const x=150+i%10*4,z=150+Math.floor(i/10)*4;fixturePower(w,'wood-generator',x,z);fixturePower(w,'standing-lamp',x+2,z);}
  reconcilePower(w);for(const s of w.structures)if(s.power)s.power.on=true;
  await page.addInitScript(data=>localStorage.setItem('lisiere.save.v1',data),serializeWorld(w));
  await page.goto('http://127.0.0.1:5173/?size=32&e2e');await page.waitForFunction(()=>window.__lisiere);
  await page.locator('[data-speed="0"]').click();await page.locator('[data-panel="menu"]').click();await page.locator('#load').click();
  await page.waitForFunction(()=>window.__miningBench.view.world?.width===250&&!window.__miningBench.view.preparing);await page.keyboard.press('Escape');
  const frames=n=>page.evaluate(n=>new Promise(resolve=>{function f(){if(!--n)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);}),n);
  await page.mouse.move(900,350);await page.mouse.wheel(0,600);await frames(90);
  const adapter=await page.evaluate(()=>{const a=window.__miningBench.view.renderer.getContext().getConfiguration().device.adapterInfo;return {vendor:a.vendor,architecture:a.architecture,description:a.description};});
  const start=()=>page.evaluate(()=>{const b=window.__miningBench;b.active=true;b.previous=null;b.frames=[];b.adoptions=[];b.pipelines=[];});
  const finish=async()=>{const d=await page.evaluate(()=>{const b=window.__miningBench;b.active=false;return {frames:b.frames,adoptions:b.adoptions,pipelines:b.pipelines};});return {frames:stats(d.frames.flatMap(f=>f.interval===null?[]:[f.interval])),frameCpu:stats(d.frames.map(f=>f.cpu)),drawCalls:stats(d.frames.map(f=>f.calls)),adoptions:stats(d.adoptions),pipelines:d.pipelines};};
  await start();await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(count=>{const w=window.__miningBench.view.world;return w.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0)===count*8;},count,{timeout:90000,polling:250});
  await page.locator('[data-speed="0"]').click();const active=await finish();await frames(90);
  const outcome=await page.evaluate(()=>{const b=window.__miningBench,w=b.view.world;return {components:w.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0),peakWorkers:b.peakWorkers,tick:w.tick,lampsOn:w.structures.filter(s=>s.kind==='standing-lamp'&&s.power.on).length};});
  await start();const textureBefore=await page.evaluate(()=>window.__miningBench.view.environmentLighting.map.version);
  for(let i=0;i<8;i++){await page.evaluate(i=>{const view=window.__miningBench.view,w={...view.world,structures:view.world.structures.map(s=>s.kind==='standing-lamp'?{...s,power:{...s.power,on:!!(i%2)}}:s)};view.setWorld(w,false,0);},i);await frames(45);}
  const toggles=await finish(),textureUploads=await page.evaluate(()=>window.__miningBench.view.environmentLighting.map.version)-textureBefore;
  report.runs.push({count,electrical,adapter,errors,outcome,active,toggles,textureUploads});
  if(errors.length||active.pipelines.length||toggles.pipelines.length||outcome.lampsOn!==(electrical?count:0)||textureUploads!==(electrical?8:0))throw new Error('Power rendering invariant failed');
 }finally{await page.close();}
}}catch(error){report.error=String(error);throw error;}finally{await browser.close();await writeFile('artifacts/power-render-v42.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
