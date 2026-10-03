import { createHash } from 'node:crypto';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve,posix } from 'node:path';
import { pathToFileURL } from 'node:url';

// Sequential native A/B diagnostics through the existing fixed-camera audit.
// Only these seven rendering modules change. The saved World, main, audio,
// simulation, ColonyRenderer and ground grass remain current in both passes.
// Run A/B/B/A separately, then repeat with PERF_GPU=1 for instrumented GPU
// diagnostics. Do not alter served sources while a pass is running.
const modules=['WildlifeLayer','PawnLayer','hare-geometry','pawn-geometry','animal-shape','corpse-presentation','pile-parts'];
const ref='e548493';
if(process.env.V196_BASELINE!==undefined&&!['0','1'].includes(process.env.V196_BASELINE))throw new Error('V196_BASELINE must be 0 or 1.');
const baseline=process.env.V196_BASELINE==='1';
process.env.PERF_WORLD??='public/test-saves/v196/sang-depouilles-douleur.json';
process.env.PERF_SCENES??=process.env.PERF_SCENE??'iso-near,perspective-low';
process.env.PERF_SPEEDS??='0';
process.env.PERF_SECONDS??='4';
process.env.PERF_WARMUP??='3';
const folder=resolve('tmp/v196/baseline');await mkdir(folder,{recursive:true});
const hashes={};
for(const name of modules){
  let source=baseline?execFileSync('git',['show',`${ref}:src/render/${name}.ts`],{encoding:'utf8'}):await readFile(`src/render/${name}.ts`,'utf8');
  hashes[name]=createHash('sha256').update(source).digest('hex');
  if(!baseline)continue;
  source=source.replace(/(from\s*['"])(\.{1,2}\/[^'"]+)(['"])/g,(_all,start,file,end)=>{
    const path=posix.normalize(posix.join('/src/render',file));
    return start+path+(posix.extname(path)?'':'.ts')+end;
  });
  await writeFile(resolve(folder,`${name}.ts`),source);
}
let script=await readFile('scripts/performance-audit-v140.mjs','utf8');
const anchor='  page.setDefaultTimeout(60_000);';
if(!script.includes(anchor))throw new Error('Native diagnostic hook changed; review before use.');
const comparison={baseline,ref,modules,sourceSha256:hashes,
  scope:'Seven actor rendering modules only. Current main/audio/simulation/ColonyRenderer/ground grass and identical prepared World.',
  limitation:'Prepared 32-square specimen chart at rest. This is not a full-map or long-campaign performance proof; the baseline has the historical grey/flattened animal proxies. GPU timestamp runs are separate from ordinary RAF/CPU runs.'};
const hook=`
  report.renderComparison=${JSON.stringify(comparison)};
  ${baseline?`await page.route('**/src/render/*.ts*',async route=>{
    const name=new URL(route.request().url()).pathname.split('/').pop().replace(/\\.ts$/,'');
    if(!${JSON.stringify(modules)}.includes(name)){await route.continue();return;}
    const url=new URL('/tmp/v196/baseline/'+name+'.ts',config.origin);
    const response=await route.fetch({url:url.href});
    await route.fulfill({response,body:await response.text()});
  });`:''}
`;
script=script.replace(anchor,anchor+hook);
// ColonyRenderer remains current, including its timestamp instrumentation.
// The generic baseline route excludes it, so no timestamp hook rewrite is
// needed. Extra WildlifeLayer.update(...,pawns) arguments are ignored by the
// historical implementation without changing gameplay or the prepared save.
const runner=resolve(`tmp/v196/native-audit-${baseline?'baseline':'current'}.mjs`);
await writeFile(runner,script);
await import(pathToFileURL(runner).href);
