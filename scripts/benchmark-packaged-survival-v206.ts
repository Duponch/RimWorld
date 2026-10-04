/** Frozen V205 baseline versus working V206 planner, on one 250x250 snapshot.
 * Run only after the V206 sources are frozen and concurrent performance work ends:
 * node --experimental-strip-types scripts/benchmark-packaged-survival-v206.ts
 * The frozen baseline and JSON report are written only below tmp/.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,readdirSync,existsSync,writeFileSync} from 'node:fs';
import {cpus} from 'node:os';
import {performance} from 'node:perf_hooks';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import type {Reachability} from '../src/sim/pathfinding.ts';
import type {World} from '../src/sim/types.ts';

type Variant='headV205'|'workingV206';
type Sample={round:number;slot:number;variant:Variant;milliseconds:number;calls:number;signature:string};
type Planner=(world:World,pawn:World['pawns'][number],access:Reachability,budget:{pairs:number})=>unknown;
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const sha=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
const fixturePath='public/test-saves/v98/mixed-100.json';
const outputPath='tmp/v206/cpu.json';
// V205 is pinned so later commits cannot silently change the baseline.
const baselineCommit='f2b6d62';

function trackedSources():{path:string;sha256:string}[] {
  return ['scripts/benchmark-packaged-survival-v206.ts',fixturePath,
    ...readdirSync('src/sim').filter(name=>name.endsWith('.ts')).map(name=>`src/sim/${name}`).sort()]
    .map(path=>({path,sha256:sha(readFileSync(path))}));
}

function extractHeadSim():{commit:string;archiveSha256:string;path:string} {
  const commit=baselineCommit;
  const archive=execFileSync('git',['archive','--format=tar',commit,'src/sim'],{maxBuffer:64*1024*1024});
  const path=`tmp/benchmark-v206-head-${commit.slice(0,12)}`;
  mkdirSync(path,{recursive:true});
  if(!existsSync(`${path}/src/sim/cooking-planner.ts`))
    execFileSync('tar',['-xf','-','-C',path],{input:archive,maxBuffer:16*1024*1024});
  const baseline=readFileSync(`${path}/src/sim/cooking-planner.ts`);
  const committed=execFileSync('git',['show',`${commit}:src/sim/cooking-planner.ts`],{maxBuffer:4*1024*1024});
  if(sha(baseline)!==sha(committed))throw new Error('Cached V205 planner differs from the committed source.');
  return {commit,archiveSha256:sha(archive),path};
}

async function run():Promise<void> {
  if(process.argv.length>2)throw new Error('Usage: node --experimental-strip-types scripts/benchmark-packaged-survival-v206.ts');
  const source=trackedSources(),head=extractHeadSim();
  const baseline=await import(pathToFileURL(resolve(head.path,'src/sim/cooking-planner.ts')).href);
  const current=await import('../src/sim/cooking-planner.ts');
  const {validPackagedSurvivalState}=await import('../src/sim/packaged-survival-save.ts');
  const {candidateAccess}=await import('../src/sim/candidate-access.ts');
  const {blockedCells}=await import('../src/sim/pathfinding.ts');
  const {CIVIL_TRANSIT_BLOCKERS}=await import('../src/sim/travel.ts');
  const {deserializeWorld,serializeWorld}=await import('../src/sim/index.ts');
  const stored=readFileSync(fixturePath,'utf8'),envelope=JSON.parse(stored);
  const raw=envelope.format==='lisiere-save'&&envelope.codec==='gzip-base64'
    ?gunzipSync(Buffer.from(envelope.payload,'base64')).toString('utf8'):stored;
  const world:World=deserializeWorld(raw);
  if(world.width!==250||world.height!==250||world.schemaVersion!==188)throw new Error('Expected a 250x250 mixed-100 scene migrated to V188.');
  const initial=serializeWorld(world),rng={world:world.rng,wildlife:world.wildlife?.rng,fire:world.fires?.rng};
  const assertUnchanged=()=>{
    if(serializeWorld(world)!==initial||world.rng!==rng.world||world.wildlife?.rng!==rng.wildlife||world.fires?.rng!==rng.fire)
      throw new Error('Planner changed World or a PRNG.');
  };
  const blocked=blockedCells(world);
  const reach=(pawn:World['pawns'][number])=>candidateAccess(world,pawn,blocked,CIVIL_TRANSIT_BLOCKERS,true);
  const pawns=world.pawns.filter(p=>baseline.availableCookingStations(world,p).length>0);
  if(!pawns.length)throw new Error('No eligible cooking pawn in the fixture.');
  const planners:Record<Variant,Planner>={headV205:baseline.planCooking,workingV206:current.planCooking};
  const invoke=(variant:Variant,index:number,access:Reachability)=>{
    const budget={pairs:32768};
    const plan=planners[variant](world,pawns[index]!,access,budget);
    return {plan,budget:budget.pairs};
  };
  let planned=0;
  for(let i=0;i<pawns.length;i++){
    const access=reach(pawns[i]!);
    const old=invoke('headV205',i,access),now=invoke('workingV206',i,reach(pawns[i]!));
    if(!same(old,now))throw new Error(`Plan or pair-budget mismatch for pawn ${pawns[i]!.id}.`);
    planned+=Number(old.plan!==null);
  }
  if(!planned)throw new Error('Fixture exercises no successful cooking proposal.');
  assertUnchanged();
  for(let i=0;i<pawns.length;i++){invoke('headV205',i,reach(pawns[i]!));invoke('workingV206',i,reach(pawns[i]!));}
  const samples:Sample[]=[];
  for(let round=1;round<=4;round++)for(const [slot,variant] of (['headV205','workingV206','workingV206','headV205'] as const).entries()){
    // Reachability preparation is outside the timed planner call.
    const accesses=pawns.map(reach);
    let count=0,budgetSum=0,pathCells=0,ingredients=0;
    const start=performance.now();
    for(let i=0;i<pawns.length;i++){
      const result=invoke(variant,i,accesses[i]!);
      count+=Number(result.plan!==null);budgetSum+=result.budget;
      const plan=result.plan as {path?:unknown[];task?:{ingredients?:unknown[]}}|null;
      pathCells+=plan?.path?.length??0;ingredients+=plan?.task?.ingredients?.length??0;
    }
    samples.push({round,slot:slot+1,variant,milliseconds:performance.now()-start,calls:pawns.length,
      signature:`${count}:${budgetSum}:${pathCells}:${ingredients}`});
    assertUnchanged();
  }
  if(samples.some(sample=>sample.signature!==samples[0]!.signature))throw new Error('Sampled plan signatures differ.');
  // The shared save/bridge guard scans entities even without new content.
  // Measure that added check separately, never fold it into planner timing.
  if(!validPackagedSurvivalState(world,world.schemaVersion))throw new Error('Prepared guard input refused.');
  for(let i=0;i<10000;i++)validPackagedSurvivalState(world,world.schemaVersion);
  const guardSamples:number[]=[],guardBatch=5000;
  for(let i=0;i<32;i++){
    const start=performance.now();
    for(let j=0;j<guardBatch;j++)if(!validPackagedSurvivalState(world,world.schemaVersion))throw new Error('Guard changed result.');
    guardSamples.push((performance.now()-start)/guardBatch);
  }
  guardSamples.sort((a,b)=>a-b);assertUnchanged();
  const guard={samples:32,callsPerSample:guardBatch,warmup:10000,p50Ms:guardSamples[15]!,p95Ms:guardSamples[30]!,
    limitation:'Absolute shared-guard CPU on the same 250x250, 100-pawn scene without V206 production; not full snapshot adoption, rendering, GPU or tick cost.'};
  if(!same(source,trackedSources()))throw new Error('Current source changed during the measurement.');
  const summary=(variant:Variant)=>{
    const values=samples.filter(s=>s.variant===variant).map(s=>s.milliseconds),sorted=[...values].sort((a,b)=>a-b);
    return {batches:values.length,callsPerBatch:pawns.length,
      meanMs:values.reduce((sum,value)=>sum+value,0)/values.length,
      medianMs:(sorted[3]!+sorted[4]!)/2,p95Ms:sorted[7]!,
      meanMsPerCall:values.reduce((sum,value)=>sum+value,0)/values.length/pawns.length};
  };
  const old=summary('headV205'),now=summary('workingV206');
  const report={timestamp:new Date().toISOString(),runtime:process.version,cpu:cpus()[0]?.model,
    baseline:{commit:head.commit,archiveSha256:head.archiveSha256,extractedPath:head.path},
    source,scene:{fixture:fixturePath,fixtureSha256:sha(stored),schema:world.schemaVersion,
      tick:world.tick,width:world.width,height:world.height,pawns:world.pawns.length,eligiblePawns:pawns.length,
      successfulPlans:planned,structures:world.structures.length,piles:world.piles.length},
    oracle:{exactPlansAndBudgets:true,identicalBatchSignatures:true,worldUnchanged:true,rngUnchanged:true},
    protocol:{sequence:'A/B/B/A',rounds:4,callsPerBatch:pawns.length,warmupCalls:2*pawns.length,
      preparation:'Same migrated 250x250 snapshot and independently prepared reachability for each planner call, excluded from timing.',
      limitation:'Existing cooking decisions only: V205 cannot plan the new V206 packaged survival bill. Isolated proposal CPU, not complete ticks, worker throughput, browser, GPU or FPS.'},
    samples,guard,headV205:old,workingV206:now,ratioHeadOverWorking:old.meanMs/now.meanMs};
  writeFileSync(outputPath,`${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify({output:outputPath,scene:report.scene,oracle:report.oracle,
    guard,headV205:old,workingV206:now,ratioHeadOverWorking:report.ratioHeadOverWorking},null,2));
}
await run();
