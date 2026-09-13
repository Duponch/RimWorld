import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('@playwright/test');
const variant = process.argv[2] ?? 'current';
if (!/^[a-z0-9-]+$/.test(variant)) throw new Error('Use a simple report label (a-z, 0-9, hyphen).');
const fixture = await readFile('tmp/dining-render-fixture.json', 'utf8');
const scenario = JSON.parse(fixture);
const report = { timestamp: new Date().toISOString(), viewport: { width: 1440, height: 1000 }, map: 250, pawns: 100,
  schema: scenario.schemaVersion, foodRules: scenario.foodRules,
  foodMix: scenario.piles.reduce((counts, pile) => { counts[pile.item ?? pile.kind] = (counts[pile.item ?? pile.kind] ?? 0) + pile.quantity; return counts; }, {}),
  protocol: 'Normal headless Chromium, default local camera, generated landscape outside cleared camps. 100 portions, tables, stools and owned beds. 60 warmup frames, then 8 seconds minimum and 240 frames per phase in one browser promise; no driver polling or interval filtering. Renderer CPU includes submissions, not GPU execution; RAF includes scheduling. No world serialization inside timed frames. Scene is deliberately uncongested.', phases: [], errors: [] };
const instrumentation = `
window.__diningBench = { view:null, active:false, frames:[], previous:null, total:0, snapshots:[], dom:[], longTasks:[], slowFrames:[], phases:new Set() };
const originalDomRender = renderState;
renderState = function(...args) {
  const started=performance.now(), result=originalDomRender.apply(this,args), b=window.__diningBench;
  if(b.active) b.dom.push(performance.now()-started);
  return result;
};
new PerformanceObserver(list => {
  const b=window.__diningBench;
  if(b.active) for(const entry of list.getEntries()) if(entry.startTime>=b.started) b.longTasks.push({ sinceStart:entry.startTime-b.started, duration:entry.duration });
}).observe({entryTypes:['longtask']});
for (const method of ['frame','setWorld']) {
  const original=ColonyRenderer.prototype[method];
  ColonyRenderer.prototype[method]=function(...args) {
    const b=window.__diningBench; b.view=this;
    const start=performance.now(), result=original.apply(this,args), elapsed=performance.now()-start;
    if(method==='frame') {
      b.total++;
      if(b.warm>0 && --b.warm===0) Object.assign(b,{active:true,frames:[],snapshots:[],dom:[],longTasks:[],slowFrames:[],phases:new Set(),previous:null,started:performance.now()});
      if(b.active) {
        b.frames.push({ cpu:elapsed, interval:b.previous===null?null:args[0]-b.previous, calls:this.stats.drawCalls, triangles:this.stats.triangles });
        if(elapsed>32 || (b.previous!==null && args[0]-b.previous>32)) b.slowFrames.push({ tick:this.world?.tick, sinceStart:performance.now()-b.started, cpu:elapsed, interval:b.previous===null?null:args[0]-b.previous });
        b.previous=args[0];
        if(performance.now()-b.started>=8000 && b.frames.length>=240) {
          b.active=false;
          b.complete({frames:b.frames,snapshots:b.snapshots,dom:b.dom,longTasks:b.longTasks,slowFrames:b.slowFrames,observed:[...b.phases],fpsText:document.querySelector('#fps-counter').textContent});
        }
      }
    } else if(b.active) {
      b.snapshots.push(elapsed);
      for(const p of args[0].pawns) if(p.need) b.phases.add(p.need.kind+':'+p.need.phase);
    }
    return result;
  };
}
`;
const stats = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b) => a-b);
  return { count: sorted.length, mean: values.reduce((a,b) => a+b,0)/values.length, p95: sorted[Math.ceil(sorted.length*.95)-1], max: sorted.at(-1) };
};
const browser = await chromium.launch({ channel:'chromium' });
try {
  const page = await browser.newPage({ viewport: report.viewport });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type()==='error' || /GPUValidationError|invalid pipeline|device.*lost/i.test(message.text())) report.errors.push(message.text()); });
  await page.route('**/src/main.ts*', async route => { const response=await route.fetch(); await route.fulfill({ response, body:instrumentation+await response.text() }); });
  await page.addInitScript(value => localStorage.setItem('lisiere.save.v1', value), fixture);
  await page.goto('http://127.0.0.1:5173/?e2e&size=250&seed=42');
  await page.waitForFunction(() => !!window.__lisiere && !!window.__diningBench.view);
  await page.locator('[data-speed="0"]').click();
  await page.locator('[data-panel="menu"]').click(); await page.locator('#load').click();
  report.backend = await page.evaluate(() => window.__lisiere.backend);
  report.adapter = await page.evaluate(async () => { const a=await navigator.gpu.requestAdapter(); return { vendor:a.info.vendor, architecture:a.info.architecture, device:a.info.device, description:a.info.description }; });
  if(report.backend!=='WebGPU') throw new Error('WebGPU required for this audit');
  for(const name of ['paused','active-6x']) {
    if(name==='active-6x') await page.locator('[data-speed="6"]').click();
    const measured = await page.evaluate(() => new Promise(resolve => {
      Object.assign(window.__diningBench,{warm:60,active:false,complete:resolve});
    }));
    report.phases.push({ name, frameCpuMs:stats(measured.frames.map(f=>f.cpu)), frameIntervalsMs:stats(measured.frames.flatMap(f=>f.interval===null?[]:[f.interval])), snapshotCpuMs:stats(measured.snapshots), domCpuMs:stats(measured.dom), longTasks:measured.longTasks, slowFrames:measured.slowFrames, drawCalls:stats(measured.frames.map(f=>f.calls)), triangles:stats(measured.frames.map(f=>f.triangles)), observed:measured.observed,fpsText:measured.fpsText });
  }
  await page.locator('[data-speed="0"]').click();
  report.outcome = await page.evaluate(() => { const w=window.__lisiere.world; return { tick:w.tick,food:w.stock.food, sleep:w.pawns.filter(p=>p.state==='sleeping').length, withoutTable:w.pawns.filter(p=>p.memories.length).length }; });
  if(report.errors.length || report.outcome.food!==0 || report.outcome.sleep!==100 || report.outcome.withoutTable!==0) throw new Error(JSON.stringify(report));
} finally { await browser.close(); }
await writeFile(`artifacts/dining-render-${variant}.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
