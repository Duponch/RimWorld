import { environmentLoad,environmentLoadInitial,environmentLoadSummary,environmentLoadOutcomeErrors,ENVIRONMENT_PROTOCOL,ENVIRONMENT_MEASURED_TICKS } from '../tests/scenarios/environment-load.ts';
import { prisonLoad,prisonLoadInitial,prisonLoadSummary,prisonLoadOutcomeErrors,PRISON_PROTOCOL,PRISON_MEASURED_TICKS } from '../tests/scenarios/prison-load.ts';
import { energyLoad,energyLoadSummary,energyLoadOutcomeErrors,ENERGY_PROTOCOL,ENERGY_START_TICK } from '../tests/scenarios/energy-load.ts';
import { foodChainLoad,foodChainCropIds,foodChainSummary,foodChainOutcomeErrors,FOOD_CHAIN_PROTOCOL,FOOD_CHAIN_START_TICK } from '../tests/scenarios/food-chain-load.ts';
import { infectionLoad } from '../tests/scenarios/infection-load.ts';
import { wildlifeLoad,injuredWildlifeLoad,meleeWildlifeLoad,huntingWildlifeLoad } from '../tests/scenarios/wildlife-load.ts';
import { coldStoreLoad } from '../tests/scenarios/cold-store-load.ts';
import { heatwaveLoad } from '../tests/scenarios/heatwave-load.ts';
import { researchLoad } from '../tests/scenarios/research-load.ts';
import { serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';
import { installGpuCallProbe } from './gpu-call-probe.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {n:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
/** Fixture-only presentation setup. Use the renderer's existing CameraRig and
 * real projections, without changing the world or adding a production API. */
async function frameFoodChain(page,detail=false,energy=false,environment=false) {
  return page.evaluate(({detail,energy,environment})=>{
    const view=window.__miningBench.view,w=view.world,rig=view.rig,controls=rig.controls;
    rig.setMode('orthographic');controls.enableDamping=false;controls.update();controls.enabled=false;
    const food=w.structures.filter(s=>['fueled-stove','electric-stove','butcher-table','wood-generator',...energy?['solar-generator','battery','power-switch','power-conduit','cooler']:[],...environment?['wind-turbine','heater']:[]].includes(s.kind));
    const research=w.structures.filter(s=>s.kind==='research-bench');
    const cells=w.growingZones.flatMap(zone=>zone.cells.map(cell=>({x:cell%w.width,z:Math.floor(cell/w.width)})));
    const points=detail?food.filter(s=>s.kind==='fueled-stove'||s.kind==='electric-stove').slice(0,2):[...w.pawns,...research,...food,...cells];
    if(!points.length)throw Error('Food camera has no target');
    // The close view covers the first one/two whole food patches: stoves,
    // generators, butcher tables, ingredient piles and both growing zones.
    const bounds={minX:Math.min(...points.map(p=>p.x))-4,maxX:Math.max(...points.map(p=>p.x))+(detail?14:4),minZ:Math.min(...points.map(p=>p.z))-4,maxZ:Math.max(...points.map(p=>p.z))+(detail?11:4)};
    const camera=rig.camera,offset=camera.position.clone().sub(controls.target);
    controls.target.set((bounds.minX+bounds.maxX)/2,1,(bounds.minZ+bounds.maxZ)/2);
    camera.position.copy(controls.target).add(offset);camera.zoom=1;camera.updateProjectionMatrix();controls.update();camera.updateMatrixWorld();
    const rect=view.renderer.domElement.getBoundingClientRect(),safe={left:260,right:rect.width-260,top:130,bottom:rect.height-130};
    const corners=[];for(const x of [bounds.minX,bounds.maxX])for(const z of [bounds.minZ,bounds.maxZ])for(const y of [0,2])corners.push({x,y,z});
    const project=p=>{const v=camera.position.clone().set(p.x,p.y,p.z).project(camera);return {x:(v.x+1)*rect.width/2,y:(1-v.y)*rect.height/2};};
    const projected=corners.map(project),width=Math.max(...projected.map(p=>p.x))-Math.min(...projected.map(p=>p.x)),height=Math.max(...projected.map(p=>p.y))-Math.min(...projected.map(p=>p.y));
    camera.zoom=Math.max(controls.minZoom,Math.min(controls.maxZoom,.95*Math.min((safe.right-safe.left)/width,(safe.bottom-safe.top)/height)));
    camera.updateProjectionMatrix();controls.update();camera.updateMatrixWorld();
    const inside=p=>p.x>=safe.left&&p.x<=safe.right&&p.y>=safe.top&&p.y<=safe.bottom;
    if(!corners.map(project).every(inside))throw Error('Food workload does not fit inside the unobstructed canvas');
    return {view:detail?'food-close':'whole-workload',projection:rig.mode,bounds,zoom:camera.zoom,verticalSpan:rig.span,target:controls.target.toArray(),position:camera.position.toArray(),safeCanvasRect:safe,initialAnchors:detail?null:{pawns:w.pawns.length,researchBenches:research.length,foodStructures:food.length,growingCells:cells.length},foliage:'unchanged'};
  },{detail,energy,environment});
}
const prefix=`
window.__miningBench={active:false,pipelines:[],frames:[],workers:[],snapshots:[],previous:null,view:null};
const tailoringFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const t=performance.now(),r=tailoringFrame.apply(this,args),b=window.__miningBench;b.view=this;
if(b.active){b.frames.push({interval:b.previous===null?null:args[0]-b.previous,cpu:performance.now()-t,calls:this.stats.drawCalls});b.previous=args[0];}return r;};
`;
const suffix=`
const tailoringSnapshot=client.onSnapshot;client.onSnapshot=(...args)=>{const b=window.__miningBench,t=performance.now();try{return tailoringSnapshot(...args);}finally{if(b.active){b.workers.push(args[1]);b.snapshots.push(performance.now()-t);}}};
`;
const environment=process.env.ENVIRONMENT==='1',prisoners=!environment&&process.env.PRISONERS==='1',energy=environment||prisoners||process.env.ENERGY==='1',foodChain=energy||process.env.FOOD_CHAIN==='1',infection=!foodChain&&process.env.INFECTIONS==='1',hunting=process.env.HUNTING==='1';
const measuredTicks=environment?ENVIRONMENT_MEASURED_TICKS:prisoners?PRISON_MEASURED_TICKS:650;
const animalMelee=process.env.ANIMAL_MELEE==='1',animalCombat=process.env.ANIMAL_COMBAT==='1'||animalMelee;
const wild=process.env.WILDLIFE==='1',cold=!wild&&process.env.COLD_STORE==='1',hot=!wild&&!cold&&process.env.HEATWAVE==='1',makeLoad=environment?environmentLoad:prisoners?prisonLoad:energy?energyLoad:foodChain?foodChainLoad:infection?infectionLoad:hunting?huntingWildlifeLoad:animalMelee?meleeWildlifeLoad:animalCombat?injuredWildlifeLoad:wild?wildlifeLoad:cold?coldStoreLoad:hot?heatwaveLoad:researchLoad,version=process.env.VALIDATION_VERSION??(environment?'v87':prisoners?'v86':energy?'v85':foodChain?'v84':wild?'v76':cold?'v75':hot?'v74':'v73'),label=environment?'environment':prisoners?'prison':energy?'energy':foodChain?'food-chain':infection?'infection':hunting?'hunting':animalMelee?'animal-melee':animalCombat?'animal-combat':wild?'wildlife':cold?'cold-store':hot?'heatwave':'research',startTick=energy?ENERGY_START_TICK:foodChain?FOOD_CHAIN_START_TICK:hot?4000:2000;
const report={date:new Date().toISOString(),cpu:os.cpus()[0].model,viewport:{width:1440,height:1000},protocol:foodChain?(environment?ENVIRONMENT_PROTOCOL:prisoners?PRISON_PROTOCOL:energy?ENERGY_PROTOCOL:FOOD_CHAIN_PROTOCOL)+` Fixed orthographic camera includes the initial research/mining actors and all food patches before warmup; camera pose and unobstructed bounds recorded. Post-measurement close views are excluded from samples. Native Chromium WebGPU, real worker at requested 6× for ${measuredTicks} ticks, 90 warmup frames, one run each; no full World export during timing. Worker samples are published batch step averages, not an independent per-tick percentile.`:(infection?'Controlled infection in one miner per six, in a physical medical bed, one researcher per six also enabled as doctor, five industrial doses per patient; other workshops preserved. ':'')+(hunting?'One miner in six hunts a healthy hare using real bullets and execution; dead animals become physical corpses. ':'')+(animalMelee?'One miner in six is drafted against an adjacent hare; the other workers retain their physical research/crafting/mining tasks. Melee injuries and outcomes are real. ':'')+(animalCombat?'Half of the hares have real tail gunshot injuries, blood loss and an initial bounded escape; no corpse transport. ':'')+(wild?'Same number of wild hares as colonists, half start hungry, one third tired; vegetation and piles consumed physically. ':'')+(cold?'1/6/20 powered cold rooms and rice stores; one fifth of actors start at 34% hypothermia and physically seek warmth; ':'')+(hot?'Heatwave plateau 17°C offset, tick 4000–4650; half shirt-wearing actors start at 34% heatstroke, other half tribalwear; ':'')+'Native Chromium WebGPU; natural 250², physical apparel on 3/30/100 actors. One third research at physical benches; others gather/craft tribalwear or mine/chop. Real worker at requested 6× for 650 ticks, 90 warmup frames, one run each; no full World export during timing. Worker samples are published batch step averages, not an independent per-tick percentile.',measuredTicks,environment,prisoners,energy,foodChain,wildlife:foodChain||wild,coldStore:!foodChain&&cold,heatwave:!foodChain&&hot,rows:[]};
const browser=await chromium.launch({channel:'chromium',args:[]});
try{for(const count of [3,30,100]){
  const page=await browser.newPage({viewport:report.viewport}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(installGpuCallProbe,false);
  await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:prefix+await response.text()+suffix});});
  const fixture=makeLoad(count),environmentInitial=environment?environmentLoadInitial(fixture):undefined,prisonInitial=prisoners?prisonLoadInitial(fixture):undefined,initialCropIds=foodChain?foodChainCropIds(fixture):[];
  await page.addInitScript(data=>localStorage.setItem('lisiere.save.v1',data),serializeWorld(fixture));
  await page.goto('http://127.0.0.1:5173/?scenario=camp&e2e&size=250');await page.waitForFunction(()=>window.__miningBench.view?.world);
  await page.locator('[data-speed="0"]').click();await page.locator('[data-panel="menu"]').click();await page.locator('#load').click();await page.keyboard.press('Escape');
  await page.waitForFunction(n=>window.__miningBench.view.world.tick===n.startTick&&window.__miningBench.view.world.pawns.length===n.count&&!document.querySelector('.game-shell').inert,{count:fixture.pawns.length,startTick});
  // Fix the complete workload in view BEFORE all 90 warmup frames. Camera
  // flight, zoom and the later close screenshot are excluded from every sample.
  const foodCamera=foodChain?await frameFoodChain(page,false,energy,environment):undefined;
  await page.evaluate(()=>new Promise(resolve=>{let n=90;function frame(){if(!--n)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);}));
  if(foodChain)foodCamera.overviewDuringMeasurement=await page.evaluate(()=>window.__miningBench.view.overview.group.visible);
  if(environment)await page.screenshot({path:`artifacts/${label}-initial-${version}-${count}.png`});
  const adapter=await page.evaluate(()=>{const a=window.__miningBench.view.renderer.getContext().getConfiguration().device.adapterInfo;return {vendor:a.vendor,architecture:a.architecture,description:a.description};});
  await page.evaluate(()=>{const b=window.__miningBench;b.initial=b.view.pawns.pawnMesh.geometry;b.active=true;});
  const start=performance.now();await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(end=>window.__miningBench.view.world.tick>=end,startTick+measuredTicks,{timeout:Math.ceil(90000*measuredTicks/650),polling:250});await page.locator('[data-speed="0"]').click();const elapsed=performance.now()-start;
  const data=await page.evaluate(()=>{const b=window.__miningBench;b.active=false;return {frames:b.frames,workers:b.workers,snapshots:b.snapshots,pipelines:b.pipelines,stable:b.initial===b.view.pawns.pawnMesh.geometry,world:JSON.stringify(b.view.world)};});
  const w=JSON.parse(data.world),invalid=validateWorld(w),foodErrors=environmentInitial?environmentLoadOutcomeErrors(w,initialCropIds,environmentInitial):prisonInitial?prisonLoadOutcomeErrors(w,initialCropIds,prisonInitial):energy?energyLoadOutcomeErrors(w,initialCropIds):foodChain?foodChainOutcomeErrors(w,initialCropIds):[],row={actors:count,...environmentInitial?{environment:environmentLoadSummary(w,initialCropIds,environmentInitial)}:{},...prisonInitial?{totalActors:w.pawns.length,prison:prisonLoadSummary(w,initialCropIds,prisonInitial)}:{},...foodChain?{foodChain:prisonInitial?prisonLoadSummary(w,initialCropIds,prisonInitial).energy.food:environmentInitial?environmentLoadSummary(w,initialCropIds,environmentInitial).energy.food:foodChainSummary(w,initialCropIds),...energy?{energy:prisonInitial?prisonLoadSummary(w,initialCropIds,prisonInitial).energy:environmentInitial?environmentLoadSummary(w,initialCropIds,environmentInitial).energy:energyLoadSummary(w,initialCropIds)}:{},foodErrors}:{},infected:w.pawns.filter(p=>p.health?.infections?.cases.length).length,treatedInfections:w.pawns.reduce((n,p)=>n+(p.health?.infections?.cases.filter(c=>c.tend).length??0),0),animals:w.wildlife?.animals.length??0,animalNutrition:w.wildlife?.eatenNutrition??0,hunted:w.hunting?.completed??0,corpses:w.piles.filter(p=>p.kind==='corpse').length,animalDead:w.wildlife?.animals.filter(a=>a.state==='dead').length??0,colonistInjured:w.pawns.filter(p=>p.health?.injuries.length).length,adapter,elapsedMs:elapsed,simulatedTicks:w.tick-startTick,completed:w.tailoring?.completed??0,research:w.research?.points,exposed:w.pawns.filter(p=>p.health?.heatstroke||p.health?.hypothermia).length,coolers:w.structures.filter(s=>s.kind==='cooler').length,frameMs:stats(data.frames.flatMap(f=>f.interval===null?[]:[f.interval])),frameCpuMs:stats(data.frames.map(f=>f.cpu)),workerBatchStepMs:stats(data.workers),snapshotAdoptionMs:stats(data.snapshots),drawCalls:stats(data.frames.map(f=>f.calls)),pipelines:data.pipelines,stable:data.stable,errors,invalid};report.rows.push(row);
  if(foodChain)row.camera={...foodCamera,...await page.evaluate(initial=>{
    const view=window.__miningBench.view,rect=view.renderer.domElement.getBoundingClientRect(),safe=initial.safeCanvasRect;
    const visible=view.screenPawns().filter(p=>p.x-rect.left>=safe.left&&p.x-rect.left<=safe.right&&p.y-rect.top>=safe.top&&p.y-rect.top<=safe.bottom).length;
    return {finalPawnCentersInSafeRect:visible,fixed:Math.abs(view.rig.camera.zoom-initial.zoom)<1e-9&&view.rig.controls.target.toArray().every((n,i)=>Math.abs(n-initial.target[i])<1e-9)&&view.rig.camera.position.toArray().every((n,i)=>Math.abs(n-initial.position[i])<1e-9)};
  },foodCamera)};
  await page.screenshot({path:`artifacts/${label}-load-${version}-${count}.png`});
  if(foodChain){row.closeCamera=await frameFoodChain(page,true,energy,environment);await page.evaluate(()=>new Promise(resolve=>{let n=30;function frame(){if(!--n)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);}));await page.screenshot({path:`artifacts/${label}-stations-${version}-${count}.png`});}
  await page.close();
  if(infection&&!row.treatedInfections||!infection&&!w.research?.points||errors.length||invalid.length||foodErrors.length||data.pipelines.length||!data.stable||foodChain&&!row.camera.fixed||!foodChain&&!infection&&!hot&&!cold&&(w.tailoring?.completed??0)!==Array.from({length:count},(_,i)=>i).filter(i=>i%2===0&&i%3!==0).length)throw Error(JSON.stringify(row));
}}
catch(error){report.error=String(error);throw error;}
finally{await browser.close();await writeFile(`artifacts/${label}-render-${version}.json`,JSON.stringify(report,null,2));}
console.log(JSON.stringify(report));
