import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import os from 'node:os';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const {chromium}=await import('@playwright/test');
const variant=process.env.CROP_VARIANT??'rice',suffix=process.env.VALIDATION_VERSION?'-'+process.env.VALIDATION_VERSION:'';
const browser=await chromium.launch({channel:'chromium'});
const report={date:new Date().toISOString(),cpu:os.cpus()[0].model,protocol:'250² seed 42, 1440×1000, hardware WebGPU, paused. Same cleared field and camera: 0/1000/0 plants. CROP_VARIANT=mixed alternates cotton and rice; otherwise rice only. 30 transition + 90 warm frames, then >=300 frames and 6 s. CPU submission is not GPU time. Synthetic presentation fixture, no gameplay throughput claim.',phases:[],errors:[]};
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {n:s.length,mean:a.reduce((n,v)=>n+v,0)/a.length,p95:s[Math.ceil(s.length*.95)-1],max:s.at(-1)};};
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
  await page.addInitScript({content:(await readFile('scripts/gpu-call-probe.mjs','utf8')).replace('export function','function')+'\nwindow.__miningBench={active:false,pipelines:[]};installGpuCallProbe();'});
  await page.route('**/src/main.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:`window.__farmBench={view:null};const farmFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const b=window.__farmBench;b.view=this;const start=performance.now();const result=farmFrame.call(this,now);if(b.active){const row={time:now,cpu:performance.now()-start,calls:this.stats.drawCalls,triangles:this.stats.triangles};if(b.transition.length<30)b.transition.push(row);else if(b.warm>0)b.warm--;else {b.frames.push(row);if(b.frames.length>=300&&now-b.frames[0].time>=6000){b.active=false;b.done({frames:b.frames,transition:b.transition});}}}return result;};\n`+await response.text()});
  });
  await page.goto('http://127.0.0.1:5173/?scenario=camp&e2e&seed=42');await page.locator('#loading').waitFor({state:'detached'});await page.locator('[data-speed="0"]').click();
  report.adapter=await page.evaluate(()=>{const i=window.__farmBench.view.renderer.getContext().getConfiguration().device.adapterInfo;return {vendor:i.vendor,architecture:i.architecture,description:i.description};});
  await page.evaluate(()=>{
    const b=window.__farmBench,v=b.view,w=structuredClone(v.world);
    w.tick=3000;w.resources=w.resources.filter(r=>r.x<110||r.x>=142||r.z<110||r.z>=142);
    b.base=w;b.daylight=v.daylight.update.bind(v.daylight);v.daylight.update=(_,target)=>b.daylight(3000,target);
    v.setWorld(w);v.crops.update(w,true);
  });
  for(const count of [0,1000,0]) {
    const result=await page.evaluate(({count,variant})=>new Promise(done=>{
      const b=window.__farmBench,v=b.view,w=structuredClone(b.base);
      for(let i=0;i<count;i++)w.resources.push({id:w.nextId++,kind:variant==='mixed'&&i%2?'cotton':'rice',x:110+i%32,z:110+Math.floor(i/32),amount:6,growth:1,growthTick:w.tick});
      window.__miningBench.active=true;const start=performance.now();v.setWorld(w);b.setWorldMs=performance.now()-start;
      Object.assign(b,{active:true,transition:[],warm:90,frames:[],done:r=>done({...r,setWorldMs:b.setWorldMs})});
    }),{count,variant});
    const frameMs=rows=>stats(rows.slice(1).map((r,i)=>r.time-rows[i].time));
    const pipelines=await page.evaluate(()=>{window.__miningBench.active=false;return window.__miningBench.pipelines;});
    const phase={count,variant,pipelines,setWorldMs:result.setWorldMs,frameMs:frameMs(result.frames),cpuMs:stats(result.frames.map(r=>r.cpu)),calls:stats(result.frames.map(r=>r.calls)),triangles:stats(result.frames.map(r=>r.triangles)),transitionFrameMs:frameMs(result.transition),transitionCpuMs:stats(result.transition.map(r=>r.cpu))};
    report.phases.push(phase);console.log(`${count} ${variant}: ${phase.calls.mean} calls, p95 ${phase.frameMs.p95.toFixed(2)} ms, setWorld ${phase.setWorldMs.toFixed(2)} ms`);
    if(count)await page.screenshot({path:`artifacts/farming-benchmark${suffix}.png`});
  }
  if(report.phases.some(p=>p.pipelines.length))throw Error('Unexpected crop pipeline compilation');
  if(report.errors.length)throw Error(report.errors.join('\n'));
} finally {await browser.close();await writeFile(`artifacts/farming-render-benchmark${suffix}.json`,JSON.stringify(report,null,2)+'\n');}
