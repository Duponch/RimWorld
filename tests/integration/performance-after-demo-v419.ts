import {expect,test,type Page} from '@playwright/test';
import {cpus,platform,release,totalmem} from 'node:os';
import {LOCAL_TICKS_PER_SECOND} from '../../src/bridge/clock-rate';
import {pause} from './helpers';

// Test-only bindings resolved in the Vite main module, never exported by product code.
declare const ColonyRenderer:any;
declare const isColonist:(p:any)=>boolean;
declare const SnapshotDecoder:any;
declare let receiveMainSnapshot:(...args:any[])=>unknown;
type Series=ReturnType<typeof summarize>;
export interface FoundationPerformanceOptions419 {
  label:string;speed:0|1;windowMs?:number;gpu420?:boolean;
}
interface GPUQuery420 {uid:string;frameId:number;beginIndex:number;endIndex:number;observedAt:number;ms?:number}
interface GPUCapture420 {complete:boolean;feature:boolean;resolutions:{at:number;wallMs:number;returned:number|null;resolvedFrameIds:number[];queries:GPUQuery420[];error?:string}[];frames:{frameId:number;passCount:number;ms:number}[];errors:string[];elapsedMs:number}
interface ProbeContext {
  tick:number;registryRevision:2;activeMapId:number;rootMapId:number;mapCount:number;mapIds:number[];maps:{id:number;tile:number|null;kind:string;pawnCount:number;createdAt:number}[];width:number;height:number;pawns:number;colonists:number;
  activePiles:number;activeStructures:number;activeResources:number;activeJobs:number;activeAnimals:number;weather:unknown;seed:number;site:unknown;inactiveMapDataInRenderer:boolean;
  camera:{mode:string;span:number;position:number[];quaternion:number[];target:number[];zoom:number};
  presentation:Record<string,unknown>;surface:{cssWidth:number;cssHeight:number;width:number;height:number;dpr:number};
  backend:string;adapter:Record<string,unknown>|null;gpuTimestampFeature:boolean;userAgent:string;hidden:boolean;
}
interface RawWindow {
  start:ProbeContext;end:ProbeContext;elapsedMs:number;
  frames:{frameId:number;cpuMs:number;intervalMs:number|null;drawCalls:number;triangles:number}[];
  snapshots:{tick:number;stepMs:number|null;speed:number;replaced:boolean;receiveMs:number}[];
  decode:{ms:number;status:string}[];
  gpu420?:GPUCapture420;
}
export interface FoundationPerformanceCapture419 {
  label:string;requestedSpeed:0|1;windowMs:number;elapsedMs:number;start:ProbeContext;end:ProbeContext;
  ticks:number;observedSpeed:number;speedTargetReached:boolean|null;observedRafFps:number|null;refreshRateHz:null;
  metrics:{rafMs:Series;imageCpuMs:Series;workerDeclaredStepMs:Series;decoderCoreMs:Series;snapshotReceiveMs:Series;drawCalls:Series;triangles:Series};
  snapshotCount:number;decodeCount:number;frameCount:number;
  workerTotalMs:null;nativeEncodeMs:null;nativeIPCTransitMs:null;gpuMs:null;gpuReason:string;
  host:{cpu:string;logicalCpus:number;memoryBytes:number;platform:string;release:string};
  raw:RawWindow;limits:string[];
  gpu420?:{raw:GPUCapture420;passSumPerFreshFrameMs:Series;coverage:string};
}
function summarize(values:readonly number[]){
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!sorted.length)return null;
  const at=(p:number)=>sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)]!;
  return {n:sorted.length,mean:sorted.reduce((a,b)=>a+b,0)/sorted.length,p50:at(.5),p95:at(.95),p99:at(.99),max:sorted.at(-1)!};
}

/** Reuse the small V140 frame/decoder/receipt wrappers, adapted to the protected
 * current MAIN facade. No private client escapes and no worker/World is written.
 * This function is serialized into the served main module after its declarations. */
