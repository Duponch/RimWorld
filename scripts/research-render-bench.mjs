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
const prefix=`
window.__miningBench={active:false,pipelines:[],frames:[],workers:[],snapshots:[],previous:null,view:null};
const tailoringFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const t=performance.now(),r=tailoringFrame.apply(this,args),b=window.__miningBench;b.view=this;
if(b.active){b.frames.push({interval:b.previous===null?null:args[0]-b.previous,cpu:performance.now()-t,calls:this.stats.drawCalls});b.previous=args[0];}return r;};
`;
const suffix=`
const tailoringSnapshot=client.onSnapshot;client.onSnapshot=(...args)=>{const b=window.__miningBench,t=performance.now();try{return tailoringSnapshot(...args);}finally{if(b.active){b.workers.push(args[1]);b.snapshots.push(performance.now()-t);}}};
`;
const infection=process.env.INFECTIONS==='1',hunting=process.env.HUNTING==='1';
const animalMelee=process.env.ANIMAL_MELEE==='1',animalCombat=process.env.ANIMAL_COMBAT==='1'||animalMelee;
const wild=process.env.WILDLIFE==='1',cold=!wild&&process.env.COLD_STORE==='1',hot=!wild&&!cold&&process.env.HEATWAVE==='1',makeLoad=infection?infectionLoad:hunting?huntingWildlifeLoad:animalMelee?meleeWildlifeLoad:animalCombat?injuredWildlifeLoad:wild?wildlifeLoad:cold?coldStoreLoad:hot?heatwaveLoad:researchLoad,version=process.env.VALIDATION_VERSION??(wild?'v76':cold?'v75':hot?'v74':'v73'),label=infection?'infection':hunting?'hunting':animalMelee?'animal-melee':animalCombat?'animal-combat':wild?'wildlife':cold?'cold-store':hot?'heatwave':'research',startTick=hot?4000:2000;
const report={date:new Date().toISOString(),cpu:os.cpus()[0].model,viewport:{width:1440,height:1000},protocol:(infection?'Controlled infection in one miner per six, in a physical medical bed, one researcher per six also enabled as doctor, five industrial doses per patient; other workshops preserved. ':'')+(hunting?'One miner in six hunts a healthy hare using real bullets and execution; dead animals become physical corpses. ':'')+(animalMelee?'One miner in six is drafted against an adjacent hare; the other workers retain their physical research/crafting/mining tasks. Melee injuries and outcomes are real. ':'')+(animalCombat?'Half of the hares have real tail gunshot injuries, blood loss and an initial bounded escape; no corpse transport. ':'')+(wild?'Same number of wild hares as colonists, half start hungry, one third tired; vegetation and piles consumed physically. ':'')+(cold?'1/6/20 powered cold rooms and rice stores; one fifth of actors start at 34% hypothermia and physically seek warmth; ':'')+(hot?'Heatwave plateau 17°C offset, tick 4000–4650; half shirt-wearing actors start at 34% heatstroke, other half tribalwear; ':'')+'Native Chromium WebGPU; natural 250², physical apparel on 3/30/100 actors. One third research at physical benches; others gather/craft tribalwear or mine/chop. Real worker at requested 6× for 650 ticks, 90 warmup frames, one run each; no full World export during timing. Worker samples are published batch step averages, not an independent per-tick percentile.',wildlife:wild,coldStore:cold,heatwave:hot,rows:[]};
const browser=await chromium.launch({channel:'chromium',args:[]});
try{for(const count of [3,30,100]){
  const page=await browser.newPage({viewport:report.viewport}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(installGpuCallProbe,false);
  await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:prefix+await response.text()+suffix});});
  await page.addInitScript(data=>localStorage.setItem('lisiere.save.v1',data),serializeWorld(makeLoad(count)));
  await page.goto('http://127.0.0.1:5173/?scenario=camp&e2e&size=250');await page.waitForFunction(()=>window.__miningBench.view?.world);
  await page.locator('[data-speed="0"]').click();await page.locator('[data-panel="menu"]').click();await page.locator('#load').click();await page.keyboard.press('Escape');
  await page.waitForFunction(n=>window.__miningBench.view.world.tick===n.startTick&&window.__miningBench.view.world.pawns.length===n.count&&!document.querySelector('.game-shell').inert,{count,startTick});
  await page.evaluate(()=>new Promise(resolve=>{let n=90;function frame(){if(!--n)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);}));
  const adapter=await page.evaluate(()=>{const a=window.__miningBench.view.renderer.getContext().getConfiguration().device.adapterInfo;return {vendor:a.vendor,architecture:a.architecture,description:a.description};});
  await page.evaluate(()=>{const b=window.__miningBench;b.initial=b.view.pawns.pawnMesh.geometry;b.active=true;});
  const start=performance.now();await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(end=>window.__miningBench.view.world.tick>=end,startTick+650,{timeout:90000,polling:250});await page.locator('[data-speed="0"]').click();const elapsed=performance.now()-start;
  const data=await page.evaluate(()=>{const b=window.__miningBench;b.active=false;return {frames:b.frames,workers:b.workers,snapshots:b.snapshots,pipelines:b.pipelines,stable:b.initial===b.view.pawns.pawnMesh.geometry,world:JSON.stringify(b.view.world)};});
  const w=JSON.parse(data.world),invalid=validateWorld(w),row={actors:count,infected:w.pawns.filter(p=>p.health?.infections?.cases.length).length,treatedInfections:w.pawns.reduce((n,p)=>n+(p.health?.infections?.cases.filter(c=>c.tend).length??0),0),animals:w.wildlife?.animals.length??0,animalNutrition:w.wildlife?.eatenNutrition??0,hunted:w.hunting?.completed??0,corpses:w.piles.filter(p=>p.kind==='corpse').length,animalDead:w.wildlife?.animals.filter(a=>a.state==='dead').length??0,colonistInjured:w.pawns.filter(p=>p.health?.injuries.length).length,adapter,elapsedMs:elapsed,simulatedTicks:w.tick-startTick,completed:w.tailoring?.completed??0,research:w.research?.points,exposed:w.pawns.filter(p=>p.health?.heatstroke||p.health?.hypothermia).length,coolers:w.structures.filter(s=>s.kind==='cooler').length,frameMs:stats(data.frames.flatMap(f=>f.interval===null?[]:[f.interval])),frameCpuMs:stats(data.frames.map(f=>f.cpu)),workerBatchStepMs:stats(data.workers),snapshotAdoptionMs:stats(data.snapshots),drawCalls:stats(data.frames.map(f=>f.calls)),pipelines:data.pipelines,stable:data.stable,errors,invalid};report.rows.push(row);
  await page.screenshot({path:`artifacts/${label}-load-${version}-${count}.png`});await page.close();
  if(infection&&!row.treatedInfections||!infection&&!w.research?.points||errors.length||invalid.length||data.pipelines.length||!data.stable||!infection&&!hot&&!cold&&(w.tailoring?.completed??0)!==Array.from({length:count},(_,i)=>i).filter(i=>i%2===0&&i%3!==0).length)throw Error(JSON.stringify(row));
}}
catch(error){report.error=String(error);throw error;}
finally{await browser.close();await writeFile(`artifacts/${label}-render-${version}.json`,JSON.stringify(report,null,2));}
console.log(JSON.stringify(report));
