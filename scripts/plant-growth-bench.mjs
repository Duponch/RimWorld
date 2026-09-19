import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';
process.env.PLAYWRIGHT_BROWSERS_PATH ??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const browser=await chromium.launch({channel:'chromium'});
const report={timestamp:new Date().toISOString(),cpu:os.cpus()[0].model,viewport:{width:1440,height:1000},errors:[],protocol:'Hardware browser, natural 250x250 seed42, pause. CPU only: 20 warmup + 100 batches of 100 growth-monitor calls, unchanging tick; no GPU submission or maturation transition cost included.'};
try {
 const page=await browser.newPage({viewport:report.viewport});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:`window.__plantView=null;const plantFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(t){window.__plantView=this;return plantFrame.call(this,t);};\n`+await response.text()});});
 await page.goto('http://127.0.0.1:5173/?scenario=camp&e2e&size=250&seed=42');await page.waitForFunction(()=>window.__plantView?.world);
 await page.locator('[data-speed="0"]').click();
 report.browser=browser.version();report.backend=await page.evaluate(()=>window.__lisiere.backend);
 report.samples=await page.evaluate(()=>{
  const view=window.__plantView,base=view.world,records=[];
  const summarize=a=>{const sorted=[...a].sort((a,b)=>a-b);return {mean:a.reduce((a,b)=>a+b,0)/a.length,p95:sorted[Math.ceil(a.length*.95)-1],max:sorted.at(-1)};};
  for(const growing of [false,true]) {
   const world={...base,resources:base.resources.map(r=>r.kind==='berries'&&growing?{...r,growth:.3,growthTick:base.tick}:r)};
   view.resources.update(world,false);const durations=[];
   for(let batch=0;batch<120;batch++) {const start=performance.now();for(let i=0;i<100;i++)view.resources.updateGrowth(world);if(batch>=20)durations.push((performance.now()-start)/100);}
   records.push({growingPlants:growing?world.resources.filter(r=>r.kind==='berries').length:0,resources:world.resources.length,monitorCpuMs:summarize(durations)});
  }
  view.resources.update(base,false);return records;
 });
 if(report.errors.length)throw new Error(JSON.stringify(report.errors));
} finally {await browser.close();}
await writeFile('artifacts/plant-growth-benchmark.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
