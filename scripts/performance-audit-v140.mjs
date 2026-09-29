import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import os from 'node:os';

/**
 * Paired, native-browser performance audit. Run this unchanged against two
 * separately served revisions, always with the same PERF_WORLD file. Each
 * phase reloads that file and fixes the complete camera pose before warmup.
 * This is a diagnostic harness: no source file or saved world is edited.
 */
const usage = `Usage: node scripts/performance-audit-v140.mjs [label] [--dry-run]

Start a Vite server for the revision under test, then set:
  PERF_ORIGIN       Vite URL (default http://127.0.0.1:5173)
  PERF_WORLD        Common save (default public/test-saves/v98/mixed-100.json)
  PERF_SCENES       Comma list: iso-near,iso-wide,perspective-low,iso-labels
  PERF_SPEEDS       Comma list of 0,1,3,6 (default 0,6)
  PERF_SECONDS      Measured seconds per phase (default 8)
  PERF_WARMUP       Warmup seconds per phase (default 5)
  PERF_GPU          1 enables a separate timestamp-instrumented run
  PERF_SHADOWS      on/off (default on)
  PERF_SHADOW_CACHE on/off (default on; V140 paused-map optimization)
  PERF_CLOUDS       on/off (default on)
  PERF_PRECIP       on/off (default on)
  PERF_WEATHER      Optional prepared weather imposed in memory on PERF_WORLD
                    (clear,fog,rain,dry-thunderstorm,rainy-thunderstorm,
                    foggy-rain,snow-gentle,snow-hard)
  PERF_LABELS       on/off (default on)
  PERF_TEXTURES     on/off (default on)
  PERF_GRASS        on/off (default on)
  PERF_WIND         on/off for tree and tuft vertex deformation (default on)
  PERF_OUTPUT       Report path (default tmp/performance-audit-v140-LABEL.json)

Use --dry-run to validate settings and the save without starting Chromium.
Run A-B-B-A sequentially; GPU timestamps are diagnostic and should be sampled
in separate runs from the ordinary RAF/CPU comparison.`;

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(usage);
  process.exit(0);
}

