import {test,expect,type CDPSession,type Page,type TestInfo} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {isAbsolute,join} from 'node:path';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../../src/sim/serialization';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {harness414,sha414} from './owners-v414-native-helper';
import {panel,pause} from './helpers';
import {installFoundationPerformanceProbe419,type FoundationPerformanceCapture419} from './performance-after-demo-v419';
import {createSourceProfiler,type SourceProfiler,type SourceProfilerIdentity,type SourceProfilerReport} from './worker-profiler421/profiler.mjs';

const INPUTS=[{label:'A-aulnes10733',pathEnv:'PERFORMANCE419_A_INPUT',shaEnv:'PERFORMANCE419_A_RAW_SHA256',sha:'19bd59c90dfbae4983d04cb6eae95a2eb728cd61b59b19172c37366e7704be47',tick:10733},{label:'B-created35-before-patrimony',pathEnv:'PERFORMANCE419_B_INPUT',shaEnv:'PERFORMANCE419_B_RAW_SHA256',sha:'748409f4b5ceba787fd59db233c2580433895cd530a077ac3fa9a1d885392df0',tick:35}]as const;
const WORKER_PATH='/__qa_assets/simulation.worker-CX5xoxxu.js';
const WORKER_FILE='C:/Users/ebsaf/.codex/visualizations/2026/10/04/01a10830-d046-7a40-90d2-80c77ae1b692/world-foundations/performance-cpu-build-v421-03/bundle'+WORKER_PATH;
const WORKER_SHA='88339874e4f6189fcce75a220e0511890fe71ef31afd52b865a61eee2a8ee7a6';
const NOTICE='ROOT only after the compiled CPU pair: two actual DedicatedWorker sampling profiles, exact candidate compiled Worker88339874, x1 and5s each after excluded1s warm-up, requested1000us interval. Existing419 MAIN scalar metrics only; no MAIN profiler or GPU tracking, no World edits, causal A/B, speedup, exact CPU/function/encode/IPC duration or FPS claim. Whole raw profile includes protocol margins.';
test.skip(process.env.PROFILE421_WORKER_NATIVE!=='1','ROOT opt-in after the compiled CPU pair; exact two actual inputs and compiled local QA required.');
type Context=FoundationPerformanceCapture419['start'];
type Camera=Context['camera'];
type Raw=FoundationPerformanceCapture419['raw'];
type ProfileReceipt={label:string;status:'complete'|'partial';profilePath:string|null;profileSHA256:string|null;profileDurationMs:number|null;profileNodeCount:number|null;profileSampleCount:number|null;hostStartRequestMs:number|null;hostStopCompleteMs:number|null;window:Raw|null;mainBounds:{startAbsolute:number;endAbsolute:number}|null;identity:SourceProfilerIdentity|null;boundary:Record<string,unknown>|null;cleanup:SourceProfilerReport|null;partialProfile:boolean;compiled:{file:string;sha256:string;bytes:number;servedURL:string;servedSHA256:string}|null;errors:string[];notice:string};
const context=(page:Page)=>page.evaluate(()=>((window as unknown as {__performanceAudit:{context():Context}}).__performanceAudit.context()));

