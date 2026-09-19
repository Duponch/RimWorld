import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('@playwright/test');
const base = process.argv[2] ?? 'http://127.0.0.1:5173';
const label = process.argv[3] ?? 'current';
const sizes = (process.argv[4] ?? '64,128,250').split(',').map(Number);
const durationMs = Number(process.env.MAP_BENCH_DURATION_MS ?? 6000);
const report = { timestamp: new Date().toISOString(), label, base, viewport: { width: 1440, height: 1000 }, seed: 42,
  durationMs, minimumFrames:240, warmupFrames:60,
  baselinePatch: label.startsWith('baseline') ? 'Commit 5a27d9e in tmp/map-baseline: only main and worker size whitelists append 250; generation maximum 128 becomes 250. Benchmark aligns camera position/near/far to final renderer for equal visible geometry; gameplay/density/render techniques unchanged.' : null,
  protocol: 'Normal headless Chromium, one canvas; local paused, local active 6x with one chop, overview paused, overview circle inside map. CPU frame includes render submission, not GPU execution; RAF intervals include scheduling. 60 warmup frames per view; at least 240 timed frames and 6 seconds. Cold view transition measured separately. Main.ts diagnostic injection only; no world getter polled during timing.', results: [] };
const browser = await chromium.launch({ headless: true, channel: 'chromium' });
const instrumentation = `
const BenchRenderer = ColonyRenderer;
window.__mapBench = { view: null, recording: false, frames: [], intervals: [], snapshots: [], resources: [], terrain: [], previous: null, frameTicks:0, travel:null, deadline:0, duration:0 };
for (const method of ['frame', 'setWorld', 'buildResources', 'updateResources', 'buildTerrain']) {
  const original = BenchRenderer.prototype[method];
  if (!original) continue;
  BenchRenderer.prototype[method] = function (...args) {
    const bench = window.__mapBench; bench.view = this;
    if (method === 'frame' && bench.travel) {
      const travel=bench.travel, angle=(performance.now()-travel.start)/travel.duration*Math.PI*2;
      const x=(travel.size-1)/2+travel.size*.35*Math.sin(angle),z=(travel.size-1)/2+travel.size*.35*Math.cos(angle);
      this.camera.position.x+=x-this.controls.target.x; this.camera.position.z+=z-this.controls.target.z;
      this.controls.target.x=x; this.controls.target.z=z;
    }
    const before = performance.now();
    const result = original.apply(this, args), elapsed = performance.now() - before;
    if (method === 'buildTerrain') bench.terrain.push(elapsed);
    if (method === 'buildResources' || method === 'updateResources') bench.resources.push(elapsed);
    if (bench.recording && method === 'setWorld') bench.snapshots.push(elapsed);
    if (method === 'frame') bench.frameTicks++;
    if (method === 'frame' && bench.recording) {
      bench.frames.push({ cpu: elapsed, calls: this.stats.drawCalls, triangles: this.stats.triangles });
      if (bench.previous !== null) bench.intervals.push(args[0] - bench.previous);
      bench.previous = args[0];
      if (performance.now() >= bench.deadline && bench.frames.length >= 240) { bench.recording=false; bench.duration=performance.now()-bench.started; }
    }
    return result;
  };
}
`;
const quantiles = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b) => a-b);
  const q = p => +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length*p))].toFixed(3);
  return { count: sorted.length, p50: q(.5), p95: q(.95), p99: q(.99), max: q(1), mean: +(sorted.reduce((a,b) => a+b,0)/sorted.length).toFixed(3) };
};
async function phase(page, name, travelSize = 0) {
  console.log(`Phase ${name}`);
  const transitionStart = performance.now();
  const target = await page.evaluate(size => {
    const b=window.__mapBench;
    b.travel=size ? { size,start:performance.now(),duration:6000 } : null;
    return b.frameTicks+60;
  },travelSize);
  await page.waitForFunction(target => window.__mapBench.frameTicks>=target,target,{timeout:120000,polling:250});
  const warmupMs=performance.now()-transitionStart;
  await page.evaluate(duration => {
    // Never return the diagnostic object: it owns the renderer, and serializing
    // its entire scene through CDP would itself insert a map-sized long task.
    Object.assign(window.__mapBench, { recording: true, started:performance.now(), deadline:performance.now()+duration, frames: [], intervals: [], snapshots: [], previous: null });
  },durationMs);
  await page.waitForFunction(() => !window.__mapBench.recording,undefined,{timeout:120000,polling:250});
  const data = await page.evaluate(() => {
    const b = window.__mapBench; b.recording = false; b.travel=null;
    return { frames: b.frames, intervals: b.intervals, snapshots: b.snapshots,
      camera: { x:b.view.controls.target.x,z:b.view.controls.target.z,zoom:b.view.camera.zoom,far:b.view.camera.far },
      memory: b.view.renderer.info.memory, resourceUpdatesMs: b.resources.slice(1), actualDurationMs:b.duration };
  });
  return { name, warmupMs:+warmupMs.toFixed(1),actualDurationMs:+data.actualDurationMs.toFixed(1), renderCpuMs: quantiles(data.frames.map(x => x.cpu)), frameIntervalsMs: quantiles(data.intervals),
    framesOver33ms: data.intervals.filter(x => x>33.4).length, framesOver50ms: data.intervals.filter(x => x>50).length,
    drawCalls: quantiles(data.frames.map(x => x.calls)), triangles: quantiles(data.frames.map(x => x.triangles)), snapshotCpuMs:quantiles(data.snapshots),
    resourceUpdatesMs:data.resourceUpdatesMs, camera:data.camera,memory:data.memory };
}
try {
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: report.viewport });
    page.setDefaultTimeout(30000);
    const errors = [], diagnostics = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    page.on('console', message => {
      if (message.type() === 'error' || /GPUValidationError|invalid pipeline|device.*lost/i.test(message.text())) errors.push(message.text());
      if (message.text().includes('Lisière renderer diagnostics')) diagnostics.push(message.text());
    });
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: instrumentation + await response.text() });
    });
    const start = performance.now();
    console.log(`Starting ${label} ${size}`);
    await page.goto(`${base}/?scenario=camp&e2e&seed=42&size=${size}`);
    await page.waitForFunction(() => !!window.__lisiere && !!window.__mapBench?.view, undefined, { timeout: 120000 });
    const readyMs = performance.now()-start;
    console.log(`Ready ${size} in ${readyMs.toFixed(1)} ms`);
    await page.locator('[data-speed="0"]').click();
    await page.locator('#pause-banner').waitFor({ state:'visible' });
    const initial = await page.evaluate(() => {
      const world = window.__lisiere.world, b = window.__mapBench;
      return { backend:window.__lisiere.backend, width:world.width,height:world.height,resources:world.resources.length,pawns:world.pawns.length,
        terrainBuildMs:b.terrain,resourcesBuildMs:b.resources, camera:{zoom:b.view.camera.zoom, far:b.view.camera.far} };
    });
    if (initial.width !== size || initial.backend !== 'WebGPU') throw new Error(`Expected ${size}/WebGPU, got ${JSON.stringify(initial)}`);
    await page.evaluate(size => {
      const v=window.__mapBench.view, d=Math.hypot(size,size)+7;
      const offset=v.camera.position.clone().sub(v.controls.target).setLength(Math.max(32*Math.hypot(.85,2,.9),d));
      v.camera.position.copy(v.controls.target).add(offset);v.camera.far=Math.max(300,offset.length()+Math.hypot(size,size)+14);
      v.camera.updateProjectionMatrix();v.controls.update();
    },size);
    const phases = [await phase(page,'local-paused')];
    await page.locator('[data-panel="architect"]').click();
    await page.locator('[data-category="orders"]').click();
    await page.locator('[data-tool="chop"]').click();
    const point = await page.evaluate(size => window.__lisiere.projectCell(Math.floor(size/2)-2,Math.floor(size/2)-2),size);
    const bounds = await page.locator('#viewport canvas').boundingBox();
    await page.mouse.click(bounds.x+point.x,bounds.y+point.y);
    await page.locator('#architect-panel [data-close-panel]').click();
    await page.mouse.move(0,0);
    await page.locator('[data-speed="6"]').click();
    phases.push(await phase(page,'local-active-chop'));
    await page.locator('[data-speed="0"]').click();
    await page.locator('#pause-banner').waitFor({state:'visible'});
    // Same overview in both versions. This also deliberately exercises the old
    // renderer beyond its fixed minZoom; final product minZoom must allow it.
    await page.evaluate(size => {
      const v=window.__mapBench.view; v.controls.minZoom = Math.min(v.controls.minZoom, 24/size);
      v.camera.zoom = 24/size; v.camera.updateProjectionMatrix(); v.controls.update();
    },size);
    phases.push(await phase(page,'overview-paused'));
    await page.screenshot({path:`artifacts/map-${label}-${size}-overview.png`});
    phases.push(await phase(page,'overview-travel',size));
    await page.screenshot({path:`artifacts/map-${label}-${size}-edge.png`});
    let spatialChecks = null;
    if (label.startsWith('current') && size === 250) {
      spatialChecks = [];
      for (const viewport of [report.viewport, {width:600,height:900}]) {
        await page.setViewportSize(viewport);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const checks = await page.evaluate(() => {
          const v=window.__mapBench.view, size=v.world.width, center=(size-1)/2, initialOffset=v.camera.position.clone().sub(v.controls.target), result=[];
          v.controls.target.set(center,0,center);
          v.camera.zoom=v.controls.minZoom;
          for (let orientation=0;orientation<4;orientation++) {
            const angle=orientation*Math.PI/2, offset=initialOffset.clone();
            offset.x=initialOffset.x*Math.cos(angle)+initialOffset.z*Math.sin(angle);
            offset.z=initialOffset.z*Math.cos(angle)-initialOffset.x*Math.sin(angle);
            v.camera.position.copy(v.controls.target).add(offset);v.camera.updateProjectionMatrix();v.controls.update();v.camera.updateMatrixWorld();
            const corners=[[0,0],[size-1,0],[0,size-1],[size-1,size-1]].map(([x,z])=>{
              const vector=v.camera.position.clone().set(x,0,z).project(v.camera);
              const point=v.projectCell(x,z),bounds=v.renderer.domElement.getBoundingClientRect();
              const picked=v.pick(new PointerEvent('pointermove',{clientX:bounds.x+point.x,clientY:bounds.y+point.y}));
              return { x,z,clip:{x:vector.x,y:vector.y,z:vector.z},picked,visible:Math.abs(vector.x)<1&&Math.abs(vector.y)<1&&Math.abs(vector.z)<1 };
            });
            result.push({orientation,zoom:v.camera.zoom,corners});
          }
          return result;
        });
        if (checks.some(check=>check.corners.some(corner=>!corner.visible||corner.picked?.x!==corner.x||corner.picked?.z!==corner.z))) throw new Error('Overview camera clipped a corner or picked the wrong logical cell.');
        spatialChecks.push({viewport,checks});
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.screenshot({path:`artifacts/map-${label}-${size}-${viewport.width}-corners.png`});
      }
    }
    report.results.push({size,readyMs:+readyMs.toFixed(1),initial,diagnostics,phases,spatialChecks,errors});
    await page.close();
    await mkdir('artifacts',{recursive:true});
    await writeFile(`artifacts/map-render-${label}.json`,JSON.stringify(report,null,2));
    console.log(JSON.stringify(report.results.at(-1)));
    if (errors.length) process.exitCode=1;
  }
} finally { await browser.close(); }