const label = process.argv.slice(2).find(arg => !arg.startsWith('--')) ?? process.env.PERF_LABEL ?? 'current';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Label must use lowercase letters, digits and hyphens.');
const origin = new URL(process.env.PERF_ORIGIN ?? 'http://127.0.0.1:5173');
if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('PERF_ORIGIN must be HTTP(S).');
const savePath = resolve(process.env.PERF_WORLD ?? 'public/test-saves/v98/mixed-100.json');
const output = resolve(process.env.PERF_OUTPUT ?? `tmp/performance-audit-v140-${label}.json`);
const numberSetting = (name, fallback, min, max) => {
  const value = process.env[name] === undefined ? fallback : Number(process.env[name]);
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${name} must be between ${min} and ${max}.`);
  return value;
};
const toggle = (name, fallback = true) => {
  const value = process.env[name];
  if (value === undefined) return fallback;
  if (value === 'on' || value === '1') return true;
  if (value === 'off' || value === '0') return false;
  throw new Error(`${name} must be on/off or 1/0.`);
};
const scenes = (process.env.PERF_SCENES ?? process.env.PERF_SCENE ?? 'iso-near,iso-wide,perspective-low,iso-labels').split(',').map(s => s.trim());
const allowedScenes = new Set(['iso-near', 'iso-wide', 'perspective-low', 'iso-labels']);
if (!scenes.length || scenes.some(s => !allowedScenes.has(s)) || new Set(scenes).size !== scenes.length) throw new Error('Invalid or repeated PERF_SCENES.');
const speeds = (process.env.PERF_SPEEDS ?? '0,6').split(',').map(s => Number(s.trim()));
if (!speeds.length || speeds.some(s => ![0, 1, 3, 6].includes(s)) || new Set(speeds).size !== speeds.length) throw new Error('Invalid or repeated PERF_SPEEDS.');
const weatherKinds = new Set(['clear', 'fog', 'rain', 'dry-thunderstorm', 'rainy-thunderstorm', 'foggy-rain', 'snow-gentle', 'snow-hard']);
const preparedWeather = process.env.PERF_WEATHER ?? null;
if (preparedWeather !== null && !weatherKinds.has(preparedWeather)) throw new Error('PERF_WEATHER must be one of the eight Core weather kinds.');
const config = {
  label,
  origin: origin.href,
  savePath,
  output,
  scenes,
  speeds,
  measuredSeconds: numberSetting('PERF_SECONDS', 8, 0.1, 120),
  warmupSeconds: numberSetting('PERF_WARMUP', 5, 0, 120),
  gpuRequested: toggle('PERF_GPU', false),
  shadows: toggle('PERF_SHADOWS'),
  shadowCache: toggle('PERF_SHADOW_CACHE'),
  clouds: toggle('PERF_CLOUDS'),
  precip: toggle('PERF_PRECIP'),
  preparedWeather,
  labels: toggle('PERF_LABELS'),
  textures: toggle('PERF_TEXTURES'),
  grass: toggle('PERF_GRASS'),
  wind: toggle('PERF_WIND'),
};

const stored = await readFile(savePath, 'utf8');
const parsed = JSON.parse(stored);
const saved = parsed?.format === 'lisiere-save' && parsed.codec === 'gzip-base64'
  ? gunzipSync(Buffer.from(parsed.payload, 'base64')).toString('utf8') : stored;
const save = JSON.parse(saved);
if (!Number.isSafeInteger(save.tick) || !Number.isSafeInteger(save.width) || !Array.isArray(save.pawns)) throw new Error('PERF_WORLD is not a Lisière world save.');
if (preparedWeather !== null) {
  if (!save.weather || save.weather.revision !== 1) throw new Error('PERF_WEATHER requires an existing revision-1 weather state in PERF_WORLD.');
  save.weather.current = save.weather.previous = preparedWeather;
  save.weather.ageCore = 0;
  save.weather.durationCore = preparedWeather.includes('thunderstorm') ? 20_000 : 40_000;
}
const loadedSave = preparedWeather === null ? saved : JSON.stringify(save);
const fixture = {
  path: savePath,
  sha256: createHash('sha256').update(stored).digest('hex'),
  worldSha256: createHash('sha256').update(saved).digest('hex'),
  loadedWorldSha256: createHash('sha256').update(loadedSave).digest('hex'),
  preparedWeather: preparedWeather === null ? null : { kind: preparedWeather, imposedInMemory: true, naturalOccurrence: false },
  schemaVersion: save.schemaVersion,
  tick: save.tick,
  width: save.width,
  height: save.height,
  pawns: save.pawns.length,
  animals: save.wildlife?.animals?.length ?? 0,
  resources: save.resources?.length ?? 0,
  piles: save.piles?.length ?? 0,
};
if (process.argv.includes('--dry-run')) {
  console.log(JSON.stringify({ config, fixture }, null, 2));
  process.exit(0);
}

const summarize = values => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const at = p => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
  return { n: sorted.length, mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    p50: at(.5), p95: at(.95), p99: at(.99), max: sorted.at(-1) };
};

// Vite serves main.ts as a module. Import bindings are available to the prefix
// because module imports are initialized before its statements execute.
const prefix = `
window.__performanceAudit = {view:null,client:null,active:false,lastRaf:null,frames:[],workerMs:[],decodeMs:[],snapshotMs:[],gpuMs:[],gpuError:null,gpuRunning:false};
const audit = window.__performanceAudit;
const auditOriginalFrame = ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame = function(now) {
  audit.view = this;
  const started = performance.now();
  const result = auditOriginalFrame.call(this, now);
  if (audit.active && !this.preparing) {
    audit.frames.push({intervalMs:audit.lastRaf===null?null:now-audit.lastRaf,
      cpuMs:performance.now()-started,drawCalls:this.stats.drawCalls,triangles:this.stats.triangles});
    audit.lastRaf = now;
  }
  return result;
};
`;
const suffix = `
audit.client = client;
const auditOriginalSnapshot = client.onSnapshot;
client.onSnapshot = function(...args) {
  const started = performance.now();
  if (audit.active && Number.isFinite(args[1])) audit.workerMs.push(args[1]);
  try { return auditOriginalSnapshot.apply(this,args); }
  finally { if (audit.active) audit.snapshotMs.push(performance.now()-started); }
};
const auditOriginalAdopt = client.snapshots.adopt;
client.snapshots.adopt = function(...args) {
  const started = performance.now();
  try { return auditOriginalAdopt.apply(this,args); }
  finally { if (audit.active) audit.decodeMs.push(performance.now()-started); }
};
`;

const report = {
  date: new Date().toISOString(), config, fixture,
  host: { cpu: os.cpus()[0]?.model ?? 'unknown', node: process.version, platform: process.platform },
  protocol: 'Each phase reloads the identical raw save, fixes camera pose and toggles, warms up, then measures for a fixed wall-time window. Native Chromium/WebGPU, 1920x1080, DPR 1. RAF is display paced; frame CPU includes JS and render submission, not GPU execution. Worker stepMs is simulation time per tick reported in snapshots, not total worker cost. GPU timestamps require a separate instrumented run. Three draw/triangle counters can omit retained bundle replay.',
  browser: null, adapter: null, gpuTimestampSupported: null, phases: [], errors: [],
};

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('@playwright/test');
const browser = await chromium.launch({ channel: 'chromium', headless: false });
let failure;
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(60_000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' || /GPUValidationError|device.*lost|invalid pipeline/i.test(message.text())) report.errors.push(message.text());
  });
  await page.addInitScript(({ textures, grass }) => {
    localStorage.setItem('lisiere.presentation.textures.v1', String(textures));
    localStorage.setItem('lisiere.presentation.ground-grass.v1', String(grass));
  }, { textures: config.textures, grass: config.grass });
  if (config.gpuRequested) await page.route('**/src/render/ColonyRenderer.ts*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    const changed = source.replace(/powerPreference:\s*['"]high-performance['"]/, '$&, trackTimestamp: true');
    if (changed === source) throw new Error('GPU timestamp instrumentation did not match ColonyRenderer.ts.');
    await route.fulfill({ response, body: changed });
  });
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: prefix + await response.text() + suffix });
  });
  await page.goto(new URL('/?scenario=camp&e2e&size=32&seed=42', origin).href);
  await page.waitForFunction(() => window.__performanceAudit?.view?.world && window.__performanceAudit?.client && !document.querySelector('.game-shell')?.inert,
    undefined, { timeout: 90_000 });
  await page.evaluate(() => window.__performanceAudit.client.setSpeed(0));
  const runtime = await page.evaluate(options => {
    const audit = window.__performanceAudit, view = audit.view;
    if (view.backend !== 'WebGPU') throw new Error(`Expected hardware WebGPU, received ${view.backend}.`);
    const device = view.renderer.getContext().getConfiguration()?.device;
    const info = device?.adapterInfo;
    const originalClouds = view.clouds?.present;
    if (originalClouds) view.clouds.present = function(...args) {
      if (options.clouds) return originalClouds.apply(this, args);
      this.mesh.visible = false;
    };
    const originalPrecipitation = view.precipitation?.present;
    if (originalPrecipitation) view.precipitation.present = function(...args) {
      if (options.precip) return originalPrecipitation.apply(this, args);
      this.geometry.instanceCount = 0;
      this.mesh.visible = false;
    };
    const originalLabels = view.mapLabels?.draw;
    if (originalLabels) view.mapLabels.draw = function(...args) {
      if (options.labels) return originalLabels.apply(this, args);
      this.canvas.hidden = true;
    };
    if (!options.shadows) {
      view.renderer.shadowMap.enabled = false;
      view.daylight.light.castShadow = false;
      if (view.daylight.fitShadow) view.daylight.fitShadow = () => {};
    }
    if (!options.shadowCache && view.pausedShadow)
      view.pausedShadow.canReuse = () => false;
    let swappedTrees = 0;
    if (!options.wind) {
      const staticTrees = () => view.resources.group.traverse(object => {
        if (object.isMesh && object.geometry?.hasAttribute?.('windRoot')) {
          object.material = view.resources.texturesEnabled ? view.resources.texturedMaterial : view.resources.staticMaterial;
          swappedTrees++;
        }
      });
      const treeUpdate = view.resources.update;
      view.resources.update = function(...args) { const result = treeUpdate.apply(this,args); staticTrees(); return result; };
      staticTrees();
      const staticTufts = () => {
        if (view.plants.mesh) view.plants.mesh.material = view.plants.texturesEnabled ? view.plants.texturedMaterial : view.plants.plainMaterial;
      };
      const plantUpdate = view.plants.update;
      view.plants.update = function(...args) { const result = plantUpdate.apply(this,args); staticTufts(); return result; };
      staticTufts();
    }
    return { backend:view.backend, userAgent:navigator.userAgent, dpr:window.devicePixelRatio,
      adapter:info ? {vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description} : null,
      gpuTimestampSupported:!!device?.features?.has('timestamp-query'),
      layers:{clouds:!!originalClouds,precipitation:!!originalPrecipitation,labels:!!originalLabels,shadows:!!view.daylight.light.shadow,
        windMaterialReplacements:swappedTrees,tuftWindDisabled:!options.wind&&view.plants.mesh.material===view.plants.texturedMaterial} };
  }, { shadows: config.shadows, shadowCache: config.shadowCache,
    clouds: config.clouds, precip: config.precip, labels: config.labels, wind: config.wind });
  report.browser = { userAgent: runtime.userAgent, dpr: runtime.dpr, backend: runtime.backend };
  report.adapter = runtime.adapter;
  report.gpuTimestampSupported = runtime.gpuTimestampSupported;
  report.availableLayers = runtime.layers;
  if (config.gpuRequested && runtime.gpuTimestampSupported) await page.evaluate(() => {
    const audit = window.__performanceAudit;
    audit.gpuRunning = true;
    const sample = async () => {
      if (!audit.gpuRunning) return;
      try {
        const value = await audit.view.renderer.resolveTimestampsAsync();
        if (audit.active && Number.isFinite(value)) audit.gpuMs.push(value);
      } catch (error) { audit.gpuError = String(error); audit.gpuRunning = false; return; }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

  for (const scene of config.scenes) for (const speed of config.speeds) {
    await page.evaluate(data => window.__performanceAudit.client.load(data), loadedSave);
    const prepared = await page.evaluate(sceneName => {
      const audit = window.__performanceAudit, view = audit.view, world = view.world;
      const rig = view.rig, controls = view.controls;
      const first = world.pawns[0];
      if (!first) throw new Error('The loaded world has no pawn to anchor the close camera.');
      const anchor = { id:first.id, x:first.x, z:first.z };
      const target = sceneName === 'iso-wide'
        ? {x:(world.width-1)/2,z:(world.height-1)/2} : {x:first.x,z:first.z};
      const mode = sceneName === 'perspective-low' ? 'perspective' : 'orthographic';
      rig.setMode(mode);
      controls.enableDamping = false;
      controls.target.set(target.x,0,target.z);
      const camera = view.camera;
      if (mode === 'perspective') {
        camera.position.set(target.x+32,9,target.z+28);
        camera.zoom = 1;
      } else {
        const length = Math.hypot(world.width,world.height)+14;
        const scale = length/Math.hypot(.85,2,.9);
        camera.position.set(target.x+.85*scale,2*scale,target.z+.9*scale);
        // A numeric wide zoom keeps the projection identical between revisions,
        // even if CameraRig changes its navigation limit.
        camera.zoom = sceneName === 'iso-near' ? 2 : sceneName === 'iso-labels' ? 4 : 0.1;
      }
      camera.updateProjectionMatrix();
      controls.update();
      camera.updateMatrixWorld();
      return {anchor,target,mode};
    }, scene);
    // Let view-dependent bundles, shadows, cloud pipeline and labels settle.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (config.warmupSeconds) await page.waitForTimeout(config.warmupSeconds * 1000);
    const started = await page.evaluate(async speedValue => {
      const audit = window.__performanceAudit, view = audit.view;
      await audit.client.setSpeed(speedValue);
      const world = view.received?.world ?? view.world;
      const camera = view.camera;
      const context = () => ({tick:world.tick,schemaVersion:world.schemaVersion,width:world.width,height:world.height,
        pawns:world.pawns.length,animals:world.wildlife?.animals?.length??0,
        resources:world.resources.length,piles:world.piles.length,jobs:world.jobs.length,
        weather:world.weather?{current:world.weather.current,previous:world.weather.previous,ageCore:world.weather.ageCore}:null,
        camera:{mode:view.rig.mode,position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),
          target:view.controls.target.toArray(),zoom:camera.zoom,near:camera.near,far:camera.far,
          span:view.rig.span,pixelsPerCell:view.rig.pixelsPerCell(view.host.clientHeight),overview:view.overview.group.visible},
        presentation:{shadows:view.renderer.shadowMap.enabled,
          shadowAutoUpdate:view.daylight.light.shadow.autoUpdate,
          shadowNeedsUpdate:view.daylight.light.shadow.needsUpdate,
          clouds:view.clouds?.mesh.visible??false,
          precipitation:view.precipitation?.mesh.visible??false,
          precipitationInstances:view.precipitation?.geometry.instanceCount??0,
          labels:view.mapLabels?.canvas?.hidden===false,grass:view.grass?.mesh.visible??false,
          windStaticMeshes:(()=>{let count=0;view.resources.group.traverse(object=>{
            if(object.isMesh&&object.geometry?.hasAttribute?.('windRoot')&&
              (object.material===view.resources.staticMaterial||object.material===view.resources.texturedMaterial))count++;
          });return count;})()}});
      Object.assign(audit,{active:true,lastRaf:null,frames:[],workerMs:[],decodeMs:[],snapshotMs:[],gpuMs:[]});
      return {time:performance.now(),state:context()};
    }, speed);
    await page.waitForTimeout(config.measuredSeconds * 1000);
    const ended = await page.evaluate(async () => {
      const audit = window.__performanceAudit, view = audit.view;
      audit.active = false;
      const time = performance.now(), endWorld = view.received?.world ?? view.world;
      const end = {tick:endWorld.tick,weather:endWorld.weather?endWorld.weather.current:null};
      await audit.client.setSpeed(0);
      return {time,end,frames:audit.frames,workerMs:audit.workerMs,decodeMs:audit.decodeMs,
        snapshotMs:audit.snapshotMs,gpuMs:audit.gpuMs,gpuError:audit.gpuError};
    });
    const elapsedMs = ended.time - started.time;
    const ticks = ended.end.tick - started.state.tick;
    const intervals = ended.frames.map(frame => frame.intervalMs).filter(Number.isFinite);
    const phase = {scene,speed,prepared,start:started.state,end:ended.end,elapsedMs,ticks,
      achievedSpeed:speed ? ticks/(6*elapsedMs/1000) : 0,
      rafMs:summarize(intervals),rafFps:intervals.length ? 1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length) : null,
      frameCpuMs:summarize(ended.frames.map(frame => frame.cpuMs)),workerStepMs:summarize(ended.workerMs),
      snapshotCallbackMs:summarize(ended.snapshotMs),decodeMs:summarize(ended.decodeMs),
      gpuMs:config.gpuRequested ? summarize(ended.gpuMs) : null,gpuError:ended.gpuError,
      encodedDrawCalls:summarize(ended.frames.map(frame => frame.drawCalls)),
      encodedTriangles:summarize(ended.frames.map(frame => frame.triangles))};
    report.phases.push(phase);
    console.log(JSON.stringify({label,scene,speed,rafP95:phase.rafMs?.p95,frameCpuP95:phase.frameCpuMs?.p95,
      gpuP95:phase.gpuMs?.p95,workerStepP95:phase.workerStepMs?.p95,achievedSpeed:phase.achievedSpeed}));
  }
  await page.evaluate(() => { window.__performanceAudit.gpuRunning = false; });
} catch (error) {
  failure = error;
  report.errors.push(error instanceof Error ? error.stack ?? error.message : String(error));
} finally {
  await browser.close();
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
}
if (failure) throw failure;
if (report.errors.length) throw new Error(`Browser/GPU errors; see ${output}`);
console.log(`Wrote ${output}`);
