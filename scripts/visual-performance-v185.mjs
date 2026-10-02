import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve,posix } from 'node:path';
import { pathToFileURL } from 'node:url';

// Sequential native diagnostics using the existing fixed-camera protocol.
// Baseline overrides the rendering modules, not main/audio/simulation.
const modules=['WeatherCloudLayer','WeatherPrecipitationLayer','FireLayer','StructureVfxLayer','WildlifeLayer','chunk-presentation','PawnLayer','ColonyRenderer'];
const baseline=process.env.V185_BASELINE==='1',ref='721a8af';
const folder=resolve('tmp/v185/baseline');await mkdir(folder,{recursive:true});
if(baseline)for(const name of modules){
  let source=execFileSync('git',['show',`${ref}:src/render/${name}.ts`],{encoding:'utf8'});
  source=source.replace(/(from\s*['"])(\.{1,2}\/[^'"]+)(['"])/g,(_all,start,file,end)=>{
    const path=posix.normalize(posix.join('/src/render',file));
    return start+path+(posix.extname(path)?'':'.ts')+end;
  });
  await writeFile(resolve(folder,`${name}.ts`),source);
}
let script=await readFile('scripts/performance-audit-v140.mjs','utf8');
const anchor='  page.setDefaultTimeout(60_000);';
if(!script.includes(anchor))throw new Error('Native diagnostic hook changed; review before use.');
const hook=`
  report.renderComparison={baseline:${baseline},ref:'${ref}',modules:${JSON.stringify(modules)},scope:'Eight rendering modules only; shared current main/audio/simulation.'};
  ${baseline?`await page.route('**/src/render/*.ts*',async route=>{
    const name=new URL(route.request().url()).pathname.split('/').pop().replace(/\\.ts$/,'');
    if(!${JSON.stringify(modules)}.includes(name)){await route.continue();return;}
    const url=new URL('/tmp/v185/baseline/'+name+'.ts',config.origin);
    const response=await route.fetch({url:url.href});
    await route.fulfill({response,body:await response.text()});
  });`:''}
`;
script=script.replace(anchor,anchor+hook);
// The later timestamp route has priority over the generic module route. It
// must instrument the same baseline renderer instead of fetching current code.
if(baseline){
  const timestampHook="if (config.gpuRequested) await page.route('**/src/render/ColonyRenderer.ts*', async route => {\n    const response = await route.fetch();";
  if(!script.includes(timestampHook))throw new Error('Timestamp route changed; review before use.');
  script=script.replace(timestampHook,"if (config.gpuRequested) await page.route('**/src/render/ColonyRenderer.ts*', async route => {\n    const response = await route.fetch({url:new URL('/tmp/v185/baseline/ColonyRenderer.ts',config.origin).href});");
}
const runner=resolve(`tmp/v185/native-audit-${baseline?'baseline':'current'}.mjs`);
await writeFile(runner,script);
await import(pathToFileURL(runner).href);
