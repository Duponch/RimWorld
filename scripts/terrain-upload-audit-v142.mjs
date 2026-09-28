import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

/**
 * Native Chromium/WebGPU A-B-B-A probe of a one-cell terrain edit on the
 * resident paint atlas. No renderer source or saved world is modified.
 *
 * Start the app first: npm run dev -- --port 5173
 * Then: node scripts/terrain-upload-audit-v142.mjs
 *
 * PERF_ORIGIN: Vite origin (default http://127.0.0.1:5173)
 * PERF_WORLD: save path (default public/test-saves/v98/mixed-100.json)
 * PERF_OUTPUT: JSON report (default tmp/terrain-upload-audit-v142.json)
 * PERF_BLOCKS: A-B-B-A repetitions (default 5)
 * PLAYWRIGHT_BROWSERS_PATH: browser install (default .playwright)
 *
 * The full-upload arm sets ColonyRenderer.terrainPaintResident=false before
 * applyWorld, forcing its existing fallback. The copy arm uses the normal
 * resident-atlas path. This is runtime instrumentation, not a source change.
 */
const usage = `Start Vite with npm run dev -- --port 5173, then run
  node scripts/terrain-upload-audit-v142.mjs [--dry-run]
Environment: PERF_ORIGIN, PERF_WORLD, PERF_OUTPUT, PERF_BLOCKS,
PLAYWRIGHT_BROWSERS_PATH. The browser is visible so hardware WebGPU is used.`;
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(usage);
  process.exit(0);
}
const origin = new URL(process.env.PERF_ORIGIN ?? 'http://127.0.0.1:5173');
if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('PERF_ORIGIN must be HTTP(S).');
const savePath = resolve(process.env.PERF_WORLD ?? 'public/test-saves/v98/mixed-100.json');
const output = resolve(process.env.PERF_OUTPUT ?? 'tmp/terrain-upload-audit-v142.json');
const blocks = Number(process.env.PERF_BLOCKS ?? 5);
if (!Number.isSafeInteger(blocks) || blocks < 1 || blocks > 50) throw new Error('PERF_BLOCKS must be an integer from 1 to 50.');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const stored = await readFile(savePath, 'utf8');
const packed = JSON.parse(stored);
const save = packed.codec === 'gzip-base64'
  ? gunzipSync(Buffer.from(packed.payload, 'base64')).toString('utf8')
  : stored;
const worldSave = JSON.parse(save);
if (!Number.isSafeInteger(worldSave.width) || !Number.isSafeInteger(worldSave.height) ||
    !Number.isSafeInteger(worldSave.tick) || !Array.isArray(worldSave.tiles) || !Array.isArray(worldSave.pawns))
  throw new Error('PERF_WORLD is not a Lisière world save.');
const fixture = {
  path: savePath, sha256: createHash('sha256').update(stored).digest('hex'),
  width: worldSave.width, height: worldSave.height, tick: worldSave.tick,
  pawns: worldSave.pawns.length, schemaVersion: worldSave.schemaVersion,
};
const config = { origin: origin.href, output, blocks, browserPath: process.env.PLAYWRIGHT_BROWSERS_PATH };
if (process.argv.includes('--dry-run')) {
  console.log(JSON.stringify({ config, fixture }, null, 2));
  process.exit(0);
}
const { chromium } = await import('@playwright/test');
const report = { date: new Date().toISOString(), config, fixture,
  protocol: 'Same save and fixed camera, paused WebGPU at 1920x1080/DPR1 with shadows disabled. A-B-B-A: normal resident atlas copy versus forced full upload by clearing terrainPaintResident before applyWorld. writeTexture CPU time is its synchronous JavaScript call; queue wait also includes rendering and mipmap work, not a pure GPU timestamp.',
  browser: null, adapter: null, summary: null, results: [], errors: [] };
