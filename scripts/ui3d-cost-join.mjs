// Offline only. Do not run while any benchmark is active.
// node scripts/ui3d-cost-join.mjs --first=RUN_A/report.json --witness=RUN_W2/report.json --out=NEW_FOLDER/report.json --driver-proof=PROOF_FOLDER/driver-repair-proof.json
// --out also accepts a new folder, in which case report.json is created within it.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,extname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const args=process.argv.slice(2),allowed=['first','witness','out'];
for(const arg of args)assert.ok(/^--(first|witness|out|driver-proof)=.+/.test(arg),`Unknown or empty argument: ${arg}`);
const option=name=>{const matches=args.filter(arg=>arg.startsWith(`--${name}=`));assert.equal(matches.length,1,`Supply exactly one --${name}=PATH`);return matches[0].slice(name.length+3);};
const [firstPath,witnessPath,outArg]=allowed.map(name=>resolve(option(name)));
const outPath=extname(outArg).toLowerCase()==='.json'?outArg:resolve(outArg,'report.json');
assert.notEqual(firstPath,witnessPath,'The completion witness must be a separate acquisition.');
assert.ok(![firstPath,witnessPath].includes(outPath),'Never overwrite either source report.');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const firstBytes=await readFile(firstPath),witnessBytes=await readFile(witnessPath);
const first=JSON.parse(firstBytes.toString('utf8')),witness=JSON.parse(witnessBytes.toString('utf8'));
const protocol='ui3d-cost-audit-v477-wcw-1',driverKey='scripts/ui3d-cost-audit.mjs';
const expectedIds=['paused-hud','paused-work','paused-wide','paused-toolbar-hover','x1-orbit','x3-orbit'];
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const equal=(left,right,label)=>assert.deepEqual(left,right,`${label} differs between acquisitions`);
for(const [name,report]of [['first',first],['witness',witness]]){
 assert.equal(report.protocol,protocol,`${name}: unsupported protocol`);
 assert.ok(Array.isArray(report.contexts),`${name}: contexts unavailable`);
 assert.ok(digest(report.save?.sha256),`${name}: missing input World SHA`);
 assert.ok(Number.isSafeInteger(report.save.inputTick),`${name}: missing input tick`);
 assert.ok(Number.isFinite(report.ticksPerSecond)&&report.ticksPerSecond>0,`${name}: invalid tick rate`);
 assert.ok(typeof report.browser==='string'&&report.browser.length,`${name}: browser version unavailable`);
 assert.ok(report.sources&&Object.keys(report.sources).some(key=>key.startsWith('src/')),`${name}: source fence missing`);
 for(const key of ['index.html','package.json','package-lock.json','vite.config.ts','public/test-saves/v419/les-eclaircies.json',driverKey])assert.ok(digest(report.sources[key]),`${name}: missing fence entry ${key}`);
 for(const [key,value]of Object.entries(report.sources))assert.ok(digest(value),`${name}: invalid fenced digest ${key}`);
 assert.equal(report.driverSHA,report.sources[driverKey],`${name}: driver identity disagrees with source fence`);
 equal(report.blocks?.map(block=>block.id),expectedIds,`${name}: six comparative block identities`);
}
equal(first.order,['legacy','native','legacy'],'first requested order');
equal(witness.order,['legacy'],'completion witness requested order');
assert.ok(first.contexts.length>=2&&first.contexts.length<=3,'First report must contain original W1/C and no unrelated contexts.');
assert.equal(witness.contexts.length,1,'Completion report must contain exactly one witness context.');
equal([first.contexts[0].mode,first.contexts[1].mode,witness.contexts[0].mode],['legacy','native','legacy'],'selected context modes');
equal(first.browser,witness.browser,'browser version');
equal(first.origin,witness.origin,'served origin');
equal(first.save.sha256,witness.save.sha256,'input save SHA');
equal(first.save.inputTick,witness.save.inputTick,'input tick');
equal(first.ticksPerSecond,witness.ticksPerSecond,'tick rate');
equal(first.preferences,witness.preferences,'saved preferences');
equal(first.viewport,witness.viewport,'ordinary viewport');
equal(first.wideViewport,witness.wideViewport,'wide viewport');
equal(first.blocks,witness.blocks,'comparative block protocol');
const productFence=report=>Object.fromEntries(Object.entries(report.sources).filter(([key])=>key!==driverKey));
equal(productFence(first),productFence(witness),'strict product/source fence (only audit driver excluded)');
assert.equal(first.sources['public/test-saves/v419/les-eclaircies.json'],first.save.sha256,'Input file fence does not match save identity');
let driverProof=null;
const proofArgs=args.filter(arg=>arg.startsWith('--driver-proof='));assert.ok(proofArgs.length<=1,'Supply at most one --driver-proof');
if(first.driverSHA!==witness.driverSHA)assert.equal(proofArgs.length,1,'A changed driver requires --driver-proof for the exact permitted repairs.');
if(proofArgs.length){
 const proofPath=resolve(option('driver-proof')),proofBytes=await readFile(proofPath),proof=JSON.parse(proofBytes.toString('utf8'));
 const expectedChanges=[
  ["assert.ok(JSON.stringify(order)===JSON.stringify(['legacy','native','legacy'])||JSON.stringify(order)===JSON.stringify(['legacy']),'Use W/C/W or one explicit completion witness.');","assert.deepEqual(order,['legacy','native','legacy'],'This driver is one W/C/W bracket only.');"],
  ['referenceCamera??=item.camera;if(!block.diagnosticOnly)assert.deepEqual(item.camera,referenceCamera);','referenceCamera??=item.camera;assert.deepEqual(item.camera,referenceCamera);'],
  ['if(order.length===3)for(const block of blocks){','for(const block of blocks){'],
 ];
 equal(proof.changes,expectedChanges,'allowlisted driver repair text');
 const originalPath=resolve(dirname(proofPath),'original-measured-driver.mjs');
 const currentPath=resolve(dirname(fileURLToPath(import.meta.url)),'..',driverKey);
 const originalBytes=await readFile(originalPath),currentBytes=await readFile(currentPath);
 assert.equal(sha(originalBytes),first.driverSHA,'Reconstructed original driver differs from measured first fence');
 assert.equal(sha(currentBytes),witness.driverSHA,'Current repaired driver differs from measured witness fence');
 assert.equal(proof.originalSHA,first.driverSHA,'Proof originalSHA mismatch');
 assert.equal(proof.currentSHA,witness.driverSHA,'Proof currentSHA mismatch');
 let reconstructed=currentBytes.toString('utf8');
 for(const [after,before]of proof.changes){assert.equal(reconstructed.split(after).length,2,'Each repair after-text must occur exactly once');reconstructed=reconstructed.replace(after,before);}
 assert.equal(sha(reconstructed),first.driverSHA,'Reversing all permitted repairs does not reproduce measured original driver');
 assert.equal(reconstructed,originalBytes.toString('utf8'),'Inverse repair differs from preserved original driver text');
 driverProof={path:proofPath,sha256:sha(proofBytes),original:{path:originalPath,sha256:sha(originalBytes)},repaired:{path:currentPath,sha256:sha(currentBytes)},reconstructedOriginalSHA:sha(reconstructed),changes:proof.changes,verified:true,
  scope:'Only argument order admission, optional diagnostic-only camera equality guard, and final comparison aggregation changed. Inverting these three exact allowlisted patches reproduces the measured original driver byte-for-byte; comparative timed methods and samplers are unchanged.'};
}

