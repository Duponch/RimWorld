import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, posix } from 'node:path';
import { pathToFileURL } from 'node:url';

// Run A/B/B/A sequentially against frozen served sources. This replaces only
// GpuGroundGrassLayer, not the game. GPU timestamp runs remain separate.
const ref = 'fe3eb00', moduleName = 'GpuGroundGrassLayer';
if (process.env.V200_BASELINE !== undefined && !['0', '1'].includes(process.env.V200_BASELINE))
  throw new Error('V200_BASELINE must be 0 or 1.');
const baseline = process.env.V200_BASELINE === '1';
const radius = Number(process.env.V200_BLOOD_RADIUS ?? '4');
if (!Number.isInteger(radius) || radius < 0 || radius > 12) throw new Error('V200_BLOOD_RADIUS must be an integer from 0 to 12.');
if (process.env.V200_TERRAIN_GRASS !== undefined && !['0', '1'].includes(process.env.V200_TERRAIN_GRASS))
  throw new Error('V200_TERRAIN_GRASS must be 0 or 1.');
const terrainGrass = process.env.V200_TERRAIN_GRASS !== '0';
process.env.PERF_WORLD ??= 'public/test-saves/v98/mixed-100.json';
process.env.PERF_SCENES ??= 'iso-near,perspective-low';
process.env.PERF_SPEEDS ??= '0';
process.env.PERF_SECONDS ??= '4';
process.env.PERF_WARMUP ??= '3';
process.env.PERF_GRASS = 'on';
if (process.env.PERF_SPEEDS !== '0') throw new Error('V200 grass comparison requires paused identical poses.');
const folder = resolve('tmp/ui-v200/grass-baseline');
await mkdir(folder, { recursive: true });
let source = baseline ? execFileSync('git', ['show', `${ref}:src/render/${moduleName}.ts`], { encoding: 'utf8' })
  : await readFile(`src/render/${moduleName}.ts`, 'utf8');
const hash = createHash('sha256').update(source).digest('hex');
const supportingHashes = {};
let historicalModulePath;
for (const file of ['src/render/grass-blood-mask.ts', 'src/render/filth-appearance.ts', 'src/render/FilthLayer.ts', 'src/render/TerrainLayer.ts', 'src/render/ground-blood.ts', 'src/render/ColonyRenderer.ts'])
  supportingHashes[file] = createHash('sha256').update(await readFile(file)).digest('hex');
if (baseline) {
  source = source.replace(/(from\s*['"])(\.{1,2}\/[^'"]+)(['"])/g, (_all, start, file, end) => {
    const absolute = posix.normalize(posix.join('/src/render', file));
    return start + absolute + (posix.extname(absolute) ? '' : '.ts') + end;
  });
  const declaration = 'export class GpuGroundGrassLayer {';
  if (!source.includes(declaration)) throw new Error('Historical grass declaration changed.');
  source = source.replace(declaration, declaration + '\n  setTexturesEnabled(_enabled) {}\n  setTerrainPaint(_texture) {}\n');
  // tmp is deliberately ignored by the dev-server watcher. An immutable name
  // prevents serving a cached earlier compatibility shim on a later run.
  const servedHash = createHash('sha256').update(source).digest('hex');
  historicalModulePath = `/tmp/ui-v200/grass-baseline/${moduleName}-${servedHash.slice(0,16)}.ts`;
  await writeFile(resolve(`.${historicalModulePath}`), source);
}
let script = await readFile('scripts/performance-audit-v140.mjs', 'utf8');
const routeAnchor = '  page.setDefaultTimeout(60_000);';
const preparedAnchor = '      const first = world.pawns[0];';
const failureAnchor = '  failure = error;';
if (!script.includes(routeAnchor) || !script.includes(preparedAnchor) || !script.includes(failureAnchor) || !script.includes('let failure;'))
  throw new Error('Audit anchors changed; review the harness.');
script = script.replace('let failure;', 'let failure, diagnosticPage;');
const comparison = { baseline, ref, module: moduleName, sourceSha256: hash, commonSourceSha256: supportingHashes,
  preparedBloodRadius: radius,
  terrainGrass,
  historicalCompatibility: 'Only historical module receives no-op setTexturesEnabled/setTerrainPaint methods to satisfy current ColonyRenderer; benchmark keeps textures on.',
  scope: 'Only GpuGroundGrassLayer changes. Common migrated 250-square save, current renderer/simulation/cameras. Paused prepared grass blood is a render-only clone, never adopted by worker.',
  limitation: 'Full-frame CPU/RAF and optional full-frame GPU timestamps are bounded to these fixed scenes. This does not isolate GPU grass duration or prove general gameplay cost.' };