const browser = await chromium.launch({ channel: 'chromium', headless: false });
let failure;
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => report.errors.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error' || /GPUValidationError|invalid pipeline/i.test(message.text())) report.errors.push(message.text());
  });
  await page.addInitScript(() => {
    localStorage.setItem('lisiere.presentation.textures.v1', 'true');
    localStorage.setItem('lisiere.presentation.ground-grass.v1', 'false');
  });
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    const body = await response.text();
    await route.fulfill({ response, body: `window.__terrainProbe={view:null,client:null,frames:[]};
const probeOriginalFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){window.__terrainProbe.view=this;const start=performance.now();const result=probeOriginalFrame.call(this,now);window.__terrainProbe.frames.push(performance.now()-start);return result;};
${body}
window.__terrainProbe.client=client;` });
  });
  await page.goto(new URL('/?scenario=camp&e2e&size=32&seed=42', origin).href);
  await page.waitForFunction(() => window.__terrainProbe?.view?.world && window.__terrainProbe?.client && !document.querySelector('.game-shell')?.inert);
  await page.evaluate(() => window.__terrainProbe.client.setSpeed(0));
  await page.evaluate(data => window.__terrainProbe.client.load(data), save);
  await page.waitForFunction(({width,height,tick}) => {
    const view=window.__terrainProbe?.view;
    return view?.world?.width===width&&view.world.height===height&&view.world.tick===tick&&!view.preparing;
  }, fixture);
  await page.evaluate(async () => {
    const p=window.__terrainProbe,v=p.view,w=v.world;
    await p.client.setSpeed(0);
    if(v.backend!=='WebGPU')throw new Error(`Expected hardware WebGPU, got ${v.backend}`);
    v.controls.enableDamping=false;
    const anchor=w.pawns[0];
    if(!anchor)throw new Error('The save has no pawn for the close camera.');
    v.rig.setMode('orthographic');
    v.controls.target.set(anchor.x,0,anchor.z);
    const scale=(Math.hypot(w.width,w.height)+14)/Math.hypot(.85,2,.9);
    v.camera.position.set(anchor.x+.85*scale,2*scale,anchor.z+.9*scale);
    v.camera.zoom=2;v.camera.updateProjectionMatrix();v.controls.update();v.camera.updateMatrixWorld();
    v.renderer.shadowMap.enabled=false;v.daylight.light.castShadow=false;
    const device=v.renderer.getContext().getConfiguration().device;
    if(!device?.queue)throw new Error('WebGPU device queue is unavailable.');
    p.device=device;
    p.adapter=device.adapterInfo?{vendor:device.adapterInfo.vendor,architecture:device.adapterInfo.architecture,
      device:device.adapterInfo.device,description:device.adapterInfo.description}:null;
    p.atlasWidth=v.terrainPaintTexture.image.width;
    p.atlasHeight=v.terrainPaintTexture.image.height;
    p.stagingWidth=v.terrainPaintStaging.image.width;
    p.stagingHeight=v.terrainPaintStaging.image.height;
    if(p.atlasWidth<=p.stagingWidth||p.atlasHeight<=p.stagingHeight)
      throw new Error('The save is too small to distinguish staging and atlas writes.');
    p.writes=[];p.copies=[];
    const original=device.queue.writeTexture.bind(device.queue);
    device.queue.writeTexture=function(destination,data,layout,extent){
      const start=performance.now();
      const result=original(destination,data,layout,extent);
      const duration=performance.now()-start;
      const width=extent.width??extent[0],height=extent.height??extent[1];
      const atlas=width===p.atlasWidth&&height===p.atlasHeight;
      const staging=width===p.stagingWidth&&height===p.stagingHeight;
      if(atlas||staging)p.writes.push({bytes:data.byteLength,width,height,kind:atlas?'atlas':'staging',ms:duration});
      return result;
    };
    const copy=v.renderer.copyTextureToTexture.bind(v.renderer);
    v.renderer.copyTextureToTexture=function(...args){
      const start=performance.now();const result=copy(...args);
      p.copies.push({ms:performance.now()-start,width:args[2]?.max?.x-args[2]?.min?.x,
        height:args[2]?.max?.y-args[2]?.min?.y});
      return result;
    };
    const z0=Math.floor(w.height*.4),z1=Math.ceil(w.height*.6);
    p.index=w.tiles.findIndex((tile,i)=>i>=z0*w.width&&i<z1*w.width&&tile.terrain==='grass');
    if(p.index<0)throw new Error('No suitable grass tile');
    p.kind='soil';
  });
  await page.waitForTimeout(2500);
  const results=[];
  report.results=results;
  for (let block=0; block<blocks; block++) {
    for (const mode of ['copy','full','full','copy']) {
      const result=await page.evaluate(async mode => {
        const p=window.__terrainProbe,v=p.view,texture=v.terrainPaintMaterial.map;
        const world={...v.world,tiles:v.world.tiles.slice()};
        world.tiles[p.index]={...world.tiles[p.index],terrain:p.kind};
        p.kind=p.kind==='soil'?'grass':'soil';
        const writesStart=p.writes.length,copiesStart=p.copies.length,framesStart=p.frames.length;
        if(mode==='copy'&&!v.terrainPaintResident)throw new Error('Atlas is not resident before the normal copy arm.');
        if(mode==='full')v.terrainPaintResident=false;
        const start=performance.now();
        v.applyWorld(world);
        const applyWorldCpuMs=performance.now()-start;
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const frameWallMs=performance.now()-start;
        const queueStart=performance.now();
        await p.device.queue.onSubmittedWorkDone();
        const queueWaitMs=performance.now()-queueStart;
        return {mode,applyWorldCpuMs,frameWallMs,queueWaitMs,
          writes:p.writes.slice(writesStart),copies:p.copies.slice(copiesStart),
          frameCpuMs:p.frames.slice(framesStart,framesStart+2),textureVersion:texture.version,
          atlasResident:v.terrainPaintResident};
      },mode);
      results.push(result);
      if(mode==='copy'&&(result.writes.length!==1||result.writes[0].kind!=='staging'||result.copies.length!==1))
        throw new Error('Copy arm did not use one staging write and one texture copy.');
      if(mode==='full'&&(result.writes.length!==1||result.writes[0].kind!=='atlas'||result.copies.length!==0))
        throw new Error('Full arm did not use one complete atlas write.');
      await page.waitForTimeout(150);
    }
  }
  const median=values=>{
    const sorted=[...values].filter(Number.isFinite).sort((a,b)=>a-b);
    if(!sorted.length)return null;
    const middle=Math.floor(sorted.length/2);
    return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
  };
  const summary=Object.fromEntries(['copy','full'].map(mode=>{
    const group=results.filter(result=>result.mode===mode);
    return [mode,{n:group.length,applyWorldCpuMedianMs:median(group.map(r=>r.applyWorldCpuMs)),
      firstFrameCpuMedianMs:median(group.map(r=>r.frameCpuMs[0])),
      queueWaitMedianMs:median(group.map(r=>r.queueWaitMs)),
      writeTextureCount:group.reduce((sum,r)=>sum+r.writes.length,0),
      writeTextureBytes:group.reduce((sum,r)=>sum+r.writes.reduce((n,w)=>n+w.bytes,0),0),
      writeTextureCpuMedianMs:median(group.map(r=>r.writes[0].ms)),
      copyTextureCount:group.reduce((sum,r)=>sum+r.copies.length,0),
      copyTextureCpuMedianMs:mode==='copy'?median(group.map(r=>r.copies[0].ms)):null}];
  }));
  report.browser=await page.evaluate(()=>({backend:window.__terrainProbe.view.backend,
    userAgent:navigator.userAgent,dpr:window.devicePixelRatio}));
  report.adapter=await page.evaluate(()=>window.__terrainProbe.adapter);
  report.summary=summary;
} catch(error) {
  failure=error;
  report.errors.push(error instanceof Error?error.stack??error.message:String(error));
} finally {
  await browser.close();
  await mkdir(dirname(output),{recursive:true});
  await writeFile(output,`${JSON.stringify(report,null,2)}\n`);
}
if(failure)throw failure;
if(report.errors.length)throw new Error(`Browser/GPU errors; see ${output}`);
console.log(JSON.stringify({output,fixture:report.fixture,summary:report.summary,errors:report.errors.length},null,2));
