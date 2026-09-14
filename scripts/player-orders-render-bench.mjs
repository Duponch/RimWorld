import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cpus } from 'node:os';
import { cookingFixture } from './fixtures/cooking.ts';
import { serializeWorld, stepWorld, applyCommand, canDesignate } from '../src/sim/index.ts';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const report={date:new Date().toISOString(),cpu:cpus()[0].model,protocol:'100 colonists, natural 250² seed 42 with synthetic camps. 75 real simulation ticks before capture, then the same paused state throughout. Native Chromium WebGPU 1440×1000; 60 warmup frames, >=300 frames and >=3 seconds per phase. Instrumented UI selection callbacks; real worker menu queries. No other tests/build/benchmark running.',phases:[],errors:[]};
const stats=values=>{const s=[...values].sort((a,b)=>a-b),at=q=>s[Math.ceil(q*s.length)-1];return {n:s.length,p50:at(.5),p95:at(.95),p99:at(.99),max:s.at(-1)};};
const initial=cookingFixture(100);stepWorld(initial,75);
initial.pawns[0].priorities.gather=1;
const tree=initial.resources.filter(r=>r.kind==='tree'&&canDesignate(initial,{type:'designate',kind:'chop',x:r.x,z:r.z}).ok).sort((a,b)=>Math.hypot(a.x-initial.pawns[0].x,a.z-initial.pawns[0].z)-Math.hypot(b.x-initial.pawns[0].x,b.z-initial.pawns[0].z))[0];
if(!tree||!applyCommand(initial,{type:'designate',kind:'chop',x:tree.x,z:tree.z}).ok)throw new Error('Missing menu target');
const browser=await chromium.launch({channel:'chromium',args:[]});
const watchdog=setTimeout(()=>{console.error('Selection audit exceeded 90 seconds');process.exit(2);},90000);
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
  await page.route('**/src/main.ts*',async route=>{
    const response=await route.fetch();
    const instrument=`window.__orderBench={view:null,frames:[],warm:0,active:false,query:(id,x,z)=>client.orderOptions(id,x,z)};const orderFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const b=window.__orderBench;b.view=this;const start=performance.now();const result=orderFrame.call(this,now);if(b.warm>0)b.warm--;else if(b.active){b.frames.push({time:now,cpu:performance.now()-start,calls:this.stats.drawCalls,triangles:this.stats.triangles});if(b.frames.length>=300&&now-b.frames[0].time>=3000){b.active=false;b.done(b.frames);}}return result;};\n`;
    await route.fulfill({response,body:instrument+await response.text()});
  });
  await page.addInitScript(data=>localStorage.setItem('lisiere.save.v1',data),serializeWorld(initial));
  await page.goto('http://127.0.0.1:5173/?e2e');await page.locator('#loading').waitFor({state:'detached'});
  await page.locator('[data-speed="0"]').click();await page.locator('[data-panel="menu"]').click();await page.locator('#load').click();await page.keyboard.press('Escape');await page.locator('#view-home').click();
  report.adapter=await page.evaluate(()=>{const i=window.__orderBench.view.renderer.getContext().getConfiguration().device.adapterInfo;return {vendor:i.vendor,architecture:i.architecture,device:i.device,description:i.description};});
  for(const view of ['local','overview'])for(const selected of [0,1,100,0]) {
    const result=await page.evaluate(({view,selected})=>new Promise(resolve=>{
      const b=window.__orderBench,v=b.view;if(view==='overview'){v.camera.zoom=v.controls.minZoom;v.camera.updateProjectionMatrix();v.controls.update();}
      const start=performance.now();v.onSelection({ids:v.world.pawns.slice(0,selected).map(p=>p.id),additive:false,toggle:false});const selectionMs=performance.now()-start;
      Object.assign(b,{warm:60,frames:[],active:true,done:frames=>resolve({frames,selectionMs})});
    }),{view,selected});
    const frames=result.frames,entry={view,selected,selectionCpuMs:result.selectionMs,frameMs:stats(frames.slice(1).map((f,i)=>f.time-frames[i].time)),frameCpuMs:stats(frames.map(f=>f.cpu)),drawCalls:stats(frames.map(f=>f.calls)),triangles:stats(frames.map(f=>f.triangles))};
    report.phases.push(entry);console.log(`${view}, selected ${selected}: p95 ${entry.frameMs.p95.toFixed(2)}ms, calls ${entry.drawCalls.p50}, selection ${entry.selectionCpuMs.toFixed(2)}ms`);
    if(selected===100)await page.screenshot({path:`artifacts/selection-100-${view}.png`});
  }
  const queries=await page.evaluate(async({id,x,z})=>{
    const b=window.__orderBench,samples=[],before=JSON.stringify(window.__lisiere.world);let last;
    for(let i=0;i<30;i++){const start=performance.now();last=await b.query(id,x,z);samples.push(performance.now()-start);}
    return {samples,unchanged:before===JSON.stringify(window.__lisiere.world),last};
  },{id:initial.pawns[0].id,x:tree.x,z:tree.z});
  report.menu={roundTripMs:stats(queries.samples),unchanged:queries.unchanged,options:queries.last};
  if(!queries.unchanged||!queries.last[0]?.enabled)throw new Error('Query changed the world or did not exercise a reachable job');
  if(report.errors.length)throw new Error(report.errors.join('\n'));
} finally {await browser.close();clearTimeout(watchdog);await writeFile(process.argv[2]??'artifacts/player-orders-render.json',JSON.stringify(report,null,2)+'\n');}
