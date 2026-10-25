// ROOT only. Separate GPU diagnostic, never run beside the ordinary performance
// pilot. No source, save, server, human browser or runtime renderer is replaced.
// node scripts/ui3d-gpu-audit.mjs --origin=http://127.0.0.1:5196
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2);
for(const arg of args)if(!/^--(origin|browser|label)=/.test(arg))throw Error(`Unknown argument ${arg}`);
const option=(name,fallback)=>args.find(arg=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const origin=new URL(option('origin','http://127.0.0.1:5196')),label=option('label','gpu-diagnostic');
assert.ok(origin.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(origin.hostname));
assert.ok(!['5173','5184'].includes(origin.port),'Human servers are excluded.');
assert.match(label,/^[a-zA-Z0-9_-]+$/);
const executablePath=resolve(root,option('browser','.playwright/chromium-1243/chrome-win64/chrome.exe'));
const out=resolve(root,'tmp/ui3d-gpu-audit',`${label}-${new Date().toISOString().replace(/[:.]/g,'-')}-${process.pid}`);
const sha=data=>createHash('sha256').update(data).digest('hex');
const savePath=resolve(root,'public/test-saves/v419/les-eclaircies.json'),bytes=await readFile(savePath),input=JSON.parse(bytes.toString('utf8'));
assert.equal(sha(bytes),'49e5d50abfac5a2ac0e609378877bb645da3e4559286cff706a33dc00f0df19f');
async function fence(){const files={};async function visit(folder){for(const entry of(await readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=join(folder,entry.name);if(entry.isDirectory())await visit(path);else if(entry.isFile())files[relative(root,path).replaceAll('\\','/')]=sha(await readFile(path));else throw Error(`Unexpected entry ${path}`);}}await visit(resolve(root,'src'));for(const name of['index.html','package.json','package-lock.json','vite.config.ts','scripts/ui3d-gpu-audit.mjs','public/test-saves/v419/les-eclaircies.json'])files[name]=sha(await readFile(resolve(root,name)));return files;}
const sources=await fence();
const preferences={
 'lisiere.audio.effects.enabled.v1':'false','lisiere.audio.music.enabled.v1':'false','lisiere.audio.effects.volume.v1':'0','lisiere.audio.music.volume.v1':'0',
 'lisiere.autosave-minutes.v1':'0','lisiere.presentation.threat-pause.v1':'never',
 'lisiere.presentation.textures.v1':'true','lisiere.presentation.ground-grass.v1':'true','lisiere.presentation.room.v1':'true','lisiere.presentation.diorama.v1':'true','lisiere.presentation.decor-occlusion.v1':'true',
 'lisiere.presentation.shadows.v1':JSON.stringify({frequency:60,resolution:2048}),
 'lisiere.presentation.lighting.v1':JSON.stringify({sun:1,moon:1,ambient:1}),
 'lisiere.presentation.animation-detail.v1':JSON.stringify({enabled:true,nearPixels:24,farPixels:8,middleHz:12}),
};
// Request descriptors and explicit destruction, not a driver VRAM measurement.
function observeRequestedGPUAllocations(){
 const devices=new WeakMap(),resources=new WeakMap(),live=new Map(),events=[];let nextDevice=0,nextResource=0,dropped=0;
 const coverage={texture:false,buffer:false,destroyTexture:false,destroyBuffer:false,destroyDevice:false,errors:[]};
 const ordinal=device=>{if(!devices.has(device))devices.set(device,++nextDevice);return devices.get(device);};
 const log=event=>{if(events.length<100000)events.push(event);else dropped++;};
 const formatBytes=format=>({r8unorm:1,r8snorm:1,r8uint:1,r8sint:1,r16uint:2,r16sint:2,r16float:2,rg8unorm:2,rg8snorm:2,rg8uint:2,rg8sint:2,r32uint:4,r32sint:4,r32float:4,rg16uint:4,rg16sint:4,rg16float:4,rgba8unorm:4,'rgba8unorm-srgb':4,rgba8snorm:4,rgba8uint:4,rgba8sint:4,bgra8unorm:4,'bgra8unorm-srgb':4,rgb10a2unorm:4,rg11b10ufloat:4,rgb9e5ufloat:4,rg32uint:8,rg32sint:8,rg32float:8,rgba16uint:8,rgba16sint:8,rgba16float:8,rgba32uint:16,rgba32sint:16,rgba32float:16,depth16unorm:2,depth32float:4,stencil8:1})[format]??null;
 const register=(device,resource,kind,descriptor)=>{
  let data={id:++nextResource,device:ordinal(device),kind,label:descriptor.label??'',usage:descriptor.usage};
  if(kind==='buffer')data={...data,size:descriptor.size,logicalBytes:descriptor.size};
  else{const raw=descriptor.size,s=Array.isArray(raw)?raw:[raw.width,raw.height??1,raw.depthOrArrayLayers??1],width=s[0],height=s[1]??1,depth=s[2]??1,mips=descriptor.mipLevelCount??1,samples=descriptor.sampleCount??1,dimension=descriptor.dimension??'2d',bpp=formatBytes(descriptor.format);let texelSamples=0;for(let i=0;i<mips;i++)texelSamples+=Math.max(1,width>>i)*Math.max(1,height>>i)*(dimension==='3d'?Math.max(1,depth>>i):depth)*samples;data={...data,width,height,depth,mips,samples,dimension,format:descriptor.format,texelSamples,logicalBytes:bpp===null?null:texelSamples*bpp,physicalDepthUnknown:/^depth24plus/.test(descriptor.format)};}
  resources.set(resource,data.id);live.set(data.id,data);log({event:'create',at:performance.now(),...data});
 };
 const wrap=(prototype,name,fn)=>{try{if(!prototype||typeof prototype[name]!=='function')return false;const original=prototype[name];prototype[name]=fn(original);return true;}catch(error){coverage.errors.push(String(error));return false;}};
 coverage.texture=wrap(globalThis.GPUDevice?.prototype,'createTexture',original=>function(descriptor){const resource=original.call(this,descriptor);register(this,resource,'texture',descriptor);return resource;});
 coverage.buffer=wrap(globalThis.GPUDevice?.prototype,'createBuffer',original=>function(descriptor){const resource=original.call(this,descriptor);register(this,resource,'buffer',descriptor);return resource;});
 for(const[kind,prototype,key]of[['texture',globalThis.GPUTexture?.prototype,'destroyTexture'],['buffer',globalThis.GPUBuffer?.prototype,'destroyBuffer']])coverage[key]=wrap(prototype,'destroy',original=>function(){const id=resources.get(this),data=live.get(id);const result=original.call(this);if(data){live.delete(id);log({event:'destroy',at:performance.now(),id,device:data.device,kind});}return result;});
 coverage.destroyDevice=wrap(globalThis.GPUDevice?.prototype,'destroy',original=>function(){const device=ordinal(this),result=original.call(this);for(const[id,data]of live)if(data.device===device){live.delete(id);log({event:'release-with-device',at:performance.now(),id,device,kind:data.kind});}log({event:'device-destroy',at:performance.now(),device});return result;});
 window.__uiGpuAlloc={snapshot(includeEvents=false){const groups={};for(const data of live.values()){const key=data.device+':'+data.kind+':'+(data.format??'buffer'),group=groups[key]??={device:data.device,kind:data.kind,format:data.format??null,count:0,knownLogicalBytes:0,unknownLogicalAllocations:0,physicalDepthUnknown:false};group.count++;if(data.logicalBytes===null)group.unknownLogicalAllocations++;else group.knownLogicalBytes+=data.logicalBytes;group.physicalDepthUnknown||=!!data.physicalDepthUnknown;}return {coverage,devices:nextDevice,created:nextResource,live:live.size,dropped,groups:Object.values(groups),...(includeEvents?{events:[...events],liveDescriptors:[...live.values()]}:{})};}};
}
const hook=String.raw`
window.__uiGpu={get view(){return renderer},get world(){return snapshot},get mode(){return nativeMode?'native':'legacy'},get speed(){return currentSpeed},
 get ready(){return !!window.__lisiere&&!session.busy&&!replacingWorld&&!presentationPreparation},
 get blocked(){return !!(simulationStopped||graphicsFault||waitingRequests.size||replacingWorld||frontMenu.isOpen()||document.hidden)},
 get settings(){return {shadows:{...shadowSettings},lighting:{...lightingSettings},animation:{...animationSettings},textures:texturesEnabled,grass:groundGrassEnabled,room:roomEnabled,diorama:dioramaEnabled,occlusion:decorOcclusionPreference,autosave:autosaveIntervalMinutes,threatPause:threatPausePreference.mode,soundEnabled,soundVolume,musicEnabled,musicVolume}},
 load:data=>replaceColony(()=>session.loadExternal(async()=>data)),save:()=>client.save(),speedTo:value=>changeSpeed(value,client.getThreatPauseToken()),
 async disposeDiagnostic(){renderer?.dispose();nativeUi?.dispose();await new Promise(resolve=>setTimeout(resolve,0));return window.__uiGpuAlloc?.snapshot(true);},
 install(){
  const v=renderer,r=v.renderer,b=r.backend,device=b.device;
  if(!device?.features.has('timestamp-query')||!b.trackTimestamp)throw Error('Native timestamp-query unavailable or not enabled');
  const q=this.q={metadata:new Map(),issued:new Map(),rows:new Map(),active:false,readErrors:[],scalar:[]};
  const inspector=r.inspector,begin=inspector.beginRender,init=b.initTimestampQuery;
  const classify=scene=>scene===nativeUi?.scene?'ui-capture':scene===nativeUi?.overlayCache?.compositeScene?'ui-composite':scene===v.scene?'world':'other';
  const render=r.render;r.render=function(scene,...args){const previous=q.parentCategory;q.parentCategory=classify(scene);try{return render.call(this,scene,...args);}finally{q.parentCategory=previous;}};
  inspector.beginRender=function(uid,scene,camera,target){
   const category=scene.name==='Output Color Transform'?'output-transform:'+q.parentCategory:classify(scene);
   q.metadata.set(uid,{category,scene:scene.name||scene.type,target:target?.texture?.name||null,targetId:target?.id??null});
   return begin.call(this,uid,scene,camera,target);
  };
  b.initTimestampQuery=function(type,uid,descriptor){
   const result=init.call(this,type,uid,descriptor);
   if(type==='render'&&q.active&&descriptor.timestampWrites){const frame=Number(uid.match(/:f(\d+)$/)?.[1]);q.issued.set(uid,{uid,frame,...q.metadata.get(uid)});}
   return result;
  };
  const info=device.adapterInfo;
  return {adapter:info?{vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description}:null,features:[...device.features],trackTimestamp:b.trackTimestamp,
   ownRendererInstrumented:false,ownCanvasVisible:nativeUi?getComputedStyle(nativeUi.ownRenderer.domElement).display!=='none':null};
 },
 memory(){const v=renderer,r=v.renderer,stage=nativeUi,cache=stage?.overlayCache,target=cache?.target;
  const descriptor=texture=>{if(!texture)return null;const d=r.backend.get(texture);const t=d.texture,m=d.msaaTexture;return {descriptor:d.textureDescriptorGPU?{format:d.textureDescriptorGPU.format,size:{...d.textureDescriptorGPU.size},samples:d.textureDescriptorGPU.sampleCount,usage:d.textureDescriptorGPU.usage,mips:d.textureDescriptorGPU.mipLevelCount}:null,actual:t?{width:t.width,height:t.height,format:t.format,samples:t.sampleCount,mips:t.mipLevelCount}:null,msaa:m?{width:m.width,height:m.height,format:m.format,samples:m.sampleCount}:null};};
  return {requestedGPUAllocations:window.__uiGpuAlloc?.snapshot(),world:{surface:{width:r.domElement.width,height:r.domElement.height},info:{...r.info.memory}},own:stage?{surface:{width:stage.ownRenderer.domElement.width,height:stage.ownRenderer.domElement.height},info:{...stage.ownRenderer.info.memory},sameDevice:r.backend.device===stage.ownRenderer.backend.device,visible:getComputedStyle(stage.ownRenderer.domElement).display!=='none'}:null,cache:cache?.stats??null,cacheColor:descriptor(target?.texture),cacheDepth:descriptor(target?r._textures.get(target).depthTexture:null)};
 },
 async measure(duration){
  const p=this,q=p.q,r=renderer.renderer;
  await r.resolveTimestampsAsync('render');q.metadata.clear();q.issued.clear();q.rows.clear();q.scalar=[];
  const start=performance.now(),startTick=snapshot.tick;q.active=true;
  const collect=async()=>{const value=await r.resolveTimestampsAsync('render');const pool=r.backend.timestampQueryPool.render;if(!pool?.timestamps)throw Error('Pinned query pool API changed');for(const[uid,ms]of pool.timestamps)if(q.issued.has(uid)&&Number.isFinite(ms))q.rows.set(uid,{...q.issued.get(uid),ms});if(Number.isFinite(value))q.scalar.push({at:performance.now(),ms:value,frames:[...pool.frames]});};
  while(performance.now()-start<duration){await new Promise(requestAnimationFrame);if(p.blocked)throw Error('Runtime blocked during GPU diagnostic');await collect();}
  q.active=false;await collect();const end=performance.now();
  const rows=[...q.rows.values()],missing=[...q.issued.keys()].filter(uid=>!q.rows.has(uid));
  return {start,end,elapsedMs:end-start,startTick,endTick:snapshot.tick,speed:currentSpeed,rows,issued:q.issued.size,missing,scalar:q.scalar,memory:p.memory(),ui:nativeUi?.diagnostics()??null,settings:p.settings};
 }
};
`;
const summary=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!a.length)return null;const at=p=>a[Math.min(a.length-1,Math.ceil(a.length*p)-1)];return {n:a.length,mean:a.reduce((s,n)=>s+n,0)/a.length,p50:at(.5),p95:at(.95),max:a.at(-1)};};
const report={protocol:'ui3d-gpu-diagnostic-r186-1',created:new Date().toISOString(),out,origin:origin.href,sources,save:{path:savePath,sha256:sha(bytes),tick:input.tick},preferences,contexts:[],errors:[],limits:[
 'Sequential isolated legacy/native contexts; this is a short instrumented diagnostic, not a causal FPS benchmark or a production V475 comparison.',
 'Native timestamp-query pass durations exclude CPU submission, queue idle gaps, browser composition, scanout, texture upload and compute work outside render passes.',
 'Timestamp readback and JS observation add overhead. Quantization and driver behavior remain possible. RAW UID/pass/frame rows are retained; missing queries are reported.',
 'Only the world renderer device is instrumented; native UI capture/composite and both output transforms run on it. The hidden standalone renderer remains uninstrumented.',
 'Each context loads the same original GameSession bytes once; all three phases check the complete serialized acknowledged World and input tick before measuring. Paused phases precede the final active x1 phase. Camera and preferences are reused from ui3d-native-performance.mjs.',
 'Viewport labels refer to width: 1440x1000 and 2557x1440, DPR 1. Fixed camera, no orbit; 1s warmup before each window, 2s paused at 1440, 2s paused at 2557, then 2s x1 at 1440.',
 'Three info.memory is accounting, not physical VRAM: it omits MSAA multiplier/separate color attachment and browser context buffering, and approximates mipmaps. Descriptors supplement it.',
 'GPU allocation observers cover successful explicit createTexture/createBuffer requests and explicit resource/device destruction only. Browser canvas textures, driver padding/compression, staging, implicit garbage collection and OS residency are excluded; depth24plus physical bytes are unknown.',
 'Human reports streaming video in Brave and League of Legends running concurrently. This separate pass-timestamp diagnostic cannot prove equal external GPU workload or a causal total-GPU performance difference; requested memory descriptors remain a logical allocation inventory.',
]};
await mkdir(out,{recursive:true});const persist=()=>writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));await persist();
let browser,timer,referenceLoaded,referenceCamera,referenceSettings,referenceMain,referenceColony;
const began=performance.now(),remaining=()=>Math.max(1,300000-(performance.now()-began));
try{
 browser=await chromium.launch({executablePath,headless:false,args:['--mute-audio','--enable-unsafe-webgpu']});timer=setTimeout(()=>{report.errors.push('Global 300s budget exceeded');void browser.close();},remaining());report.browser=browser.version();
 for(const mode of['legacy','native']){
  assert.deepEqual(await fence(),sources);const row={mode,phases:[],errors:[]};report.contexts.push(row);await persist();
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  try{
   await context.addInitScript(observeRequestedGPUAllocations);
   await context.addInitScript(values=>{for(const[key,value]of Object.entries(values))localStorage.setItem(key,value);},preferences);
   const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',error=>row.errors.push(String(error)));page.on('console',message=>{if(message.type()==='error'||/GPUValidationError|device.*lost/i.test(message.text()))row.errors.push(message.text());});
   await page.route('**/src/render/ColonyRenderer.ts*',async route=>{const response=await route.fetch(),body=await response.text(),changed=body.replace(/powerPreference:\s*['"]high-performance['"]/, '$&, trackTimestamp: true');assert.notEqual(changed,body,'Timestamp source anchor missing');referenceColony??=sha(body);assert.equal(sha(body),referenceColony);row.servedColony={originalSHA:sha(body),injectedSHA:sha(changed)};await route.fulfill({response,body:changed});});
   await page.route('**/src/main.ts*',async route=>{const response=await route.fetch(),body=await response.text();for(const anchor of['const nativeMode','function replaceColony','void start().catch'])assert.ok(body.includes(anchor));referenceMain??=sha(body);assert.equal(sha(body),referenceMain);row.servedMain={originalSHA:sha(body),injectedSHA:sha(body+hook)};await route.fulfill({response,body:body+hook});});
   const url=new URL('/',origin);url.searchParams.set('e2e','1');url.searchParams.set('ui',mode);await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:remaining()});await page.waitForFunction(()=>window.__uiGpu?.ready,null,{timeout:remaining()});assert.equal(await page.evaluate(()=>window.__uiGpu.mode),mode);
   let firstLoad=true;
   async function prepare(viewport){
    await page.setViewportSize(viewport);if(firstLoad){await page.evaluate(data=>window.__uiGpu.load(data),bytes.toString('utf8'));firstLoad=false;}
    await page.waitForFunction(()=>window.__uiGpu?.ready&&window.__uiGpu.view?.backend==='WebGPU'&&window.__lisiere?.hasActiveMap&&!window.__uiGpu.blocked,null,{timeout:remaining()});await page.evaluate(()=>window.__uiGpu.speedTo(0));
    const loaded=await page.evaluate(()=>window.__uiGpu.save());assert.equal(typeof loaded,'string');referenceLoaded??=sha(loaded);assert.equal(sha(loaded),referenceLoaded,'Complete initial World changed');assert.equal(await page.evaluate(()=>window.__uiGpu.world.tick),input.tick);
    const camera=await page.evaluate(()=>{const p=window.__uiGpu,v=p.view,w=p.world,r=v.rig,c=v.controls;r.setMode('orthographic');c.enableDamping=false;c.autoRotate=false;c.enabled=false;const target=[w.pawns[0].x,0,w.pawns[0].z];let radius=Math.hypot(65,65),height=85;
     if(r.roomEnabled&&r.roomLayout){const{walls,floorY,unit}=r.roomLayout,margin=Math.max(v.camera.near*2,unit*.04)+.01,limits=[target[0]-walls.westX-margin,walls.eastX-target[0]-margin,target[2]-walls.northZ-margin,walls.southZ-target[2]-margin,walls.ceilingY-margin-target[1]];if(!limits.every(Number.isFinite)||!Number.isFinite(floorY)||target[1]<floorY+margin)throw Error('Invalid room bounds');radius=Math.min(radius,...limits.slice(0,4));height=Math.min(height,limits[4]);}if(!(radius>1&&height>1))throw Error('No admissible camera');c.target.set(...target);v.camera.position.set(target[0]+radius*Math.cos(Math.PI/4),target[1]+height,target[2]+radius*Math.sin(Math.PI/4));v.camera.zoom=2;v.camera.updateProjectionMatrix();c.update();v.camera.lookAt(c.target);v.camera.updateMatrixWorld();if(r.constrainRoom())throw Error('Camera changed by room constraints');return {target,radius,height,zoom:2,position:v.camera.position.toArray(),mode:r.mode};});
    referenceCamera??=camera;assert.deepEqual(camera,referenceCamera);const settings=await page.evaluate(()=>window.__uiGpu.settings);referenceSettings??=settings;assert.deepEqual(settings,referenceSettings);assert.equal(settings.autosave,0);assert.equal(settings.threatPause,'never');assert.equal(settings.soundEnabled,false);assert.equal(settings.musicEnabled,false);
    await page.mouse.move(0,0);await page.waitForTimeout(1000);return {viewport,loadedSHA:sha(loaded),loadedBytes:Buffer.byteLength(loaded),camera,settings};
   }
   for(const phase of[{id:'1440-paused',viewport:{width:1440,height:1000},speed:0},{id:'2557-paused',viewport:{width:2557,height:1440},speed:0},{id:'1440-x1',viewport:{width:1440,height:1000},speed:1}]){
    const state=await prepare(phase.viewport);if(!row.gpu)row.gpu=await page.evaluate(()=>window.__uiGpu.install());if(mode==='native')assert.equal(row.gpu.ownCanvasVisible,false,'Standalone native renderer must be hidden');
    await page.evaluate(speed=>window.__uiGpu.speedTo(speed),phase.speed);const raw=await page.evaluate(()=>window.__uiGpu.measure(2000));await page.evaluate(()=>window.__uiGpu.speedTo(0));
    const byFrame=new Map();for(const pass of raw.rows){const frame=byFrame.get(pass.frame)??{total:0,categories:{}};frame.total+=pass.ms;frame.categories[pass.category??'unattributed']=(frame.categories[pass.category??'unattributed']??0)+pass.ms;byFrame.set(pass.frame,frame);}
    const frames=[...byFrame].map(([id,data])=>({id,...data})),categories=[...new Set(raw.rows.map(pass=>pass.category??'unattributed'))];
    row.phases.push({...phase,...state,...raw,frames,summary:{frameGPUms:summary(frames.map(frame=>frame.total)),passCategories:Object.fromEntries(categories.map(category=>[category,summary(frames.map(frame=>frame.categories[category]??0))])),attributionComplete:raw.missing.length===0&&raw.rows.every(pass=>pass.category)}});await persist();console.log(JSON.stringify({mode,phase:phase.id,gpu:row.phases.at(-1).summary}));assert.deepEqual(row.errors,[]);
   }
   row.allocationsBeforeDispose=await page.evaluate(()=>window.__uiGpuAlloc?.snapshot(true));
   row.allocationsAfterDispose=await page.evaluate(()=>window.__uiGpu.disposeDiagnostic()).catch(error=>({failure:String(error)}));
  }finally{await context.close();}
 }
 assert.deepEqual(await fence(),sources);report.ok=true;
}catch(error){report.failure=String(error?.stack??error);throw error;}
finally{clearTimeout(timer);await browser?.close().catch(()=>{});report.wallMs=performance.now()-began;await persist();console.log(JSON.stringify({out,ok:report.ok??false,failure:report.failure??null}));}
