import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cpus } from 'node:os';
import { recreationFixture } from './fixtures/recreation.ts';
import { cookingFixture } from './fixtures/cooking.ts';
import { serializeWorld, validateWorld } from '../src/sim/index.ts';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const output=process.argv[2]??'artifacts/cooking-render-bench.json';
const populations=(process.argv[3]??'3,30,100').split(',').map(Number);
if(populations.some(n=>!Number.isInteger(n)||n<1||n>100))throw new Error('Audit population must be 1..100');
const recreation=process.argv[4]==='recreation';
const report={workload:recreation?'recreation':'cooking',date:new Date().toISOString(),cpu:cpus()[0].model,protocol:'Native Chromium WebGPU, 1440×1000, natural 250² with synthetic camps; real worker at UI speed 6; 60 warmup frames then >=300 frames and >=5 seconds per phase. Local/overview phases advance the simulation successively, so they are workload observations, not identical-state camera A/B. RAF includes scheduling; frame CPU is submission, not GPU execution. No parallel tests or CPU benchmarks.',phases:[],errors:[]};
const stats=values=>{const s=[...values].sort((a,b)=>a-b),at=q=>s[Math.ceil(q*s.length)-1];return {n:s.length,p50:at(.5),p95:at(.95),p99:at(.99),max:s.at(-1)};};
const browser=await chromium.launch({channel:'chromium',args:[]});
const watchdog=setTimeout(()=>{console.error('Render audit exceeded 150 seconds');process.exit(2);},150000);
try {
  for(const count of populations) {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    page.on('pageerror',e=>report.errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
    await page.route('**/src/main.ts*',async route=>{
      const response=await route.fetch();
      const instrumentation=`window.__cookingBench={view:null,frames:[],warm:0,active:false};const cookingOriginalFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const b=window.__cookingBench;b.view=this;const start=performance.now();const result=cookingOriginalFrame.call(this,now);if(b.warm>0)b.warm--;else if(b.active){b.frames.push({time:now,cpu:performance.now()-start,calls:this.stats.drawCalls,triangles:this.stats.triangles,tick:this.world.tick,stepMs});if(b.frames.length>=300&&now-b.frames[0].time>=5000){b.active=false;b.done(b.frames);}}return result;};\n`;
      await route.fulfill({response,body:instrumentation+await response.text()});
    });
    const initial=recreation?recreationFixture(count):cookingFixture(count);
    await page.addInitScript(data=>localStorage.setItem('lisiere.save.v1',data),serializeWorld(initial));
    await page.goto('http://127.0.0.1:5173/?e2e&seed=42');await page.waitForFunction(()=>!!window.__cookingBench.view?.world);
    await page.locator('[data-speed="0"]').click();await page.locator('[data-panel="menu"]').click();await page.locator('#load').click();
    await page.waitForFunction(n=>window.__lisiere.world.pawns.length===n&&window.__lisiere.world.structures.some(s=>s.kind==='campfire'),count);
    await page.keyboard.press('Escape');await page.locator('#view-home').click();
    const backend=await page.evaluate(()=>window.__lisiere.backend);if(backend!=='WebGPU')throw new Error(`Hardware audit requires WebGPU, got ${backend}`);
    report.adapter??=await page.evaluate(()=>{const i=window.__cookingBench.view.renderer.getContext().getConfiguration().device.adapterInfo;return {vendor:i.vendor,architecture:i.architecture,device:i.device,description:i.description};});
    await page.locator('[data-speed="6"]').click();
    for(const view of ['local','overview']) {
      const frames=await page.evaluate(view=>new Promise(resolve=>{
        const b=window.__cookingBench,v=b.view;
        if(view==='overview'){v.camera.zoom=v.controls.minZoom;v.camera.updateProjectionMatrix();v.controls.update();}
        Object.assign(b,{warm:60,frames:[],active:true,done:resolve});
      }),view);
      const state=JSON.parse(await page.evaluate(()=>JSON.stringify(window.__lisiere.world))),invalid=validateWorld(state);if(invalid.length)throw new Error(invalid.join(';'));
      const entry={pawns:count,view,backend,frameMs:stats(frames.slice(1).map((f,i)=>f.time-frames[i].time)),frameCpuMs:stats(frames.map(f=>f.cpu)),lastReportedWorkerMs:stats(frames.map(f=>f.stepMs)),drawCalls:stats(frames.map(f=>f.calls)),triangles:stats(frames.map(f=>f.triangles)),ticks:[frames[0].tick,frames.at(-1).tick],cookedInRecentJournal:state.events.filter(e=>e.message.includes('a cuisiné')).length,active:state.pawns.filter(p=>p.cooking||p.haul||p.jobId!==null||p.recreation.task).length,recreation:Object.fromEntries(['skygaze','horseshoes'].map(activity=>[activity,state.pawns.filter(p=>p.recreation.task?.activity===activity&&p.recreation.task.phase==='active').length]))};
      entry.construction={plans:state.jobs.filter(j=>j.construction==='blueprint').length,frames:state.jobs.filter(j=>j.construction==='frame').length,clearingPlants:state.jobs.filter(j=>j.clearance).length,walls:state.structures.filter(s=>s.kind==='wall').length,builders:state.pawns.filter(p=>p.jobId!==null&&state.jobs.some(j=>j.id===p.jobId&&j.construction)).length};
      report.phases.push(entry);console.log(`${count} ${view}: frame p95 ${entry.frameMs.p95.toFixed(2)} ms, CPU p95 ${entry.frameCpuMs.p95.toFixed(2)} ms, ticks ${entry.ticks.join('→')}, ${entry.drawCalls.p50} calls`);
      await page.screenshot({path:`artifacts/${recreation?'recreation':'cooking'}-${count}-${view}.png`});
    }
    await page.close();
  }
  if(report.errors.length)throw new Error(report.errors.join('\n'));
} finally {
  await browser.close();clearTimeout(watchdog);await writeFile(output,JSON.stringify(report,null,2)+'\n');
}
