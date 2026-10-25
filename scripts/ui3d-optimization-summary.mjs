// ROOT: run only after both acquisitions finish. Reads evidence; writes tmp only.
// node scripts/ui3d-optimization-summary.mjs --first=.../report.json --continuation=.../report.json --completion=.../report.json --verify-current-sources=true
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
for(const arg of args)assert.ok(/^--(first|continuation|completion|verify-current-sources)=/.test(arg),'Unknown argument '+arg);
const option=(key,fallback)=>args.find(arg=>arg.startsWith('--'+key+'='))?.slice(key.length+3)??fallback;
assert.ok(option('first')&&option('continuation'),'--first and --continuation are required');
assert.ok(['true','false'].includes(option('verify-current-sources','false')));
const paths={first:resolve(root,option('first')),continuation:resolve(root,option('continuation'))};
if(option('completion'))paths.completion=resolve(root,option('completion'));
assert.notEqual(paths.first,paths.continuation);
const sha=value=>createHash('sha256').update(value).digest('hex');
const readJSON=async path=>JSON.parse(await readFile(path,'utf8'));
const documents={};
for(const [key,path]of Object.entries(paths)){
 const bytes=await readFile(path),report=JSON.parse(bytes.toString('utf8'));
 if(key==='continuation'&&paths.completion){
  assert.equal(report.status,'failed','Only the preserved known failed continuation may use completion');
 }else{
  assert.equal(report.status,'comparative-blocks-acquired',key+' acquisition incomplete');
  assert.deepEqual(report.errors,[]);assert.ok(report.contexts.every(context=>context.status==='acquired'));
 }
 assert.equal(report.expired,false);
 documents[key]={report,path,sha256:sha(bytes)};
}
const first=documents.first.report,continuation=documents.continuation.report;
const completion=documents.completion?.report;
assert.deepEqual(first.order,['baseline','candidate','baseline']);
assert.deepEqual(continuation.order,['candidate','baseline']);
assert.deepEqual(first.contexts.map(c=>c.variant),first.order);
assert.deepEqual(continuation.contexts.map(c=>c.variant),continuation.order);
for(const key of ['protocol','ticksPerSecond','browser'])assert.equal(first[key],continuation[key],key+' differs');
for(const key of ['blocks','preferences','viewport','wideViewport'])assert.deepEqual(first[key],continuation[key],key+' differs');
for(const key of ['cpu','node','platform','ramTotal'])assert.equal(first.host[key],continuation.host[key]);
assert.deepEqual(first.sources.baseline,continuation.sources.baseline,'Baseline manifests differ');
assert.equal(first.sourceRoots.baseline,continuation.sourceRoots.baseline,'Baseline root differs');
assert.equal(first.save.sha256,continuation.save.sha256);
assert.equal(first.save.inputTick,continuation.save.inputTick);
assert.equal(sha(await readFile(first.save.path)),first.save.sha256,'Input save bytes changed');
let knownFailure=null;
if(completion){
 assert.deepEqual(completion.order,['baseline']);
 assert.equal(completion.contexts.length,1);assert.equal(completion.contexts[0].variant,'baseline');
 assert.deepEqual(completion.contexts[0].blocks.map(block=>block.id),['x1-orbit']);
 assert.deepEqual(completion.blocks,[first.blocks.find(block=>block.id==='x1-orbit')]);
 for(const key of ['protocol','ticksPerSecond','browser'])assert.equal(completion[key],first[key]);
 for(const key of ['preferences','viewport','wideViewport'])assert.deepEqual(completion[key],first[key]);
 assert.deepEqual(completion.sources,continuation.sources,'Completion changes measured sources');
 assert.deepEqual(completion.sourceRoots,continuation.sourceRoots);
 assert.equal(completion.save.sha256,first.save.sha256);assert.equal(completion.save.inputTick,first.save.inputTick);
 assert.equal(continuation.contexts[0].status,'acquired');
 assert.equal(continuation.contexts[1].status,'failed');
 assert.deepEqual(continuation.contexts[1].blocks.map(block=>block.id),first.blocks.map(block=>block.id));
 const failed=continuation.contexts[1].blocks.at(-1);
 assert.equal(failed.id,'x1-orbit');assert.equal(failed.status,undefined);
 assert.ok(continuation.contexts[1].blocks.slice(0,-1).every(block=>block.status==='acquired'));
 assert.equal(continuation.errors.length,1);assert.equal(continuation.errors[0],continuation.contexts[1].failure);
 assert.ok(continuation.errors[0].includes('InvokeMethodOnNull'));
 assert.ok(failed.externalBefore?.error?.includes('InvokeMethodOnNull'),'Different metadata failure');
 assert.equal(failed.externalBefore.exitCode,0);
 for(const key of ['start','raw','boundary','summary','cdp','processCpu'])assert.equal(Object.hasOwn(failed,key),false,'Failed block entered measurement: '+key);
 await assert.rejects(readFile(resolve(dirname(documents.continuation.path),continuation.contexts[1].id,'x1-orbit/raw.json')),{code:'ENOENT'});
 const replacement=completion.contexts[0].blocks[0];
 for(const key of ['initialWorld','camera','settings','surface'])assert.deepEqual(replacement[key],failed[key],'Completion differs from failed pre-window state: '+key);
 knownFailure={sourceReport:documents.continuation.path,sourceReportSHA256:documents.continuation.sha256,
  context:continuation.contexts[1].id,block:failed.id,status:continuation.status,
  error:continuation.errors[0],externalBefore:failed.externalBefore,noMeasuredStart:true,noRawFile:true,
  completedBy:{sourceReport:documents.completion.path,context:completion.contexts[0].id,block:replacement.id}};
}

