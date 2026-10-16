import {expect,test,type Page} from '@playwright/test';
import {cpus,platform,release,totalmem} from 'node:os';
import {LOCAL_TICKS_PER_SECOND} from '../../src/bridge/clock-rate';
import {pause} from './helpers';
import type {HumanGoodsCapture} from './aulnes-multimap-conservation-v397';

// Test-only bindings resolved in the Vite main module, never exported by product code.
declare const ColonyRenderer:any;
declare const SnapshotDecoder:any;
declare let receiveMainSnapshot:(...args:any[])=>unknown;
type Series=ReturnType<typeof summarize>;
export interface AulnesPerformanceOptions {
  label:string;speed:0|1|6;windowMs?:number;campaign?:HumanGoodsCapture;
}
interface ProbeContext {
  tick:number;active:'home'|'secondary';mapCount:number;width:number;height:number;pawns:number;colonists:number;
  activePiles:number;activeStructures:number;activeResources:number;activeJobs:number;activeAnimals:number;weather:unknown;seed:number;site:unknown;inactiveMapDataInRenderer:boolean;
  camera:{mode:string;span:number;position:number[];quaternion:number[];target:number[];zoom:number};
  presentation:Record<string,unknown>;surface:{cssWidth:number;cssHeight:number;width:number;height:number;dpr:number};
  backend:string;adapter:Record<string,unknown>|null;gpuTimestampFeature:boolean;userAgent:string;hidden:boolean;
}
interface RawWindow {
  start:ProbeContext;end:ProbeContext;elapsedMs:number;
  frames:{cpuMs:number;intervalMs:number|null;drawCalls:number;triangles:number}[];
  snapshots:{tick:number;stepMs:number|null;speed:number;replaced:boolean;receiveMs:number}[];
  decode:{ms:number;status:string}[];
}
export interface AulnesPerformanceCapture {
  label:string;requestedSpeed:0|1|6;windowMs:number;elapsedMs:number;start:ProbeContext;end:ProbeContext;
  ticks:number;observedSpeed:number;speedTargetReached:boolean|null;observedRafFps:number|null;refreshRateHz:null;
  metrics:{rafMs:Series;imageCpuMs:Series;workerDeclaredStepMs:Series;decoderCoreMs:Series;snapshotReceiveMs:Series;drawCalls:Series;triangles:Series};
  snapshotCount:number;decodeCount:number;frameCount:number;
  workerTotalMs:null;gpuMs:null;gpuReason:string;
  campaignCheckpoint:{tick:number;maps:HumanGoodsCapture['maps']}|null;
  host:{cpu:string;logicalCpus:number;memoryBytes:number;platform:string;release:string};
  raw:RawWindow;limits:string[];
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
  let latestConfirmed:any=null;
  const context=()=>{
    if(!view?.received?.world)throw Error('No confirmed active map for Aulnes diagnostics.');
    const w=view.received.world,canvas=view.renderer.domElement,bounds=canvas.getBoundingClientRect();
    const device=view.backend==='WebGPU'?view.renderer.getContext().getConfiguration()?.device:undefined,info=device?.adapterInfo;
    return {tick:w.tick,active:w.campaignMap?.active??'home',mapCount:w.campaignMap?2:1,
      width:w.width,height:w.height,pawns:w.pawns.length,colonists:w.pawns.filter((p:any)=>(p.faction??'colony')==='colony'&&!p.prisoner&&p.state!=='dead').length,
      activePiles:w.piles.length,activeStructures:w.structures.length,activeResources:w.resources.length,activeJobs:w.jobs.length,activeAnimals:w.wildlife?.animals.length??0,weather:w.weather?{...w.weather}:null,seed:w.seed,site:w.site?{...w.site}:null,inactiveMapDataInRenderer:Object.hasOwn(w,'secondarySite')||Object.hasOwn(view.world??{},'secondarySite'),
      camera:{mode:view.rig.mode,span:view.rig.span,position:view.camera.position.toArray(),quaternion:view.camera.quaternion.toArray(),
        target:view.controls.target.toArray(),zoom:view.camera.zoom},
      presentation:{room:view.roomEnabled,diorama:view.dioramaEnabled,textures:view.texturesEnabled,grass:!!view.grass,
        wallCutaway:view.wallCutaway,lighting:{...view.lightingSettings},shadows:{...view.shadowSettings},
        animations:{...view.animationDetail.settings},overview:!!view.overview?.group.visible},
      surface:{cssWidth:bounds.width,cssHeight:bounds.height,width:canvas.width,height:canvas.height,dpr:devicePixelRatio},
      backend:view.backend,adapter:info?{vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description}:null,
      gpuTimestampFeature:!!device?.features?.has('timestamp-query'),userAgent:navigator.userAgent,hidden:document.hidden};
  };
  const originalFrame=ColonyRenderer.prototype.frame;
  ColonyRenderer.prototype.frame=function(this:any,now:number){
    view=this;const recording=active&&!this.preparing,at=recording?performance.now():0;
    try{return originalFrame.call(this,now);}
    finally{if(recording){frames.push({cpuMs:performance.now()-at,intervalMs:lastRaf===null?null:now-lastRaf,
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
    finally{latestConfirmed=args[0];if(recording)snapshots.push({tick:args[0].tick,stepMs:args[2]>0&&Number.isFinite(args[1])?args[1]:null,
      speed:args[2],replaced:!!args[3],receiveMs:performance.now()-at});}
  };
  // The exposed diagnostic contains scalar metadata/arrays only: no World,
  // renderer, client, command, decoder, camera setter or live owner reference.
  Object.defineProperty(browser,'__performanceAudit',{value:{
    context,
    dangerFor(ids:number[]){
      const w=latestConfirmed;if(!w)return null;
      const members=new Set(ids),g=w.group,people=[...w.pawns,...g&&'members' in g?g.members:[]];
      const unsafe=people.find((p:any)=>members.has(p.id)&&(p.state==='dead'||p.state==='downed'||p.burning||p.mental?.crisis
        ||p.health?.injuries?.length||p.health?.bloodLoss||p.health?.heatstroke||p.health?.hypothermia||p.health?.infections));
      const hostile=w.pawns.some((p:any)=>!!p.raid&&!['dead','downed'].includes(p.state))||w.mechanoids?.some((p:any)=>!['dead','downed'].includes(p.state));
      const remote=w.campaignMap?.incidents?.find((row:any)=>row.kind==='raid'||row.kind==='mechanoid');
      const reason=unsafe?'Voyageur en danger réel #'+unsafe.id:hostile?'Hostile présent sur la carte active':remote?'Danger réel sur la carte '+remote.site:undefined;
      return reason?{tick:w.tick,reason}:null;
    },
    begin(){if(active)throw Error('Nested Aulnes performance window.');start=context();frames=[];snapshots=[];decode=[];lastRaf=null;started=performance.now();active=true;},
    end(){const elapsedMs=performance.now()-started;active=false;return {start,end:context(),elapsedMs,frames,snapshots,decode};},
    cancel(){active=false;},
  }});
}
export async function installAulnesPerformanceProbe(page:Page):Promise<void>{
  await page.route('**/src/main.ts*',async route=>{
    const response=await route.fetch(),source=await response.text();
    for(const marker of ['function receiveMainSnapshot(', 'class MainColonyRenderer extends ColonyRenderer'])
      if(!source.includes(marker))throw Error('Aulnes probe no longer matches current main: '+marker);
    await route.fulfill({response,body:source+'\n;('+browserProbe.toString()+')();\n'});
  });
}

/** One short window in the actual trip. World serialization, screenshots and
 * exports belong before/after this call, never concurrently inside its window. */
export async function captureAulnesPerformance(page:Page,options:AulnesPerformanceOptions):Promise<AulnesPerformanceCapture>{
  const windowMs=options.windowMs??3000;
  if(!Number.isFinite(windowMs)||windowMs<1000||windowMs>5000)throw Error('Use a short Aulnes window from 1000 to 5000 ms.');
  await page.keyboard.press('Escape');await pause(page);
  if(options.speed>0)await page.locator('[data-speed="'+options.speed+'"]').click();
  await expect(page.locator('[data-speed="'+options.speed+'"]')).toHaveAttribute('aria-pressed','true');
  await page.waitForTimeout(350); // speed/snapshot/RAF transition excluded
  let raw:RawWindow;
  try{
    raw=await page.evaluate(async duration=>{
      const audit=(window as unknown as {__performanceAudit:any}).__performanceAudit;
      if(!audit)throw Error('Install the Aulnes probe before page.goto.');
      audit.begin();
      try{await new Promise(resolve=>setTimeout(resolve,duration));return audit.end();}
      catch(error){audit.cancel();throw error;}
    },windowMs) as RawWindow;
  }finally{await pause(page);}
  const ticks=raw.end.tick-raw.start.tick,observedSpeed=ticks/(raw.elapsedMs/1000)/LOCAL_TICKS_PER_SECOND;
  const snapshotCount=raw.snapshots.length,frameCount=raw.frames.length,raf=summarize(raw.frames.flatMap(r=>r.intervalMs===null?[]:[r.intervalMs]));
  const capture:AulnesPerformanceCapture={label:options.label,requestedSpeed:options.speed,windowMs,elapsedMs:raw.elapsedMs,start:raw.start,end:raw.end,
    ticks,observedSpeed,speedTargetReached:options.speed===0?null:observedSpeed>=options.speed,observedRafFps:raf?1000/raf.mean:null,refreshRateHz:null,
    metrics:{rafMs:raf,
      imageCpuMs:summarize(raw.frames.map(r=>r.cpuMs)),workerDeclaredStepMs:options.speed===0?null:summarize(raw.snapshots.flatMap(r=>r.stepMs===null?[]:[r.stepMs])),
      decoderCoreMs:summarize(raw.decode.map(r=>r.ms)),snapshotReceiveMs:summarize(raw.snapshots.map(r=>r.receiveMs)),
      drawCalls:summarize(raw.frames.map(r=>r.drawCalls)),triangles:summarize(raw.frames.map(r=>r.triangles))},
    snapshotCount,decodeCount:raw.decode.length,frameCount,workerTotalMs:null,gpuMs:null,
    gpuReason:'Absent: no real GPU timing query enabled/read. Feature support is metadata; CPU submission and RAF are not GPU duration.',
    campaignCheckpoint:options.campaign?{tick:options.campaign.tick,maps:options.campaign.maps}:null,
    host:{cpu:cpus()[0]?.model??'unknown',logicalCpus:cpus().length,memoryBytes:totalmem(),platform:platform(),release:release()},
    raw,limits:[
      'Short windows in one evolving real campaign, not an isolated A/B or endurance qualification; record weather/jobs/colonists and tick ranges.',
      'Worker stepMs is the mean simulation time per tick in each published batch, sampled per snapshot; total worker/encoding/postMessage/queue cost is unavailable.',
      'Decoder core excludes MAIN subclass pre/post work. Snapshot receive excludes decoding and asynchronously deferred HUD; frame CPU includes presentation/adoption due in that frame.',
      'RAF is display paced and image CPU is JS plus submission; neither measures GPU execution. Display refresh/cap is not measured; no 200 or 240 FPS guarantee. Retained bundles can be omitted by draw counters.',
      'Paused frame rate says nothing about simulation cost. Actual x1/x6 throughput is reported without a success threshold or a promise.',
      'Inactive map dimensions/population come only from the separately supplied complete campaign checkpoint; the renderer receives the active map and campaign knowledge.',
      'Instrumentation overhead is present; World capture/export/screenshot are deliberately outside this window.',
    ]};
  await test.info().attach(options.label+'-performance',{body:JSON.stringify(capture,null,2),contentType:'application/json'});
  expect(raw.start.hidden).toBe(false);expect(raw.end.hidden).toBe(false);
  expect(raw.end.active).toBe(raw.start.active);expect(raw.end.mapCount).toBe(raw.start.mapCount);
  expect(raw.start.inactiveMapDataInRenderer).toBe(false);expect(raw.end.inactiveMapDataInRenderer).toBe(false);
  expect(raw.snapshots.some(row=>row.replaced),'No map replacement inside a stable view window.').toBe(false);
  expect(frameCount,'A genuine rendered-frame window must contain frames.').toBeGreaterThan(0);
  if(options.speed===0)expect(ticks,'Paused rendering does not measure simulated ticks.').toBe(0);
  if(options.campaign)expect(options.campaign.maps.length).toBe(raw.start.mapCount);
  return capture;
}
export function assertComparableAulnesView(before:AulnesPerformanceCapture,after:AulnesPerformanceCapture):void{
  expect(before.start.active).toBe('home');expect(after.start.active).toBe('home');
  expect(before.start.mapCount).toBe(1);expect(after.start.mapCount).toBe(2);
  expect(after.requestedSpeed).toBe(before.requestedSpeed);expect(after.windowMs).toBe(before.windowMs);
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