const selected=[first.contexts[0],first.contexts[1],witness.contexts[0]];
const validation=[];
let referenceMainSHA,referenceLoadedSHA;
for(const id of expectedIds){
 const blocks=selected.map((context,index)=>{
  const matches=context.blocks?.filter(block=>block.id===id)??[];
  assert.equal(matches.length,1,`${context.id}: expected exactly one ${id}`);
  const block=matches[0];assert.equal(block.status,'acquired',`${context.id}/${id}: comparison block was not acquired`);
  assert.ok(!block.diagnosticOnly,`${context.id}/${id}: diagnostic cannot enter comparison`);
  assert.ok(block.summary&&Number.isFinite(block.summary.elapsedMs)&&block.summary.elapsedMs>0,`${context.id}/${id}: summary unavailable`);
  assert.ok(Number.isInteger(block.boundary?.frames)&&block.boundary.frames>2,`${context.id}/${id}: callback boundary unavailable`);
  assert.equal(block.boundary.startTick,first.save.inputTick,`${context.id}/${id}: wrong starting tick`);
  assert.ok(digest(block.initialWorld?.sha256),`${context.id}/${id}: loaded World SHA unavailable`);
  assert.equal(block.initialWorld.tick,first.save.inputTick,`${context.id}/${id}: wrong loaded tick`);
  referenceLoadedSHA??=block.initialWorld.sha256;
  assert.equal(block.initialWorld.sha256,referenceLoadedSHA,`${context.id}/${id}: loaded World differs from initial complete World`);
  assert.ok(block.camera&&block.settings&&block.surface,`${context.id}/${id}: camera/settings/surface unavailable`);
  assert.ok(block.raw?.path&&digest(block.raw.sha256)&&Number.isSafeInteger(block.raw.bytes)&&block.raw.bytes>0,`${context.id}/${id}: raw evidence reference unavailable`);
  const main=context.mainResponse?.originalSHA;
  assert.ok(digest(main),`${context.id}: served Main original SHA unavailable`);referenceMainSHA??=main;
  assert.equal(main,referenceMainSHA,`${context.id}: served Main original response changed`);
  return {contextIndex:index,block};
 });
 for(const {block}of blocks.slice(1))for(const field of ['camera','settings','initialWorld','surface'])equal(blocks[0].block[field],block[field],`${id}: ${field}`);
 validation.push({block:id,status:'three-comparative-blocks-acquired',loadedWorldSHA:blocks[0].block.initialWorld.sha256,servedMainOriginalSHA:referenceMainSHA,matched:['camera','settings','surface','initialWorld','inputTick'],raw:blocks.map(({block},index)=>({position:['W1','C','W2'][index],...block.raw}))});
}