const oldDriverPath=resolve(root,'tmp/ui3d-optimization-v478/first-wcw-driver.mjs');
const newDriverPath=resolve(root,completion?'tmp/ui3d-optimization-v478/owned-cw-driver.mjs':'scripts/ui3d-optimization-audit.mjs');
const oldDriver=await readFile(oldDriverPath,'utf8'),newDriver=await readFile(newDriverPath,'utf8');
const driverNewline=oldDriver.includes('\r\n')?'\r\n':'\n';
assert.equal(sha(oldDriver),first.driverSHA,'Archived first driver SHA differs');
assert.equal(sha(newDriver),continuation.driverSHA,'Continuation driver SHA differs');
const hookAnchor='const hook=String.raw';
assert.ok(oldDriver.includes(hookAnchor)&&newDriver.includes(hookAnchor));
const oldMeasurement=oldDriver.slice(oldDriver.indexOf(hookAnchor));
const newMeasurement=newDriver.slice(newDriver.indexOf(hookAnchor));
assert.equal(oldMeasurement,newMeasurement,'Measurement hook/window code changed');
// Permit exactly the two CLI changes needed to run C/W after an acquired W.
const normalizedDriver=oldDriver
 .replace('(baseline-root|baseline-origin|candidate-origin|label|browser|budget-seconds)=','(baseline-root|baseline-origin|candidate-origin|label|browser|budget-seconds|order)=')
 .replace("const order=['baseline','candidate','baseline'],label=","const order=option('order','baseline,candidate,baseline').split(','),label=")
 .replace("assert.ok(/^[a-zA-Z0-9_-]+$/.test(label)","assert.ok(['baseline,candidate,baseline','candidate,baseline'].includes(order.join(',')),'Use a full bracket or its continuation after an acquired witness');"+driverNewline+"assert.ok(/^[a-zA-Z0-9_-]+$/.test(label)");
