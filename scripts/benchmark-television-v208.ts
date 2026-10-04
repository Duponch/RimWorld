/** Read-only recreation query cost, historical A/B/B/A then absolute TV setup.
 * Run centrally after source freeze: node --experimental-strip-types scripts/benchmark-television-v208.ts
 * Preparation, topology capture, strict migration, hashes and oracles are untimed.
 * This is neither a complete decision/tick nor worker/browser/GPU/FPS evidence.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync,readFileSync,readdirSync,writeFileSync } from 'node:fs';
import { cpus,platform,release } from 'node:os';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { Cell,World } from '../src/sim/types.ts';
import type { RecreationTask } from '../src/sim/recreation-rules.ts';
import type { RecreationSpace } from '../src/sim/recreation-space.ts';

const baselineCommit='0ffb0624',fixturePath='public/test-saves/v98/mixed-100.json';
const baselinePath=`tmp/benchmark-v208-head-${baselineCommit}`,outputPath='tmp/v208/cpu.json';
const scriptPath='scripts/benchmark-television-v208.ts',helperPath='tests/scenarios/television-v208.ts';
type Variant='baselineV207'|'workingV208';
type Queries={recreationSpace:(w:World,targets?:readonly Cell[])=>RecreationSpace;standableRecreationCell:(w:World,c:Cell,s?:RecreationSpace)=>boolean;recreationSiteValid:(w:World,t:RecreationTask,s?:RecreationSpace)=>boolean};
type Sample={round:number;slot:number;variant:Variant;calls:number;captureMsPerCall:number;queryMsPerBatch:number;totalMsPerCall:number};
const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const sourceHashes=(directory='src/sim')=>readdirSync(directory).filter(name=>name.endsWith('.ts')).sort().map(name=>({path:`${directory}/${name}`,sha256:sha(readFileSync(`${directory}/${name}`))}));
const tracked=()=>[scriptPath,fixturePath,helperPath,'tests/scenarios/deconstruction.ts'].map(path=>({path,sha256:sha(readFileSync(path))})).concat(sourceHashes());
function statistics(values:number[]){
  const sorted=[...values].sort((a,b)=>a-b),count=sorted.length;
  return {count,mean:values.reduce((n,v)=>n+v,0)/count,p50:(sorted[Math.floor((count-1)/2)]!+sorted[Math.floor(count/2)]!)/2,p95:sorted[Math.ceil(count*.95)-1]!,min:sorted[0]!,max:sorted.at(-1)!};
}

async function run(){
  if(process.argv.length>2)throw new Error('Usage: node --experimental-strip-types scripts/benchmark-television-v208.ts');
  process.env.TEMP=resolve('tmp/host-cache/temp');process.env.TMP=process.env.TEMP;process.env.NPM_CONFIG_CACHE=resolve('tmp/host-cache/npm-cache');
  mkdirSync(process.env.TEMP,{recursive:true});mkdirSync(process.env.NPM_CONFIG_CACHE,{recursive:true});
  const sourcesBefore=tracked();mkdirSync('tmp/v208',{recursive:true});mkdirSync(baselinePath,{recursive:true});
  const fullCommit=execFileSync('git',['rev-parse',`${baselineCommit}^{commit}`],{encoding:'utf8'}).trim();
  const archive=execFileSync('git',['archive','--format=tar',fullCommit,'src/sim'],{maxBuffer:64*1024*1024});
  execFileSync('tar',['-xf','-','-C',baselinePath],{input:archive,maxBuffer:16*1024*1024});
  const baselineSources=sourceHashes(`${baselinePath}/src/sim`);
  const oldQueries:Queries=await import(pathToFileURL(resolve(baselinePath,'src/sim/recreation-space.ts')).href);
  const currentQueries=await import('../src/sim/recreation-space.ts');
  const { deserializeWorld,serializeWorld,validateWorld }=await import('../src/sim/index.ts');
  const { prepareTelevisionWorld }=await import('../tests/scenarios/television-v208.ts');
  const { RoomTopologyCache }=await import('../src/sim/room-topology.ts');
  const { televisionWatchCells,tvActive }=await import('../src/sim/television-recreation.ts');
  const stored=readFileSync(fixturePath,'utf8'),envelope=JSON.parse(stored);
  const raw=envelope.format==='lisiere-save'&&envelope.codec==='gzip-base64'?gunzipSync(Buffer.from(envelope.payload,'base64')).toString('utf8'):stored;
  const world:World=deserializeWorld(raw);
  if(world.schemaVersion!==190||world.width!==250||world.height!==250)throw new Error('Expected strict migration of historical mixed-100 to schema190 on250².');
  if(world.structures.some(s=>s.kind==='tube-television')||world.jobs.some(j=>j.kind==='tube-television'||j.deconstruction?.kind==='tube-television'))throw new Error('Historical comparison must contain no TV.');
  const errors=validateWorld(world);if(errors.length)throw new Error(`Historical migration invalid: ${JSON.stringify(errors)}`);
  const initial=serializeWorld(world);const unchanged=()=>{if(serializeWorld(world)!==initial)throw new Error('Historical World or any serialized PRNG changed.');};
  const actors=world.pawns.filter(p=>p.state!=='dead').slice(0,24);
  if(!actors.length)throw new Error('Historical fixture needs a living actor.');
  const targets:Cell[]=actors.map((p,i)=>({x:p.x+(i%3+1)*2,z:p.z+2}));
  const tasks:RecreationTask[]=targets.map(target=>({activity:'skygaze',buildingId:null,target,phase:'travel',elapsed:0}));
  for(const p of actors)if(p.recreation.task)tasks.push(structuredClone(p.recreation.task));
  for(const s of world.structures){
    if(s.kind==='horseshoes')for(const target of currentQueries.horseshoeCells(s))tasks.push({activity:'horseshoes',buildingId:s.id,target,phase:'travel',elapsed:0});
    if(s.kind==='chess-table')for(const target of currentQueries.chessCells(s)){
      const seat=world.structures.find(c=>['stool','dining-chair','armchair'].includes(c.kind)&&c.x===target.x&&c.z===target.z);
      tasks.push({activity:'chess',buildingId:s.id,...(seat?{seatId:seat.id}:{}),target,phase:'travel',elapsed:0});
    }
  }
  const variants:Record<Variant,Queries>={baselineV207:oldQueries,workingV208:currentQueries};
  const query=(variant:Variant,space:RecreationSpace)=>tasks.map(task=>variants[variant].recreationSiteValid(world,task,space));
  const a=oldQueries.recreationSpace(world,targets),b=currentQueries.recreationSpace(world,targets);
  let cellsCompared=0,directIndexedDifferences=0;
  // Check both historical direct and indexed standability across the whole map.
  // Pre-existing direct/index differences are counted, never silently repaired.
  for(let z=0;z<world.height;z++)for(let x=0;x<world.width;x++){
    const cell={x,z},oldDirect=oldQueries.standableRecreationCell(world,cell),newDirect=currentQueries.standableRecreationCell(world,cell);
    const oldIndexed=oldQueries.standableRecreationCell(world,cell,a),newIndexed=currentQueries.standableRecreationCell(world,cell,b);
    if(oldDirect!==newDirect||oldIndexed!==newIndexed)throw new Error(`Historical standability changed at ${x},${z}.`);
    if(oldDirect!==oldIndexed)directIndexedDifferences++;cellsCompared++;
  }
  for(const cell of [{x:-1,z:0},{x:0,z:-1},{x:250,z:0},{x:0,z:250}]){
    if(oldQueries.standableRecreationCell(world,cell,a)!==currentQueries.standableRecreationCell(world,cell,b))throw new Error('Bounds oracle differs.');
  }
  const reference=query('baselineV207',a),directReference=tasks.map(t=>oldQueries.recreationSiteValid(world,t));
  if(!same(reference,query('workingV208',b))||!same(directReference,tasks.map(t=>currentQueries.recreationSiteValid(world,t))))throw new Error('Historical site oracle differs.');
  const signature=sha(JSON.stringify({reference,directReference}));unchanged();
  for(let i=0;i<4;i++)for(const variant of ['baselineV207','workingV208'] as const)query(variant,variants[variant].recreationSpace(world,targets));
  const samples:Sample[]=[],calls=3;
  for(let round=1;round<=4;round++)for(const [slot,variant] of (['baselineV207','workingV208','workingV208','baselineV207'] as const).entries()){
    let captureMs=0,queryMs=0;const outputs:boolean[][]=[];
    for(let call=0;call<calls;call++){
      const start=performance.now(),space=variants[variant].recreationSpace(world,targets),captured=performance.now();
      outputs.push(query(variant,space));const end=performance.now();captureMs+=captured-start;queryMs+=end-captured;
    }
    if(outputs.some(result=>!same(result,reference)))throw new Error('Timed historical oracle changed.');
    samples.push({round,slot:slot+1,variant,calls,captureMsPerCall:captureMs/calls,queryMsPerBatch:queryMs/calls,totalMsPerCall:(captureMs+queryMs)/calls});unchanged();
  }
  // Absolute new-content queries only: eight prepared people/chairs, fifteen
  // frontal candidates. This setup is not an integrated viewing campaign.
  const televisionWorld=prepareTelevisionWorld(8,8,true,250),screen=televisionWorld.structures.find(s=>s.kind==='tube-television')!;
  const tvErrors=validateWorld(televisionWorld);if(tvErrors.length)throw new Error(`TV fixture invalid: ${JSON.stringify(tvErrors)}`);
  if(!tvActive(screen))throw new Error('TV fixture requires engine-established current.');
  const topology=new RoomTopologyCache().read(televisionWorld),tvInitial=serializeWorld(televisionWorld);
  const tvTasks:RecreationTask[]=televisionWatchCells(screen).map(target=>{
    const seat=televisionWorld.structures.find(s=>s.kind==='stool'&&s.x===target.x&&s.z===target.z);
    return {activity:'watch-television',buildingId:screen.id,...(seat?{seatId:seat.id}:{}),target,phase:'travel',elapsed:0};
  });
  let topologyCalls=0;
  const readTopology=()=>{topologyCalls++;return topology;};
  const tvCapture=()=>currentQueries.recreationSpace(televisionWorld,undefined,false,readTopology);
  const tvQuery=(space:RecreationSpace)=>tvTasks.map(task=>currentQueries.recreationSiteValid(televisionWorld,task,space));
  const tvReference=tvQuery(tvCapture());
  if(topologyCalls!==1||tvReference.filter(Boolean).length!==8)throw new Error('Expected eight valid seats, seven empty candidates and one topology acquisition.');
  if(!same(tvReference,tvTasks.map(task=>currentQueries.recreationSiteValid(televisionWorld,task,undefined,()=>topology))))throw new Error('TV direct/indexed geometry differs.');
  for(let i=0;i<100;i++)tvQuery(tvCapture());
  const tvSamples:{captureMsPerCall:number;queryMsPerBatch:number;totalMsPerCall:number}[]=[],tvCalls=100;
  for(let sample=0;sample<16;sample++){
    let captureMs=0,queryMs=0;const outputs:boolean[][]=[];topologyCalls=0;
    for(let call=0;call<tvCalls;call++){
      const start=performance.now(),space=tvCapture(),captured=performance.now();outputs.push(tvQuery(space));
      const end=performance.now();captureMs+=captured-start;queryMs+=end-captured;
    }
    if(topologyCalls!==tvCalls||outputs.some(result=>!same(result,tvReference)))throw new Error('Absolute TV batch lost geometry/topology oracle.');
    if(serializeWorld(televisionWorld)!==tvInitial)throw new Error('TV queries mutated World or serialized PRNG.');
    tvSamples.push({captureMsPerCall:captureMs/tvCalls,queryMsPerBatch:queryMs/tvCalls,totalMsPerCall:(captureMs+queryMs)/tvCalls});
  }
  unchanged();const sourcesAfter=tracked();
  if(!same(sourcesBefore,sourcesAfter)||!same(baselineSources,sourceHashes(`${baselinePath}/src/sim`)))throw new Error('Sources changed during measurement.');
  const summary=(variant:Variant)=>{
    const selected=samples.filter(s=>s.variant===variant);
    return {captureMsPerCall:statistics(selected.map(s=>s.captureMsPerCall)),queryMsPerBatch:statistics(selected.map(s=>s.queryMsPerBatch)),totalMsPerCall:statistics(selected.map(s=>s.totalMsPerCall))};
  };
  const report={timestamp:new Date().toISOString(),runtime:process.version,cpu:cpus()[0]?.model,os:`${platform()} ${release()}`,
    baseline:{requestedCommit:baselineCommit,commit:fullCommit,archiveSha256:sha(archive),extractedPath:baselinePath,sources:baselineSources},sourcesBefore,sourcesAfter,
    scene:{fixture:fixturePath,fixtureSha256:sha(stored),schema:world.schemaVersion,tick:world.tick,width:world.width,height:world.height,pawns:world.pawns.length,structures:world.structures.length,resources:world.resources.length},
    oracle:{cellsCompared,boundsCompared:4,directIndexedDifferences,exactHistoricalStandability:true,exactHistoricalSiteQueries:true,signature,worldAndAllSerializedPrngUnchanged:true},
    protocol:{sequence:'A/B/B/A',rounds:4,batchesPerVariant:8,capturesPerBatch:calls,siteQueriesPerCapture:tasks.length,skyResourceTargets:targets.length,warmupCapturesPerVariant:4,
      preparation:'One strictly migrated common historical World; pinned baseline reads the same content. Extraction, migration, full-cell oracles and hashes are outside timing.',
      limitation:'Capture plus read-only site validation only; excludes routing, recreation decisions, room topology construction, complete ticks, worker, browser, GPU and FPS. No television exists in the historical baseline.'},
    samples,baselineV207:summary('baselineV207'),workingV208:summary('workingV208'),
    televisionAbsolute:{width:250,height:250,pawns:8,seats:8,candidates:15,validCandidates:8,topologyAcquisitionsPerCapture:1,warmup:100,samples:16,callsPerSample:tvCalls,
      captureMsPerCall:statistics(tvSamples.map(s=>s.captureMsPerCall)),queryMsPerBatch:statistics(tvSamples.map(s=>s.queryMsPerBatch)),totalMsPerCall:statistics(tvSamples.map(s=>s.totalMsPerCall)),rawSamples:tvSamples,
      limitation:'Absolute V208 capture and fifteen site queries using caller-captured current topology, eight prepared chairs and engine-established power. Topology acquisition returns the captured object; scanning/rebuilding topology, physical construction, integrated spectators and full decisions/ticks are excluded.'}};
  writeFileSync(outputPath,`${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify({output:outputPath,scene:report.scene,oracle:report.oracle,baselineV207:report.baselineV207,workingV208:report.workingV208,televisionAbsolute:report.televisionAbsolute},null,2));
}
await run();