function browserProbe(){
  const browser=window as unknown as {__performanceAudit?:any};
  if(browser.__performanceAudit)throw Error('Another performance audit is already installed.');
  let view:any=null,active=false,lastRaf:number|null=null,started=0,start:any;
  let frames:any[]=[],snapshots:any[]=[],decode:any[]=[];

  const context=()=>{
    if(!view?.received?.world)throw Error('No confirmed active map for Aulnes diagnostics.');
    const w=view.received.world,registry=w.campaignMap,canvas=view.renderer.domElement,bounds=canvas.getBoundingClientRect();
    if(registry?.revision!==2||!Array.isArray(registry.maps)||!registry.maps.some((m:any)=>m.id===registry.activeMapId))throw Error('Actual revision2 registered active map required; no legacy count fallback');
    const device=view.backend==='WebGPU'?view.renderer.getContext().getConfiguration()?.device:undefined,info=device?.adapterInfo;
    return {tick:w.tick,registryRevision:2,activeMapId:registry.activeMapId,rootMapId:registry.rootMapId,mapCount:registry.maps.length,mapIds:registry.maps.map((m:any)=>m.id),maps:registry.maps.map((m:any)=>({id:m.id,tile:m.tile,kind:m.kind,pawnCount:m.pawnCount,createdAt:m.createdAt})),
      width:w.width,height:w.height,pawns:w.pawns.length,colonists:w.pawns.filter((p:any)=>isColonist(p)&&!p.prisoner&&!p.visitor&&p.state!=='dead'&&!p.health?.death).length,
      activePiles:w.piles.length,activeStructures:w.structures.length,activeResources:w.resources.length,activeJobs:w.jobs.length,activeAnimals:w.wildlife?.animals.length??0,weather:w.weather?{...w.weather}:null,seed:w.seed,site:w.site?{...w.site}:null,inactiveMapDataInRenderer:Object.hasOwn(w,'secondarySite')||Object.hasOwn(view.world??{},'secondarySite'),
      camera:{mode:view.rig.mode,span:view.rig.span,position:view.camera.position.toArray(),quaternion:view.camera.quaternion.toArray(),
        target:view.controls.target.toArray(),zoom:view.camera.zoom},
      presentation:{room:view.roomEnabled,diorama:view.dioramaEnabled,textures:view.texturesEnabled,grass:!!view.grass,
        preferences:['textures-enabled','ground-grass-enabled','diorama-enabled','room-enabled','decor-occlusion-enabled','sound-enabled','music-enabled'].map(id=>({id,checked:(document.getElementById(id) as HTMLInputElement).checked})),
        wallCutaway:view.wallCutaway,zones:view.zonesVisible,roofAreas:view.roofAreasVisible,uiToggles:[...document.querySelectorAll('#roof-toggle,#foliage-toggle,#zones-toggle')].map((e:any)=>({id:e.id,pressed:e.getAttribute('aria-pressed')})),lighting:{...view.lightingSettings},shadows:{...view.shadowSettings},
        animations:{...view.animationDetail.settings},overview:!!view.overview?.group.visible},
      surface:{cssWidth:bounds.width,cssHeight:bounds.height,width:canvas.width,height:canvas.height,dpr:devicePixelRatio},
      backend:view.backend,adapter:info?{vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description}:null,
      gpuTimestampFeature:!!device?.features?.has('timestamp-query'),userAgent:navigator.userAgent,hidden:document.hidden};
  };
  const originalFrame=ColonyRenderer.prototype.frame;
  ColonyRenderer.prototype.frame=function(this:any,now:number){
    view=this;const recording=active&&!this.preparing,at=recording?performance.now():0;
    try{return originalFrame.call(this,now);}
    finally{if(recording){frames.push({frameId:this.renderer.info.frame,cpuMs:performance.now()-at,intervalMs:lastRaf===null?null:now-lastRaf,
      drawCalls:this.stats.drawCalls,triangles:this.stats.triangles});lastRaf=now;}}
  };
  const originalDecode=SnapshotDecoder.prototype.adopt;
  SnapshotDecoder.prototype.adopt=function(this:any,...args:any[]){
    const recording=active,at=recording?performance.now():0;let status='thrown';
    try{const result=originalDecode.apply(this,args);status=result.status;return result;}
    finally{if(recording)decode.push({ms:performance.now()-at,status});}
  };
  const originalReceive=receiveMainSnapshot;
  receiveMainSnapshot=function(this:any,...args:any[]){
    const recording=active,at=recording?performance.now():0;
    try{return originalReceive.apply(this,args);}
    finally{if(recording)snapshots.push({tick:args[0].tick,stepMs:args[2]>0&&Number.isFinite(args[1])?args[1]:null,
      speed:args[2],replaced:!!args[3],receiveMs:performance.now()-at});}
  };
  const beginCapture=()=>{if(active)throw Error('Nested performance window.');start=context();frames=[];snapshots=[];decode=[];lastRaf=null;started=performance.now();active=true;};
  const endCapture=()=>{const elapsedMs=performance.now()-started;active=false;return {start,end:context(),elapsedMs,frames,snapshots,decode};};
  // Private opt-in only. Observe actual query allocation, preserving native calls.
  // Never infer availability from info.timestamp, zero or a fulfilled Promise.
  const gpuWindow=async(duration:number)=>{
    if(!Number.isFinite(duration)||duration<1000||duration>2500)throw Error('GPU window must be bounded to1000..2500ms');
    const r=view?.renderer,b=r?.backend;
    if(view?.backend!=='WebGPU'||!b?.isWebGPUBackend||r.hasFeature('timestamp-query')!==true)throw Error('GPU timestamps unavailable: actual WebGPU timestamp-query required');
    if(b.trackTimestamp)throw Error('Another GPU tracker is active; do not borrow its samples');
    const pool=b.timestampQueryPool.render;
    if(pool&&(pool.pendingResolve||pool.currentQueryIndex!==0))throw Error('Pending foreign GPU queries: no pool reset or sample theft');
    const original=b.initTimestampQuery,previousTrack=b.trackTimestamp,seen=new Set<string>(),accepted=new Set<number>();
    const renderDescriptors=new Map<any,PropertyDescriptor|undefined>();
    const restoreTimestampWrites=()=>{
      for(const [descriptor,initial] of renderDescriptors){
        if(initial)Object.defineProperty(descriptor,'timestampWrites',initial);
        else delete descriptor.timestampWrites;
      }
    };
    const data:GPUCapture420={complete:false,feature:true,resolutions:[],frames:[],errors:[],elapsedMs:0};
    let pending:GPUQuery420[]=[],lastOffset=-1,inFlight:Promise<void>|undefined;
    b.initTimestampQuery=function(this:any,type:string,uid:string,descriptor:any){
      if(type==='render'&&!renderDescriptors.has(descriptor))renderDescriptors.set(descriptor,Object.getOwnPropertyDescriptor(descriptor,'timestampWrites'));
      const result=original.call(this,type,uid,descriptor);
      if(type!=='render'||!this.trackTimestamp)return result;
      const q=descriptor.timestampWrites,match=/^r:.*:f(\d+)$/.exec(uid);
      if(!match||!q?.querySet||!Number.isInteger(q.beginningOfPassWriteIndex)||q.endOfPassWriteIndex!==q.beginningOfPassWriteIndex+1){data.errors.push('Missing actual query descriptor '+uid);return result;}
      if(seen.has(uid)||q.beginningOfPassWriteIndex<=lastOffset)data.errors.push('Repeated UID or pool rollover before explicit resolve '+uid);
      seen.add(uid);lastOffset=q.beginningOfPassWriteIndex;
      pending.push({uid,frameId:Number(match[1]),beginIndex:q.beginningOfPassWriteIndex,endIndex:q.endOfPassWriteIndex,observedAt:performance.now()});
      return result;
    };
    const resolveBatch=async()=>{
      if(inFlight)throw Error('Concurrent private GPU resolution');
      if(!pending.length)return;
      const queries=pending;pending=[];lastOffset=-1;
      const at=performance.now(),row:GPUCapture420['resolutions'][number]={at,wallMs:0,returned:null,resolvedFrameIds:[],queries};data.resolutions.push(row);
      inFlight=(async()=>{
        let timer:ReturnType<typeof setTimeout>|undefined;
        try{
          // Native _resolveQueries captures/resets its offsets synchronously before
          // its first await. Later RAF queries belong to our next batch.
          const value=await Promise.race([r.resolveTimestampsAsync('render'),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('GPU readback exceeded2000ms')),2000);})]);
          row.returned=Number.isFinite(value)?value:null;row.resolvedFrameIds=[...b.getTimestampFrames('render')];
          const expected=[...new Set(queries.map(q=>q.frameId))];
          if(row.returned===null||row.resolvedFrameIds.length!==expected.length||expected.some(id=>!row.resolvedFrameIds.includes(id)))throw Error('Resolution has stale/missing frame IDs');
          const totals=new Map<number,{ms:number;count:number}>();
          for(const q of queries){
            if(!b.hasTimestampQuery(q.uid))throw Error('Actual query missing after resolve '+q.uid);
            const ms=b.getTimestamp(q.uid);if(!Number.isFinite(ms)||ms<0)throw Error('Invalid GPU query duration '+q.uid);
            q.ms=ms;const total=totals.get(q.frameId)??{ms:0,count:0};total.ms+=ms;total.count++;totals.set(q.frameId,total);
          }
          const last=row.resolvedFrameIds.at(-1)!;
          if(Math.abs(totals.get(last)!.ms-row.returned!)>1e-6)throw Error('Native last-frame scalar disagrees with actual UID sums');
          if(expected.some(id=>accepted.has(id)))throw Error('Frame ID already accepted; no repeated lastValue');
          for(const id of expected){accepted.add(id);const total=totals.get(id)!;data.frames.push({frameId:id,passCount:total.count,ms:total.ms});}
        }catch(error){row.error=String(error);data.errors.push(row.error);}
        finally{if(timer!==undefined)clearTimeout(timer);row.wallMs=performance.now()-at;}
      })();
      try{await inFlight;}finally{inFlight=undefined;}
    };
    let raw:ReturnType<typeof endCapture>|undefined;
    try{
      beginCapture();b.trackTimestamp=true;const deadline=performance.now()+duration;
      while(performance.now()<deadline&&!data.errors.length){
        await new Promise(resolve=>setTimeout(resolve,Math.min(100,Math.max(0,deadline-performance.now()))));
        if(performance.now()<deadline)await resolveBatch();
      }
      // Stop allocation at the same JS boundary as CPU capture. Final readback
      // is outside the window; x1 may genuinely advance until pause is ACKed.
      b.trackTimestamp=false;raw=endCapture();restoreTimestampWrites();data.elapsedMs=raw.elapsedMs;
      // Backend resolver requires trackTimestamp=true; restore only across its
      // synchronous capture, then disable before the event loop can render.
      if(pending.length){b.trackTimestamp=true;const last=resolveBatch();b.trackTimestamp=false;await last;}
      const rendered=raw.frames.map(f=>f.frameId);
      if(new Set(rendered).size!==rendered.length||rendered.length!==accepted.size||rendered.some(id=>!accepted.has(id)))data.errors.push('GPU frame coverage differs from actual recorded frame IDs');
      data.complete=data.errors.length===0&&data.frames.length>0&&pending.length===0;
      return {...raw,gpu420:data};
    }finally{
      active=false;b.trackTimestamp=false;
      try{restoreTimestampWrites();}
      finally{b.initTimestampQuery=original;b.trackTimestamp=previousTrack;}
    }
  };
  // The exposed diagnostic contains scalar metadata/arrays only: no World,
  // renderer, client, command, decoder, camera setter or live owner reference.
  Object.defineProperty(browser,'__performanceAudit',{value:{
    context,
    begin:beginCapture,end:endCapture,gpuWindow,
    cancel(){active=false;},
  }});
}
/** Same prefix/suffix payload convention as HARVEST_EMIT_PROBE. Called only by
 * private QA config/emitter; a ROOT build plugin appends it inside MAIN scope. */