assert.equal(normalizedDriver,newDriver,'Driver differences exceed order CLI configuration');
let completionDriver=null;
if(completion){
 const path=resolve(root,'scripts/ui3d-optimization-audit.mjs'),body=await readFile(path,'utf8');
 assert.equal(sha(body),completion.driverSHA,'Completion driver SHA differs');
 assert.equal(body.slice(body.indexOf(hookAnchor)),oldMeasurement,'Completion changes measurement hook/window code');
 const repaired=newDriver
  .replace('budget-seconds|order)=','budget-seconds|order|blocks)=')
  .replace("'candidate,baseline'].includes(order.join(','))","'candidate,baseline','baseline'].includes(order.join(','))")
  .replace('const blocks=[','const allBlocks=[')
  .replace('const report={',"const requestedBlocks=option('blocks','').split(',').filter(Boolean);\nassert.ok(requestedBlocks.every(id=>allBlocks.some(block=>block.id===id))&&new Set(requestedBlocks).size===requestedBlocks.length,'Known unique blocks only');\nconst blocks=allBlocks.filter(block=>!requestedBlocks.length||requestedBlocks.includes(block.id));\nconst report={".replaceAll('\n',newDriver.includes('\r\n')?'\r\n':'\n'))
  .replace('ForEach-Object { @{name=', 'ForEach-Object { $processStarted=$_.StartTime; @{name=')
  .replace("startedUtc=$_.StartTime.ToUniversalTime().ToString('o')","startedUtc=if($null -ne $processStarted){$processStarted.ToUniversalTime().ToString('o')}else{$null}");
 assert.equal(repaired,body,'Completion driver changes exceed order/filter and null metadata repair');
 completionDriver={path,sha256:sha(body),measurementSuffixSHA256:sha(oldMeasurement),allowedPrefixChanges:['single-baseline order','single-block CLI filter','nullable external-process StartTime metadata']};
}

