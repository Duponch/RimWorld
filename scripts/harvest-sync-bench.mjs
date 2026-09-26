import { assertHarvestPhase,presentationStarvations,visibleSpeedResponse } from './harvest-assertions.ts';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';
import { createWorld,applyCommand,serializeWorld } from '../src/sim/index.ts';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const label=process.argv[2]??'verification',seconds=Number(process.env.HARVEST_SECONDS??45),switches=process.env.HARVEST_SWITCHES!=='0';
const initialSpeed=Number(process.env.HARVEST_INITIAL_SPEED??1),speedCycle=(process.env.HARVEST_SPEEDS??'6,1,3').split(',').map(Number);
if(![1,3,6].includes(initialSpeed)||!speedCycle.length||speedCycle.some(s=>![1,3,6].includes(s)))throw Error('Invalid speed sequence');
if(!Number.isFinite(seconds)||seconds<7||seconds>300)throw Error('Duration must be 7–300 seconds');
if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid report label');
const stats=a=>{if(!a.length)return null;const s=a.slice().sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const probe=`
const visibleSpeedResponse=${visibleSpeedResponse.toString()};
window.__sync={view:null,active:false,frames:[],snapshots:[],removals:[],previous:null,poses:new Map(),jumps:[],gaps:[],solidOccupancy:[],controls:[],lastPlay:null};
${process.env.HARVEST_TRACE==='1'?`window.__sync.longTasks=[];new PerformanceObserver(list=>{for(const e of list.getEntries())window.__sync.longTasks.push({at:e.startTime,duration:e.duration});}).observe({type:'longtask'});`:''}
document.addEventListener('click',e=>{const button=e.target.closest?.('[data-speed]');if(!button||!window.__sync.active)return;const b=window.__sync,speed=Number(button.dataset.speed),old=b.view.received?.speed;if(speed>0&&old>0&&speed!==old)b.controls.push({speed,previousSpeed:old,at:performance.now(),delay:null,fullRateDelay:null});},true);
for(const method of ['frame','setWorld','applyWorld']){const original=ColonyRenderer.prototype[method];if(!original)continue;ColonyRenderer.prototype[method]=function(...args){
const b=window.__sync;b.view=this;const old=this.world,start=performance.now(),result=original.apply(this,args);
if(!b.active)return result;
if(method!=='frame'){b.snapshots.push({method,ms:performance.now()-start,tick:args[0].tick,play:this.timeline.tick,at:start});
if((method==='applyWorld'||!ColonyRenderer.prototype.applyWorld)&&old&&old.jobs.length>args[0].jobs.length)b.removals.push({tick:args[0].tick,play:this.timeline.tick,removed:old.jobs.length-args[0].jobs.length});return result;}
const now=args[0],dt=b.previous===null?0:now-b.previous;b.previous=now;
const control=b.controls.at(-1);if(control&&b.lastPlay!==null&&dt>0){const delta=this.timeline.tick-b.lastPlay;if(control.delay===null&&visibleSpeedResponse(delta,dt,control.previousSpeed,control.speed))control.delay=performance.now()-control.at;if(control.fullRateDelay===null&&Math.abs(delta/dt-control.speed*.006)<.00001)control.fullRateDelay=performance.now()-control.at;}b.lastPlay=this.timeline.tick;
b.frames.push({at:now,speed:this.received?.speed,dt,cpu:performance.now()-start,lag:(this.received?.world.tick??this.world.tick)-this.timeline.tick,tick:this.world.tick,play:this.timeline.tick});
const g=this.pawns.pawnMesh?.geometry;if(!g)return result;
const f=g.getAttribute('aFrom'),t=g.getAttribute('aTo'),travel=g.getAttribute('aTravel'),motion=g.getAttribute('aMotion');
this.world.pawns.forEach((p,i)=>{const duration=travel.getY(i)-travel.getX(i),a=duration>0?Math.min(1,Math.max(0,(this.pawns.travelTime.value-travel.getX(i))/duration)):this.pawns.blend.value;
const x=f.getX(i)+(t.getX(i)-f.getX(i))*a,z=f.getZ(i)+(t.getZ(i)-f.getZ(i))*a,prev=b.poses.get(p.id),distance=prev?Math.hypot(x-prev.x,z-prev.z):0;
if(this.world.tiles[Math.round(z)*this.world.width+Math.round(x)]?.terrain==='rock'&&Math.hypot(x-Math.round(x),z-Math.round(z))<.35)b.solidOccupancy.push({tick:this.world.tick,play:this.timeline.tick,pawn:p.id,x,z});
if(prev&&dt>0&&dt<100&&distance>dt*.013+.02)b.jumps.push({at:now,tick:this.world.tick,play:this.timeline.tick,distance,dt,pawn:p.id,state:p.state,from:[prev.x,prev.z],to:[x,z],segment:this.timeline.segment(p.id),gpuFrom:[f.getX(i),f.getZ(i)],gpuTo:[t.getX(i),t.getZ(i)],gpuTravel:[travel.getX(i),travel.getY(i),travel.getZ(i),travel.getW(i)],workOffset:this.pawns.workOffsets.get(p.id),approach:this.pawns.approachTransitions.get(p.id)});
const track=this.timeline.tracks.get(p.id);if(track?.length&&track[0].start>this.timeline.tick)b.gaps.push({tick:this.world.tick,play:this.timeline.tick,first:track[0].start});
b.poses.set(p.id,{x,z});});return result;};}
`;
const report={date:new Date().toISOString(),cpu:os.cpus()[0].model,seconds,switches,initialSpeed,speedCycle,viewport:{width:1440,height:1000},protocol:'Native Chromium WebGPU, seed 42 / 250² / 3 colonists, rectangular designations, actual worker at initialSpeed; switches=true uses speedCycle every 2 seconds. Frame pose read from shared GPU inputs; no full-world serialization in frames. Runtime clock: 6 local ticks/s at 1x. 13 cells/s jump bound includes neutral 6x travel (12 cells/s).',phases:[]};
const browser=await chromium.launch({channel:'chromium',args:[]});
try{for(const action of (process.env.HARVEST_ACTIONS??'mine,chop').split(',')){
 const w=createWorld(42,250,250);w.tick=2000;
 const p=w.pawns[0],c=action==='mine'?w.tiles.map((t,i)=>({t,x:i%250,z:Math.floor(i/250)})).filter(v=>v.t.terrain==='rock').sort((a,b)=>(a.x-p.x)**2+(a.z-p.z)**2-((b.x-p.x)**2+(b.z-p.z)**2))[0]:p;
 const command={type:'area',action,from:{x:Math.max(0,c.x-20),z:Math.max(0,c.z-20)},to:{x:Math.min(249,c.x+20),z:Math.min(249,c.z+20)}};
 if(!applyCommand(w,command).ok)throw Error('Designation rejected');
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.setDefaultTimeout(30000);
 if(process.env.HARVEST_TRACE==='1'){
  // Diagnostic only: compare worker publication with main-thread receipt in a
  // shared time origin. No production protocol or simulation state is changed.
  await page.route('**/src/bridge/simulation.worker.ts*',async route=>{
   const response=await route.fetch(),source=await response.text();
   if(!source.includes('stepWorld(world);'))throw Error('Worker diagnostic could not locate the step call');
   const instrumentation=`
let traceBatch=null,lastTraceWake=performance.now();
function tracedStep(w){const at=performance.now();try{return stepWorld(w);}finally{if(traceBatch)traceBatch.simulation+=performance.now()-at;}}
const originalTraceEncode=snapshots.encode.bind(snapshots);snapshots.encode=(...args)=>{const at=performance.now();try{return originalTraceEncode(...args);}finally{if(traceBatch)traceBatch.encoding+=performance.now()-at;}};
const originalTracePost=self.postMessage.bind(self);self.postMessage=(message,...rest)=>{const at=performance.now();if(message.type==='snapshot')message.__publishedAt=performance.timeOrigin+at;try{return originalTracePost(message,...rest);}finally{if(traceBatch)traceBatch.sending+=performance.now()-at;}};
const originalTraceAdvance=advanceSimulation;advanceSimulation=now=>{const at=performance.now();traceBatch={at:performance.timeOrigin+at,wakeGap:at-lastTraceWake,simulation:0,encoding:0,sending:0,fromTick:world?.tick,speed};lastTraceWake=at;try{return originalTraceAdvance(now);}finally{const batch=traceBatch;batch.toTick=world?.tick;batch.elapsed=performance.now()-at;traceBatch=null;originalTracePost({type:'trace-batch',batch});}};
`;
   await route.fulfill({response,body:source.replace('stepWorld(world);','tracedStep(world);')+instrumentation});
  });
  await page.addInitScript(()=>{const Original=window.Worker;window.Worker=class extends Original{constructor(...args){super(...args);this.addEventListener('message',({data})=>{const b=window.__sync;if(!b?.active)return;if(data.__publishedAt!==undefined)(b.workerSnapshots??=[]).push({tick:data.world.tick,speed:data.speed,stepMs:data.stepMs,published:data.__publishedAt-performance.timeOrigin,received:performance.now()});if(data.type==='trace-batch')(b.workerBatches??=[]).push({...data.batch,at:data.batch.at-performance.timeOrigin});});}};});
 }
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()+`\nconst originalSync=client.onSnapshot;client.onSnapshot=(...args)=>{window.__sync.stepMs=args[1];return originalSync(...args);};`});});
 await page.addInitScript(data=>localStorage.setItem('lisiere.save.v1',data),serializeWorld(w));
 await page.goto('http://127.0.0.1:5173/?scenario=camp&e2e&size=250');await page.waitForFunction(()=>!!window.__lisiere);
 await page.locator('[data-speed="0"]').click();await page.locator('[data-panel="menu"]').click();await page.locator('#load').click();await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!document.querySelector('.game-shell').inert);
 await page.evaluate(()=>{window.__sync.active=true;});await page.locator('[data-speed="'+initialSpeed+'"]').click();
 if(switches)await page.evaluate(speeds=>{let i=0;window.__sync.switchTimer=setInterval(()=>document.querySelector('[data-speed="'+speeds[i++%speeds.length]+'"]').click(),2000);},speedCycle);
 await page.waitForFunction(start=>performance.now()-start>=0,await page.evaluate(s=>performance.now()+s*1000,seconds),{timeout:(seconds+15)*1000,polling:200});
 await page.evaluate(()=>clearInterval(window.__sync.switchTimer));await page.locator('[data-speed="0"]').click();
 const data=await page.evaluate(()=>{const b=window.__sync;b.active=false;const d=b.view.renderer.getContext().getConfiguration().device;return {workerBatches:b.workerBatches,workerSnapshots:b.workerSnapshots,adapter:{vendor:d.adapterInfo.vendor,architecture:d.adapterInfo.architecture},longTasks:b.longTasks,frames:b.frames,snapshots:b.snapshots,controls:b.controls,removals:b.removals,jumps:b.jumps,gaps:b.gaps,solidOccupancy:b.solidOccupancy,stepMs:b.stepMs,tick:b.view.world.tick,jobs:b.view.world.jobs.length};});
 const starvation=presentationStarvations(data.frames);
 const starvedFrames=starvation.length;
 const trace=process.env.HARVEST_TRACE==='1'?{longTasks:data.longTasks,workerBatchMs:Object.fromEntries(['wakeGap','simulation','encoding','sending','elapsed'].map(k=>[k,stats((data.workerBatches??[]).filter(b=>b.speed>0).map(b=>b[k]))])),slowWorkerBatches:(data.workerBatches??[]).filter(b=>b.speed>0&&(b.elapsed>20||b.wakeGap>50)),workerDeliveryMs:stats((data.workerSnapshots??[]).map(s=>s.received-s.published)),workerPublicationGapMs:stats((data.workerSnapshots??[]).flatMap((s,i,a)=>i&&s.speed===a[i-1].speed?[s.published-a[i-1].published]:[])),starvationContext:starvation.slice(0,10).map(s=>({frames:data.frames.filter(f=>Math.abs(f.at-s.current.at)<300),snapshots:data.snapshots.filter(f=>Math.abs(f.at-s.current.at)<300),worker:(data.workerSnapshots??[]).filter(f=>Math.abs(f.received-s.current.at)<300),batches:(data.workerBatches??[]).filter(b=>Math.abs(b.at-s.current.at)<300)}))}:{};
 const phase={starvation:starvation.slice(0,10),starvedFrames,controls:data.controls,action,command,initialJobs:w.jobs.length,adapter:data.adapter,errors,tick:data.tick,remainingJobs:data.jobs,stepMs:data.stepMs,frames:stats(data.frames.filter(f=>f.dt>0).map(f=>f.dt)),frameCpu:stats(data.frames.map(f=>f.cpu)),lagTicks:stats(data.frames.map(f=>f.lag)),adoptions:stats(data.snapshots.map(s=>s.ms)),deliveries:stats(data.snapshots.filter(s=>s.method==='setWorld').map(s=>s.ms)),sceneApplications:stats(data.snapshots.filter(s=>s.method==='applyWorld').map(s=>s.ms)),jumpCount:data.jumps.length,jumps:data.jumps.slice(0,80),gapCount:data.gaps.length,gaps:data.gaps.slice(0,5),solidOccupancyCount:data.solidOccupancy.length,solidOccupancy:data.solidOccupancy.slice(0,5),removals:data.removals,lagTimeline:data.frames.filter((_,i)=>i%240===0).map(f=>({tick:f.tick,play:f.play,lag:f.lag}))};report.phases.push(phase);console.log(JSON.stringify({action,frames:phase.frames,jumpCount:phase.jumpCount,solidOccupancyCount:phase.solidOccupancyCount}));
 Object.assign(phase,trace);
 if(process.env.HARVEST_RECOVERY==='1'){
  await page.locator('[data-speed="6"]').click();
  // Exceed the 64-tick history at 36 ticks/s. This isolated page stall is outside
  // all timed performance data, and the independent tick assertion stays below.
  await page.evaluate(()=>{const end=performance.now()+2500;while(performance.now()<end){}});
  await page.waitForFunction(()=>{const v=window.__sync.view;return v.received.world.tick-v.timeline.tick<=64&&v.world.tick<=v.timeline.tick;},undefined,{timeout:3000});
  await page.locator('[data-speed="0"]').click();
  phase.recovery=await page.evaluate(()=>{const v=window.__sync.view;return {latest:v.received.world.tick,display:v.world.tick,play:v.timeline.tick,queued:v.presentation.size};});
  const r=phase.recovery;
  if(r.latest<phase.tick+64||r.display>r.play||r.play>r.latest||r.latest-r.play>64||r.queued>64)throw Error('Incoherent recovery: '+JSON.stringify(r));
 }
 await page.screenshot({path:'artifacts/harvest-'+action+'-'+label+'.png'});await page.close();
 assertHarvestPhase(phase,process.env.HARVEST_VERIFY_SPEED!=='0',process.env.HARVEST_VERIFY!=='0',switches);
 }}finally{await browser.close();await writeFile('artifacts/harvest-sync-'+label+'.json',JSON.stringify(report,null,2)+'\n');}
