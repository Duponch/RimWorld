/** Historical tactical capture CPU only, followed by an absolute V207 guard.
 * Run after sources freeze and other performance/native work ends:
 * node --experimental-strip-types scripts/benchmark-sandbags-v207.ts
 * Extraction and reports remain below tmp/. No simulation stepping or GPU.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync,readFileSync,readdirSync,writeFileSync } from 'node:fs';
import { cpus,platform,release } from 'node:os';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { World,Cell } from '../src/sim/types.ts';
import type { WorldShotGrid } from '../src/sim/combat-world.ts';
import type { ShotTarget,ShotLine } from '../src/sim/combat-space.ts';
import type { CoverReport } from '../src/sim/combat-report.ts';

const baselineCommit='eb8cebb',fixturePath='public/test-saves/v98/mixed-100.json';
const outputPath='tmp/v207/cpu.json',baselinePath=`tmp/benchmark-v207-head-${baselineCommit}`;
const scriptPath='scripts/benchmark-sandbags-v207.ts';
type Variant='baselineV206'|'workingV207';
type Pair={from:Cell;target:ShotTarget};
type Tactical={capture:(world:World)=>WorldShotGrid;line:(grid:WorldShotGrid,from:Cell,target:ShotTarget,range:number)=>ShotLine;cover:(grid:WorldShotGrid,from:Cell,target:Cell)=>CoverReport};
type Sample={round:number;slot:number;variant:Variant;calls:number;captureMsPerCall:number;queryMsPerBatch:number;totalMsPerCall:number;signature:string};
const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const sourceHashes=(directory='src/sim')=>readdirSync(directory).filter(name=>name.endsWith('.ts')).sort()
  .map(name=>({path:`${directory}/${name}`,sha256:sha(readFileSync(`${directory}/${name}`))}));
const tracked=()=>[{path:scriptPath,sha256:sha(readFileSync(scriptPath))},{path:fixturePath,sha256:sha(readFileSync(fixturePath))},...sourceHashes()];
function statistics(values:number[]){
  const sorted=[...values].sort((a,b)=>a-b),count=sorted.length;
  return {count,mean:values.reduce((n,v)=>n+v,0)/count,p50:(sorted[Math.floor((count-1)/2)]!+sorted[Math.floor(count/2)]!)/2,p95:sorted[Math.ceil(count*.95)-1]!,min:sorted[0]!,max:sorted.at(-1)!};
}

async function run(){
  if(process.argv.length>2)throw new Error('Usage: node --experimental-strip-types scripts/benchmark-sandbags-v207.ts');
  const sourcesBefore=tracked();mkdirSync('tmp/v207',{recursive:true});mkdirSync(baselinePath,{recursive:true});
  const fullCommit=execFileSync('git',['rev-parse',`${baselineCommit}^{commit}`],{encoding:'utf8'}).trim();
  const archive=execFileSync('git',['archive','--format=tar',fullCommit,'src/sim'],{maxBuffer:64*1024*1024});
  // Always overwrite extraction from the pinned archive, rather than trusting a cache.
  execFileSync('tar',['-xf','-','-C',baselinePath],{input:archive,maxBuffer:16*1024*1024});
  const baselineSources=sourceHashes(`${baselinePath}/src/sim`);
  const baselineWorld=await import(pathToFileURL(resolve(baselinePath,'src/sim/combat-world.ts')).href);
  const baselineSpace=await import(pathToFileURL(resolve(baselinePath,'src/sim/combat-space.ts')).href);
  const baselineReport=await import(pathToFileURL(resolve(baselinePath,'src/sim/combat-report.ts')).href);
  const currentWorld=await import('../src/sim/combat-world.ts');
  const currentSpace=await import('../src/sim/combat-space.ts');
  const currentReport=await import('../src/sim/combat-report.ts');
  const { validSandbagsState }=await import('../src/sim/sandbags-save.ts');
  const { deserializeWorld,serializeWorld }=await import('../src/sim/index.ts');
  const stored=readFileSync(fixturePath,'utf8'),envelope=JSON.parse(stored);
  const raw=envelope.format==='lisiere-save'&&envelope.codec==='gzip-base64'?gunzipSync(Buffer.from(envelope.payload,'base64')).toString('utf8'):stored;
  // One common, strictly migrated World; baseline reads the same historical content.
  const world:World=deserializeWorld(raw);
  if(world.schemaVersion!==189||world.width!==250||world.height!==250)throw new Error('Expected the historical mixed-100 World migrated to schema 189 on 250².');
  if(world.structures.some(s=>s.kind==='sandbags')||world.jobs.some(j=>j.kind==='sandbags'||j.deconstruction?.kind==='sandbags')||world.deconstructed.lostTextiles!==undefined)throw new Error('Historical comparison must not contain V207 content.');
  const initial=serializeWorld(world),rng={world:world.rng,wildlife:world.wildlife?.rng,fire:world.fires?.rng};
  const unchanged=()=>{if(serializeWorld(world)!==initial||!same(rng,{world:world.rng,wildlife:world.wildlife?.rng,fire:world.fires?.rng}))throw new Error('Tactical query or guard mutated World/PRNG.');};
  const variants:Record<Variant,Tactical>={
    baselineV206:{capture:baselineWorld.captureWorldShotGrid,line:baselineSpace.findShotLine,cover:baselineReport.shotCover},
    workingV207:{capture:currentWorld.captureWorldShotGrid,line:currentSpace.findShotLine,cover:currentReport.shotCover},
  };
  const actors=world.pawns.filter(p=>p.state!=='dead').slice(0,32);
  if(actors.length<2)throw new Error('Fixture requires at least two historical actors.');
  const pairs:Pair[]=actors.map((pawn,i)=>({from:{x:pawn.x,z:pawn.z},target:{cell:{x:actors[(i+1)%actors.length]!.x,z:actors[(i+1)%actors.length]!.z},leans:true}}));
  const query=(variant:Variant,grid:WorldShotGrid)=>pairs.map(pair=>({line:variants[variant].line(grid,pair.from,pair.target,25.9),cover:variants[variant].cover(grid,pair.from,pair.target.cell)}));
  const a=variants.baselineV206.capture(world),b=variants.workingV207.capture(world);
  if(a.width!==b.width||a.height!==b.height||a.capturedAt!==b.capturedAt)throw new Error('Capture metadata differs.');
  let cellsCompared=0;
  // Full cell oracle is outside timing and includes every possible line/cover lookup.
  for(let z=0;z<world.height;z++)for(let x=0;x<world.width;x++){
    if(a.blocksSight(x,z)!==b.blocksSight(x,z)||!same(a.coverAt(x,z),b.coverAt(x,z)))throw new Error(`Historical cell mismatch at ${x},${z}.`);
    cellsCompared++;
  }
  for(const [x,z] of [[-1,0],[0,-1],[world.width,0],[0,world.height]])if(a.blocksSight(x!,z!)!==b.blocksSight(x!,z!)||!same(a.coverAt(x!,z!),b.coverAt(x!,z!)))throw new Error('Bounds oracle differs.');
  const reference=query('baselineV206',a);
  if(!same(reference,query('workingV207',b)))throw new Error('Historical line/cover reports differ.');
  const signature=sha(JSON.stringify(reference));unchanged();
  for(let i=0;i<4;i++)for(const variant of ['baselineV206','workingV207'] as const)query(variant,variants[variant].capture(world));
  const samples:Sample[]=[],calls=3;
  for(let round=1;round<=4;round++)for(const [slot,variant] of (['baselineV206','workingV207','workingV207','baselineV206'] as const).entries()){
    let captureMs=0,queryMs=0;const outputs:unknown[]=[];
    for(let call=0;call<calls;call++){
      const start=performance.now(),grid=variants[variant].capture(world),captured=performance.now();
      const reports=query(variant,grid),end=performance.now();outputs.push(reports);captureMs+=captured-start;queryMs+=end-captured;
    }
    // Serialization, hashes and equality checks do not belong to the timed batch.
    if(outputs.some(result=>!same(result,reference)))throw new Error('Timed query batch lost its exact oracle.');
    samples.push({round,slot:slot+1,variant,calls,captureMsPerCall:captureMs/calls,queryMsPerBatch:queryMs/calls,totalMsPerCall:(captureMs+queryMs)/calls,signature});unchanged();
  }
  // Absolute cost only: V206 has no corresponding new-content guard to compare.
  if(!validSandbagsState(world,world.schemaVersion))throw new Error('Guard refuses the historical World.');
  for(let i=0;i<500;i++)validSandbagsState(world,world.schemaVersion);
  const guardSamples:number[]=[],guardCalls=1000;
  for(let sample=0;sample<16;sample++){
    const start=performance.now();for(let i=0;i<guardCalls;i++)if(!validSandbagsState(world,world.schemaVersion))throw new Error('Guard changed result.');
    guardSamples.push((performance.now()-start)/guardCalls);
  }
  unchanged();const sourcesAfter=tracked();
  if(!same(sourcesBefore,sourcesAfter)||!same(baselineSources,sourceHashes(`${baselinePath}/src/sim`)))throw new Error('Sources changed during the bounded measurement.');
  const summary=(variant:Variant)=>{
    const selected=samples.filter(s=>s.variant===variant);
    return {captureMsPerCall:statistics(selected.map(s=>s.captureMsPerCall)),queryMsPerBatch:statistics(selected.map(s=>s.queryMsPerBatch)),totalMsPerCall:statistics(selected.map(s=>s.totalMsPerCall))};
  };
  const report={timestamp:new Date().toISOString(),runtime:process.version,cpu:cpus()[0]?.model,os:`${platform()} ${release()}`,
    baseline:{requestedCommit:baselineCommit,commit:fullCommit,archiveSha256:sha(archive),extractedPath:baselinePath,sources:baselineSources},sourcesBefore,sourcesAfter,
    scene:{fixture:fixturePath,fixtureSha256:sha(stored),schema:world.schemaVersion,tick:world.tick,width:world.width,height:world.height,pawns:world.pawns.length,structures:world.structures.length,resources:world.resources.length,piles:world.piles.length},
    oracle:{cellsCompared,boundsCompared:4,exactLineCoverReports:true,signature,worldUnchanged:true,rngUnchanged:true},
    protocol:{sequence:'A/B/B/A',rounds:4,batchesPerVariant:8,capturesPerBatch:calls,queryPairsPerCapture:pairs.length,warmupCapturesPerVariant:4,
      preparation:'Common strict migration, extraction, full-cell oracle and source hashing outside timing. Each timed capture is fresh, shared by one fixed batch of up to 32 historical actor pairs; no World mutation.',
      limitation:'Historical capture and read-only line/cover inspection only. These pairs are queries, not integrated combatants or actual shots. Baseline has no sandbags, so this cannot compare V207 cover behavior. Not navigation, complete ticks, worker, browser, GPU, FPS or colony throughput.'},
    samples,baselineV206:summary('baselineV206'),workingV207:summary('workingV207'),
    guard:{warmup:500,samples:16,callsPerSample:guardCalls,msPerCall:statistics(guardSamples),rawMsPerCall:guardSamples,
      limitation:'Absolute validSandbagsState on the same historical 250² World without sandbags or textile-loss entries; excludes active new-content validation, adoption, full save validation, worker and rendering.'}};
  writeFileSync(outputPath,`${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify({output:outputPath,scene:report.scene,oracle:report.oracle,baselineV206:report.baselineV206,workingV207:report.workingV207,guard:report.guard},null,2));
}
await run();
