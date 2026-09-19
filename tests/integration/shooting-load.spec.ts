import { barrierLoad } from '../scenarios/barrier-load';
import { enableArrivals } from '../../src/sim/arrivals';
import { addMentalLoad } from '../scenarios/mental-break.ts';
import { dressLoad } from '../scenarios/apparel';
import { pursuitLoad } from '../scenarios/pursuit';
import { automaticLoad } from '../scenarios/automatic-combat';
import { meleeLoad } from '../scenarios/melee';
import { encounterLoad } from '../scenarios/encounter';
import { expect,test } from '@playwright/test';
import { readFileSync,writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { shootingLoad } from '../scenarios/shooting';
import { applyCommand } from '../../src/sim/engine';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { expectWorld,observeErrors,panel,saveKey,world } from './helpers';
const barriers=process.env.BARRIERS==='1';
const pursuit=process.env.PURSUIT==='1';
const melee=barriers||process.env.MELEE==='1',automatic=barriers||pursuit||process.env.AUTOMATIC==='1';
const proofVersion=process.env.VALIDATION_VERSION??'v57',movingTargets=process.env.MOVING_TARGETS==='1',hostileTargets=process.env.HOSTILE_TARGETS==='1';
const probe=`window.__miningBench={active:false,pipelines:[],frames:[],scenes:[],snapshots:[],previous:null,view:null,visible:0,meleePoses:0,slowed:{},retimed:{}};
const shotSet=ColonyRenderer.prototype.setWorld;ColonyRenderer.prototype.setWorld=function(...args){const b=window.__miningBench;if(b.active)for(const p of args[0].pawns){if(p.stagger)b.slowed[p.id]=true;if(p.motion?.stagger)b.retimed[p.id+':'+p.motion.start]=true;}return shotSet.apply(this,args);};
const shotApply=ColonyRenderer.prototype.applyWorld;ColonyRenderer.prototype.applyWorld=function(...args){const start=performance.now();try{return shotApply.apply(this,args);}finally{if(window.__miningBench.active)window.__miningBench.scenes.push(performance.now()-start);}};
const shotFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const b=window.__miningBench;b.view=this;const start=performance.now(),r=shotFrame.call(this,now);if(b.active&&!this.preparing){b.frames.push({cpu:performance.now()-start,interval:b.previous===null?null:now-b.previous,calls:this.stats.drawCalls});b.previous=now;const body=this.pawns.pawnMesh.geometry;for(let i=0;i<this.world.pawns.length;i++)if(body.getAttribute('aMotion').getZ(i)===8)b.meleePoses++;const g=this.projectiles.mesh.geometry,t=g.getAttribute('bulletTime');for(let i=0;i<g.instanceCount;i++)if(this.projectiles.tick.value>=t.getX(i)&&this.projectiles.tick.value<t.getY(i))b.visible++;}return r;};`;
const stats=(a:number[])=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};

