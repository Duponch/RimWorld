// ROOT only, sequential qualification. This file never starts/stops a server
// and never edits a served source. Run only after browser QA and source freeze.
// Example: node scripts/ui3d-native-performance.mjs --seconds=20 --speeds=1,3,6 --paused-cache-off
import {chromium} from '@playwright/test';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import assert from 'node:assert/strict';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2);
for(const arg of args)if(!/^--(origin|seconds|speeds|label|browser)=/.test(arg)&&arg!=='--paused-cache-off')throw Error(`Unknown argument: ${arg}`);
const option=(name,fallback)=>args.find(arg=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const origin=new URL(option('origin','http://127.0.0.1:5196'));
if(!['127.0.0.1','localhost','[::1]'].includes(origin.hostname)||origin.protocol!=='http:')throw Error('A private local DEV server is required.');
if(['5173','5184'].includes(origin.port))throw Error('Human servers 5173/5184 are excluded.');
const seconds=Number(option('seconds','20')),speeds=option('speeds','1,3,6').split(',').map(Number),label=option('label','native-performance');
if(![20,40].includes(seconds)||!speeds.length||new Set(speeds).size!==speeds.length||speeds.some(speed=>![1,3,6].includes(speed))||!/^[a-zA-Z0-9_-]+$/.test(label))throw Error('Use --seconds=20|40 --speeds=1,3,6 --label=safe-name.');
const executablePath=resolve(root,option('browser','.playwright/chromium-1243/chrome-win64/chrome.exe'));
const out=resolve(root,'tmp/ui3d-v476',`${label}-${new Date().toISOString().replace(/[:.]/g,'-')}-${process.pid}`);
await mkdir(out,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const savePath=resolve(root,'public/test-saves/v419/les-eclaircies.json'),saveBytes=await readFile(savePath),saveSHA=sha(saveBytes);
assert.equal(saveSHA,'49e5d50abfac5a2ac0e609378877bb645da3e4559286cff706a33dc00f0df19f','Original Éclaircies bytes changed; review the input before measuring.');
const input=JSON.parse(saveBytes.toString('utf8'));
assert.ok(Number.isSafeInteger(input.tick)&&input.pawns?.length===3,'Expected the original uncompressed Éclaircies save.');
const ticksSource=await readFile(resolve(root,'src/sim/types.ts'),'utf8'),tickMatch=ticksSource.match(/export const TICKS_PER_SECOND\s*=\s*(\d+)/);
if(!tickMatch)throw Error('Local tick-rate definition changed.');
const ticksPerSecond=Number(tickMatch[1]);
async function sourceFence(){
 const entries={};
 async function visit(folder){for(const entry of (await readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=join(folder,entry.name);if(entry.isDirectory())await visit(path);else if(entry.isFile())entries[relative(root,path).replaceAll('\\','/')]=sha(await readFile(path));else throw Error(`Unsupported source entry ${path}`);}}
 await visit(resolve(root,'src'));
 for(const name of ['index.html','package.json','package-lock.json','vite.config.ts'])entries[name]=sha(await readFile(resolve(root,name)));
 entries['scripts/ui3d-native-performance.mjs']=sha(await readFile(fileURLToPath(import.meta.url)));entries['public/test-saves/v419/les-eclaircies.json']=sha(await readFile(savePath));
 return entries;
}
const fence=await sourceFence();
const preferences={
 'lisiere.audio.effects.enabled.v1':'false','lisiere.audio.music.enabled.v1':'false','lisiere.audio.effects.volume.v1':'0','lisiere.audio.music.volume.v1':'0',
 'lisiere.autosave-minutes.v1':'0','lisiere.presentation.threat-pause.v1':'never',
 'lisiere.presentation.textures.v1':'true','lisiere.presentation.ground-grass.v1':'true','lisiere.presentation.room.v1':'true','lisiere.presentation.diorama.v1':'true','lisiere.presentation.decor-occlusion.v1':'true',
 'lisiere.presentation.shadows.v1':JSON.stringify({frequency:60,resolution:2048}),
 'lisiere.presentation.lighting.v1':JSON.stringify({sun:1,moon:1,ambient:1}),
 'lisiere.presentation.animation-detail.v1':JSON.stringify({enabled:true,nearPixels:24,farPixels:8,middleHz:12}),
};
const report={protocol:'native-ui-v476-bracket-1',created:new Date().toISOString(),out,origin:origin.href,seconds,speeds,ticksPerSecond,
 save:{path:savePath,sha256:saveSHA,inputTick:input.tick},sources:fence,driverSHA:fence['scripts/ui3d-native-performance.mjs'],
 host:{cpu:os.cpus()[0]?.model,node:process.version,platform:process.platform},preferences,viewport:{width:1440,height:1000,dpr:1},
 order:speeds.flatMap(speed=>[{id:`x${speed}-W1`,mode:'legacy',speed},{id:`x${speed}-C`,mode:'native',speed},{id:`x${speed}-W2`,mode:'legacy',speed}]),
 phases:[],comparisons:[],errors:[],limits:[
  'DEV legacy and native use the same current product/simulation/renderer sources; this does not compare production V475 against V476.',
  'Fresh isolated context for every phase; one visible Chromium browser and one active scene. No other human application is closed or assumed absent.',
  'Paused warmup only, three seconds. Measurement includes speed-start acknowledgement and initial active work from the same confirmed tick; no claim of steady-state-only behavior.',
  'Analytic camera orbit is applied immediately before the actual renderer frame, one revolution per ten seconds. It is not a physical pointer rotation test.',
  'RAF and wall-start intervals measure callback cadence, not completed GPU execution or physical display. First callback delay and the terminal callback are retained.',
  'CDP Performance TaskDuration covers the page renderer main thread only, not Worker/GPU/browser/OS total CPU. Its bracket includes small protocol and speed-acknowledgement overhead outside the active frame window.',
  'One W/C/W bracket per requested speed detects witness drift but cannot establish repeatability or universal comfort. Later simulated states may differ if delivery throughput differs.',
  'Idle gameplay HUD only; creation screens, open panels, modal interactions, other saves, long campaigns and production builds require separate qualification.',
  'A local source fence and served Main SHA are checked; the private DEV server has no startup-provenance endpoint. Other module response URLs/statuses are recorded, not proof of all external asset identity.',
  'Paused before captures share the input World and analytic camera. Optional ui-cache=off is an extra paused capture only; no pixel equivalence claim or active performance comparison is made from that capture.',
 ]};
if(args.includes('--paused-cache-off'))report.order.push({id:'paused-native-cache-off',mode:'native',speed:0,captureOnly:true,cacheOff:true});
const persist=()=>writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));
async function verifyFence(){assert.deepEqual(await sourceFence(),fence,'Sources or driver changed during qualification.');}
const stats=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!a.length)return null;const at=p=>a[Math.min(a.length-1,Math.ceil(a.length*p)-1)];return {n:a.length,mean:a.reduce((a,b)=>a+b,0)/a.length,p50:at(.5),p95:at(.95),p99:at(.99),max:a.at(-1)};};
const cuts=values=>[16.7,33.4,50,100].map(threshold=>({thresholdMs:threshold,count:values.filter(value=>value>threshold).length}));
// Only an observation/control hook is appended to the DEV response. Loading
// still uses the actual strict session/replacement path and original bytes.
const hook=String.raw`
window.__ui3dPerformance={get view(){return renderer},get world(){return snapshot},get mode(){return nativeMode?'native':'legacy'},get speed(){return currentSpeed},
 get ready(){return !!window.__lisiere&&!session.busy&&!replacingWorld&&!presentationPreparation},
 get blocked(){return !!(simulationStopped||graphicsFault||waitingRequests.size||replacingWorld||frontMenu.isOpen()||document.hidden)},
 get settings(){return {shadows:{...shadowSettings},lighting:{...lightingSettings},animation:{...animationSettings},textures:texturesEnabled,grass:groundGrassEnabled,room:roomEnabled,diorama:dioramaEnabled,occlusion:decorOcclusionPreference,autosave:autosaveIntervalMinutes,threatPause:threatPausePreference.mode,soundEnabled,soundVolume,musicEnabled,musicVolume}},
 get audio(){return {effects:audio.diagnostics,music:music.diagnostics}},
 load:data=>replaceColony(()=>session.loadExternal(async()=>data)),save:()=>client.save(),
 speedTo:value=>changeSpeed(value,client.getThreatPauseToken())};
`;
await persist();
let browser,referenceCamera,referenceSettings,referenceLoadedSHA,referenceMainSHA;
try{
 await verifyFence();
 browser=await chromium.launch({executablePath,headless:false,args:['--mute-audio','--enable-unsafe-webgpu']});report.browser=browser.version();
 for(const phase of report.order){
  await verifyFence();
  const phaseDir=resolve(out,phase.id);await mkdir(phaseDir,{recursive:true});
  const row={...phase,started:new Date().toISOString(),servedModules:[],errors:[]};report.phases.push(row);await persist();
  console.log(JSON.stringify({phase:phase.id,status:'loading'}));
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  let page;
  try{
   await context.addInitScript(values=>{for(const [key,value]of Object.entries(values))localStorage.setItem(key,value);},preferences);
   page=await context.newPage();page.setDefaultTimeout(120000);
   page.on('pageerror',error=>row.errors.push(String(error)));
   page.on('console',message=>{if(message.type()==='error'||/GPUValidationError|device.*lost/i.test(message.text()))row.errors.push(message.text());});
   page.on('response',response=>{const url=new URL(response.url());if(url.origin===origin.origin&&url.pathname.startsWith('/src/'))row.servedModules.push({url:url.href,status:response.status()});});
   await page.route('**/src/main.ts*',async route=>{
    const response=await route.fetch(),body=await response.text();
    for(const anchor of ['const nativeMode','function replaceColony','void start().catch'])if(!body.includes(anchor))throw Error(`DEV Main anchor changed: ${anchor}`);
    const originalSHA=sha(body);referenceMainSHA??=originalSHA;assert.equal(originalSHA,referenceMainSHA,'Served Main response changed across phases.');
    row.mainResponse={url:route.request().url(),originalSHA,injectedSHA:sha(body+hook)};await route.fulfill({response,body:body+hook});
   });
   const url=new URL('/',origin);url.searchParams.set('e2e','1');url.searchParams.set('ui',phase.mode);if(phase.cacheOff)url.searchParams.set('ui-cache','off');await page.goto(url.href,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__ui3dPerformance?.ready);
   assert.equal(await page.evaluate(()=>window.__ui3dPerformance.mode),phase.mode,'DEV UI selector was not honored.');
   await page.evaluate(data=>window.__ui3dPerformance.load(data),saveBytes.toString('utf8'));
   await page.waitForFunction(()=>window.__ui3dPerformance?.view?.backend==='WebGPU'&&window.__lisiere?.hasActiveMap&&!window.__ui3dPerformance.blocked);
   await page.evaluate(()=>window.__ui3dPerformance.speedTo(0));
   const loaded=await page.evaluate(()=>window.__ui3dPerformance.save());assert.equal(typeof loaded,'string');
   row.loadedSave={sha256:sha(loaded),bytes:Buffer.byteLength(loaded)};await writeFile(resolve(phaseDir,'loaded-save.json'),loaded);
   referenceLoadedSHA??=row.loadedSave.sha256;assert.equal(row.loadedSave.sha256,referenceLoadedSHA,'Confirmed initial complete World differs between phases.');
   assert.equal(await page.evaluate(()=>window.__ui3dPerformance.world.tick),input.tick,'Initial tick advanced during loading.');
   row.camera=await page.evaluate(()=>{
    const p=window.__ui3dPerformance,v=p.view,w=p.world,r=v.rig,c=v.controls;r.setMode('orthographic');c.enableDamping=false;c.autoRotate=false;c.enabled=false;
    const target=[w.pawns[0].x,0,w.pawns[0].z];let radius=Math.hypot(65,65),height=85;
    if(r.roomEnabled&&r.roomLayout){const {walls,floorY,unit}=r.roomLayout,margin=Math.max(v.camera.near*2,unit*.04)+.01,limits=[target[0]-walls.westX-margin,walls.eastX-target[0]-margin,target[2]-walls.northZ-margin,walls.southZ-target[2]-margin,walls.ceilingY-margin-target[1]];
     if(!limits.every(Number.isFinite)||!Number.isFinite(floorY)||target[1]<floorY+margin)throw Error('Invalid room bounds for the prepared orbit');radius=Math.min(radius,...limits.slice(0,4));height=Math.min(height,limits[4]);}
    if(!(radius>1&&height>1))throw Error('No admissible fixed orbit');
    const orbit={target,radius,height,zoom:2,initialAngle:Math.PI/4,radiansPerSecond:2*Math.PI/10};window.__ui3dOrbit=orbit;
    c.target.set(...target);v.camera.position.set(target[0]+radius*Math.cos(orbit.initialAngle),target[1]+height,target[2]+radius*Math.sin(orbit.initialAngle));v.camera.zoom=2;v.camera.updateProjectionMatrix();c.update();v.camera.lookAt(c.target);v.camera.updateMatrixWorld();
    if(r.constrainRoom())throw Error('Prepared camera was changed by room constraints');return {...orbit,mode:r.mode,position:v.camera.position.toArray()};
   });
   referenceCamera??=row.camera;assert.deepEqual(row.camera,referenceCamera,'Different orbit between phases.');
   await page.mouse.move(0,0);await page.waitForTimeout(3000);
   row.settings=await page.evaluate(()=>{const p=window.__ui3dPerformance,v=p.view;return {...p.settings,surface:{width:v.renderer.domElement.width,height:v.renderer.domElement.height,dpr:devicePixelRatio},mode:v.rig.mode};});
   referenceSettings??=row.settings;assert.deepEqual(row.settings,referenceSettings,'Different presentation/runtime settings between phases.');
   assert.equal(row.settings.autosave,0);assert.equal(row.settings.threatPause,'never');assert.equal(row.settings.soundEnabled,false);assert.equal(row.settings.musicEnabled,false);assert.equal(row.settings.soundVolume,0);assert.equal(row.settings.musicVolume,0);
   row.uiBefore=await page.evaluate(()=>window.__lisiere.nativeUi??null);
   if(phase.mode==='native')assert.equal(await page.locator('button,select,dialog,input').count(),0,'Legacy HTML controls remain active in native UI.');
   await page.screenshot({path:resolve(phaseDir,'before.png')});
   if(phase.captureOnly){row.status='captured-paused';row.audioAfter=await page.evaluate(()=>window.__ui3dPerformance.audio);assert.deepEqual(row.errors,[]);await verifyFence();continue;}
   await page.evaluate(()=>{
    const p=window.__ui3dPerformance,v=p.view,orbit=window.__ui3dOrbit,q=window.__ui3dMeasure={active:false,frames:[],long:[],visibility:[]};
    const original=v.frame;
    v.frame=function(now){
     if(!q.active)return original.call(this,now);
     const wallAt=performance.now(),t=Math.max(0,Math.min(q.duration,wallAt-q.start))/1000,angle=orbit.initialAngle+t*orbit.radiansPerSecond;
     v.controls.target.set(...orbit.target);v.camera.position.set(orbit.target[0]+orbit.radius*Math.cos(angle),orbit.target[1]+orbit.height,orbit.target[2]+orbit.radius*Math.sin(angle));v.camera.zoom=orbit.zoom;v.camera.lookAt(v.controls.target);v.camera.updateMatrixWorld();
     try{original.call(this,now);}catch(error){q.active=false;clearTimeout(q.watchdog);q.reject(error);throw error;}
     const end=performance.now(),radiusError=Math.abs(Math.hypot(v.camera.position.x-orbit.target[0],v.camera.position.z-orbit.target[2])-orbit.radius),heightError=Math.abs(v.camera.position.y-orbit.target[1]-orbit.height),targetError=v.controls.target.toArray().some((n,i)=>Math.abs(n-orbit.target[i])>1e-8);
     q.frames.push({at:now,wallAt,end,cpuMs:end-wallAt,tick:p.world.tick,shownTick:v.world.tick,timelineTick:v.timeline?.tick??null,speed:p.speed,phaseSeconds:t,angle,radiusError,heightError});
     if(radiusError>1e-6||heightError>1e-6||targetError||v.camera.zoom!==orbit.zoom||p.blocked){q.active=false;clearTimeout(q.watchdog);q.reject(Error('Camera, visibility, front, or runtime blocked during the window'));return;}
     if(wallAt-q.start>=q.duration){q.end=end;q.endTick=p.world.tick;q.endShownTick=v.world.tick;q.hidden=document.hidden;q.active=false;clearTimeout(q.watchdog);q.resolve();}
    };
    document.addEventListener('visibilitychange',()=>{if(q.active)q.visibility.push({at:performance.now(),hidden:document.hidden});});
    if(PerformanceObserver.supportedEntryTypes.includes('longtask')){q.observer=new PerformanceObserver(list=>q.long.push(...list.getEntries().map(entry=>({at:entry.startTime,ms:entry.duration}))));q.observer.observe({type:'longtask',buffered:false});}
   });
   const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable',{timeDomain:'timeTicks'});
   const metrics=async()=>{const requested=Date.now(),result=await cdp.send('Performance.getMetrics');return {requested,received:Date.now(),metrics:Object.fromEntries(result.metrics.map(metric=>[metric.name,metric.value]))};};
   const cpuBefore=await metrics();row.cdp={before:cpuBefore};
   const boundary=await page.evaluate(async({duration,speed})=>{
    const p=window.__ui3dPerformance,q=window.__ui3dMeasure;q.duration=duration;q.start=performance.now();q.startTick=p.world.tick;q.startShownTick=p.view.world.tick;q.active=true;
    const done=new Promise((resolve,reject)=>{q.resolve=resolve;q.reject=reject;q.watchdog=setTimeout(()=>{q.active=false;reject(Error('Active frame window exceeded bound'));},duration+15000);});
    try{await p.speedTo(speed);q.speedAck={at:performance.now(),tick:p.world.tick,speed:p.speed};await done;}catch(error){q.active=false;clearTimeout(q.watchdog);throw error;}
    return {timeOrigin:performance.timeOrigin,start:q.start,end:q.end,startTick:q.startTick,endTick:q.endTick,startShownTick:q.startShownTick,endShownTick:q.endShownTick,frames:q.frames.length,speedAck:q.speedAck,hidden:q.hidden};
   },{duration:seconds*1000,speed:phase.speed});
   // Read CPU metadata before RAW extraction, pausing, screenshots or JSON work.
   const cpuAfter=await metrics();row.cdp.after=cpuAfter;
   const raw=await page.evaluate(async()=>{const q=window.__ui3dMeasure;if(q.active)throw Error('RAW requested during active window');await new Promise(resolve=>setTimeout(resolve,0));if(q.observer){q.long.push(...q.observer.takeRecords().map(entry=>({at:entry.startTime,ms:entry.duration})));q.observer.disconnect();}return {frames:q.frames,long:q.long.filter(entry=>entry.at>=q.start&&entry.at<q.end),visibility:q.visibility};});
   row.boundary=boundary;row.cdp={before:cpuBefore,after:cpuAfter};assert.equal(raw.frames.length,boundary.frames);assert.ok(boundary.frames>2);assert.equal(boundary.startTick,input.tick,'Phase must start from the unchanged input tick.');assert.equal(boundary.hidden,false);assert.equal(raw.visibility.length,0);
   const taskDurationSeconds=cpuAfter.metrics.TaskDuration-cpuBefore.metrics.TaskDuration;assert.ok(Number.isFinite(taskDurationSeconds)&&taskDurationSeconds>=0,'CDP TaskDuration unavailable');
   const elapsedMs=boundary.end-boundary.start,raf=raw.frames.slice(1).map((frame,i)=>frame.at-raw.frames[i].at),wall=raw.frames.slice(1).map((frame,i)=>frame.wallAt-raw.frames[i].wallAt),deliveredTicks=boundary.endTick-boundary.startTick;
   row.summary={elapsedMs,deliveredTicks,shownTicks:boundary.endShownTick-boundary.startShownTick,actualSpeed:deliveredTicks/ticksPerSecond/(elapsedMs/1000),targetFraction:deliveredTicks/ticksPerSecond/(elapsedMs/1000)/phase.speed,raf:stats(raf),wall:stats(wall),rafCuts:cuts(raf),wallCuts:cuts(wall),frameCpu:stats(raw.frames.map(frame=>frame.cpuMs)),firstCallbackDelayMs:raw.frames[0].wallAt-boundary.start,rafClockLag:stats(raw.frames.map(frame=>frame.wallAt-frame.at)),taskDurationSeconds,mainThreadDutyFraction:taskDurationSeconds/(elapsedMs/1000),longTasks:raw.long};
   const bytes=Buffer.from(JSON.stringify({phase,boundary,cdp:row.cdp,...raw}));await writeFile(resolve(phaseDir,'raw.json'),bytes);row.raw={path:resolve(phaseDir,'raw.json'),bytes:bytes.length,sha256:sha(bytes)};
   await page.evaluate(()=>window.__ui3dPerformance.speedTo(0));
   row.uiAfter=await page.evaluate(()=>window.__lisiere.nativeUi??null);row.audioAfter=await page.evaluate(()=>window.__ui3dPerformance.audio);
   await page.screenshot({path:resolve(phaseDir,'after.png')});assert.deepEqual(row.errors,[],'Browser errors invalidate this phase.');row.status='acquired';
   console.log(JSON.stringify({phase:phase.id,status:row.status,summary:row.summary}));
  }catch(error){
   row.status='failed';row.failure=String(error);
   if(page){
    const partial=await page.evaluate(()=>{const q=window.__ui3dMeasure;if(!q)return null;q.active=false;clearTimeout(q.watchdog);q.observer?.disconnect();return {start:q.start,end:q.end,startTick:q.startTick,endTick:q.endTick,frames:q.frames,long:q.long,visibility:q.visibility};}).catch(cause=>({collectionFailure:String(cause)}));
    await writeFile(resolve(phaseDir,'failed-partial-raw.json'),JSON.stringify({phase,error:String(error),cdp:row.cdp,partial},null,2));
    await page.screenshot({path:resolve(phaseDir,'failure.png')}).catch(()=>{});
   }
   throw error;
  }
  finally{await persist();await context.close();}
  await verifyFence();
 }
 for(const speed of speeds){const [w1,c,w2]=report.phases.filter(phase=>phase.speed===speed).map(phase=>phase.summary);report.comparisons.push({speed,witness1:w1,candidate:c,witness2:w2,witnessDrift:{wallP99Ms:w2.wall.p99-w1.wall.p99,deliveredSpeed:w2.actualSpeed-w1.actualSpeed,taskDurationSeconds:w2.taskDurationSeconds-w1.taskDurationSeconds},interpretation:'Raw W/C/W bracket; no automatic gain or comfort acceptance.'});}
 report.status='acquired';await verifyFence();
}catch(error){report.status='failed';report.errors.push(String(error));throw error;}
finally{await persist();if(browser)await browser.close();console.log(JSON.stringify({out,status:report.status}));}
