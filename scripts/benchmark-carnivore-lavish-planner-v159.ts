/** Exact HEAD V158 versus working V159 planner, on the same 250x250 snapshot.
 * Run: node --experimental-strip-types scripts/benchmark-carnivore-lavish-planner-v159.ts
 * The frozen HEAD source and JSON report are written only below tmp/.
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

type Variant='headV158'|'workingV159';
type Sample={round:number;slot:number;variant:Variant;milliseconds:number;calls:number;signature:string};
type Planner=(world:World,pawn:World['pawns'][number],access:Reachability,budget:{pairs:number})=>unknown;
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const sha=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
const fixturePath='public/test-saves/v98/mixed-100.json';
const outputPath='tmp/benchmark-carnivore-lavish-planner-v159.json';

function trackedSources():{path:string;sha256:string}[] {
  return ['scripts/benchmark-carnivore-lavish-planner-v159.ts',fixturePath,
    ...readdirSync('src/sim').filter(name=>name.endsWith('.ts')).map(name=>`src/sim/${name}`).sort()]
    .map(path=>({path,sha256:sha(readFileSync(path))}));
}

function extractHeadSim():{commit:string;archiveSha256:string;path:string} {
  const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const archive=execFileSync('git',['archive','--format=tar','HEAD','src/sim'],{maxBuffer:64*1024*1024});
  const path=`tmp/benchmark-v159-head-${commit.slice(0,12)}`;
  mkdirSync(path,{recursive:true});
  if(!existsSync(`${path}/src/sim/cooking-planner.ts`))
    execFileSync('tar',['-xf','-','-C',path],{input:archive,maxBuffer:16*1024*1024});
  const baseline=readFileSync(`${path}/src/sim/cooking-planner.ts`);
  const committed=execFileSync('git',['show','HEAD:src/sim/cooking-planner.ts'],{maxBuffer:4*1024*1024});
  if(sha(baseline)!==sha(committed))throw new Error('Cached HEAD planner differs from the committed source.');
  return {commit,archiveSha256:sha(archive),path};
}

async function run():Promise<void> {
  if(process.argv.length>2)throw new Error('Usage: node --experimental-strip-types scripts/benchmark-carnivore-lavish-planner-v159.ts');
  const source=trackedSources(),head=extractHeadSim();
  const baseline=await import(pathToFileURL(resolve(head.path,'src/sim/cooking-planner.ts')).href);
  const current=await import('../src/sim/cooking-planner.ts');
  const {candidateAccess}=await import('../src/sim/candidate-access.ts');
  const {blockedCells}=await import('../src/sim/pathfinding.ts');
  const {CIVIL_TRANSIT_BLOCKERS}=await import('../src/sim/travel.ts');
  const {deserializeWorld,serializeWorld}=await import('../src/sim/index.ts');
  const stored=readFileSync(fixturePath,'utf8'),envelope=JSON.parse(stored);
  const raw=envelope.format==='lisiere-save'&&envelope.codec==='gzip-base64'
    ?gunzipSync(Buffer.from(envelope.payload,'base64')).toString('utf8'):stored;
  const world:World=deserializeWorld(raw);
  if(world.width!==250||world.height!==250)throw new Error('Expected a 250x250 mixed-100 scene.');
  const initial=serializeWorld(world),rng={world:world.rng,wildlife:world.wildlife?.rng,fire:world.fires?.rng};
  const assertUnchanged=()=>{
    if(serializeWorld(world)!==initial||world.rng!==rng.world||world.wildlife?.rng!==rng.wildlife||world.fires?.rng!==rng.fire)
      throw new Error('Planner changed World or a PRNG.');
  };
  const blocked=blockedCells(world);
  const reach=(pawn:World['pawns'][number])=>candidateAccess(world,pawn,blocked,CIVIL_TRANSIT_BLOCKERS,true);
  const pawns=world.pawns.filter(p=>baseline.availableCookingStations(world,p).length>0);
  if(!pawns.length)throw new Error('No eligible cooking pawn in the fixture.');
  const planners:Record<Variant,Planner>={headV158:baseline.planCooking,workingV159:current.planCooking};
  const invoke=(variant:Variant,index:number,access:Reachability)=>{
    const budget={pairs:32768};
    const plan=planners[variant](world,pawns[index]!,access,budget);
    return {plan,budget:budget.pairs};
  };
  let planned=0;
  for(let i=0;i<pawns.length;i++){
    const access=reach(pawns[i]!);
    const old=invoke('headV158',i,access),now=invoke('workingV159',i,reach(pawns[i]!));
    if(!same(old,now))throw new Error(`Plan or pair-budget mismatch for pawn ${pawns[i]!.id}.`);
    planned+=Number(old.plan!==null);
  }
  if(!planned)throw new Error('Fixture exercises no successful cooking proposal.');
  assertUnchanged();
  for(let i=0;i<pawns.length;i++){invoke('headV158',i,reach(pawns[i]!));invoke('workingV159',i,reach(pawns[i]!));}
  const samples:Sample[]=[];
  for(let round=1;round<=4;round++)for(const [slot,variant] of (['headV158','workingV159','workingV159','headV158'] as const).entries()){
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
  if(!same(source,trackedSources()))throw new Error('Current source changed during the measurement.');
  const summary=(variant:Variant)=>{
    const values=samples.filter(s=>s.variant===variant).map(s=>s.milliseconds),sorted=[...values].sort((a,b)=>a-b);
    return {batches:values.length,callsPerBatch:pawns.length,
      meanMs:values.reduce((sum,value)=>sum+value,0)/values.length,
      medianMs:(sorted[3]!+sorted[4]!)/2,p95Ms:sorted[7]!,
      meanMsPerCall:values.reduce((sum,value)=>sum+value,0)/values.length/pawns.length};
  };
  const old=summary('headV158'),now=summary('workingV159');
  const report={timestamp:new Date().toISOString(),runtime:process.version,cpu:cpus()[0]?.model,
    baseline:{commit:head.commit,archiveSha256:head.archiveSha256,extractedPath:head.path},
    source,scene:{fixture:fixturePath,fixtureSha256:sha(stored),schema:world.schemaVersion,
      tick:world.tick,width:world.width,height:world.height,pawns:world.pawns.length,eligiblePawns:pawns.length,
      successfulPlans:planned,structures:world.structures.length,piles:world.piles.length},
    oracle:{exactPlansAndBudgets:true,identicalBatchSignatures:true,worldUnchanged:true,rngUnchanged:true},
    protocol:{sequence:'A/B/B/A',rounds:4,callsPerBatch:pawns.length,warmupCalls:2*pawns.length,
      preparation:'Same migrated 250x250 snapshot and independently prepared reachability for each planner call, excluded from timing.',
      limitation:'Existing cooking decisions only: HEAD V158 cannot plan the new V159 recipe. Isolated proposal CPU, not complete ticks, worker throughput, browser, GPU or FPS.'},
    samples,headV158:old,workingV159:now,ratioHeadOverWorking:old.meanMs/now.meanMs};
  writeFileSync(outputPath,`${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify({output:outputPath,scene:report.scene,oracle:report.oracle,
    headV158:old,workingV159:now,ratioHeadOverWorking:report.ratioHeadOverWorking},null,2));
}
await run();
