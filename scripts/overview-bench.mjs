import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('@playwright/test');
const label = process.argv[2] ?? 'current';
if (!/^[a-z0-9-]+$/.test(label)) throw Error('Invalid label');
const browser = await chromium.launch({ channel: 'chromium' });
const report = { detailedOnly:label.endsWith('-detailed'), timestamp: new Date().toISOString(), cpu: os.cpus()[0].model, protocol: '250² seed 42, 1440×1000, hardware Chromium, paused simulation, local and minimum zoom; 90 warmup frames then at least 8 seconds and 300 frames, captured in one browser promise. Detailed variant renders the original detailed layers at all zooms; same code and world otherwise. RAF includes scheduling; submission CPU is not GPU time.', phases: [], errors: [] };
const stats = a => { const s = [...a].sort((x,y)=>x-y); return { mean:a.reduce((x,y)=>x+y,0)/a.length, p95:s[Math.ceil(s.length*.95)-1], max:s.at(-1), count:s.length }; };
try {
  const page = await browser.newPage({ viewport: { width:1440, height:1000 } });
  page.on('pageerror', e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body:`window.__overview={view:null,frames:[],active:false,total:0};const originalFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const b=window.__overview;b.view=this;const t=performance.now();const result=originalFrame.call(this,now);b.total++;if(b.warm>0){b.warm--;if(!b.warm){b.active=true;b.frames=[];}}else if(b.active){b.frames.push({time:now,cpu:performance.now()-t,calls:this.stats.drawCalls,triangles:this.stats.triangles});if(b.frames.length>=300&&now-b.frames[0].time>=8000){b.active=false;b.complete(b.frames);}}return result;};\n`+await response.text() });
  });
  await page.goto('http://127.0.0.1:5173/?scenario=camp&e2e&size=250&seed=42');
  await page.waitForFunction(()=>!!window.__overview.view?.world);
  await page.locator('[data-speed="0"]').click();
  report.adapter = await page.evaluate(()=>{const c=window.__overview.view.renderer.getContext(),i=c.getConfiguration().device.adapterInfo;return {vendor:i.vendor,architecture:i.architecture,device:i.device,description:i.description};});
  for(const name of ['local','overview']) {
    const frames=await page.evaluate(({name,detailed})=>new Promise(resolve=>{
      const b=window.__overview;
      if(detailed&&!b.patched){const render=b.view.renderer.render.bind(b.view.renderer);b.view.renderer.render=(...args)=>{b.view.overview.group.visible=false;b.view.terrainGroup.visible=true;b.view.resourceGroup.visible=true;return render(...args);};b.patched=true;}
      if(name==='overview'){b.view.camera.zoom=b.view.controls.minZoom;b.view.camera.updateProjectionMatrix();}
      Object.assign(b,{warm:90,active:false,complete:resolve});
    }),{name,detailed:report.detailedOnly});
    report.phases.push({name,frameMs:stats(frames.slice(1).map((v,i)=>v.time-frames[i].time)),cpuMs:stats(frames.map(v=>v.cpu)),drawCalls:stats(frames.map(v=>v.calls)),triangles:stats(frames.map(v=>v.triangles))});
    await page.screenshot({path:`artifacts/overview-${label}-${name}.png`});
  }
} finally { await browser.close(); }
await writeFile(`artifacts/overview-${label}.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
