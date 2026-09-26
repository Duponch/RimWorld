import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import os from 'node:os';
import {gunzipSync} from 'node:zlib';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const label=process.argv[2]??'current';
if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid label');
const duration=Number(process.env.PERF_SECONDS??6)*1000;
const warmup=Number(process.env.PERF_WARMUP??1.3)*1000;
const gpu=process.env.PERF_GPU==='1';
const baseline=process.env.PERF_BASELINE==='1';
const reference=process.env.PERF_REFERENCE;
if(reference&&!['v96','v98'].includes(reference))throw Error('Unknown reference; archive the documented source revision first');
const bundleBaseline=process.env.PERF_BUNDLE_BASELINE==='1';
const motion=process.env.PERF_MOTION==='1';
const middleZoom=Number(process.env.PERF_MIDDLE_ZOOM??.5);
if(!Number.isFinite(middleZoom)||middleZoom<=0)throw Error('Invalid middle zoom');
const chunkSize=process.env.PERF_CHUNK_SIZE?Number(process.env.PERF_CHUNK_SIZE):null;
if(chunkSize!==null&&![16,24,32,48,64].includes(chunkSize))throw Error('Invalid render chunk size');
const stats=a=>{if(!a.length)return null;const s=[...a].sort((a,b)=>a-b);return {n:s.length,mean:a.reduce((x,y)=>x+y,0)/a.length,p50:s[Math.floor(s.length*.5)],p95:s[Math.min(s.length-1,Math.ceil(s.length*.95)-1)],p99:s[Math.min(s.length-1,Math.ceil(s.length*.99)-1)],max:s.at(-1)};};
const prefix=`
window.__perf={active:false,view:null,frames:[],costs:{},workers:[],previous:0};
const perf=window.__perf;
function measureMethod(object,key,label=key){const original=object[key];if(typeof original!=='function')return;object[key]=function(...args){if(!perf.active)return original.apply(this,args);const t=performance.now();try{return original.apply(this,args);}finally{(perf.costs[label]??=[]).push(performance.now()-t);}};}
const perfFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){perf.view=this;const t=performance.now();if(perf.active&&perf.motion){const x=perf.motion.x+6*Math.sin((now-perf.motion.time)/1200),z=perf.motion.z+4*Math.sin((now-perf.motion.time)/900);this.camera.position.x+=x-this.controls.target.x;this.camera.position.z+=z-this.controls.target.z;this.controls.target.x=x;this.controls.target.z=z;}const result=perfFrame.call(this,now);if(perf.active){perf.frames.push({interval:perf.previous?now-perf.previous:null,cpu:performance.now()-t,calls:this.stats.drawCalls,triangles:this.stats.triangles});perf.previous=now;}return result;};
for(const key of ['applyWorld','updateResources','updatePiles','updateHover','buildStructures','buildJobs'])measureMethod(ColonyRenderer.prototype,key);
`;
const suffix=`
perf.client=client;const perfSnapshot=client.onSnapshot;client.onSnapshot=(...args)=>{if(perf.active)perf.workers.push(args[1]);return perfSnapshot(...args);};
measureMethod(client,'onSnapshot','snapshot');measureMethod(client.snapshots,'adopt','decode');
const perfHud=renderState;renderState=function(...args){if(!perf.active)return perfHud(...args);const t=performance.now();try{return perfHud(...args);}finally{(perf.costs.hud??=[]).push(performance.now()-t);}};
`;
const report={label,date:new Date().toISOString(),cpu:os.cpus()[0].model,viewport:{width:1920,height:1080},protocol:`Same saved world (identified below) restored for every phase. Native hardware Chromium, no SwiftShader flags. RAF interval and CPU submission measured separately, no world export in windows. ${duration/1000} seconds after ${warmup/1000}s warmup per phase. CPU profiling only in separate diagnostic window. No GPU timestamp implied by frame CPU.`,phases:[],errors:[]};
const browser=await chromium.launch({channel:'chromium',headless:false});
try{
 const page=await browser.newPage({viewport:report.viewport});
 if(chunkSize!==null)await page.route('**/src/world/scale.ts*',async route=>{const response=await route.fetch();const original=await response.text();if(!/chunkSize:\s*\d+\b/.test(original))throw Error('Chunk-size instrumentation missed transformed source');await route.fulfill({response,body:original.replace(/chunkSize:\s*\d+\b/,`chunkSize: ${chunkSize}`)});});
 if(bundleBaseline)await page.route('**/src/render/ColonyRenderer.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new ReentrantRenderer(', 'new THREE.WebGPURenderer(')});});
 if(gpu)await page.route('**/src/render/ColonyRenderer.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace(/powerPreference: ["']high-performance["']/,'powerPreference: "high-performance", trackTimestamp: true')});});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch(reference?{url:`http://127.0.0.1:5173/tmp/perf-${reference}/src/main.ts`}:baseline?{url:'http://127.0.0.1:5173/tmp/perf-v94/src/main.ts'}:{});await route.fulfill({response,body:prefix+await response.text()+suffix});});
 await page.goto('http://127.0.0.1:5173/?scenario=crashlanded&e2e&size=250&seed=42');
 await page.waitForFunction(()=>window.__perf.view?.world&&!document.querySelector('.game-shell')?.inert,{},{timeout:60000});
 await page.evaluate(()=>window.__perf.client.setSpeed(0));
 let saved=process.env.PERF_WORLD?await readFile(process.env.PERF_WORLD,'utf8'):await page.evaluate(()=>window.__perf.client.save());
 if(process.env.PERF_WORLD){const envelope=JSON.parse(saved);if(envelope.format==='lisiere-save'&&envelope.codec==='gzip-base64')saved=gunzipSync(Buffer.from(envelope.payload,'base64')).toString('utf8');}
 report.world=process.env.PERF_WORLD??'Crashlanded seed 42, 250²';
 report.baseline=reference?(reference==='v98'?'d5cb6f7':'c9010ec'):baseline?'f993e3a':bundleBaseline?'5bd1af3 (render adapter bypassed)':null;
 report.motion=motion?'Continuous sinusoidal pan, same path from starting target; no render quality changes.':'stationary';
 report.counterNote='Three renderer.info counts encoded draws; retained bundle replay is not included. Do not interpret fewer encoded triangles as fewer rendered triangles.';
 report.adapter=await page.evaluate(()=>{const a=window.__perf.view.renderer.getContext().getConfiguration().device.adapterInfo;return {vendor:a.vendor,architecture:a.architecture,description:a.description};});
 report.chunkSize=await page.evaluate(async()=>{const {WORLD_SCALE}=await import('/src/world/scale.ts');return WORLD_SCALE.chunkSize;});
 await page.evaluate(()=>{const b=window.__perf,v=b.view;for(const [object,keys] of [[v.renderer,['render']],[v.landscape,['refresh']],[v.presentation,['take']],[v.pawns,['update','updateTravel']],[v.wildlife,['update']],[v.daylight,['update']],[v.environmentLighting,['update']],[v.plants,['update']],[v.overview,['update']],[v.actionFeedback,['update','syncTravel']]].filter(([object])=>!!object))for(const key of keys){const orig=object[key],label=object.constructor.name+'.'+key;object[key]=function(...args){if(!b.active)return orig.apply(this,args);const t=performance.now();try{return orig.apply(this,args);}finally{(b.costs[label]??=[]).push(performance.now()-t);}};}});
 const phases=process.env.PERF_PHASES?process.env.PERF_PHASES.split(',').map(token=>{const [zoom,speedText]=token.split(':');const speed=Number(speedText);if(!['near','middle','far'].includes(zoom)||![0,1,3,6].includes(speed))throw Error(`Invalid phase ${token}`);return [zoom,speed];}):[['near',0],['middle',0],['far',0],['near',6],['middle',1],['middle',6],['far',6]];
 if(gpu){report.gpuTimestamp=true;await page.evaluate(()=>{const b=window.__perf;b.gpu=[];const sample=()=>{if(b.gpuStopped)return;void b.view.renderer.resolveTimestampsAsync().then(value=>{if(b.active&&Number.isFinite(value))b.gpu.push(value);requestAnimationFrame(sample);});};requestAnimationFrame(sample);});}
 for(const [zoom,speed] of phases){
  await page.evaluate(data=>window.__perf.client.load(data),saved);
  if(zoom==='middle'){
   await page.evaluate(()=>{const v=window.__perf.view;v.camera.zoom=2;v.camera.updateProjectionMatrix();v.controls.update();});
   await page.waitForTimeout(100);
  }
  await page.evaluate(({zoom,middleZoom})=>{const v=window.__perf.view,c=v.controls;c.enableDamping=false;c.update();v.camera.zoom=zoom==='near'?2:zoom==='middle'?middleZoom:c.minZoom;v.camera.updateProjectionMatrix();c.update();},{zoom,middleZoom});
  await page.evaluate(ms=>new Promise(r=>setTimeout(r,ms)),warmup);
  const start=await page.evaluate(async ({speed,motion})=>{const b=window.__perf;await b.client.setSpeed(speed);Object.assign(b,{active:true,frames:[],costs:{},workers:[],gpu:[],previous:0,motion:motion?{x:b.view.controls.target.x,z:b.view.controls.target.z,time:performance.now()}:null});return {tick:b.view.received.world.tick,time:performance.now(),zoom:b.view.camera.zoom,span:b.view.rig.span,overview:b.view.overview.group.visible};},{speed,motion});
  if(zoom==='middle'&&start.overview)throw Error('Intermediate phase entered the distant LOD');
  await page.evaluate(ms=>new Promise(r=>setTimeout(r,ms)),duration);
  const data=await page.evaluate(async()=>{const b=window.__perf;b.active=false;const end={tick:b.view.received.world.tick,time:performance.now()};await b.client.setSpeed(0);return {end,frames:b.frames,costs:b.costs,workers:b.workers,gpu:b.gpu,overview:b.view.overview.group.visible};});
  const row={zoom,speed,camera:start,overview:data.overview,elapsed:data.end.time-start.time,ticks:data.end.tick-start.tick,achievedSpeed:(data.end.tick-start.tick)/6/((data.end.time-start.time)/1000),frameMs:stats(data.frames.flatMap(f=>f.interval===null?[]:[f.interval])),cpuMs:stats(data.frames.map(f=>f.cpu)),calls:stats(data.frames.map(f=>f.calls)),triangles:stats(data.frames.map(f=>f.triangles)),workerMs:stats(data.workers),costs:Object.fromEntries(Object.entries(data.costs).map(([k,v])=>[k,{...stats(v),total:v.reduce((x,y)=>x+y,0)}]))};
  if(gpu)row.gpuMs=stats(data.gpu);
  report.phases.push(row);console.log(JSON.stringify({zoom,speed,fps:1000/row.frameMs.mean,p95:row.frameMs.p95,cpuP95:row.cpuMs.p95,achieved:row.achievedSpeed,gpuMs:row.gpuMs}));
  await writeFile(`artifacts/performance-${label}.json`,JSON.stringify(report,null,2));
 }
 if(process.env.PERF_PROFILE==='1'){
  const session=await page.context().newCDPSession(page);await session.send('Profiler.enable');await session.send('Profiler.start');
  await page.evaluate(()=>window.__perf.client.setSpeed(6));await page.evaluate(()=>new Promise(r=>setTimeout(r,8000)));
  const {profile}=await session.send('Profiler.stop');await page.evaluate(()=>window.__perf.client.setSpeed(0));
  await writeFile(`tmp/performance-${label}.cpuprofile`,JSON.stringify(profile));
  const hits=new Map();for(const id of profile.samples??[])hits.set(id,(hits.get(id)??0)+1);
  report.profile=profile.nodes.map(n=>({function:n.callFrame.functionName,url:n.callFrame.url,line:n.callFrame.lineNumber,hits:hits.get(n.id)??0})).sort((a,b)=>b.hits-a.hits).slice(0,35);
 }
 await page.screenshot({path:`artifacts/performance-${label}.png`});
}finally{await browser.close();await writeFile(`artifacts/performance-${label}.json`,JSON.stringify(report,null,2));}
if(report.errors.length)throw Error(JSON.stringify(report.errors));