async function settings(page:Page){
 await pause(page);await panel(page,'menu');
 for(const id of ['textures-enabled','ground-grass-enabled','diorama-enabled','room-enabled','decor-occlusion-enabled'])await page.locator('#'+id).setChecked(true);
 for(const id of ['sound-enabled','music-enabled'])await page.locator('#'+id).setChecked(false);
 await page.locator('#game-performance-balanced').click();await page.locator('#lighting-reset').click();
 await expect(page.locator('#game-shadow-frequency')).toHaveValue('60');await expect(page.locator('#game-shadow-resolution')).toHaveValue('2048');await expect(page.locator('#game-animation-enabled')).toBeChecked();
 for(const [id,n]of [['game-animation-near','24'],['game-animation-far','8'],['game-animation-frequency','12'],['lighting-sun','100'],['lighting-moon','100'],['lighting-ambient','100']]as const)await expect(page.locator('#'+id)).toHaveValue(n);
 await page.keyboard.press('Escape');
 for(const [id,pressed]of [['wall-cutaway','false'],['roof-toggle','false'],['foliage-toggle','false'],['zones-toggle','false']]as const){const node=page.locator('#'+id);if(await node.getAttribute('aria-pressed')!==pressed)await node.click();await expect(node).toHaveAttribute('aria-pressed',pressed);}
 if((await context(page)).camera.mode!=='orthographic')await page.locator('#camera-mode').click();
}
/** Existing V397 pointer/wheel restore: numeric camera is READ, never set by an API. */
async function restoreCamera(page:Page,target:Camera){
 await pause(page);await page.keyboard.press('Escape');
 if((await context(page)).camera.mode!==target.mode)await page.locator('#camera-mode').click();
 const anchor=await page.evaluate(()=>{const c=document.querySelector<HTMLCanvasElement>('#viewport canvas')!,b=c.getBoundingClientRect();for(let y=b.top+90;y<b.bottom-120;y+=30)for(let x=b.left+b.width*.55;x<b.right-30;x+=30)if(document.elementFromPoint(x,y)===c)return {x,y};throw Error('No actual uncovered camera gesture point');});
 for(let n=0;n<4;n++){const current=(await context(page)).camera,ratio=target.span/current.span;if(Math.abs(ratio-1)<.00001)break;await page.mouse.move(anchor.x,anchor.y);await page.mouse.wheel(0,Math.log(ratio)/-Math.log(.95)*100);await page.waitForTimeout(250);}
 for(let n=0;n<24;n++){const offset=await page.evaluate(target=>{const b=document.querySelector('#viewport canvas')!.getBoundingClientRect(),p=window.__lisiere.projectCell(target[0]!,target[2]!);return {dx:b.width/2-p.x,dy:b.height/2-p.y};},target.target);if(Math.hypot(offset.dx,offset.dy)<.005)break;await page.mouse.move(anchor.x,anchor.y);await page.mouse.down({button:'middle'});await page.mouse.move(anchor.x+Math.max(-300,Math.min(300,offset.dx)),anchor.y+Math.max(-180,Math.min(180,offset.dy)),{steps:8});await page.mouse.up({button:'middle'});await page.waitForTimeout(250);}
 await page.waitForTimeout(500);
}


/** Exact existing context comparisons, without comparing the two workloads. */
function sameView(a:Context,b:Context){
 expect(a.activeMapId).toBe(0);expect(b.activeMapId).toBe(0);expect(a.rootMapId).toBe(0);expect(b.rootMapId).toBe(0);
 expect(a.mapIds).toEqual([0]);expect(b.mapIds).toEqual([0]);expect(a.mapCount).toBe(1);expect(b.mapCount).toBe(1);
 expect([a.width,a.height]).toEqual([250,250]);expect([b.width,b.height]).toEqual([250,250]);
 expect(b.surface).toEqual(a.surface);expect(b.presentation).toEqual(a.presentation);expect(b.backend).toBe(a.backend);expect(b.adapter).toEqual(a.adapter);
 expect(b.camera.mode).toBe(a.camera.mode);
 for(const key of ['span','zoom']as const)expect(b.camera[key]).toBeCloseTo(a.camera[key],2);
 for(const key of ['position','quaternion','target']as const){expect(b.camera[key]).toHaveLength(a.camera[key].length);b.camera[key].forEach((v,i)=>expect(v).toBeCloseTo(a.camera[key][i]!,2));}
}

/** Retained V254 controller owns a separate Page session only as a tunnel to
 * the actual compiled Worker. Profiler never starts on the Page isolate.
 * Existing419 capture receives absolute marks from the SAME MAIN evaluation.
 * The full raw profile is durable before boundary validation; close() also
 * preserves incomplete sampling on uncertain start/stop failures. */
