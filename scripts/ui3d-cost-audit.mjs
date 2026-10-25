// ROOT only. Prepare/freeze sources first. This driver never edits served sources,
// starts/stops a server, or closes a human browser. Run no concurrent benchmark.
// node scripts/ui3d-cost-audit.mjs --origin=http://127.0.0.1:5196 --order=legacy,native,legacy
import {chromium} from '@playwright/test';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2);
for(const arg of args)if(!/^--(origin|order|label|browser|budget-seconds)=/.test(arg))throw Error(`Unknown argument: ${arg}`);
const option=(name,fallback)=>args.find(arg=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const origin=new URL(option('origin','http://127.0.0.1:5196')),order=option('order','legacy,native,legacy').split(','),label=option('label','ui-cost-audit');
const budgetSeconds=Number(option('budget-seconds','540'));
if(!['127.0.0.1','localhost','[::1]'].includes(origin.hostname)||origin.protocol!=='http:'||['5173','5184'].includes(origin.port))throw Error('Use a private local DEV server, excluding human ports 5173/5184.');
assert.ok(JSON.stringify(order)===JSON.stringify(['legacy','native','legacy'])||JSON.stringify(order)===JSON.stringify(['legacy']),'Use W/C/W or one explicit completion witness.');
if(!/^[a-zA-Z0-9_-]+$/.test(label)||!Number.isInteger(budgetSeconds)||budgetSeconds<300||budgetSeconds>900)throw Error('Use a safe label and a 300–900 second total budget (default 540).');
const out=resolve(root,'tmp/ui3d-cost-audit',`${label}-${new Date().toISOString().replace(/[:.]/g,'-')}-${process.pid}`);
await mkdir(out,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const savePath=resolve(root,'public/test-saves/v419/les-eclaircies.json'),saveBytes=await readFile(savePath),saveSHA=sha(saveBytes),input=JSON.parse(saveBytes.toString('utf8'));
assert.equal(saveSHA,'49e5d50abfac5a2ac0e609378877bb645da3e4559286cff706a33dc00f0df19f');
assert.ok(Number.isSafeInteger(input.tick)&&input.pawns?.length===3);
const tickMatch=(await readFile(resolve(root,'src/sim/types.ts'),'utf8')).match(/export const TICKS_PER_SECOND\s*=\s*(\d+)/);
assert.ok(tickMatch,'Local tick rate must be known');const ticksPerSecond=Number(tickMatch[1]);
async function sourceFence(){
 const entries={};
 async function visit(folder){for(const entry of (await readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=join(folder,entry.name);if(entry.isDirectory())await visit(path);else if(entry.isFile())entries[relative(root,path).replaceAll('\\','/')]=sha(await readFile(path));else throw Error(`Unsupported source entry ${path}`);}}
 await visit(resolve(root,'src'));
 for(const name of ['index.html','package.json','package-lock.json','vite.config.ts','scripts/ui3d-cost-audit.mjs','public/test-saves/v419/les-eclaircies.json'])entries[name]=sha(await readFile(resolve(root,name)));
 return entries;
}
const fence=await sourceFence(),preferences={
 'lisiere.audio.effects.enabled.v1':'false','lisiere.audio.music.enabled.v1':'false','lisiere.audio.effects.volume.v1':'0','lisiere.audio.music.volume.v1':'0',
 'lisiere.autosave-minutes.v1':'0','lisiere.presentation.threat-pause.v1':'never',
 'lisiere.presentation.textures.v1':'true','lisiere.presentation.ground-grass.v1':'true','lisiere.presentation.room.v1':'true','lisiere.presentation.diorama.v1':'true','lisiere.presentation.decor-occlusion.v1':'true',
 'lisiere.presentation.shadows.v1':JSON.stringify({frequency:60,resolution:2048}),
 'lisiere.presentation.lighting.v1':JSON.stringify({sun:1,moon:1,ambient:1}),
 'lisiere.presentation.animation-detail.v1':JSON.stringify({enabled:true,nearPixels:24,farPixels:8,middleHz:12}),
 'elsewhere.ui3d.auto-hide.v1':JSON.stringify({bottom:false,notifications:false}),
};
const blocks=[
 {id:'paused-hud',speed:0,seconds:8},
 {id:'paused-work',speed:0,seconds:8,work:true},
 {id:'paused-wide',speed:0,seconds:6,wide:true},
 {id:'paused-toolbar-hover',speed:0,seconds:8,hover:true},
 {id:'x1-orbit',speed:1,seconds:20,orbit:true},
 {id:'x3-orbit',speed:3,seconds:20,orbit:true,reload:true},
];
const nativeDiagnostic={id:'x1-bio-diagnostic',speed:1,seconds:12,inspector:true,diagnosticOnly:true};
const report={protocol:'ui3d-cost-audit-v477-wcw-1',created:new Date().toISOString(),out,origin:origin.href,order,blocks,nativeDiagnostic,budgetSeconds,ticksPerSecond,
 save:{path:savePath,sha256:saveSHA,inputTick:input.tick},sources:fence,driverSHA:fence['scripts/ui3d-cost-audit.mjs'],preferences,
 viewport:{width:1440,height:1000,dpr:1},wideViewport:{width:2557,height:1440,dpr:1},host:{cpu:os.cpus()[0]?.model,node:process.version,platform:process.platform,ramTotal:os.totalmem(),ramFreeAtStart:os.freemem()},externalLoad:'Human watching streaming film in Brave, then announced League of Legends launch. First bracket interrupted/excluded. This fresh run follows observed League game-process creation 2026-10-25T19:49:50Z. No human application stopped. CPU counters of League/Riot/Brave are retained around windows; changing external GPU workload remains an unmeasured confounder.',contexts:[],comparisons:[],errors:[],limits:[
 'Current DEV legacy/native selectors share the same simulation/render sources. This is not a historical V475 production-versus-V477 comparison.',
 'One visible muted Chromium browser; three fresh contexts sequentially, one page navigation per context. Input loaded through GameSession, then reloaded only before x3. All paused blocks and x1 start at the exact input tick and serialized World SHA.',
 'HUD pause 8s, Work pause 8s, HUD 2557x1440 pause 6s, restored HUD toolbar hover pause 8s, x1 analytic orbit 20s, exact input reload, x3 analytic orbit 20s. Paused warmup 1.2s per block, outside measurement. Initial load and reload costs are recorded separately, not included in active windows.',
 'Work opens/closes by actual toolbar clicks. Hover uses 40 Playwright mouse moves at 200ms nominal spacing over Work/Planning/Recherche/Monde centers; browser-generated pointer events, no synthetic in-page events. Coordinates differ with the UI layout. Protocol overhead and scheduling jitter remain part of that hover window.',
 'RAF/wall callback intervals are cadence, not GPU completion or physical display. renderer.frame and native method timings are synchronous performance.now wall durations, not CPU accounting. Native nested timings may overlap and must not be summed with frame timings.',
 'CDP TaskDuration is renderer main-thread task time. ThreadTime is retained only if provided; raw unavailable metrics remain null. Brackets include small start/ack/protocol overhead. BrowserCDP SystemInfo.getProcessInfo records OS CPU seconds for every process exposed by this private browser, including process threads/Workers; it is separate from renderer TaskDuration and GPU elapsed execution time.',
 'Process CPU is differenced by PID and raw process type. Newly observed PID lifetime CPU is included separately; vanished PIDs and counter resets make the total incomplete. Inventories and timings are retained. Other browser instances/human apps are outside this private-browser scope. Renderer process CPU cannot be assigned exactly to one subsystem.',
 'NativeHud.update, NativeStage.showPage and NativeStage.hit aggregate count, total/max synchronous wall duration only while the window is active. Legacy has no equivalent wrappers; its DOM/layout cost is included in CDP totals. Wrappers add small uncalibrated overhead to native.',
 'Native UI diagnostics/cache counters and DOM counters are sampled outside windows. Heap/DOM counters are retained levels, not allocation volume or memory ownership. No forced GC. Cache recaptures/composites do not measure texture uploads or GPU time.',
 'An extra native-only Bio x1 12s diagnostic follows the comparative blocks, continuing the acknowledged x3 final World. It measures actual update/paint costs with a selected colonist; it is excluded from W/C/W comparisons and does not start at the initial input tick.',
 'No known local texture-upload or GPU timestamp instrumentation is enabled. GPU-process OS CPU is not GPU execution time or VRAM; total VRAM cannot be inferred from WebGPU allocations because private DOM/compositor ownership is not visible. GPU execution needs a separate acquisition. No automatic performance/FPS/comfort acceptance from this single drift-sensitive W/C/W bracket.',
 'Local source/driver fence and served Main response SHA are checked. Other served source URLs/statuses are recorded; the DEV server has no full startup-provenance endpoint. No claim about unrelated human application load.',
 'League/Riot/Brave process CPU snapshots are collected outside measured brackets. They detect process/lifetime or CPU-load changes, not equal external GPU load. Concurrent League gameplay prevents an unconditional causal FPS conclusion even if both witnesses agree.',
 ]};
const persist=()=>writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));
const verifyFence=async()=>assert.deepEqual(await sourceFence(),fence,'Frozen sources/driver changed');
function externalSnapshot(){const requested=Date.now(),result=spawnSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',"@(Get-Process | Where-Object {$_.ProcessName -match 'League|Riot|Brave'} | ForEach-Object { @{name=$_.ProcessName;id=$_.Id;cpuSeconds=$_.CPU;startedUtc=$_.StartTime.ToUniversalTime().ToString('o')} }) | ConvertTo-Json -Compress"],{encoding:'utf8',windowsHide:true,timeout:10000});let processes=null;try{processes=JSON.parse(result.stdout.trim()||'[]');}catch{}return {requested,received:Date.now(),exitCode:result.status,processes,error:result.error?String(result.error):result.stderr?.trim()||null};}
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
let browser,watchdog,expired=false,referenceCamera,referenceSettings,referenceLoadedSHA,referenceMainSHA;
const startedAt=Date.now(),remaining=()=>{const ms=budgetSeconds*1000-(Date.now()-startedAt);if(ms<=0)throw Error('Total audit budget exhausted');return ms;};
await persist();
try{
 await verifyFence();
 browser=await chromium.launch({executablePath:resolve(root,option('browser','.playwright/chromium-1243/chrome-win64/chrome.exe')),headless:false,args:['--mute-audio','--enable-unsafe-webgpu']});
 report.browser=browser.version();watchdog=setTimeout(()=>{expired=true;void browser.close();},remaining());
 const browserCDP=await browser.newBrowserCDPSession();
 report.gpuInfo=(await browserCDP.send('SystemInfo.getInfo')).gpu;
 const processMetrics=async()=>{const requested=Date.now(),result=await browserCDP.send('SystemInfo.getProcessInfo');assert.ok(result.processInfo.every(process=>Number.isFinite(process.id)&&typeof process.type==='string'&&Number.isFinite(process.cpuTime)&&process.cpuTime>=0),'Browser process CPU API unavailable');return {requested,received:Date.now(),processInfo:result.processInfo};};
 for(const [index,mode]of order.entries()){
  await verifyFence();const contextDir=resolve(out,`${index+1}-${mode}`);await mkdir(contextDir,{recursive:true});
  const row={id:`${index+1}-${mode}`,mode,started:new Date().toISOString(),servedModules:[],errors:[],loads:[],blocks:[]};report.contexts.push(row);await persist();
  const context=await browser.newContext({viewport:{width:report.viewport.width,height:report.viewport.height},deviceScaleFactor:1});let page;
  try{
   await context.addInitScript(values=>{for(const [key,value]of Object.entries(values))localStorage.setItem(key,value);},preferences);
   page=await context.newPage();page.setDefaultTimeout(Math.min(120000,remaining()));
   page.on('pageerror',error=>row.errors.push(String(error)));page.on('console',message=>{if(message.type()==='error'||/GPUValidationError|device.*lost/i.test(message.text()))row.errors.push(message.text());});
   page.on('response',response=>{const url=new URL(response.url());if(url.origin===origin.origin&&url.pathname.startsWith('/src/'))row.servedModules.push({url:url.href,status:response.status()});});
   await page.route('**/src/main.ts*',async route=>{const response=await route.fetch(),body=await response.text();for(const anchor of ['const nativeMode','function replaceColony','void start().catch'])assert.ok(body.includes(anchor),`Main anchor changed: ${anchor}`);const originalSHA=sha(body);referenceMainSHA??=originalSHA;assert.equal(originalSHA,referenceMainSHA);row.mainResponse={url:route.request().url(),originalSHA,injectedSHA:sha(body+hook)};await route.fulfill({response,body:body+hook});});
   const url=new URL('/',origin);url.searchParams.set('e2e','1');url.searchParams.set('ui',mode);await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:Math.min(120000,remaining())});
   await page.waitForFunction(()=>window.__ui3dAudit?.ready,null,{timeout:Math.min(120000,remaining())});assert.equal(await page.evaluate(()=>window.__ui3dAudit.mode),mode);
   const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable',{timeDomain:'timeTicks'});
   const metrics=async()=>{const requested=Date.now(),result=await cdp.send('Performance.getMetrics');return {requested,received:Date.now(),metrics:Object.fromEntries(result.metrics.map(metric=>[metric.name,metric.value]))};};
   const outsideSnapshot=async()=>({page:await page.evaluate(()=>({ui:window.__lisiere.nativeUi??null,panel:window.__ui3dAudit.panel,audio:window.__ui3dAudit.audio,visibility:document.visibilityState,domElements:document.querySelectorAll('*').length})),dom:await cdp.send('Memory.getDOMCounters')});
   const loadOriginal=async reason=>{const at=Date.now();await page.evaluate(data=>window.__ui3dAudit.load(data),saveBytes.toString('utf8'));await page.waitForFunction(()=>window.__ui3dAudit.ready&&window.__ui3dAudit.view?.backend==='WebGPU'&&window.__lisiere.hasActiveMap&&!window.__ui3dAudit.blocked,null,{timeout:Math.min(120000,remaining())});await page.evaluate(()=>window.__ui3dAudit.speedTo(0));row.loads.push({reason,wallMs:Date.now()-at});};
   await loadOriginal('initial');
   const work=async open=>{assert.equal(await page.evaluate(()=>window.__ui3dAudit.panel),open?null:'work');if(mode==='native'){const target=await page.evaluate(()=>window.__lisiere.nativeUi.management.find(item=>item.id==='work'));assert.ok(target);await page.mouse.click(target.x,target.y);}else await page.locator('[data-panel="work"]').click();await page.waitForFunction(expected=>window.__ui3dAudit.panel===expected,open?'work':null);};
   for(const block of mode==='native'?[...blocks,nativeDiagnostic]:blocks){
    remaining();await verifyFence();const blockDir=resolve(contextDir,block.id);await mkdir(blockDir,{recursive:true});const item={...block,started:new Date().toISOString()};row.blocks.push(item);await persist();console.log(JSON.stringify({context:row.id,block:block.id,status:'preparing'}));
    if(block.reload)await loadOriginal(block.id);const viewport=block.wide?report.wideViewport:report.viewport;await page.setViewportSize({width:viewport.width,height:viewport.height});
    if(block.work)await work(true);
    if(block.inspector){const target=await page.evaluate(()=>{const id=window.__ui3dAudit.world.pawns[0].id;return window.__lisiere.nativeUi.targets.find(item=>item.nativeId==='hud:pawn:'+id);});assert.ok(target);await page.mouse.click(target.x,target.y);await page.waitForFunction(()=>window.__lisiere.nativeUi.controls.some(item=>item.id==='pawn-tab-bio'));const tab=await page.evaluate(()=>window.__lisiere.nativeUi.controls.find(item=>item.id==='pawn-tab-bio'));await page.mouse.click(tab.x,tab.y);await page.waitForFunction(()=>window.__lisiere.nativeUi.page.endsWith('-bio'));}
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
    item.externalBefore=externalSnapshot();await page.screenshot({path:resolve(blockDir,'before.png')});item.before=await outsideSnapshot();
    let hoverTargets;if(block.hover){hoverTargets=[];for(const id of ['work','schedule','research','world']){const target=mode==='native'?await page.evaluate(id=>window.__lisiere.nativeUi.management.find(item=>item.id===id),id):await page.locator(`[data-panel="${id}"]`).evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});assert.ok(target,`Missing toolbar target ${id}`);hoverTargets.push({id,x:target.x,y:target.y});}item.hoverTargets=hoverTargets;}
    item.processCpu={before:await processMetrics()};item.cdp={before:await metrics()};
    item.start=await page.evaluate(({duration,speed,orbit})=>{const p=window.__ui3dAudit,q=window.__ui3dAuditWindow={active:false,duration,orbit,frames:[],long:[],visibility:[],native:{}};q.done=new Promise((resolve,reject)=>{q.resolve=resolve;q.reject=reject;});q.done.catch(()=>{});q.onVisibility=()=>{if(q.active)q.visibility.push({at:performance.now(),hidden:document.hidden});};document.addEventListener('visibilitychange',q.onVisibility);if(PerformanceObserver.supportedEntryTypes.includes('longtask')){q.observer=new PerformanceObserver(list=>q.long.push(...list.getEntries().map(e=>({at:e.startTime,ms:e.duration}))));q.observer.observe({type:'longtask',buffered:false});}q.start=performance.now();q.startTick=p.world.tick;q.startShownTick=p.view.world.tick;q.active=true;q.watchdog=setTimeout(()=>{q.active=false;q.reject(Error('Frame window exceeded bound'));},duration+15000);q.speedPromise=p.speedTo(speed).then(()=>{q.speedAck={at:performance.now(),tick:p.world.tick,speed:p.speed};});return {timeOrigin:performance.timeOrigin,start:q.start,startTick:q.startTick,startShownTick:q.startShownTick};},{duration:block.seconds*1000,speed:block.speed,orbit:!!block.orbit});
    if(block.hover){item.pointerMoves=[];const at=performance.now();for(let n=0;n<40;n++){await new Promise(resolve=>setTimeout(resolve,Math.max(0,at+n*200-performance.now())));const target=hoverTargets[n%hoverTargets.length],sent=performance.now();await page.mouse.move(target.x,target.y);item.pointerMoves.push({index:n,target:target.id,nodeElapsedMs:sent-at,protocolWallMs:performance.now()-sent});}}
    item.boundary=await page.evaluate(async()=>{const q=window.__ui3dAuditWindow;await q.done;await q.speedPromise;return {timeOrigin:performance.timeOrigin,start:q.start,end:q.end,startTick:q.startTick,endTick:q.endTick,startShownTick:q.startShownTick,endShownTick:q.endShownTick,frames:q.frames.length,speedAck:q.speedAck,hidden:q.hidden};});
    item.cdp.after=await metrics();item.processCpu.after=await processMetrics();item.processCpu.summary=processCpuSummary(item.processCpu.before,item.processCpu.after);item.after=await outsideSnapshot();item.externalAfter=externalSnapshot();
    const raw=await page.evaluate(async()=>{const q=window.__ui3dAuditWindow;if(q.active)throw Error('RAW requested during active window');await new Promise(resolve=>setTimeout(resolve,0));q.observer?.takeRecords().forEach(e=>q.long.push({at:e.startTime,ms:e.duration}));q.observer?.disconnect();document.removeEventListener('visibilitychange',q.onVisibility);return {frames:q.frames,long:q.long.filter(e=>e.at>=q.start&&e.at<q.end),visibility:q.visibility,native:q.native};});
    assert.equal(item.boundary.frames,raw.frames.length);assert.ok(raw.frames.length>2);assert.equal(item.boundary.startTick,block.diagnosticOnly?item.initialWorld.tick:input.tick);assert.equal(item.boundary.hidden,false);assert.deepEqual(raw.visibility,[]);
    const elapsedMs=item.boundary.end-item.boundary.start,deliveredTicks=item.boundary.endTick-item.boundary.startTick,raf=raw.frames.slice(1).map((f,i)=>f.at-raw.frames[i].at),wall=raw.frames.slice(1).map((f,i)=>f.wallAt-raw.frames[i].wallAt),delta=name=>{const before=item.cdp.before.metrics[name],after=item.cdp.after.metrics[name];return Number.isFinite(before)&&Number.isFinite(after)?after-before:null;};
    const taskDurationSeconds=delta('TaskDuration');assert.ok(Number.isFinite(taskDurationSeconds)&&taskDurationSeconds>=0);if(!block.speed)assert.equal(deliveredTicks,0);
    item.summary={elapsedMs,deliveredTicks,shownTicks:item.boundary.endShownTick-item.boundary.startShownTick,actualSpeed:deliveredTicks/ticksPerSecond/(elapsedMs/1000),targetFraction:block.speed?deliveredTicks/ticksPerSecond/(elapsedMs/1000)/block.speed:null,raf:stats(raf),wall:stats(wall),rafCuts:cuts(raf),wallCuts:cuts(wall),synchronousFrameWallMs:stats(raw.frames.map(f=>f.synchronousFrameWallMs)),firstCallbackDelayMs:raw.frames[0].wallAt-item.boundary.start,rafClockLag:stats(raw.frames.map(f=>f.wallAt-f.at)),taskDurationSeconds,threadTimeSeconds:delta('ThreadTime'),processTimeSeconds:delta('ProcessTime'),mainThreadTaskDutyFraction:taskDurationSeconds/(elapsedMs/1000),cdpLayoutSeconds:delta('LayoutDuration'),cdpRecalcStyleSeconds:delta('RecalcStyleDuration'),heapBefore:item.cdp.before.metrics.JSHeapUsedSize??null,heapAfter:item.cdp.after.metrics.JSHeapUsedSize??null,nativeSynchronousMethods:raw.native,longTasks:raw.long};
    item.summary.privateBrowserProcessCpuSeconds=item.processCpu.summary.observedCpuSeconds;item.summary.privateBrowserProcessCpuIncomplete=item.processCpu.summary.incomplete;item.summary.privateBrowserProcessCpuByGroup=item.processCpu.summary.groups;
    const bytes=Buffer.from(JSON.stringify({context:row.id,block,boundary:item.boundary,cdp:item.cdp,processCpu:item.processCpu,pointerMoves:item.pointerMoves??[],...raw}));await writeFile(resolve(blockDir,'raw.json'),bytes);item.raw={path:resolve(blockDir,'raw.json'),bytes:bytes.length,sha256:sha(bytes)};
    await page.evaluate(()=>window.__ui3dAudit.speedTo(0));await page.screenshot({path:resolve(blockDir,'after.png')});if(block.work)await work(false);if(block.wide)await page.setViewportSize({width:report.viewport.width,height:report.viewport.height});assert.deepEqual(row.errors,[]);item.status='acquired';await verifyFence();
    item.nativeCounterBracket=mode==='native'?Object.fromEntries(['renders','overlayRenders','rebuilds','raycasts'].map(key=>[key,item.after.page.ui[key]-item.before.page.ui[key]]).concat(['cacheRenders','composites','totalRenderCPUms'].map(key=>[`cache.${key}`,item.after.page.ui.cache[key]-item.before.page.ui.cache[key]]))):null;
    item.nativeCounterBracketScope='Outside-window samples tightly bracket the CDP window, including small protocol gaps. Cache totalRenderCPUms is the existing synchronous submission-wall counter name, not CPU or GPU accounting.';
    await writeFile(resolve(blockDir,'manifest.json'),JSON.stringify({protocol:report.protocol,context:row.id,block,sourceManifestSHA:sha(JSON.stringify(fence)),sourceManifestPath:resolve(out,'report.json'),mainResponse:row.mainResponse,initialWorld:item.initialWorld,camera:item.camera,settings:item.settings,surface:item.surface,raw:item.raw,screenshots:['before.png','after.png'],before:item.before,after:item.after,summary:item.summary,processCpu:item.processCpu.summary,nativeCounterBracket:item.nativeCounterBracket,nativeCounterBracketScope:item.nativeCounterBracketScope},null,2));
    await persist();console.log(JSON.stringify({context:row.id,block:block.id,status:item.status,summary:item.summary}));
   }
   row.status='acquired';
  }catch(error){row.status='failed';row.failure=String(error);if(page){const partial=await page.evaluate(()=>{const q=window.__ui3dAuditWindow;if(!q)return null;q.active=false;clearTimeout(q.watchdog);q.observer?.disconnect();return {start:q.start,end:q.end,startTick:q.startTick,endTick:q.endTick,frames:q.frames,long:q.long,native:q.native,visibility:q.visibility};}).catch(cause=>({collectionFailure:String(cause)}));await writeFile(resolve(contextDir,'failed-partial-raw.json'),JSON.stringify({error:String(error),partial},null,2));await page.screenshot({path:resolve(contextDir,'failure.png')}).catch(()=>{});}throw error;}
  finally{await persist();await context.close().catch(()=>{});}
 }
 if(order.length===3)for(const block of blocks){const [w1,c,w2]=report.contexts.map(context=>context.blocks.find(item=>item.id===block.id).summary);report.comparisons.push({block:block.id,witness1:w1,candidate:c,witness2:w2,witnessDrift:{wallP99Ms:w2.wall.p99-w1.wall.p99,actualSpeed:w2.actualSpeed-w1.actualSpeed,taskDurationSeconds:w2.taskDurationSeconds-w1.taskDurationSeconds},interpretation:'Single raw bracket. No automatic gain/comfort acceptance.'});}
 report.status='acquired';await verifyFence();
}catch(error){report.status='failed';report.errors.push(String(error));throw error;}
finally{clearTimeout(watchdog);report.expired=expired;report.totalWallMs=Date.now()-startedAt;await persist();if(browser)await browser.close();console.log(JSON.stringify({out,status:report.status,expired}));}
