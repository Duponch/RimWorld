import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Paired presentation-only probe. Start Vite first, e.g. npm run dev.
 * The diagnostic world is prepared directly in the renderer while the real
 * GameSession remains paused; no synthetic state is serialized or simulated. */
const base=process.env.VFX_BENCH_URL??'http://127.0.0.1:5173';
const durationMs=Number(process.env.VFX_BENCH_DURATION_MS??1800);
const report={date:new Date().toISOString(),base,viewport:{width:1440,height:1000},
  protocol:'One paused synthetic 64² scene, 100 visible actors (60 at powered machining benches, 40 sleeping), 30 ground fires and 10 lit campfires. Native Chromium WebGPU, fixed orthographic camera, A/B/A with V126 actor/structure effect groups visible/hidden/visible. 45 RAF warmup frames per arm and 1.8 s sampling. RAF interval includes scheduling and display pacing; frame CPU is JS/render submission, not GPU execution. No performance threshold or simulation-speed claim.',
  scene:null,adapter:null,phases:[],errors:[]};
const stats=values=>{const sorted=[...values].sort((a,b)=>a-b),at=q=>sorted.length?+sorted[Math.min(sorted.length-1,Math.floor(sorted.length*q))].toFixed(3):null;
  return {count:sorted.length,p50:at(.5),p95:at(.95),max:at(1)};};
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('playwright');
const browser=await chromium.launch({channel:'chromium',headless:false});
try{
  const page=await browser.newPage({viewport:report.viewport});
  page.setDefaultTimeout(20_000);
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'||/GPUValidationError|invalid pipeline/i.test(message.text()))report.errors.push(message.text());});
  const probe=`
window.__activityVfxBench={view:null,active:false,enabled:true,frames:[],intervals:[],previous:null};
const activityFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
  const b=window.__activityVfxBench;b.view=this;
  const start=performance.now(),result=activityFrame.call(this,now);
  if(b.active&&!this.preparing){b.frames.push(performance.now()-start);if(b.previous!==null)b.intervals.push(now-b.previous);b.previous=now;}
  return result;
};\n`;
  await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
  await page.goto(`${base}/?scenario=camp&size=64&e2e`);
  await page.waitForFunction(()=>window.__activityVfxBench?.view&&!window.__activityVfxBench.view.preparing,undefined,{timeout:60_000});
  await page.locator('[data-speed="0"]').click();
  report.scene=await page.evaluate(async()=>{
    const b=window.__activityVfxBench,v=b.view;
    const {createWorld}=await import('/src/sim/index.ts');
    const {ensureFireState}=await import('/src/sim/fire-rules.ts');
    const w=createWorld(126,64,64),base=structuredClone(w.pawns[0]);
    w.jobs=[];w.structures=[];w.piles=[];
    w.pawns=Array.from({length:100},(_,i)=>{
      const p=structuredClone(base);p.id=w.nextId++;p.name=`Acteur ${i+1}`;
      p.x=15+(i%10)*3;p.z=15+Math.floor(i/10)*3;
      p.jobId=null;p.haul=undefined;p.research=undefined;p.melee=undefined;p.shooting=undefined;
      p.state=i<60?'working':'sleeping';
      if(i<60){const station={id:w.nextId++,kind:i%2?'machining-table':'fabrication-bench',x:p.x,z:p.z+1,
        orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
        w.structures.push(station);p.cooking={stationId:station.id,phase:'work',recipe:'make-revolver',actionCell:{x:p.x,z:p.z}};}
      else p.cooking=undefined;
      return p;
    });
    for(let i=0;i<10;i++)w.structures.push({id:w.nextId++,kind:'campfire',x:13+i*3,z:12,orientation:0,footprint:'standard',fuel:{ticks:1000,burned:0,autoRefuel:true}});
    const fire=ensureFireState(w);
    for(let i=0;i<30;i++)fire.items.push({id:w.nextId++,x:15+(i%10)*3,z:44+Math.floor(i/10)*2,size:1,
      bornCore:0,nextPulseCore:15,complexCore:150,spreadCore:150});
    v.setWorld(w,true,0);
    v.rig.setMode('orthographic');v.controls.enableDamping=false;
    v.controls.target.set(28.5,0,28.5);v.camera.position.set(46.5,31,48.5);v.camera.zoom=.90;
    v.camera.updateProjectionMatrix();v.controls.update();
    // Intercept only the final scene submission. Both arms pay the same tiny
    // visibility branch; the simulation and all other graphics stay identical.
    const render=v.renderer.render.bind(v.renderer);
    v.renderer.render=function(scene,camera){v.actionVfx.group.visible=b.enabled;
      v.structureVfx.group.visible=b.enabled&&!v.overview.group.visible;
      return render(scene,camera);};
    return {pawns:w.pawns.length,working:w.pawns.filter(p=>p.state==='working').length,
      sleeping:w.pawns.filter(p=>p.state==='sleeping').length,groundFires:fire.items.length,campfires:10};
  });
  await page.waitForTimeout(900);
  const runtime=await page.evaluate(()=>{
    const v=window.__activityVfxBench.view,a=v.renderer.getContext().getConfiguration().device.adapterInfo;
    return {backend:v.backend,adapter:{vendor:a.vendor,architecture:a.architecture,description:a.description},
      actorInstances:v.actionVfx.mesh.geometry.instanceCount,smokeInstances:v.structureVfx.smoke.geometry.instanceCount,
      glowInstances:v.structureVfx.glow.activeCount,detail:v.rig.pixelsPerCell(v.host.clientHeight),distant:v.overview.group.visible};
  });
  assert.equal(runtime.backend,'WebGPU');assert.ok(runtime.actorInstances>0&&runtime.smokeInstances>0&&runtime.glowInstances>0);
  assert.equal(runtime.distant,false);report.adapter=runtime.adapter;report.runtime=runtime;
  const waitFrames=n=>page.evaluate(n=>new Promise(resolve=>{const step=()=>{if(--n<=0)resolve();else requestAnimationFrame(step);};requestAnimationFrame(step);}),n);
  for(const [name,enabled] of [['A-visible',true],['B-hidden',false],['A-visible-repeat',true]]){
    await page.evaluate(enabled=>{const b=window.__activityVfxBench;b.enabled=enabled;b.active=false;},enabled);
    await waitFrames(45);
    await page.evaluate(()=>{const b=window.__activityVfxBench;b.frames=[];b.intervals=[];b.previous=null;b.active=true;});
    await page.waitForTimeout(durationMs);
    const data=await page.evaluate(()=>{const b=window.__activityVfxBench;b.active=false;
      return {frames:b.frames,intervals:b.intervals,calls:b.view.stats.drawCalls,triangles:b.view.stats.triangles,tick:b.view.world.tick};});
    report.phases.push({name,enabled,frames:stats(data.intervals),frameCpu:stats(data.frames),
      fps:data.intervals.length?+(1000/(data.intervals.reduce((a,c)=>a+c,0)/data.intervals.length)).toFixed(1):null,
      drawCalls:data.calls,triangles:data.triangles,tick:data.tick});
  }
  assert.equal(new Set(report.phases.map(p=>p.tick)).size,1,'Benchmark world must remain paused.');
  await page.close();
}finally{
  await browser.close();
  writeFileSync('artifacts/activity-vfx-bench-v126.json',JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report));