async function profileWorker(page:Page,info:TestInfo,label:string,receipts:ProfileReceipt[]){
 const receipt:ProfileReceipt={label,status:'partial',profilePath:null,profileSHA256:null,profileDurationMs:null,profileNodeCount:null,profileSampleCount:null,hostStartRequestMs:null,hostStopCompleteMs:null,window:null,mainBounds:null,identity:null,boundary:null,cleanup:null,partialProfile:false,compiled:null,errors:[],notice:NOTICE};
 receipts.push(receipt);
 const output=info.outputPath(label+'-worker');
 let cdp:CDPSession|undefined,profiler:SourceProfiler|undefined,started=false,windowCompleted=false;
 try{
  await mkdir(output);
  // The already frozen compiled text is the coordinate witness. No Debugger
  // captureSources call: its historical2MiB bound cannot hold this6.855MB file.
  const compiled=await readFile(WORKER_FILE,'utf8');expect(sha414(compiled)).toBe(WORKER_SHA);
  const servedURL=new URL(WORKER_PATH,page.url()).href,response=await page.request.get(servedURL);
  try{
   expect(response.status()).toBe(200);const served=await response.text();expect(sha414(served)).toBe(WORKER_SHA);
   receipt.compiled={file:WORKER_FILE,sha256:WORKER_SHA,bytes:Buffer.byteLength(compiled),servedURL,servedSHA256:sha414(served)};
  }finally{await response.dispose();}
  cdp=await page.context().newCDPSession(page);
  profiler=createSourceProfiler(cdp,{origin:new URL(page.url()).origin,output});
  receipt.identity=await profiler.attach();
  expect(receipt.identity.source.targetInfo.url).toBe(servedURL);
  expect(page.workers().filter(worker=>worker.url()===servedURL)).toHaveLength(1);
  expect(receipt.identity.workerIsolateId).not.toBe(receipt.identity.mainIsolateId);
  await profiler.beforeWindow();
  await page.keyboard.press('Escape');await pause(page);await page.locator('[data-speed="1"]').click();await expect(page.locator('[data-speed="1"]')).toHaveAttribute('aria-pressed','true');
  await page.waitForTimeout(1000);
  receipt.hostStartRequestMs=performance.now();await profiler.start();started=true;
  try{
   const marked=await page.evaluate(async()=>{
    const audit=(window as unknown as {__performanceAudit:{begin():void;end():Raw;cancel():void}}).__performanceAudit;
    const startAbsolute=performance.timeOrigin+performance.now();audit.begin();
    try{await new Promise(resolve=>setTimeout(resolve,5000));const raw=audit.end();const endAbsolute=performance.timeOrigin+performance.now();return {raw,startAbsolute,endAbsolute};}
    catch(error){audit.cancel();throw error;}
   });receipt.window=marked.raw;receipt.mainBounds={startAbsolute:marked.startAbsolute,endAbsolute:marked.endAbsolute};windowCompleted=true;
  }catch(error){receipt.errors.push('window: '+String(error));}
 }catch(error){receipt.errors.push('setup/start: '+String(error));}
 finally{
  if(started&&profiler&&receipt.mainBounds)try{
   receipt.boundary=await profiler.stop(receipt.mainBounds);receipt.hostStopCompleteMs=performance.now();
  }catch(error){receipt.errors.push('stop/persist: '+String(error));}
  // Controller keeps start/stop intentions even when their ACK was lost.
  // Never send a second direct stop, disable or detach behind its back.
  if(profiler){
   try{await profiler.close();}catch(error){receipt.errors.push('close: '+String(error));}
   receipt.cleanup=profiler.report();
   try{
    expect(receipt.cleanup.state).toBe('closed');expect(receipt.cleanup.enabled).toBe(false);expect(receipt.cleanup.running).toBe(false);expect(receipt.cleanup.debuggerEnabled).toBe(false);
    expect(receipt.cleanup.cleanupErrors).toEqual([]);expect(receipt.cleanup.tunnel.state).toBe('closed');expect(receipt.cleanup.tunnel.pending).toBe(0);expect(receipt.cleanup.tunnel.ownedSessions).toEqual([]);
    expect(receipt.cleanup.tunnel.faults).toEqual([]);expect(receipt.cleanup.tunnel.faultCount).toBe(0);expect(receipt.cleanup.tunnel.mainProfilerStarted).toBe(false);
   }catch(error){receipt.errors.push('cleanup receipt: '+String(error));}
  }else if(cdp)try{await cdp.detach();}catch(error){receipt.errors.push('unowned-session detach: '+String(error));}
  // Read and describe the file the retained controller already persisted,
  // including a raw file whose later boundary validation refused the run.
  for(const name of ['source.cpuprofile','incomplete-source.cpuprofile']){
   const path=join(output,name);let bytes:string;
   try{bytes=await readFile(path,'utf8');}
   catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')continue;receipt.errors.push('profile read: '+String(error));continue;}
   receipt.profilePath=path;receipt.profileSHA256=sha414(bytes);receipt.partialProfile=name.startsWith('incomplete-');
   try{const profile=JSON.parse(bytes);receipt.profileDurationMs=(profile.endTime-profile.startTime)/1000;receipt.profileNodeCount=profile.nodes.length;receipt.profileSampleCount=profile.samples?.length??0;}
   catch(error){receipt.errors.push('profile metadata: '+String(error));}break;
  }
  // Best effort only after stop: preserve a partial probe context if the page
  // remained alive. It is never relabelled as a completed 5s window.
  if(started&&!receipt.window)try{receipt.window=await page.evaluate(()=>((window as unknown as {__performanceAudit:{end():Raw}}).__performanceAudit.end()));}catch(error){receipt.errors.push('partial context: '+String(error));}
  try{await pause(page);}catch(error){receipt.errors.push('pause: '+String(error));}
  try{expect(sha414(await readFile(WORKER_FILE,'utf8'))).toBe(WORKER_SHA);}catch(error){receipt.errors.push('compiled source after: '+String(error));}
  receipt.status=windowCompleted&&receipt.boundary!==null&&receipt.profilePath!==null&&!receipt.partialProfile&&receipt.errors.length===0?'complete':'partial';
  await writeFile(info.outputPath(label+'-profile-context.json'),JSON.stringify(receipt,null,2));
 }
 return receipt;
}