script = script.replace(routeAnchor, routeAnchor + `
  diagnosticPage = page;
  report.networkFailures = [];
  page.on('requestfailed', request => report.networkFailures.push({kind:'requestfailed',url:request.url(),error:request.failure()?.errorText??null}));
  page.on('response', response => {if(response.status()>=400)report.networkFailures.push({kind:'http',url:response.url(),status:response.status()});});
  report.renderComparison = ${JSON.stringify(comparison)};
  ${baseline ? `await page.route('**/src/render/GpuGroundGrassLayer.ts*', async route => {
    const response = await route.fetch({url:new URL('${historicalModulePath}',config.origin).href});
    await route.fulfill({response,body:await response.text()});
  });` : ''}
`);
script = script.replace(failureAnchor, failureAnchor + `
  if(diagnosticPage){
    report.failureState = await diagnosticPage.evaluate(() => {
      const audit=window.__performanceAudit, view=audit?.view;
      const text=selector=>document.querySelector(selector)?.textContent??null;
      return {frontError:text('.front-error'),frontStatus:text('.front-status'),loading:!!document.querySelector('#loading'),
        shellInert:document.querySelector('.game-shell')?.inert??null,
        audit:!!audit,client:!!audit?.client,view:!!view,preparing:view?.preparing??null,backend:view?.backend??null,
        world:view?.world?{tick:view.world.tick,width:view.world.width,height:view.world.height,seed:view.world.seed}:null};
    }).catch(error=>({captureError:String(error)}));
    await mkdir(dirname(output),{recursive:true});
    report.failureScreenshot=output.replace(/\\.json$/,'')+'-failure.png';
    await diagnosticPage.screenshot({path:report.failureScreenshot,fullPage:true}).catch(error=>{report.failureScreenshotError=String(error);});
  }
`);
script = script.replace(preparedAnchor, preparedAnchor + `
      if (world.width !== 250 || world.height !== 250) throw new Error('V200 comparison requires the same 250-square map.');
      if (!view.grass) throw new Error('Missing ground grass.');
      ${!baseline && !terrainGrass ? 'view.grass.setTerrainPaint(null);' : ''}
      // Prepared stain near the fixed anchor. Only grass receives this clone;
      // no filth record, save or sim RNG is modified in the authoritative world.
      const clone=structuredClone(world),stains=[];
      for(let z=first.z-${radius};z<=first.z+${radius};z++)for(let x=first.x-${radius};x<=first.x+${radius};x++){
        if(x<0||z<0||x>=world.width||z>=world.height)continue;
        const i=z*world.width+x;if(view.grass.map.image.data[i*4+3]!==255)continue;
        stains.push({id:clone.nextId+stains.length,x,z,kind:'blood',thickness:3,grownCore:0,expiresAfterCore:2400000,nextCheckCore:5000});
      }
      if(!stains.length)throw new Error('Prepared grass scene has no exposed soil at the common anchor.');
      clone.filth={rng:1,cleaned:0,items:stains};view.grass.update(clone,true);
      const g=view.grass;
      audit.grassPrepared={renderOnly:true,workerTick:world.tick,stains:stains.length,records:stains,
        terrainPaintPresent:g.terrainPaintPresent?.value??null,
        sharesTerrainPaint:g.terrainPaint?.value===view.terrainPaintTexture,
        sharedPaintBytes:view.terrainPaintTexture.image.data.byteLength,
        terrainBytes:g.map.image.data.byteLength,terrainTextureVersion:g.map.version,
        bloodBytes:g.bloodMap?.image?.data?.byteLength??null,
        bloodDimensions:g.bloodMap?[g.bloodMap.image.width,g.bloodMap.image.height]:null,
        bloodTextureVersion:g.bloodMap?.version??null};
`);
script = script.replace('const phase = {scene,speed,prepared,start:started.state,end:ended.end,elapsedMs,ticks,',
  'const phase = {scene,speed,prepared,grassPrepared:await page.evaluate(()=>window.__performanceAudit.grassPrepared),start:started.state,end:ended.end,elapsedMs,ticks,');
const runner = resolve(`tmp/ui-v200/grass-audit-${baseline ? 'baseline' : 'current'}.mjs`);
await writeFile(runner, script);
await import(pathToFileURL(runner).href);