export function foundationPerformanceProbeSource420():{prefix:string;suffix:string}{return {prefix:'',suffix:'\n;('+browserProbe.toString()+')();\n'};}
export async function installFoundationPerformanceProbe419(page:Page):Promise<void>{
  if(process.env.GPU420_PREINSTRUMENTED==='1')return;
  await page.route('**/src/main.ts*',async route=>{
    const response=await route.fetch(),source=await response.text();
    for(const marker of ['function receiveMainSnapshot(', 'class MainColonyRenderer extends ColonyRenderer'])
      if(!source.includes(marker))throw Error('Aulnes probe no longer matches current main: '+marker);
    await route.fulfill({response,body:source+foundationPerformanceProbeSource420().suffix});
  });
}

/** One short window in the actual trip. World serialization, screenshots and
 * exports belong before/after this call, never concurrently inside its window. */
export async function captureFoundationPerformance419(page:Page,options:FoundationPerformanceOptions419):Promise<FoundationPerformanceCapture419>{
  const windowMs=options.windowMs??5000;
  if(!Number.isFinite(windowMs)||windowMs<1000||windowMs>5000)throw Error('Use a short Aulnes window from 1000 to 5000 ms.');
  await page.keyboard.press('Escape');await pause(page);
  if(options.speed>0)await page.locator('[data-speed="'+options.speed+'"]').click();
  await expect(page.locator('[data-speed="'+options.speed+'"]')).toHaveAttribute('aria-pressed','true');
  await page.waitForTimeout(1000); // constant real warm-up excluded; x1 genuinely advances here
  let raw:RawWindow;
  try{
    raw=await page.evaluate(async ({duration,gpu420})=>{
      const audit=(window as unknown as {__performanceAudit:any}).__performanceAudit;
      if(!audit)throw Error('Install the Aulnes probe before page.goto.');
      if(gpu420)return audit.gpuWindow(duration);
      audit.begin();
      try{await new Promise(resolve=>setTimeout(resolve,duration));return audit.end();}
      catch(error){audit.cancel();throw error;}
    },{duration:windowMs,gpu420:!!options.gpu420}) as RawWindow;
  }finally{await pause(page);}
  const ticks=raw.end.tick-raw.start.tick,observedSpeed=ticks/(raw.elapsedMs/1000)/LOCAL_TICKS_PER_SECOND;
  const snapshotCount=raw.snapshots.length,frameCount=raw.frames.length,raf=summarize(raw.frames.flatMap(r=>r.intervalMs===null?[]:[r.intervalMs]));
  const capture:FoundationPerformanceCapture419={label:options.label,requestedSpeed:options.speed,windowMs,elapsedMs:raw.elapsedMs,start:raw.start,end:raw.end,
    ticks,observedSpeed,speedTargetReached:options.speed===0?null:observedSpeed>=options.speed,observedRafFps:raf?1000/raf.mean:null,refreshRateHz:null,
    metrics:{rafMs:raf,
      imageCpuMs:summarize(raw.frames.map(r=>r.cpuMs)),workerDeclaredStepMs:options.speed===0?null:summarize(raw.snapshots.flatMap(r=>r.stepMs===null?[]:[r.stepMs])),
      decoderCoreMs:summarize(raw.decode.map(r=>r.ms)),snapshotReceiveMs:summarize(raw.snapshots.map(r=>r.receiveMs)),
      drawCalls:summarize(raw.frames.map(r=>r.drawCalls)),triangles:summarize(raw.frames.map(r=>r.triangles))},
    snapshotCount,decodeCount:raw.decode.length,frameCount,workerTotalMs:null,nativeEncodeMs:null,nativeIPCTransitMs:null,gpuMs:null,
    gpuReason:raw.gpu420?'Whole-device GPU remains unmeasured; see separate gpu420 pass sums with freshness and coverage receipts.':'Absent: no real GPU timing query enabled/read. Feature support is metadata; CPU submission and RAF are not GPU duration.',
    ...raw.gpu420?{gpu420:{raw:raw.gpu420,passSumPerFreshFrameMs:raw.gpu420.complete?summarize(raw.gpu420.frames.map(f=>f.ms)):null,coverage:'Unique resolved frame IDs and every actual allocated UID; sum of render passes only, not whole-device GPU time. CPU/RAF here include timestamp/readback observer overhead.'}}:{},
    host:{cpu:cpus()[0]?.model??'unknown',logicalCpus:cpus().length,memoryBytes:totalmem(),platform:platform(),release:release()},
    raw,limits:[
      'Two immutable inputs, private diagnostic copies: different terrain/light/population/tasks. Pause/x1 load comparison, not a causal A/B or endurance qualification.',
      'Worker stepMs is the mean simulation time per tick in each published batch, sampled per snapshot; total worker/encoding/postMessage/queue cost is unavailable.',
      'Decoder core excludes MAIN subclass pre/post work. Snapshot receive excludes decoding and asynchronously deferred HUD; frame CPU includes presentation/adoption due in that frame.',
      'RAF is display paced and image CPU is JS plus submission; neither measures GPU execution. Display refresh/cap is not measured; no 200 or 240 FPS guarantee. Retained bundles can be omitted by draw counters.',
      'Paused frame rate says nothing about simulation cost. Actual x1 throughput is reported without a success threshold or a promise.',
      'Registry metadata comes from actual revision2 maps/activeMapId; complete export supplies the independent before/after campaign. No assumed one/two/17-map facade.',
      'Instrumentation overhead is present; World capture/export/screenshot are deliberately outside this window.',
    ]};
  await test.info().attach(options.label+'-performance',{body:JSON.stringify(capture,null,2),contentType:'application/json'});
  expect(raw.start.hidden).toBe(false);expect(raw.end.hidden).toBe(false);
  expect(raw.end.activeMapId).toBe(raw.start.activeMapId);expect(raw.end.mapIds).toEqual(raw.start.mapIds);expect(raw.end.mapCount).toBe(raw.start.mapCount);
  expect(raw.start.inactiveMapDataInRenderer).toBe(false);expect(raw.end.inactiveMapDataInRenderer).toBe(false);
  expect(raw.snapshots.some(row=>row.replaced),'No map replacement inside a stable view window.').toBe(false);
  expect(frameCount,'A genuine rendered-frame window must contain frames.').toBeGreaterThan(0);
  if(options.speed===0)expect(ticks,'Paused rendering does not measure simulated ticks.').toBe(0);
  return capture;
}
export function assertSameFoundationView419(before:FoundationPerformanceCapture419,after:FoundationPerformanceCapture419,sameSpeed=true):void{
  expect(before.start.activeMapId).toBe(0);expect(after.start.activeMapId).toBe(0);expect(before.start.mapIds).toEqual([0]);expect(after.start.mapIds).toEqual([0]);
  expect(before.start.mapCount).toBe(1);expect(after.start.mapCount).toBe(1);
  if(sameSpeed)expect(after.requestedSpeed).toBe(before.requestedSpeed);expect(after.windowMs).toBe(before.windowMs);
  expect(after.host).toEqual(before.host);
  expect(after.start.width).toBe(before.start.width);expect(after.start.height).toBe(before.start.height);
  expect(after.start.surface).toEqual(before.start.surface);expect(after.start.presentation).toEqual(before.start.presentation);
  expect(after.start.backend).toBe(before.start.backend);expect(after.start.adapter).toEqual(before.start.adapter);
  expect(after.start.camera.mode).toBe(before.start.camera.mode);
  for(const key of ['span','zoom'] as const)expect(after.start.camera[key]).toBeCloseTo(before.start.camera[key],2);
  for(const key of ['position','quaternion','target'] as const){
    expect(after.start.camera[key]).toHaveLength(before.start.camera[key].length);
    after.start.camera[key].forEach((value,i)=>expect(value).toBeCloseTo(before.start.camera[key][i]!,2));
  }
}
