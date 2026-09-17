import { applyCommand } from '../src/sim/engine.ts';
import { controlledInjury } from '../tests/scenarios/health.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { stonecuttingLoad } from '../tests/scenarios/stonecutting.ts';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';
import { constructionLoad } from '../tests/scenarios/construction-load.ts';
import { miningLoad } from '../tests/scenarios/mining.ts';
import { serializeWorld } from '../src/sim/index.ts';
import { startRenderTrace } from './render-trace.mjs';
import { installGpuCallProbe } from './gpu-call-probe.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const armed=process.env.MINING_EQUIPMENT==='1';
const drafting=process.env.MINING_DRAFTING==='1';
const medicalWounds=Number(process.env.MINING_MEDICAL_WOUNDS??0);
if(!Number.isInteger(medicalWounds)||medicalWounds<0||medicalWounds>100)throw Error('Invalid medical load');
const machinery=process.env.MINING_COMPONENTS==='1';
const stonecutting=process.env.STONECUTTING==='1';
const workshops=process.env.CONSTRUCTION_WORKSHOPS==='1';
const probe=`
window.__miningBench={active:false,view:null,previous:null,frames:[],adoptions:[],events:[],snapshots:[],longFrames:[],pipelines:[],preparations:[],growths:[]};
const originalMiningPrepare=ColonyRenderer.prototype.preparePresentation;ColonyRenderer.prototype.preparePresentation=async function(...args){const start=performance.now();try{return await originalMiningPrepare.apply(this,args);}finally{window.__miningBench.preparations.push(performance.now()-start);}};
new PerformanceObserver(list=>{if(window.__miningBench.active)for(const entry of list.getEntries())window.__miningBench.longFrames.push(entry.toJSON());}).observe({type:'long-animation-frame'});
const sceneMethod=ColonyRenderer.prototype.applyWorld?'applyWorld':'setWorld';
for(const method of ['frame',sceneMethod]){const original=ColonyRenderer.prototype[method];ColonyRenderer.prototype[method]=function(...args){
const b=window.__miningBench;b.view=this;
if(!this.renderer.backend.__miningProbe){const backend=this.renderer.backend,create=backend.createRenderPipeline;backend.__miningProbe=true;backend.createRenderPipeline=function(renderObject,...rest){const o=renderObject.object;b.pipelineObject={name:o.name,type:o.type,count:o.geometry?.instanceCount??o.count,capacity:o.instanceMatrix?.count,material:renderObject.material.id};try{return create.call(this,renderObject,...rest);}finally{b.pipelineObject=null;}};
const boxes=this.boxes,originalSet=boxes.set;boxes.set=function(...args){const before=this.batches.get(args[1])?.instanceMatrix.count;const result=originalSet.apply(this,args);const next=this.batches.get(args[1]).instanceMatrix.count;if(b.active&&before!==undefined&&next>before)b.growths.push({key:args[1],prior:before,next});return result;};}
const before=method===sceneMethod?${stonecutting?"this.world?.piles.reduce((n,p)=>n+(p.kind==='blocks'?p.quantity/20:0),0)??0":"this.world?.jobs.filter(j=>j.kind==='"+(workshops?'stonecutter':'mine')+"').length??0"}:0,start=performance.now();
const result=original.apply(this,args),elapsed=performance.now()-start;
if(b.active){if(method==='frame'){b.frames.push({at:start,cpu:elapsed,interval:b.previous===null?null:args[0]-b.previous,calls:this.stats.drawCalls});b.previous=args[0];}
else {b.adoptions.push(elapsed);const after=${stonecutting?"args[0].piles.reduce((n,p)=>n+(p.kind==='blocks'?p.quantity/20:0),0)":"args[0].jobs.filter(j=>j.kind==='"+(workshops?'stonecutter':'mine')+"').length"};if(${stonecutting?'after>before':'after<before'}){b.events.push({at:start,tick:args[0].tick,mined:${stonecutting?'after-before':'before-after'},dirty:this.rocks.stats.updatedCells});if(b.tracing)performance.mark('mining-extraction-'+args[0].tick);}}}
return result;};}
`;
const steel=process.env.MINING_MATERIAL==='steel';
const report={drafting,profiled:!!process.env.MINING_PROFILE,armed,medicalWounds,stonecutting,workshops,date:new Date().toISOString(),cpu:os.cpus()[0].model,viewport:{width:1440,height:1000},ore:machinery?'machinery':steel?'steel':'stone',protocol:stonecutting?'Native WebGPU: clear 250², 3 chunks per stonecutter, real gather/work/output via worker 6x, 90-frame warmup. Instrument event mined means completed recipe; no natural forest.':workshops?'Native WebGPU: clear 250² map, 100 builders, alternating 75 wood + 30 steel / 105 steel workshops, actual worker 6x. 90 warmup frames. Frame/snapshot timings, pipelines and buffer growth. Same mining-render instrumentation; extraction event counts represent completed workshops. No natural forest in this fixture.':'Native Chromium WebGPU, actual worker 6x, natural 250² with cleared mining patch; 3/30/100 miners × 4 sandstone, steel or machinery walls and 1 tree. 90 warmup frames; no full-world serialization during timed frames. Ground/rock buffer identities checked after excavation.',phases:[]};
if(drafting)report.protocol+=' Half the actors start drafted with two directed moves; the others work. Wait for both complete mining and automatic undraft, checking all weapons and existing GPU buffers. No extra UI injected commands during timing.';
const browser=await chromium.launch({channel:'chromium'});
try {
 for(const count of (process.env.MINING_COUNTS??'3,30,100').split(',').map(Number)) {
  const page=await browser.newPage({viewport:report.viewport}),errors=[];page.setDefaultTimeout(15000);
  await page.addInitScript(installGpuCallProbe,!!process.env.MINING_SHADER_DIFF);
  if(process.env.MINING_SKIP_SHADOW_PREPARATION)await page.route('**/src/render/shadow-preparation.ts*',route=>route.fulfill({contentType:'application/javascript',body:'export async function prepareShadowPipelines() {}'}));
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))errors.push(m.text());});
  await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()+`\nconst originalMiningSnapshot=client.onSnapshot;client.onSnapshot=(...args)=>{const start=performance.now();try{return originalMiningSnapshot(...args);}finally{if(window.__miningBench.active)window.__miningBench.snapshots.push(performance.now()-start);}};`});});
  const initial=stonecutting?stonecuttingLoad(count):workshops?constructionLoad(count,true):miningLoad(count,steel,machinery);
  if(armed)for(const pawn of initial.pawns)addMaterial(initial,'weapon',1,{type:'equipment',pawnId:pawn.id},'revolver');
  for(const pawn of initial.pawns)for(let i=0;i<medicalWounds;i++)controlledInjury(initial,pawn,i%2?'left-arm':'right-leg',100,'cut');
  if(drafting){const ids=initial.pawns.filter((_,i)=>i%2===0).map(p=>p.id);for(const c of [{type:'draft',pawnIds:ids,enabled:true},{type:'draft-move',pawnIds:ids,target:{x:140,z:140},queue:false},{type:'draft-move',pawnIds:ids,target:{x:109,z:142},queue:true}]){const result=applyCommand(initial,c);if(!result.ok)throw Error(result.reason);}}
  await page.addInitScript(saved=>localStorage.setItem('lisiere.save.v1',saved),serializeWorld(initial));
  await page.goto('http://127.0.0.1:5173/?e2e&size=250&seed=42');await page.waitForFunction(()=>window.__miningBench.view?.world);
  await page.locator('[data-speed="0"]').click();await page.locator('[data-panel="menu"]').click();await page.locator('#load').click();await page.keyboard.press('Escape');
  await page.waitForFunction(({n,workshops,stonecutting})=>{const w=window.__miningBench.view.world;if(stonecutting)return w.tick===0&&w.pawns.length===n&&w.structures.filter(s=>s.kind==='stonecutter').length===n;return w.tick===2000&&w.pawns.length===n&&w.jobs.filter(j=>j.kind===(workshops?'stonecutter':'mine')).length===(workshops?1:4)*n;},{n:count,workshops,stonecutting});
  await page.waitForFunction(()=>!document.querySelector('.game-shell').inert);
  if(workshops||stonecutting){await page.mouse.move(720,500);await page.mouse.wheel(0,1800);}
  await page.evaluate(()=>{const b=window.__miningBench,v=b.view;b.initial={rock:v.rocks.mesh.geometry,position:v.rocks.mesh.geometry.getAttribute('position'),index:v.rocks.mesh.geometry.index,ground:v.terrainGroup.children.map(g=>g.uuid)};});
  const adapter=await page.evaluate(()=>{const a=window.__miningBench.view.renderer.getContext().getConfiguration().device.adapterInfo;return {vendor:a.vendor,architecture:a.architecture,description:a.description};});
  const formats=await page.evaluate(()=>[...window.__miningBench.view.boxes.batches].slice(0,5).map(([key,m])=>({key,material:m.material.id,storage:!!m.instanceMatrix.isStorageInstancedBufferAttribute,capacity:m.instanceMatrix.count})));
  await page.evaluate(()=>new Promise(resolve=>{let n=90;function f(){if(!--n)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);}));
  if(steel||machinery)await page.screenshot({path:`artifacts/${machinery?'machinery':'steel'}-deposits-${count}.png`});
  const finishTrace=process.env.MINING_TRACE?await startRenderTrace(browser,`mining-${count}-${Date.now()}`):null;
  const profiler=process.env.MINING_PROFILE?await page.context().newCDPSession(page):null;
  if(profiler){await profiler.send('Profiler.enable');await profiler.send('Profiler.start');}
  await page.evaluate(tracing=>{window.__miningBench.active=true;window.__miningBench.tracing=tracing;performance.mark('mining-measure-start');},!!finishTrace);await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(({n,drafting})=>window.__miningBench.events.reduce((sum,e)=>sum+e.mined,0)>=n&&(!drafting||!window.__miningBench.view.world.pawns.some(p=>p.draft)),{n:count*(stonecutting?3:workshops?1:4),drafting},{timeout:90000,polling:250});
  await page.locator('[data-speed="0"]').click();
  if(profiler){const {profile}=await profiler.send('Profiler.stop');await writeFile(`tmp/mining-main-${count}.cpuprofile`,JSON.stringify(profile));await profiler.detach();}
  const b=await page.evaluate(()=>{const b=window.__miningBench,v=b.view;b.active=false;return {drafted:v.world.pawns.filter(p=>p.draft).length,armed:v.world.piles.filter(p=>p.owner.type==='equipment').length,frames:b.frames,adoptions:b.adoptions,snapshots:b.snapshots,longFrames:b.longFrames,events:b.events,stableRock:b.initial.rock===v.rocks.mesh.geometry&&b.initial.position===v.rocks.mesh.geometry.getAttribute('position')&&b.initial.index===v.rocks.mesh.geometry.index,stableGround:JSON.stringify(b.initial.ground)===JSON.stringify(v.terrainGroup.children.map(g=>g.uuid)),blocks:v.world.piles.reduce((n,p)=>n+(p.kind==='blocks'?p.quantity:0),0),componentUnits:v.world.piles.reduce((n,p)=>n+(p.item==='component'?p.quantity:0),0),steelUnits:v.world.piles.reduce((n,p)=>n+(p.item==='steel'?p.quantity:0),0),chunks:v.world.piles.filter(p=>p.kind==='chunk').length,workshops:v.world.structures.filter(s=>s.kind==='stonecutter').length};});
  const phase={drafted:b.drafted,armed:b.armed,blocks:b.blocks,workshops:b.workshops,count,adapter,errors,frames:stats(b.frames.flatMap(f=>f.interval===null?[]:[f.interval])),frameCpu:stats(b.frames.map(f=>f.cpu)),adoptions:stats(b.adoptions),drawCalls:stats(b.frames.map(f=>f.calls)),excavationFrames:stats(b.frames.filter(f=>b.events.some(e=>f.at>=e.at&&f.at<e.at+150)).flatMap(f=>f.interval===null?[]:[f.interval])),mined:b.events.reduce((n,e)=>n+e.mined,0),componentUnits:b.componentUnits,steelUnits:b.steelUnits,chunks:b.chunks,stableRock:b.stableRock,stableGround:b.stableGround};
  phase.formats=formats;phase.growths=await page.evaluate(()=>window.__miningBench.growths);
  phase.shadowPreparation=!process.env.MINING_SKIP_SHADOW_PREPARATION;
  phase.snapshots=stats(b.snapshots);phase.longFrames=b.longFrames;phase.excavations=b.events;phase.slowFrames=b.frames.filter(f=>f.interval>20);phase.pipelines=await page.evaluate(()=>window.__miningBench.pipelines);phase.preparations=await page.evaluate(()=>window.__miningBench.preparations);
  report.phases.push(phase);
  if(finishTrace)try{phase.trace=await finishTrace();}catch(error){phase.traceError=String(error);throw error;}
  await page.screenshot({path:`artifacts/${stonecutting?'stonecutting':workshops?'stonebench':'mining'}-render-${count}.png`});await page.close();
  if(drafting&&b.drafted!==0||armed&&b.armed!==count||stonecutting&&b.blocks!==count*60||workshops&&b.workshops!==count||machinery&&b.componentUnits!==count*8||steel&&b.steelUnits!==count*160||errors.length||!b.stableRock||!b.stableGround||phase.shadowPreparation&&phase.pipelines.length)throw new Error(JSON.stringify(phase));
 }
}catch(error){report.error=String(error);throw error;}finally{await browser.close();await writeFile(process.argv[2]??'artifacts/mining-render.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