async function sourceFence(base){
 const files={};
 async function visit(folder){
  for(const entry of(await readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
   const path=join(folder,entry.name);
   if(entry.isDirectory())await visit(path);
   else{assert.ok(entry.isFile(),'Unexpected source entry '+path);files[relative(base,path).replaceAll('\\','/')]=sha(await readFile(path));}
  }
 }
 await visit(resolve(base,'src'));
 for(const name of ['index.html','package.json','package-lock.json','vite.config.ts','public/test-saves/v419/les-eclaircies.json'])files[name]=sha(await readFile(resolve(base,name)));
 return files;
}
let currentSources=null;
if(option('verify-current-sources','false')==='true'){
 const base=continuation.sourceRoots.candidate;
 assert.equal(resolve(base).toLowerCase(),root.toLowerCase(),'Unexpected candidate source root');
 assert.deepEqual(await sourceFence(base),continuation.sources.candidate,'Final candidate sources changed after acquisition');
 currentSources={root:base,verifiedAt:new Date().toISOString(),manifestSHA256:sha(JSON.stringify(continuation.sources.candidate))};
}

const selected=[
 {label:'W2',document:documents.first,context:first.contexts.at(-1)},
 {label:'C2',document:documents.continuation,context:continuation.contexts[0]},
 {label:'W3',document:documents.continuation,context:completion?{...continuation.contexts[1],blocks:continuation.contexts[1].blocks.slice(0,-1)}:continuation.contexts[1]}
];
if(completion)selected.push({label:'W3',document:documents.completion,context:completion.contexts[0],singleBlockCompletion:true});
assert.deepEqual(selected.map(s=>s.context.variant),completion?['baseline','candidate','baseline','baseline']:['baseline','candidate','baseline']);
const verification={raw:[],sourceManifests:[],loadedSaves:[],servedCriticalSources:[],externalSnapshots:0};
const loadedReference=selected[0].context.blocks[0].initialWorld.sha256;
for(const selectedContext of selected){
 const {label,document,context}=selectedContext,report=document.report;
 assert.equal(context.mode,'native');assert.deepEqual(context.errors,[]);
 const expectedDefinitions=completion&&selectedContext===selected[2]?report.blocks.slice(0,-1):report.blocks;
 assert.deepEqual(context.blocks.map(b=>b.id),expectedDefinitions.map(b=>b.id));
 const contextDirectory=resolve(dirname(document.path),context.id);
 if(selectedContext.singleBlockCompletion){
  // The unchanged window driver persists loaded-save.json only for paused-hud.
  // A single x1 completion still hashes its complete serialized World before
  // measurement; require that digest and byte count to equal the saved exports.
  const initial=context.blocks[0].initialWorld;
  assert.equal(initial.sha256,loadedReference);assert.equal(initial.bytes,selected[0].context.blocks[0].initialWorld.bytes);
  verification.loadedSaves.push({label,context:context.id,sha256:initial.sha256,bytes:initial.bytes,source:'pre-window complete serialized World digest; single x1 driver emits no initial export'});
 }else{
  const loaded=await readFile(resolve(contextDirectory,'loaded-save.json'));
  assert.equal(sha(loaded),loadedReference,'Complete loaded World differs');
  verification.loadedSaves.push({label,context:context.id,sha256:sha(loaded),bytes:loaded.length,source:'independently hashed loaded-save.json'});
 }
 for(const name of ['src/main.ts','src/ui3d/NativeStage.ts','src/ui3d/NativeOverlayCache.ts']){
  const body=await readFile(resolve(contextDirectory,name.replaceAll('/','_')+'.served.js'),'utf8');
  const evidence=context.servedModules.find(module=>module.path===name);
  assert.ok(evidence,'Missing served source evidence '+name);assert.equal(sha(body),evidence.responseSHA);
  const expected=report.sources[context.variant][name];
  const encoded=body.match(/\/\/[#@]\s*sourceMappingURL=data:application\/json(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/=]+)/);
  const map=encoded?JSON.parse(Buffer.from(encoded[1],'base64').toString('utf8')):null;
  assert.ok(sha(body)===expected||map?.sourcesContent?.some(content=>typeof content==='string'&&sha(content)===expected),'Served source original differs '+name);
  verification.servedCriticalSources.push({label,path:name,responseSHA256:sha(body),originalSHA256:expected});
 }
 for(const block of context.blocks){
  assert.equal(block.status,'acquired');assert.equal(block.initialWorld.sha256,loadedReference);
  assert.equal(block.initialWorld.tick,first.save.inputTick);
  const rawPath=resolve(block.raw.path),rawBytes=await readFile(rawPath),raw=JSON.parse(rawBytes.toString('utf8'));
  assert.equal(rawBytes.length,block.raw.bytes);assert.equal(sha(rawBytes),block.raw.sha256);
  assert.equal(raw.frames.length,block.boundary.frames);assert.ok(raw.frames.length>2);
  assert.deepEqual(raw.visibility,[]);assert.equal(block.boundary.hidden,false);
  assert.deepEqual(raw.boundary,block.boundary);assert.deepEqual(raw.cdp,block.cdp);assert.deepEqual(raw.processCpu,block.processCpu);
  assert.equal(raw.boundary.startTick,first.save.inputTick);
  verification.raw.push({label,block:block.id,path:rawPath,bytes:rawBytes.length,sha256:sha(rawBytes)});
  const manifest=await readJSON(resolve(dirname(rawPath),'manifest.json'));
  const manifestSHA=sha(JSON.stringify(report.sources[context.variant]));
  assert.equal(manifest.sourceManifestSHA,manifestSHA);assert.deepEqual(manifest.initialWorld,block.initialWorld);
  for(const key of ['camera','settings','surface'])assert.deepEqual(manifest[key],block[key]);
  verification.sourceManifests.push({label,block:block.id,sha256:manifestSHA});
  const cpu=block.processCpu.summary;
  assert.equal(cpu.incomplete,false);assert.equal(cpu.newPidLifetimeCpuSeconds,0);
  assert.deepEqual(cpu.missing,[]);assert.deepEqual(cpu.invalid,[]);
  assert.ok(cpu.rows.every(row=>!row.newPid&&!row.counterReset),'Unstable PID CPU window');
  const cpuSum=cpu.rows.reduce((n,row)=>n+row.cpuSeconds,0);
  assert.ok(Math.abs(cpuSum-cpu.stablePidCpuSeconds)<1e-8,'Stable PID CPU sum differs');
  const threadDelta=block.cdp.after.metrics.ThreadTime-block.cdp.before.metrics.ThreadTime;
  assert.ok(Number.isFinite(threadDelta)&&Math.abs(threadDelta-block.summary.threadTimeSeconds)<1e-8);
  assert.ok(Math.abs(threadDelta*1000/raw.frames.length-block.summary.threadCPUmsPerFrame)<1e-8);
  for(const key of ['externalBefore','externalAfter']){
   const snapshot=block[key];assert.equal(snapshot.exitCode,0);assert.equal(snapshot.error,null);assert.ok(snapshot.processes!==null);
   const processes=Array.isArray(snapshot.processes)?snapshot.processes:[snapshot.processes];
   assert.ok(!processes.some(process=>/^League of Legends$/i.test(process.name)),'League game observed');
   verification.externalSnapshots++;
  }
 }
}
assert.equal(verification.raw.length,12);assert.equal(verification.sourceManifests.length,12);

function intervals(frames,key){return frames.slice(1).map((frame,i)=>frame[key]-frames[i][key]);}
function distribution(values){
 const sorted=[...values].sort((a,b)=>a-b),at=p=>sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];
 return {n:sorted.length,mean:sorted.reduce((n,value)=>n+value,0)/sorted.length,p95:at(.95),p99:at(.99),max:sorted.at(-1),cuts:[16.7,33.4,50,100].map(thresholdMs=>({thresholdMs,count:values.filter(value=>value>thresholdMs).length}))};
}
const comparison=[];
for(const blockDefinition of first.blocks){
 const blockSelections=[selected[0],selected[1],completion&&blockDefinition.id==='x1-orbit'?selected[3]:selected[2]];
 const blocks=blockSelections.map(selectedContext=>selectedContext.context.blocks.find(block=>block.id===blockDefinition.id));
 for(const key of ['initialWorld','camera','settings','surface']){
  assert.deepEqual(blocks[1][key],blocks[0][key],key+' differs W2/C2 '+blockDefinition.id);
  assert.deepEqual(blocks[2][key],blocks[0][key],key+' differs W2/W3 '+blockDefinition.id);
 }
 const rows=[];
 for(const [i,block]of blocks.entries()){
  const raw=await readJSON(block.raw.path),s=block.summary,n=raw.frames.length;
  const simulatedSeconds=s.deliveredTicks/first.ticksPerSecond;
  const wall=distribution(intervals(raw.frames,'wallAt')),raf=distribution(intervals(raw.frames,'at'));
  for(const [name,value]of [['wall',wall],['raf',raf]]){
   for(const key of ['p99','max'])assert.ok(Math.abs(value[key]-s[name][key])<1e-8);
   assert.deepEqual(value.cuts,s[name+'Cuts']);
  }
  assert.deepEqual(raw.cache,s.cache,'Raw cache observer differs');
  rows.push({label:blockSelections[i].label,context:blockSelections[i].context.id,variant:blockSelections[i].context.variant,sourceReport:blockSelections[i].document.path,singleBlockCompletion:!!blockSelections[i].singleBlockCompletion,
   elapsedMs:s.elapsedMs,frames:n,startEpochMs:block.boundary.timeOrigin+block.boundary.start,endEpochMs:block.boundary.timeOrigin+block.boundary.end,
   mainThreadCPUSeconds:s.threadTimeSeconds,mainThreadCPUmsPerFrame:s.threadCPUmsPerFrame,
   stablePidCPUSeconds:block.processCpu.summary.stablePidCpuSeconds,
   stablePidCPUmsPerFrame:block.processCpu.summary.stablePidCpuSeconds*1000/n,
   stablePidCPUSecondsByGroup:Object.fromEntries(Object.entries(block.processCpu.summary.groups).map(([name,value])=>[name,value.stablePidCpuSeconds])),
   wall,raf,deliveredTicks:s.deliveredTicks,shownTicks:s.shownTicks,actualSpeed:s.actualSpeed,simulatedSeconds,
   mainThreadCPUSecondsPerActualSimulatedSecond:simulatedSeconds?s.threadTimeSeconds/simulatedSeconds:null,
   stablePidCPUSecondsPerActualSimulatedSecond:simulatedSeconds?block.processCpu.summary.stablePidCpuSeconds/simulatedSeconds:null,
   cache:{...s.cache,capturedPixelsPerFrame:s.cache.capturedPixels/n,pixelsPerCapture:s.cache.captures?s.cache.capturedPixels/s.cache.captures:0,captureSubmissionWallMsPerFrame:s.cache.captureSubmissionWallMs/n}});
 }
 const [w2,c2,w3]=rows,descriptive={};
 for(const key of ['mainThreadCPUmsPerFrame','mainThreadCPUSeconds','stablePidCPUSeconds','stablePidCPUmsPerFrame']){
  const low=Math.min(w2[key],w3[key]),high=Math.max(w2[key],w3[key]);
  descriptive[key]={witnessLow:low,witnessHigh:high,candidateBelowBoth:c2[key]<low,candidateInsideRange:c2[key]>=low&&c2[key]<=high,
   candidateVsW2Percent:(c2[key]/w2[key]-1)*100,candidateVsW3Percent:(c2[key]/w3[key]-1)*100};
 }
 comparison.push({block:blockDefinition.id,definition:blockDefinition,rows,descriptive,
  interAcquisitionGapsMs:{w2EndToC2Start:c2.startEpochMs-w2.endEpochMs,c2EndToW3Start:w3.startEpochMs-c2.endEpochMs}});
}

const out=resolve(root,'tmp/ui3d-optimization-v478');await mkdir(out,{recursive:true});
const result={protocol:'native-ui-optimization-stitched-w2-c2-w3-v478-1',created:new Date().toISOString(),status:'evidence-joined',automaticAcceptance:false,
 acquisitions:Object.fromEntries(Object.entries(documents).map(([name,document])=>[name,{path:document.path,sha256:document.sha256,status:document.report.status,wallMs:document.report.totalWallMs}])),
 drivers:{first:{path:oldDriverPath,sha256:sha(oldDriver)},continuation:{path:newDriverPath,sha256:sha(newDriver)},measurementSuffixSHA256:sha(oldMeasurement),firstToContinuationOnlyOrderCLIChanged:true,completion:completionDriver},
 preservedFailure:knownFailure,
 save:first.save,baselineManifestSHA256:sha(JSON.stringify(first.sources.baseline)),candidateManifestSHA256:sha(JSON.stringify(continuation.sources.candidate)),
 currentSources,verification,comparison,limits:[
  'W2 is the last baseline of the first successful acquisition. C2 and the three paused W3 windows come from a later continuation. If present, a separate fresh context completes only W3 x1 after the strictly identified pre-window metadata failure. The failed report is retained; this is a joined bracket, not an uninterrupted acquisition.',
  'First-to-continuation changes only order CLI configuration. Completion permits exactly single-baseline order, a block CLI filter and nullable StartTime in external metadata. The measurement hook and all subsequent window code are byte-identical. Baseline manifests and exact per-block input World/camera/settings/surface agree.',
  'Main ThreadTime/frame is renderer-main-thread CPU. Stable private-browser PID CPU includes browser, renderer/Workers, GPU-process CPU and utilities, with small protocol gaps. Neither is GPU execution time.',
  'Capture pixels describe dirty rendering work; capture submission duration is synchronous wall time, not CPU attribution or GPU completion. It cannot be subtracted from ThreadTime to infer another function cost.',
  'Brave streaming is an unchanged human-reported workload, not an equalized external decode/compositor GPU load. League game is absent in the observed boundaries; intermediate process launches are not observed.',
  'A candidate below both CPU witnesses is a descriptive observation in this one bracket, not automatic proof of a general CPU gain, FPS gain or resolved comfort.',
  'CPU per actual simulated second uses confirmed delivered ticks, not requested speed. Paused blocks have no denominator and return null.',
  'The separate memory fixture measures explicit known logical allocations, with opaque depth excluded; this comparison makes no physical VRAM claim.'
 ]};
const f=(value,digits=3)=>Number.isFinite(value)?value.toFixed(digits):'—';
const lines=['# Comparaison native finale W2 / C2 / W3','',
 'Jonction du dernier témoin de la première acquisition avec la continuation C2/W3. Aucune acceptation automatique ; streaming Brave conservé, intensité GPU externe non égalisée.','',
 '| Bloc | W2 CPU principal ms/image | C2 | W3 | W2 CPU privé stable s | C2 | W3 |','|---|---:|---:|---:|---:|---:|---:|'];
for(const block of comparison){const [a,c,b]=block.rows;lines.push('| '+block.block+' | '+[a.mainThreadCPUmsPerFrame,c.mainThreadCPUmsPerFrame,b.mainThreadCPUmsPerFrame,a.stablePidCPUSeconds,c.stablePidCPUSeconds,b.stablePidCPUSeconds].map(n=>f(n,6)).join(' | ')+' |');}
lines.push('','| Bloc | W2 wall p99/max ms | C2 | W3 | W2 >16,7/>33,4/>50/>100 ms | C2 | W3 |','|---|---:|---:|---:|---|---|---|');
for(const block of comparison){lines.push('| '+block.block+' | '+block.rows.map(row=>f(row.wall.p99,1)+'/'+f(row.wall.max,1)).concat(block.rows.map(row=>row.wall.cuts.map(cut=>cut.count).join('/'))).join(' | ')+' |');}
lines.push('','| Bloc | W2 pixels capturés/image | C2 | W3 | W2 soumission cache ms/image | C2 | W3 |','|---|---:|---:|---:|---:|---:|---:|');
for(const block of comparison){lines.push('| '+block.block+' | '+block.rows.map(row=>f(row.cache.capturedPixelsPerFrame,1)).concat(block.rows.map(row=>f(row.cache.captureSubmissionWallMsPerFrame,6))).join(' | ')+' |');}
lines.push('','Rotation ×1 :');
for(const row of comparison.find(block=>block.definition.speed===1).rows)lines.push('- '+row.label+' : '+row.deliveredTicks+' ticks confirmés, '+row.shownTicks+' présentés ; vitesse '+f(row.actualSpeed,7)+'× ; CPU principal '+f(row.mainThreadCPUSecondsPerActualSimulatedSecond,6)+' s/seconde simulée réelle ; CPU privé '+f(row.stablePidCPUSecondsPerActualSimulatedSecond,6)+' s/seconde simulée réelle.');
const hover=comparison.find(block=>block.definition.hover);
lines.push('','Survol : le CPU principal C2/image '+(hover.descriptive.mainThreadCPUmsPerFrame.candidateBelowBoth?'est numériquement inférieur aux deux témoins':hover.descriptive.mainThreadCPUmsPerFrame.candidateInsideRange?'reste dans la plage des deux témoins':'dépasse au moins un témoin')+'. Ce constat descriptif n’admet pas automatiquement un gain général.','',
 'Preuves : 12 fichiers RAW et 12 manifestes vérifiés, '+verification.servedCriticalSources.length+' réponses de sources critiques vérifiées ; trois exports initiaux et '+(completion?'l’empreinte du World chargé du bloc de complétion sont identiques':'leurs empreintes sont identiques')+'. Caméra, réglages et surfaces identiques pour chaque bloc. Les seuls changements de pilote admis sont l’ordre, le filtre du bloc manquant et la métadonnée StartTime nullable. Contrôle des sources finales courantes : '+(currentSources?'acquis':'non demandé')+'.','',
 'CPU et intervalles sont distincts des FPS et du temps GPU. Les sources mémoire séparées n’autorisent pas de chiffre de VRAM physique. Les écarts temporels et les limites détaillées figurent dans le JSON.');
if(knownFailure)lines.push('','Le rapport de continuation reste marqué failed : seule la collecte externe de StartTime échoue avant le démarrage du dernier bloc ×1. Ses sept blocs acquis sont conservés. Un nouveau contexte complète uniquement ce dernier bloc ; aucun RAW ni démarrage de mesure n’existe pour l’essai interrompu.');
await writeFile(resolve(out,'final-comparison.json'),JSON.stringify(result,null,2));
await writeFile(resolve(out,'final-comparison.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({out,status:result.status,automaticAcceptance:false,rawFiles:verification.raw.length,currentSourcesVerified:!!currentSources}));
