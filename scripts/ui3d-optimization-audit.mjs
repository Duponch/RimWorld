// ROOT only. Prepare/freeze sources first. This driver never edits served sources,
// starts/stops a server, or closes a human browser. Run no concurrent benchmark.
// node scripts/ui3d-optimization-audit.mjs --baseline-root=tmp/FROZEN_ROOT
import {chromium} from '@playwright/test';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2);
for(const arg of args)if(!/^--(baseline-root|baseline-origin|candidate-origin|label|browser|budget-seconds|order|blocks)=/.test(arg))throw Error(`Unknown argument: ${arg}`);
const option=(name,fallback)=>args.find(arg=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;

assert.ok(option('baseline-root'),'--baseline-root required');
const roots={baseline:resolve(root,option('baseline-root')),candidate:root};
assert.notEqual(roots.baseline.toLowerCase(),root.toLowerCase());
const origins={baseline:new URL(option('baseline-origin','http://127.0.0.1:5197')),candidate:new URL(option('candidate-origin','http://127.0.0.1:5196'))};
for(const o of Object.values(origins))assert.ok(['127.0.0.1','localhost','[::1]'].includes(o.hostname)&&o.protocol==='http:'&&!['5173','5184'].includes(o.port),'Private loopback servers only');
assert.notEqual(origins.baseline.origin,origins.candidate.origin);
const order=option('order','baseline,candidate,baseline').split(','),label=option('label','native-optimization'),budgetSeconds=Number(option('budget-seconds','540'));
assert.ok(['baseline,candidate,baseline','candidate,baseline','baseline'].includes(order.join(',')),'Use a full bracket or its continuation after an acquired witness');
assert.ok(/^[a-zA-Z0-9_-]+$/.test(label)&&Number.isInteger(budgetSeconds)&&budgetSeconds>=240&&budgetSeconds<=900);
const out=resolve(root,'tmp/ui3d-optimization-audit',`${label}-${new Date().toISOString().replace(/[:.]/g,'-')}-${process.pid}`);
await mkdir(out,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const savePath=resolve(root,'public/test-saves/v419/les-eclaircies.json'),saveBytes=await readFile(savePath),saveSHA=sha(saveBytes),input=JSON.parse(saveBytes.toString('utf8'));
assert.equal(saveSHA,'49e5d50abfac5a2ac0e609378877bb645da3e4559286cff706a33dc00f0df19f');
assert.ok(Number.isSafeInteger(input.tick)&&input.pawns?.length===3);
const tickMatch=(await readFile(resolve(root,'src/sim/types.ts'),'utf8')).match(/export const TICKS_PER_SECOND\s*=\s*(\d+)/);
assert.ok(tickMatch,'Local tick rate must be known');const ticksPerSecond=Number(tickMatch[1]);
async function sourceFence(base=root){
 const entries={};
 async function visit(folder){for(const entry of (await readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=join(folder,entry.name);if(entry.isDirectory())await visit(path);else if(entry.isFile())entries[relative(base,path).replaceAll('\\','/')]=sha(await readFile(path));else throw Error(`Unsupported source entry ${path}`);}}
 await visit(resolve(base,'src'));
 for(const name of ['index.html','package.json','package-lock.json','vite.config.ts','public/test-saves/v419/les-eclaircies.json'])entries[name]=sha(await readFile(resolve(base,name)));
 return entries;
}

const fence=await sourceFence(),baselineFence=await sourceFence(roots.baseline),fences={baseline:baselineFence,candidate:fence},driverSHA=sha(await readFile(fileURLToPath(import.meta.url)));
const differences=[...new Set([...Object.keys(fence),...Object.keys(baselineFence)])].filter(path=>fence[path]!==baselineFence[path]);
assert.ok(differences.length>0&&differences.every(path=>path.startsWith('src/ui3d/')),'Only native UI may differ: '+differences.join(','));
const preferences={
 'lisiere.audio.effects.enabled.v1':'false','lisiere.audio.music.enabled.v1':'false','lisiere.audio.effects.volume.v1':'0','lisiere.audio.music.volume.v1':'0',
 'lisiere.autosave-minutes.v1':'0','lisiere.presentation.threat-pause.v1':'never',
 'lisiere.presentation.textures.v1':'true','lisiere.presentation.ground-grass.v1':'true','lisiere.presentation.room.v1':'true','lisiere.presentation.diorama.v1':'true','lisiere.presentation.decor-occlusion.v1':'true',
 'lisiere.presentation.shadows.v1':JSON.stringify({frequency:60,resolution:2048}),
 'lisiere.presentation.lighting.v1':JSON.stringify({sun:1,moon:1,ambient:1}),
 'lisiere.presentation.animation-detail.v1':JSON.stringify({enabled:true,nearPixels:24,farPixels:8,middleHz:12}),
 'elsewhere.ui3d.auto-hide.v1':JSON.stringify({bottom:false,notifications:false}),
};
const allBlocks=[{id:'paused-hud',speed:0,seconds:8},{id:'paused-toolbar-hover',speed:0,seconds:8,hover:true},{id:'paused-wide',speed:0,seconds:6,wide:true},{id:'x1-orbit',speed:1,seconds:20,orbit:true}];
const requestedBlocks=option('blocks','').split(',').filter(Boolean);
assert.ok(requestedBlocks.every(id=>allBlocks.some(block=>block.id===id))&&new Set(requestedBlocks).size===requestedBlocks.length,'Known unique blocks only');
const blocks=allBlocks.filter(block=>!requestedBlocks.length||requestedBlocks.includes(block.id));
const report={created:new Date().toISOString(),out,order,blocks,budgetSeconds,ticksPerSecond,
 save:{path:savePath,sha256:saveSHA,inputTick:input.tick},driverSHA,preferences,
 viewport:{width:1440,height:1000,dpr:1},wideViewport:{width:2557,height:1440,dpr:1},
 host:{cpu:os.cpus()[0]?.model,node:process.version,platform:process.platform,ramTotal:os.totalmem(),ramFreeAtStart:os.freemem()},
 contexts:[],comparisons:[],errors:[]};
report.protocol='native-ui-optimization-wcw-v478-1';report.sources=fences;report.sourceRoots=roots;report.origins=Object.fromEntries(Object.entries(origins).map(([id,url])=>[id,url.href]));report.differences=differences;
report.externalLoad='League closed per human; Brave streaming unchanged per human. Process CPU/identity retained; video/decode GPU intensity uncontrolled.';
report.limits=[
 'Fresh native W/C/W only, never compared causally to prior League-active acquisitions; no automatic gain/comfort acceptance.',
 'Both roots/config/save/driver frozen. Only src/ui3d differences. Served executable TS originals verified by inline map sourcesContent SHA or exact raw source equality. Transformed CSS records response hashes and its disk fence; unmodified Vite CSS originals are matched when available.',
 'Fresh visible muted Chromium contexts; exact GameSession input. Initial complete World SHA/tick, camera, DPR/settings identical in every block.',
 'Idle8s, hover40moves/8s, wide idle6s, x1orbit20s; warmup1.2s outside. Actual intervals and delivered simulation throughput retained.',
 'ThreadTime mandatory using CDP threadTicks; CPU/frame means renderer main-thread CPU. TaskDuration and synchronous submission-wall timings remain separate.',
 'Equal cache.draw wrappers add uncalibrated observer cost. Captures count dirty draws; baseline captured pixels are full target area, candidate uses cumulative damage pixels. Capture duration is submission wall time, not GPU time/upload.',
 'League game absence checked only at observed boundaries. Brave/Riot CPU and lifetimes retained; intermediate launches or decode/compositor load uncontrolled.',
 'Private browser OS process CPU independent of ThreadTime, with new/missing/reset PIDs reported. GPU process CPU is not GPU execution.',
 'No GPU timestamp/allocation instrumentation here; no physical VRAM conclusion. RAW, initial complete saves, screenshots, source response evidence and failures preserved.'
];
const persist=()=>writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));
const verifyFence=async()=>{assert.deepEqual(await sourceFence(),fence,'Candidate changed');assert.deepEqual(await sourceFence(roots.baseline),baselineFence,'Baseline changed');assert.equal(sha(await readFile(fileURLToPath(import.meta.url))),driverSHA,'Driver changed');};
function externalSnapshot(){const requested=Date.now(),result=spawnSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',"@(Get-Process | Where-Object {$_.ProcessName -match 'League|Riot|Brave'} | ForEach-Object { $processStarted=$_.StartTime; @{name=$_.ProcessName;id=$_.Id;cpuSeconds=$_.CPU;startedUtc=if($null -ne $processStarted){$processStarted.ToUniversalTime().ToString('o')}else{$null}} }) | ConvertTo-Json -Compress"],{encoding:'utf8',windowsHide:true,timeout:10000});let processes=null;try{processes=JSON.parse(result.stdout.trim()||'[]');}catch{}return {requested,received:Date.now(),exitCode:result.status,processes,error:result.error?String(result.error):result.stderr?.trim()||null};}

function assertExternal(d){assert.equal(d.exitCode,0);assert.equal(d.error,null);assert.ok(d.processes!==null);const rows=Array.isArray(d.processes)?d.processes:[d.processes];assert.ok(!rows.some(p=>/^League of Legends$/i.test(p.name)),'League game process present');}
report.externalAtStart=externalSnapshot();
const stats=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!a.length)return null;const at=p=>a[Math.min(a.length-1,Math.ceil(a.length*p)-1)];return {n:a.length,mean:a.reduce((a,b)=>a+b,0)/a.length,p50:at(.5),p95:at(.95),p99:at(.99),max:a.at(-1)};};
const cuts=values=>[16.7,33.4,50,100].map(thresholdMs=>({thresholdMs,count:values.filter(value=>value>thresholdMs).length}));
function processCpuSummary(before,after){
 const previous=new Map(before.processInfo.map(process=>[process.id,process])),current=new Map(after.processInfo.map(process=>[process.id,process]));
 const processGroup=type=>{const value=type.toLowerCase();return value.includes('gpu')?'GPU':value.includes('renderer')?'renderer':value==='browser'?'browser':value.includes('utility')?'utility':'other';};
 const rows=after.processInfo.map(process=>{const earlier=previous.get(process.id),sameType=!earlier||earlier.type===process.type,delta=earlier?process.cpuTime-earlier.cpuTime:process.cpuTime;return {pid:process.id,type:process.type,group:processGroup(process.type),beforeCpuSeconds:earlier?.cpuTime??null,afterCpuSeconds:process.cpuTime,cpuSeconds:delta,newPid:!earlier,counterReset:!sameType||!Number.isFinite(delta)||delta<0};});
 const missing=before.processInfo.filter(process=>!current.has(process.id)),invalid=rows.filter(process=>process.counterReset),groups={};
 for(const row of rows){const group=groups[row.group]??={observedCpuSeconds:0,stablePidCpuSeconds:0,newPidLifetimeCpuSeconds:0,pids:[]};group.pids.push(row.pid);if(row.counterReset)continue;group.observedCpuSeconds+=row.cpuSeconds;if(row.newPid)group.newPidLifetimeCpuSeconds+=row.cpuSeconds;else group.stablePidCpuSeconds+=row.cpuSeconds;}
 const stablePidCpuSeconds=rows.filter(row=>!row.newPid&&!row.counterReset).reduce((total,row)=>total+row.cpuSeconds,0),newPidLifetimeCpuSeconds=rows.filter(row=>row.newPid&&!row.counterReset).reduce((total,row)=>total+row.cpuSeconds,0);
 return {observedCpuSeconds:stablePidCpuSeconds+newPidLifetimeCpuSeconds,stablePidCpuSeconds,newPidLifetimeCpuSeconds,groups,rows,beforePids:[...previous.keys()],afterPids:[...current.keys()],missing,invalid,incomplete:!!(missing.length||invalid.length),scope:'Private browser OS process CPU. Missing PID terminal CPU is unrecoverable; newly observed PID lifetime CPU is separately identified. Bracket includes CDP protocol gaps; no GPU execution-time inference.'};
}
const hook=String.raw`
window.__ui3dAudit={get view(){return renderer},get world(){return snapshot},get hud(){return nativeHud},get stage(){return nativeUi},get panel(){return currentPanel},get mode(){return nativeMode?'native':'legacy'},get speed(){return currentSpeed},
 get ready(){return !!window.__lisiere&&!session.busy&&!replacingWorld&&!presentationPreparation},
 get blocked(){return !!(simulationStopped||graphicsFault||waitingRequests.size||replacingWorld||frontMenu.isOpen()||document.hidden)},
 get settings(){return {shadows:{...shadowSettings},lighting:{...lightingSettings},animation:{...animationSettings},textures:texturesEnabled,grass:groundGrassEnabled,room:roomEnabled,diorama:dioramaEnabled,occlusion:decorOcclusionPreference,autosave:autosaveIntervalMinutes,threatPause:threatPausePreference.mode,soundEnabled,soundVolume,musicEnabled,musicVolume}},
 get audio(){return {effects:audio.diagnostics,music:music.diagnostics}},load:data=>replaceColony(()=>session.loadExternal(async()=>data)),save:()=>client.save(),speedTo:value=>changeSpeed(value,client.getThreatPauseToken())};
`;
let browser,watchdog,expired=false,referenceCamera,referenceSettings,referenceLoadedSHA;const referenceMainSHAs={};
const startedAt=Date.now(),remaining=()=>{const ms=budgetSeconds*1000-(Date.now()-startedAt);if(ms<=0)throw Error('Total audit budget exhausted');return ms;};
await persist();
try{
 assertExternal(report.externalAtStart);await verifyFence();
 browser=await chromium.launch({executablePath:resolve(root,option('browser','.playwright/chromium-1243/chrome-win64/chrome.exe')),headless:false,args:['--mute-audio','--enable-unsafe-webgpu']});
 report.browser=browser.version();watchdog=setTimeout(()=>{expired=true;void browser.close();},remaining());
 const browserCDP=await browser.newBrowserCDPSession();
 report.gpuInfo=(await browserCDP.send('SystemInfo.getInfo')).gpu;
 const processMetrics=async()=>{const requested=Date.now(),result=await browserCDP.send('SystemInfo.getProcessInfo');assert.ok(result.processInfo.every(process=>Number.isFinite(process.id)&&typeof process.type==='string'&&Number.isFinite(process.cpuTime)&&process.cpuTime>=0),'Browser process CPU API unavailable');return {requested,received:Date.now(),processInfo:result.processInfo};};
 for(const [index,variant]of order.entries()){
  const mode="native",origin=origins[variant];
  await verifyFence();const contextDir=resolve(out,`${index+1}-${variant}`);await mkdir(contextDir,{recursive:true});
  const row={id:`${index+1}-${variant}`,variant,mode,origin:origin.href,sourceRoot:roots[variant],started:new Date().toISOString(),servedModules:[],errors:[],loads:[],blocks:[]};report.contexts.push(row);await persist();
  const context=await browser.newContext({viewport:{width:report.viewport.width,height:report.viewport.height},deviceScaleFactor:1});let page;
  try{
   await context.addInitScript(values=>{for(const [key,value]of Object.entries(values))localStorage.setItem(key,value);},preferences);
   page=await context.newPage();page.setDefaultTimeout(Math.min(120000,remaining()));
   page.on('pageerror',error=>row.errors.push(String(error)));page.on('console',message=>{if(message.type()==='error'||/GPUValidationError|device.*lost/i.test(message.text()))row.errors.push(message.text());});

   let rejectRoute;
   const routeFailure=new Promise((_,reject)=>{rejectRoute=reject;});routeFailure.catch(()=>{});
   await page.route('**/src/**',async route=>{
    try{
    let response;
    for(let attempt=0;attempt<3;attempt++){
     try{response=await route.fetch();break;}
     catch(error){row.routeRetries??=[];row.routeRetries.push({url:route.request().url(),attempt,error:String(error)});if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,200));}
    }
    const url=new URL(route.request().url()),body=await response.text(),path=decodeURIComponent(url.pathname.slice(1)),expected=fences[variant][path];
    assert.ok(expected,'Unfenced module '+path);assert.equal(response.status(),200);
    const encoded=body.match(/\/\/[#@]\s*sourceMappingURL=data:application\/json(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/=]+)/),map=encoded?JSON.parse(Buffer.from(encoded[1],'base64').toString('utf8')):null;
    const css=path.endsWith('.css')?body.match(/const __vite__css = ("(?:\\.|[^"\\])*")/):null;
    const cssMatches=css&&sha(JSON.parse(css[1]))===expected;
    const matches=cssMatches||map?.sourcesContent?.some(content=>typeof content==='string'&&sha(content)===expected);
    // Vite may resolve CSS imports/URLs before embedding its CSS string. These
    // transformed styles have response evidence; strict original-source
    // matching applies to executable TS modules, including both native stages.
    const exact=sha(body)===expected;
    assert.ok(matches||exact||path.endsWith('.css'),'Served source root mismatch: '+path);
    row.servedModules.push({url:url.href,path,responseSHA:sha(body),sourceSHA:expected,provenance:cssMatches?'vite-css-original':matches?'inline-map-sourcesContent':exact?'exact-body':'transformed-css-disk-fenced'});
    let served=body;
    if(path==='src/main.ts'){for(const a of ['const nativeMode','function replaceColony','void start().catch'])assert.ok(body.includes(a));const originalSHA=sha(body);referenceMainSHAs[variant]??=originalSHA;assert.equal(originalSHA,referenceMainSHAs[variant]);served+=hook;row.mainResponse={url:url.href,originalSHA,injectedSHA:sha(served)};}
    if(['src/main.ts','src/ui3d/NativeStage.ts','src/ui3d/NativeOverlayCache.ts','src/ui3d/NativeRendererStandby.ts'].includes(path))await writeFile(resolve(contextDir,path.replaceAll('/','_')+'.served.js'),body);
    await route.fulfill({response,body:served});
    }catch(error){row.errors.push(String(error));rejectRoute(error);await route.abort().catch(()=>{});}
   });
   const url=new URL('/',origin);url.searchParams.set('e2e','1');url.searchParams.set('ui',mode);await Promise.race([routeFailure,page.goto(url.href,{waitUntil:'domcontentloaded',timeout:Math.min(120000,remaining())})]);
   await Promise.race([routeFailure,page.waitForFunction(()=>window.__ui3dAudit?.ready,null,{timeout:Math.min(120000,remaining())})]);assert.equal(await page.evaluate(()=>window.__ui3dAudit.mode),mode);
   const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable',{timeDomain:'threadTicks'});
   const metrics=async()=>{const requested=Date.now(),result=await cdp.send('Performance.getMetrics');return {requested,received:Date.now(),metrics:Object.fromEntries(result.metrics.map(metric=>[metric.name,metric.value]))};};
   const outsideSnapshot=async()=>({page:await page.evaluate(()=>({ui:window.__lisiere.nativeUi??null,panel:window.__ui3dAudit.panel,audio:window.__ui3dAudit.audio,visibility:document.visibilityState,domElements:document.querySelectorAll('*').length})),dom:await cdp.send('Memory.getDOMCounters')});
   const loadOriginal=async reason=>{const at=Date.now();await page.evaluate(data=>window.__ui3dAudit.load(data),saveBytes.toString('utf8'));await page.waitForFunction(()=>window.__ui3dAudit.ready&&window.__ui3dAudit.view?.backend==='WebGPU'&&window.__lisiere.hasActiveMap&&!window.__ui3dAudit.blocked,null,{timeout:Math.min(120000,remaining())});await page.evaluate(()=>window.__ui3dAudit.speedTo(0));row.loads.push({reason,wallMs:Date.now()-at});};
   await loadOriginal('initial');
   for(const block of blocks){
    remaining();await verifyFence();const blockDir=resolve(contextDir,block.id);await mkdir(blockDir,{recursive:true});const item={...block,started:new Date().toISOString()};row.blocks.push(item);await persist();console.log(JSON.stringify({context:row.id,block:block.id,status:'preparing'}));
    if(block.reload)await loadOriginal(block.id);const viewport=block.wide?report.wideViewport:report.viewport;await page.setViewportSize({width:viewport.width,height:viewport.height});
    const loaded=await page.evaluate(()=>window.__ui3dAudit.save());assert.equal(typeof loaded,'string');item.initialWorld={sha256:sha(loaded),bytes:Buffer.byteLength(loaded),tick:await page.evaluate(()=>window.__ui3dAudit.world.tick)};referenceLoadedSHA??=item.initialWorld.sha256;if(!block.diagnosticOnly){assert.equal(item.initialWorld.sha256,referenceLoadedSHA,'Initial complete World differs');assert.equal(item.initialWorld.tick,input.tick);}
    if(row.loads.length===1&&block.id==='paused-hud')await writeFile(resolve(contextDir,'loaded-save.json'),loaded);
    item.camera=await page.evaluate(()=>{
     const p=window.__ui3dAudit,v=p.view,w=p.world,r=v.rig,c=v.controls;r.setMode('orthographic');c.enableDamping=false;c.autoRotate=false;c.enabled=false;
     const target=[w.pawns[0].x,0,w.pawns[0].z];let radius=Math.hypot(65,65),height=85;
     if(r.roomEnabled&&r.roomLayout){const {walls,floorY,unit}=r.roomLayout,margin=Math.max(v.camera.near*2,unit*.04)+.01,limits=[target[0]-walls.westX-margin,walls.eastX-target[0]-margin,target[2]-walls.northZ-margin,walls.southZ-target[2]-margin,walls.ceilingY-margin-target[1]];if(!limits.every(Number.isFinite)||!Number.isFinite(floorY)||target[1]<floorY+margin)throw Error('Invalid room orbit bounds');radius=Math.min(radius,...limits.slice(0,4));height=Math.min(height,limits[4]);}
     if(!(radius>1&&height>1))throw Error('No admissible fixed orbit');const orbit={target,radius,height,zoom:2,initialAngle:Math.PI/4,radiansPerSecond:2*Math.PI/10};window.__ui3dAuditOrbit=orbit;
     c.target.set(...target);v.camera.position.set(target[0]+radius*Math.cos(orbit.initialAngle),target[1]+height,target[2]+radius*Math.sin(orbit.initialAngle));v.camera.zoom=2;v.camera.updateProjectionMatrix();c.update();v.camera.lookAt(c.target);v.camera.updateMatrixWorld();if(r.constrainRoom())throw Error('Room constraints changed prepared camera');return {...orbit,mode:r.mode,position:v.camera.position.toArray()};
    });
    referenceCamera??=item.camera;if(!block.diagnosticOnly)assert.deepEqual(item.camera,referenceCamera);
    await page.evaluate(()=>{
     const p=window.__ui3dAudit,v=p.view;
     for(const [owner,key,label]of [[p.hud,'update','NativeHud.update'],[p.stage,'showPage','NativeStage.showPage'],[p.stage,'hit','NativeStage.hit']]){if(!owner||owner[key].__ui3dAuditWrapped)continue;const original=owner[key];const wrapped=function(...args){const q=window.__ui3dAuditWindow;if(!q?.active)return original.apply(this,args);const start=performance.now();try{return original.apply(this,args);}finally{const ms=performance.now()-start,record=q.native[label]??={count:0,synchronousWallMs:0,maxSynchronousWallMs:0};record.count++;record.synchronousWallMs+=ms;record.maxSynchronousWallMs=Math.max(record.maxSynchronousWallMs,ms);}};wrapped.__ui3dAuditWrapped=true;owner[key]=wrapped;}

     const cache=p.stage?.overlayCache;
     if(cache&&!cache.__ui3dOptimizationWrapped){cache.__ui3dOptimizationWrapped=true;const originalDraw=cache.draw;
      cache.draw=function(...args){const q=window.__ui3dAuditWindow;if(!q?.active)return originalDraw.apply(this,args);const before=this.cacheRenders??0,beforePixels=this.totalCapturePixels;
       try{return originalDraw.apply(this,args);}finally{const n=(this.cacheRenders??0)-before;q.cache.draws++;if(n>0){q.cache.captures+=n;q.cache.captureSubmissionWallMs+=this.captureCPUms??0;q.cache.capturedPixels+=typeof beforePixels==='number'&&typeof this.totalCapturePixels==='number'?this.totalCapturePixels-beforePixels:n*(this.target?.width??0)*(this.target?.height??0);}}
      };
     }
     if(v.__ui3dAuditWrapped)return;v.__ui3dAuditWrapped=true;const original=v.frame;
     v.frame=function(now){const q=window.__ui3dAuditWindow;if(!q?.active)return original.call(this,now);const wallAt=performance.now(),orbit=window.__ui3dAuditOrbit,t=Math.max(0,Math.min(q.duration,wallAt-q.start))/1000,angle=orbit.initialAngle+(q.orbit?t*orbit.radiansPerSecond:0);
      if(q.orbit){v.controls.target.set(...orbit.target);v.camera.position.set(orbit.target[0]+orbit.radius*Math.cos(angle),orbit.target[1]+orbit.height,orbit.target[2]+orbit.radius*Math.sin(angle));v.camera.zoom=orbit.zoom;v.camera.lookAt(v.controls.target);v.camera.updateMatrixWorld();}
      try{original.call(this,now);}catch(error){q.active=false;clearTimeout(q.watchdog);q.reject(error);throw error;}
      const end=performance.now();q.frames.push({at:now,wallAt,end,synchronousFrameWallMs:end-wallAt,tick:p.world.tick,shownTick:v.world.tick,timelineTick:v.timeline?.tick??null,speed:p.speed,angle});
      const radiusError=Math.abs(Math.hypot(v.camera.position.x-orbit.target[0],v.camera.position.z-orbit.target[2])-orbit.radius),heightError=Math.abs(v.camera.position.y-orbit.target[1]-orbit.height),targetError=v.controls.target.toArray().some((n,i)=>Math.abs(n-orbit.target[i])>1e-8);
      if(radiusError>1e-6||heightError>1e-6||targetError||v.camera.zoom!==orbit.zoom||p.blocked){q.active=false;clearTimeout(q.watchdog);q.reject(Error('Camera/visibility/runtime changed during window'));return;}
      if(wallAt-q.start>=q.duration){q.end=end;q.endTick=p.world.tick;q.endShownTick=v.world.tick;q.hidden=document.hidden;q.active=false;clearTimeout(q.watchdog);q.resolve();}
     };
    });
    await page.mouse.move(0,0);await page.waitForTimeout(1200);
    item.settings=await page.evaluate(()=>{const p=window.__ui3dAudit,v=p.view;return {...p.settings,dpr:devicePixelRatio,mode:v.rig.mode};});referenceSettings??=item.settings;assert.deepEqual(item.settings,referenceSettings);assert.equal(item.settings.dpr,1);assert.equal(item.settings.autosave,0);assert.equal(item.settings.threatPause,'never');for(const key of ['soundEnabled','musicEnabled'])assert.equal(item.settings[key],false);for(const key of ['soundVolume','musicVolume'])assert.equal(item.settings[key],0);
    if(mode==='native')assert.equal(await page.locator('button,select,dialog,input').count(),0);
    item.surface=await page.evaluate(()=>({width:window.__ui3dAudit.view.renderer.domElement.width,height:window.__ui3dAudit.view.renderer.domElement.height,viewportWidth:innerWidth,viewportHeight:innerHeight,dpr:devicePixelRatio}));assert.equal(item.surface.viewportWidth,viewport.width);assert.equal(item.surface.viewportHeight,viewport.height);assert.equal(item.surface.width,viewport.width);assert.equal(item.surface.height,viewport.height);
    item.externalBefore=externalSnapshot();assertExternal(item.externalBefore);await page.screenshot({path:resolve(blockDir,'before.png')});item.before=await outsideSnapshot();
    let hoverTargets;if(block.hover){hoverTargets=[];for(const id of ['work','schedule','research','world']){const target=mode==='native'?await page.evaluate(id=>window.__lisiere.nativeUi.management.find(item=>item.id===id),id):await page.locator(`[data-panel="${id}"]`).evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});assert.ok(target,`Missing toolbar target ${id}`);hoverTargets.push({id,x:target.x,y:target.y});}item.hoverTargets=hoverTargets;}
    item.processCpu={before:await processMetrics()};item.cdp={before:await metrics()};
    item.start=await page.evaluate(({duration,speed,orbit})=>{const p=window.__ui3dAudit,q=window.__ui3dAuditWindow={active:false,duration,orbit,frames:[],long:[],visibility:[],native:{},cache:{draws:0,captures:0,capturedPixels:0,captureSubmissionWallMs:0}};q.done=new Promise((resolve,reject)=>{q.resolve=resolve;q.reject=reject;});q.done.catch(()=>{});q.onVisibility=()=>{if(q.active)q.visibility.push({at:performance.now(),hidden:document.hidden});};document.addEventListener('visibilitychange',q.onVisibility);if(PerformanceObserver.supportedEntryTypes.includes('longtask')){q.observer=new PerformanceObserver(list=>q.long.push(...list.getEntries().map(e=>({at:e.startTime,ms:e.duration}))));q.observer.observe({type:'longtask',buffered:false});}q.start=performance.now();q.startTick=p.world.tick;q.startShownTick=p.view.world.tick;q.active=true;q.watchdog=setTimeout(()=>{q.active=false;q.reject(Error('Frame window exceeded bound'));},duration+15000);q.speedPromise=p.speedTo(speed).then(()=>{q.speedAck={at:performance.now(),tick:p.world.tick,speed:p.speed};});return {timeOrigin:performance.timeOrigin,start:q.start,startTick:q.startTick,startShownTick:q.startShownTick};},{duration:block.seconds*1000,speed:block.speed,orbit:!!block.orbit});
    if(block.hover){item.pointerMoves=[];const at=performance.now();for(let n=0;n<40;n++){await new Promise(resolve=>setTimeout(resolve,Math.max(0,at+n*200-performance.now())));const target=hoverTargets[n%hoverTargets.length],sent=performance.now();await page.mouse.move(target.x,target.y);item.pointerMoves.push({index:n,target:target.id,nodeElapsedMs:sent-at,protocolWallMs:performance.now()-sent});}}
    item.boundary=await page.evaluate(async()=>{const q=window.__ui3dAuditWindow;await q.done;await q.speedPromise;return {timeOrigin:performance.timeOrigin,start:q.start,end:q.end,startTick:q.startTick,endTick:q.endTick,startShownTick:q.startShownTick,endShownTick:q.endShownTick,frames:q.frames.length,speedAck:q.speedAck,hidden:q.hidden};});
    item.cdp.after=await metrics();item.processCpu.after=await processMetrics();item.processCpu.summary=processCpuSummary(item.processCpu.before,item.processCpu.after);item.after=await outsideSnapshot();item.externalAfter=externalSnapshot();assertExternal(item.externalAfter);
    const raw=await page.evaluate(async()=>{const q=window.__ui3dAuditWindow;if(q.active)throw Error('RAW requested during active window');await new Promise(resolve=>setTimeout(resolve,0));q.observer?.takeRecords().forEach(e=>q.long.push({at:e.startTime,ms:e.duration}));q.observer?.disconnect();document.removeEventListener('visibilitychange',q.onVisibility);return {frames:q.frames,long:q.long.filter(e=>e.at>=q.start&&e.at<q.end),visibility:q.visibility,native:q.native,cache:q.cache};});
    assert.equal(item.boundary.frames,raw.frames.length);assert.ok(raw.frames.length>2);assert.equal(item.boundary.startTick,block.diagnosticOnly?item.initialWorld.tick:input.tick);assert.equal(item.boundary.hidden,false);assert.deepEqual(raw.visibility,[]);
    const elapsedMs=item.boundary.end-item.boundary.start,deliveredTicks=item.boundary.endTick-item.boundary.startTick,raf=raw.frames.slice(1).map((f,i)=>f.at-raw.frames[i].at),wall=raw.frames.slice(1).map((f,i)=>f.wallAt-raw.frames[i].wallAt),delta=name=>{const before=item.cdp.before.metrics[name],after=item.cdp.after.metrics[name];return Number.isFinite(before)&&Number.isFinite(after)?after-before:null;};
    const threadTimeSeconds=delta('ThreadTime');assert.ok(Number.isFinite(threadTimeSeconds)&&threadTimeSeconds>=0,'ThreadTime unavailable');const taskDurationSeconds=delta('TaskDuration');assert.ok(Number.isFinite(taskDurationSeconds)&&taskDurationSeconds>=0);if(!block.speed)assert.equal(deliveredTicks,0);
    item.summary={elapsedMs,deliveredTicks,shownTicks:item.boundary.endShownTick-item.boundary.startShownTick,actualSpeed:deliveredTicks/ticksPerSecond/(elapsedMs/1000),targetFraction:block.speed?deliveredTicks/ticksPerSecond/(elapsedMs/1000)/block.speed:null,raf:stats(raf),wall:stats(wall),rafCuts:cuts(raf),wallCuts:cuts(wall),synchronousFrameWallMs:stats(raw.frames.map(f=>f.synchronousFrameWallMs)),firstCallbackDelayMs:raw.frames[0].wallAt-item.boundary.start,rafClockLag:stats(raw.frames.map(f=>f.wallAt-f.at)),taskDurationSeconds,threadTimeSeconds,threadCPUmsPerFrame:threadTimeSeconds*1000/raw.frames.length,cache:raw.cache,cacheCaptureSubmissionWallMsPerFrame:raw.cache.captureSubmissionWallMs/raw.frames.length,processTimeSeconds:delta('ProcessTime'),mainThreadTaskDutyFraction:taskDurationSeconds/(elapsedMs/1000),cdpLayoutSeconds:delta('LayoutDuration'),cdpRecalcStyleSeconds:delta('RecalcStyleDuration'),heapBefore:item.cdp.before.metrics.JSHeapUsedSize??null,heapAfter:item.cdp.after.metrics.JSHeapUsedSize??null,nativeSynchronousMethods:raw.native,longTasks:raw.long};
    item.summary.privateBrowserProcessCpuSeconds=item.processCpu.summary.observedCpuSeconds;item.summary.privateBrowserProcessCpuIncomplete=item.processCpu.summary.incomplete;item.summary.privateBrowserProcessCpuByGroup=item.processCpu.summary.groups;
    const bytes=Buffer.from(JSON.stringify({context:row.id,block,boundary:item.boundary,cdp:item.cdp,processCpu:item.processCpu,pointerMoves:item.pointerMoves??[],...raw}));await writeFile(resolve(blockDir,'raw.json'),bytes);item.raw={path:resolve(blockDir,'raw.json'),bytes:bytes.length,sha256:sha(bytes)};
    await page.evaluate(()=>window.__ui3dAudit.speedTo(0));
    if(block.speed){const finalSave=await page.evaluate(()=>window.__ui3dAudit.save());assert.equal(typeof finalSave,'string');const finalWorld=JSON.parse(finalSave);assert.ok(finalWorld.tick>=item.boundary.endTick);await writeFile(resolve(blockDir,'final-save.json'),finalSave);item.finalWorld={sha256:sha(finalSave),bytes:Buffer.byteLength(finalSave),tick:finalWorld.tick};}
    await page.screenshot({path:resolve(blockDir,'after.png')});if(block.wide)await page.setViewportSize({width:report.viewport.width,height:report.viewport.height});assert.deepEqual(row.errors,[]);item.status='acquired';await verifyFence();
    item.nativeCounterBracket=mode==='native'?Object.fromEntries(['renders','overlayRenders','rebuilds','raycasts'].map(key=>[key,item.after.page.ui[key]-item.before.page.ui[key]]).concat(['cacheRenders','composites','totalRenderCPUms'].map(key=>[`cache.${key}`,item.after.page.ui.cache[key]-item.before.page.ui.cache[key]]))):null;
    item.nativeCounterBracketScope='Outside-window samples tightly bracket the CDP window, including small protocol gaps. Cache totalRenderCPUms is the existing synchronous submission-wall counter name, not CPU or GPU accounting.';
    await writeFile(resolve(blockDir,'manifest.json'),JSON.stringify({protocol:report.protocol,context:row.id,block,variant,sourceRoot:roots[variant],sourceManifestSHA:sha(JSON.stringify(fences[variant])),sourceManifestPath:resolve(out,'report.json'),mainResponse:row.mainResponse,initialWorld:item.initialWorld,camera:item.camera,settings:item.settings,surface:item.surface,raw:item.raw,screenshots:['before.png','after.png'],before:item.before,after:item.after,summary:item.summary,processCpu:item.processCpu.summary,nativeCounterBracket:item.nativeCounterBracket,nativeCounterBracketScope:item.nativeCounterBracketScope},null,2));
    await persist();console.log(JSON.stringify({context:row.id,block:block.id,status:item.status,summary:item.summary}));
   }
   row.status='acquired';
  }catch(error){row.status='failed';row.failure=String(error);if(page){const partial=await page.evaluate(()=>{const q=window.__ui3dAuditWindow;if(!q)return null;q.active=false;clearTimeout(q.watchdog);q.observer?.disconnect();return {start:q.start,end:q.end,startTick:q.startTick,endTick:q.endTick,frames:q.frames,long:q.long,native:q.native,visibility:q.visibility};}).catch(cause=>({collectionFailure:String(cause)}));await writeFile(resolve(contextDir,'failed-partial-raw.json'),JSON.stringify({error:String(error),partial},null,2));await page.screenshot({path:resolve(contextDir,'failure.png')}).catch(()=>{});}throw error;}
  finally{await persist();await context.close().catch(()=>{});}
 }
 if(order.length===3)for(const block of blocks){const [w1,c,w2]=report.contexts.map(context=>context.blocks.find(item=>item.id===block.id).summary);report.comparisons.push({block:block.id,witness1:w1,candidate:c,witness2:w2,witnessDrift:{wallP99Ms:w2.wall.p99-w1.wall.p99,actualSpeed:w2.actualSpeed-w1.actualSpeed,taskDurationSeconds:w2.taskDurationSeconds-w1.taskDurationSeconds},interpretation:'Single raw bracket. No automatic gain/comfort acceptance.'});}
 report.status='comparative-blocks-acquired';await verifyFence();
}catch(error){report.status='failed';report.errors.push(String(error));throw error;}
finally{clearTimeout(watchdog);report.expired=expired;report.totalWallMs=Date.now()-startedAt;await persist();if(browser)await browser.close();console.log(JSON.stringify({out,status:report.status,expired}));}