test('Worker sampling only: two real inputs, two x1 5s profiles on the exact compiled source',async({page},info)=>{
 const sources=INPUTS.map(row=>{const path=process.env[row.pathEnv],sha=process.env[row.shaEnv];if(!path||!isAbsolute(path)||sha!==row.sha)throw Error('Exact actual '+row.label+' path and decoded RAW SHA required; no fallback');return {...row,path,sha};});
 if(process.env.GPU420_PREINSTRUMENTED!=='1'||process.env.GPU420_NATIVE==='1')throw Error('Frozen compiled419 metrics required, GPU tracker OFF; no new probe or DEV route');
 await installFoundationPerformanceProbe419(page);const h=await harness414(page,info,NOTICE,{exactAdoptionOnce415:true});
 const receipts:ProfileReceipt[]=[],checkpoints:object[]=[];let reference:Camera|undefined,loaded=false;
 h.proof.inputs=sources;h.proof.status='WORKER_PROFILING_AFTER_COMPILED_CPU_PAIR_RUNNING';
 try{
  for(const source of sources)await(async()=>{
   loaded=false;h.proof.currentInput=source.label;
   const bytes=await readFile(source.path,'utf8'),raw=await decodeStoredSave(bytes);expect(sha414(raw)).toBe(source.sha);
   const root=deserializeCampaign(raw);if(!('tiles'in root)||!root.worldMaps)throw Error('Actual registered loaded map required');expect(validateWorld(root)).toEqual([]);expect(root.tick).toBe(source.tick);expect([root.width,root.height]).toEqual([250,250]);expect(root.worldMaps.sites.map(s=>({id:s.id,kind:s.kind}))).toEqual([{id:0,kind:'settlement'}]);
   if(source.tick===35){expect(root.pawns).toHaveLength(3);expect(root.jobs).toHaveLength(0);expect(root.startingArrival?.phase).toBe('opened');expect(root.worldGroups!.groups).toHaveLength(0);}
   const canonical=serializeCampaign(root);
   await h.load(source.path,root);loaded=true;await settings(page);if(reference)await restoreCamera(page,reference);else reference=(await context(page)).camera;
   const before=await h.exported(source.label+'-00-before-profile');expect(before.canonical).toBe(canonical);
   checkpoints.push({label:source.label,stage:'before',tick:before.root.tick,path:before.path,sha256:before.fileSHA256,sourceFileSHA256:sha414(bytes),sourceDecodedRAWSHA256:source.sha});
   h.actualGPU();
   const receipt=await profileWorker(page,info,source.label+'-WORKER-x1',receipts);
   // Save the actual continuation before checking profile completeness or view.
   const after=await h.exported(source.label+'-01-last-real-after-profile');
   checkpoints.push({label:source.label,stage:'after',tick:after.root.tick,path:after.path,sha256:after.fileSHA256,notice:'Diagnostic copy only; includes x1 warm-up and ordered pause boundary, never a demonstration checkpoint.'});h.proof.latestDiagnosticContinuation={path:after.path,sha256:after.fileSHA256,tick:after.root.tick};
   // Actual UI reload and a complete re-export remain outside sampling. They
   // resume the exact diagnostic continuation; no second profile is taken.
   await h.load(after.path,after.root);
   const reloaded=await h.exported(source.label+'-02-exact-after-reload');expect(reloaded.canonical).toBe(after.canonical);
   checkpoints.push({label:source.label,stage:'reloaded',tick:reloaded.root.tick,path:reloaded.path,sha256:reloaded.fileSHA256,exactCanonical:true});
   expect(after.root.tick).toBeGreaterThanOrEqual(before.root.tick);if(after.root.tick===before.root.tick)expect(after.canonical).toBe(before.canonical);
   expect(sha414(await readFile(source.path,'utf8'))).toBe(sha414(bytes));
   expect(receipt.errors).toEqual([]);expect(receipt.status).toBe('complete');expect(receipt.profileSampleCount).toBeGreaterThan(0);
   const window=receipt.window;expect(window).not.toBeNull();if(!window)throw Error('No marked profile context');
   expect(after.root.tick).toBeGreaterThanOrEqual(window.end.tick);expect(window.start.hidden).toBe(false);expect(window.end.hidden).toBe(false);expect(window.start.inactiveMapDataInRenderer).toBe(false);expect(window.end.inactiveMapDataInRenderer).toBe(false);
   expect(window.frames.length).toBeGreaterThan(0);expect(window.snapshots.some(row=>row.replaced)).toBe(false);sameView(window.start,window.end);h.actualGPU();
  })();
  expect(receipts).toHaveLength(2);sameView(receipts[0]!.window!.start,receipts[1]!.window!.start);await h.finish();h.proof.completeWorkerProfilesOnly=true;h.proof.status='TWO_WORKER_PROFILES_OBSERVED_NO_SPEEDUP_OR_GPU_CLAIM';
 }catch(error){h.proof.complete=false;h.proof.status='PARTIAL_OR_REFUSED_WORKER_PROFILING_NO_FAVOURABLE_RERUN';if(loaded)await h.failure(error);else h.proof.error=String(error);throw error;}
 finally{
  h.proof.notice=NOTICE;h.proof.referenceCamera=reference;h.proof.checkpoints=checkpoints;h.proof.workerProfiles=receipts;h.proof.unmeasured={gpuMs:null,workerTotalMs:null,nativeEncodeMs:null,nativeIPCTransitMs:null};
  await writeFile(info.outputPath('WORKER-profile-summary.json'),JSON.stringify({notice:NOTICE,checkpoints,profiles:receipts,unmeasured:h.proof.unmeasured},null,2));await h.save();
 }
});