test('native mixed shooting load: 3/30/100 actors, 250², worker/scene/frames and GPU capacity growth',async({playwright})=>{
  test.setTimeout(150000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]}),results=[];
  try {for(const count of [3,30,100]) {
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page),{world:initial,pairs}=(barriers?barrierLoad(count):pursuit?pursuitLoad(count):automatic?automaticLoad(count):melee?meleeLoad(count):hostileTargets?encounterLoad(count):shootingLoad(count,movingTargets));
    if(process.env.APPAREL==='1')dressLoad(initial);
    const mentalActors=process.env.MENTAL_BREAKS==='1'?addMentalLoad(initial):0;
    if(!automatic)for(const [pawnId,targetId] of pairs)expect(applyCommand(initial,{type:melee?'melee':'shoot',pawnIds:[pawnId],targetId}).ok).toBe(true);
    if(process.env.ARRIVALS==='1'){enableArrivals(initial);initial.arrivals!.serial=1;initial.arrivals!.pending={id:1,openedAt:initial.tick,expiresAt:initial.tick+6000,name:'Alix',profile:1};}
    expect(validateWorld(initial)).toEqual([]);
    await page.addInitScript({content:readFileSync('scripts/gpu-call-probe.mjs','utf8').replace('export function','function')+'\ninstallGpuCallProbe();'});
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()+`\nconst shotSnapshot=client.onSnapshot;client.onSnapshot=(...args)=>{const start=performance.now();try{return shotSnapshot(...args);}finally{if(window.__miningBench.active)window.__miningBench.snapshots.push(performance.now()-start);}};`});});
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?e2e&size=250');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await page.locator(`[data-pawn="${initial.pawns[0].id}"]`).dblclick();
    await page.evaluate(()=>new Promise<void>(resolve=>{let n=90;const f=()=>{if(!--n)resolve();else requestAnimationFrame(f);};requestAnimationFrame(f);}));
    await page.evaluate(()=>{(window as any).__miningBench.active=true;});
    if(process.env.ARRIVALS==='1'){await page.locator('#arrival-letter').click();await page.locator('#accept-arrival').click();await page.waitForFunction(n=>window.__lisiere.world.pawns.length===n,initial.pawns.length+1);}
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(t=>window.__lisiere.tick>=t,initial.tick+240,{timeout:20000,polling:100});await page.locator('[data-speed="0"]').click();
    const b=await page.evaluate(()=>{const b=(window as any).__miningBench;b.active=false;const device=b.view.renderer.getContext().getConfiguration().device;return {frames:b.frames,scenes:b.scenes,snapshots:b.snapshots,pipelines:b.pipelines,visible:b.visible,meleePoses:b.meleePoses,slowed:Object.keys(b.slowed).length,retimed:Object.keys(b.retimed).length,capacity:b.view.projectiles.mesh.geometry.getAttribute('bulletTime').count,adapter:{vendor:device.adapterInfo.vendor,architecture:device.adapterInfo.architecture}};});
    // Exporting all 62,500 tiles over CDP is a diagnostic, not a game action.
    // End capture before this export; keep actual acceptance/pause in the window.
    const end=await world(page);expect(validateWorld(end)).toEqual([]);
    expect(melee?b.meleePoses:b.visible).toBeGreaterThan(0);if(movingTargets){expect(b.slowed).toBeGreaterThan(0);expect(b.retimed).toBeGreaterThan(0);}expect(b.pipelines).toEqual([]);expect(errors).toEqual([]);if(count===100&&!melee)expect(b.capacity).toBeGreaterThan(32);
    results.push({barriers,destroyed:end.destroyed?.count??0,repairJobs:end.jobs.filter(j=>j.kind==='repair').length,remainingDamage:end.structures.reduce((n,s)=>n+(s.damage??0),0),arrivalAccepted:end.arrivals?.accepted??0,finalActors:end.pawns.length,mentalActors,pursuit,automatic,actors:count,pairs:pairs.length,movingTargets,hostileTargets,slowedPawns:b.slowed,retimedEdges:b.retimed,adapter:b.adapter,framesMs:stats(b.frames.flatMap((f:any)=>f.interval===null?[]:[f.interval])),frameCpuMs:stats(b.frames.map((f:any)=>f.cpu)),sceneMs:stats(b.scenes),snapshotCallbackMs:stats(b.snapshots),drawCalls:stats(b.frames.map((f:any)=>f.calls)),meleePoses:b.meleePoses,visibleFlightSamples:b.visible,capacity:b.capacity,apparelRemaining:end.piles.filter(p=>p.kind==='apparel').length,apparelDamaged:end.piles.filter(p=>p.apparel&&p.apparel.hitPoints<(p.item==='cloth-shirt'?100:200)).length,gunshotPatients:end.pawns.filter(p=>p.health?.injuries.some(i=>i.kind==='gunshot')).length,pipelines:b.pipelines,errors});await page.close();
  }writeFileSync(`artifacts/shooting-native-${proofVersion}.json`,JSON.stringify({arrivalFixture:process.env.ARRIVALS==='1'?'Pending letter before population growth; accepted through UI during native capture. Generation frequency not measured.':null,mentalBreaks:process.env.MENTAL_BREAKS==='1',apparel:process.env.APPAREL==='1',date:new Date().toISOString(),melee,hostileTargets,variant:barriers?'Barrier destruction, independent repair targets and mining/chopping; initial low HP is a controlled load, no reset.':pursuit?'Mobile visible-threat pursuit and firing positions, drafted autofire, civilian responses and mixed work; enemies start 35 cells from defenders.':automatic?'Drafted autofire, civilian Attack/Flee and armed sentries; remaining workers mine/chop. Quiet twin has the same automatic decisions.':melee?'Approach and melee against sentries; other civilians flee/work.':hostileTargets?'Hostile sentries return fire; half the civilian workers begin near a sentry and flee. Other workers mine/chop. Quiet twin still has hostile AI.':'Friendly-fire baseline',cpu:cpus()[0]?.model,viewport:{width:1440,height:1000},protocol:(barriers?'250², 3/30/100 actors; one third attacks weakened barriers, one third repairs separate damaged barriers in home, remainder mines/chops. No reset. ':pursuit?'250², 3/30/100 actors, mobile enemies initially 35 cells from defenders; shared path budget and real combat plus civilian work. ':automatic?'250², 3/30/100 actors; stationary drafted autofire, armed sentries, civilian Attack/Flee and mixed work. No commanded shots or healing reset. ':melee?'250², paired melee approach and strikes against armed sentries; remaining civilians flee/work. ':hostileTargets?'Hostile sentries return fire; civilians flee or work. ':'Friendly-target baseline. ')+'Native WebGPU, real worker at 6× for 240 ticks, generated forest 250² with cleared shooting lanes; roles follow the selected variant (MOVING_TARGETS=1 only for moving-pawn variants). Outside AUTOMATIC, actual shot commands accepted before fixture load; health, XP and all decisions evolve in worker. 90 warmup frames before measurement. Scene time is included in frame time; callback excludes IPC decoding. No claim of perfect frame pacing.',results},null,2)+'\n');
  } finally {await browser.close();}
});