const sourceRecord=(report,path,bytes)=>({path,sha256:sha(bytes),protocol:report.protocol,status:report.status??null,errors:report.errors??[],created:report.created,finishedWallMs:report.totalWallMs??null,browser:report.browser,order:report.order,externalLoad:report.externalLoad??null,driverSHA:report.driverSHA,sourceFence:report.sources,contexts:report.contexts.map(context=>({id:context.id,mode:context.mode,status:context.status??null,failure:context.failure??null}))});
const sourceReports={first:sourceRecord(first,firstPath,firstBytes),completionWitness:sourceRecord(witness,witnessPath,witnessBytes)};
const qualificationLimits=[
 'This report joins the six already acquired W1/native comparative blocks from a globally failed first run with six separately acquired W2 blocks. Its status is comparative-blocks-acquired, never full-run PASS.',
 'The original native context and first-run global failure remain recorded. The optional Bio diagnostic failed its camera/target guard after the six comparative blocks; that failure is preserved and excluded from comparison. It is not reclassified as a product failure or a successful diagnostic.',
 'W2 was acquired in a newly launched private browser, rather than a third context in the original browser lifetime. Browser version, product fence, input, preferences, camera, settings, complete loaded World, and served Main original SHA were matched, but browser lifetime/process history and warm caches can differ.',
 'League of Legends and streaming activity continued under human control. League CPU snapshots do not prove equal external GPU load. Changes in external load can cause drift and prevent an unconditional causal UI/FPS attribution, even if witnesses agree.',
 driverProof?'The audit driver SHA is the sole allowed source-fence exception. The preserved original copy matches the first measured SHA, the current repaired driver matches the W2 measured SHA, and inversion of three exact allowlisted patches reproduces the original byte-for-byte. Changes are restricted to order admission, optional diagnostic camera equality guard and final aggregation; comparative timed methods and samplers are unchanged. Proof, both exact driver fences and source-run statuses are retained.':'Both acquisitions used the same audit driver SHA; both source fences and source-run statuses are retained.',
 'Raw files, screenshots, source reports, original context failures and diagnostic evidence are referenced in their original locations and are never rewritten. This join validates report identities and acquired block metadata; it does not replay or rehash the large raw files.',
 'The standalone W2 report, if globally failed outside an acquired comparative block, is not upgraded to full-run PASS by this join. All six selected W2 blocks must independently carry acquired status.',
 'No statistical significance, performance gain, comfort completion, or automatic acceptance follows from joining these descriptive observations.',
];
const contexts=selected.map((context,index)=>({...context,id:['1-legacy','2-native','3-legacy'][index],sourceContextId:context.id,sourceContextStatus:context.status??null,sourceReportPath:index===2?witnessPath:firstPath}));
const diagnostics=first.contexts.flatMap(context=>(context.blocks??[]).filter(block=>block.diagnosticOnly).map(block=>({contextId:context.id,sourceReportPath:firstPath,comparisonExcluded:true,id:block.id,status:block.status??'not-acquired',contextStatus:context.status??null,contextFailure:context.failure??null,raw:block.raw??null,preservedInContext:true})));
const combined={...first,created:new Date().toISOString(),out:dirname(outPath),order:['legacy','native','legacy'],contexts,comparisons:[],status:'comparative-blocks-acquired',
 totalWallMs:null,expired:null,errors:[],sourceRunErrors:{first:first.errors??[],completionWitness:witness.errors??[]},sourceReports,validation,
 driverFenceException:{path:driverKey,firstSHA:first.driverSHA,completionWitnessSHA:witness.driverSHA,differ:first.driverSHA!==witness.driverSHA,authorizedReason:'Optional Bio camera equality guard repair and explicit legacy-only completion order, with final aggregation guard.',timedMethodStability:driverProof?'Verified exact inverse allowlisted patch reconstruction against both measured SHA fences':'Same measured driver SHA',proof:driverProof},
 excludedDiagnostics:diagnostics,qualificationLimits,
 externalLoad:'Joined acquisitions with League of Legends and streaming activity ongoing; changing external load and a new W2 browser lifetime remain confounders.',
 limits:[...new Set([...qualificationLimits,...(first.limits??[]),...(witness.limits??[])])],
 join:{protocol:'ui3d-cost-join-v1',validationOnly:'Report metadata and fences; no raw rewriting, benchmark replay, or automatic performance decision',selectedSourceContexts:[{source:'first',id:selected[0].id,position:'W1'},{source:'first',id:selected[1].id,position:'C'},{source:'completionWitness',id:selected[2].id,position:'W2'}]},
};
await mkdir(dirname(outPath),{recursive:true});
// Exclusive creation also protects previous combined reports and accidental raw destinations.
await writeFile(outPath,JSON.stringify(combined,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out:outPath,status:combined.status,comparativeBlocks:validation.length,contexts:contexts.map(context=>({id:context.id,sourceContextId:context.sourceContextId,status:context.status})),driverFenceException:combined.driverFenceException,excludedDiagnostics:diagnostics.length}));
