/** Sequential, local Node CPU diagnostic on untouched public saves.
 * node --experimental-strip-types scripts/benchmark-wildlife-reconciliation-v222.ts
 * Optional --baseline=tmp/simulation-baseline-v222 --output-directory=tmp/simulation-v222
 * Full Worlds/RNG are checked at each tick; clones, codec, migration, validation,
 * serialization, source hashes and IO are outside timers. No native/GPU/×6 claim.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {appendFileSync,existsSync,mkdirSync,readFileSync,readdirSync,realpathSync,writeFileSync} from 'node:fs';
import {cpus,platform,release} from 'node:os';
import {dirname,isAbsolute,join,relative,resolve,sep} from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {decodeStoredSave} from '../src/ui/save-storage-codec.ts';
import type {World} from '../src/sim/types.ts';

type Side='A'|'B';
type Runtime=Pick<typeof import('../src/sim/index.ts'),'deserializeWorld'|'serializeWorld'|'validateWorld'|'stepWorld'>
  & Pick<typeof import('../src/sim/wildlife.ts'),'reconcileWildlife'>;
const options=new Map<string,string>();
for(const arg of process.argv.slice(2)){
  const match=/^--(baseline|output-directory)=(.+)$/.exec(arg);
  assert.ok(match&&!arg.includes('\0'),'Unknown or empty option: '+arg);
  assert.ok(!options.has(match[1]!),'Duplicate option: '+match[1]);options.set(match[1]!,match[2]!);
}
const baseline=resolve(options.get('baseline')??'tmp/simulation-baseline-v222');
const output=resolve(options.get('output-directory')??'tmp/simulation-v222'),outputRoot=resolve('tmp/simulation-v222');
const inside=(path:string,root:string)=>{const r=relative(root,path);return r===''||r!=='..'&&!r.startsWith('..'+sep)&&!isAbsolute(r);};
assert.ok(inside(output,outputRoot),'Output must remain inside tmp/simulation-v222.');
let ancestor=output;while(!existsSync(ancestor))ancestor=dirname(ancestor);
assert.ok(inside(resolve(realpathSync(ancestor),relative(ancestor,output)),resolve(realpathSync(process.cwd()),'tmp/simulation-v222')),'Output escapes through a filesystem link.');
assert.equal(readFileSync(join(baseline,'commit.txt'),'utf8').trim(),'415e34727744be31382bbd4ae0004a7c1638b6f3');
const fixtures=[{id:'les-aulnes',path:'public/test-saves/v221/les-aulnes.json'},{id:'mixed-100',path:'public/test-saves/v98/mixed-100.json'}];
const sha=(raw:string|Buffer)=>createHash('sha256').update(raw).digest('hex');
function sources(){
  const files=[fileURLToPath(import.meta.url),...fixtures.map(f=>resolve(f.path)),join(baseline,'commit.txt')];
  const visit=(directory:string)=>{for(const entry of readdirSync(directory,{withFileTypes:true})){const path=join(directory,entry.name);if(entry.isDirectory())visit(path);else files.push(path);}};
  for(const root of [baseline,resolve('.')]){visit(join(root,'src'));files.push(join(root,'package.json'),join(root,'package-lock.json'));}
  return Object.fromEntries(files.sort().map(path=>[path.replaceAll('\\','/'),sha(readFileSync(path))]));
}
const before=sources(),sourceFingerprint=sha(JSON.stringify(before));
const runDirectory=join(output,'wildlife-'+new Date().toISOString().replaceAll(':','-')+'-'+process.pid);
mkdirSync(runDirectory,{recursive:true});
const save=(name:string,value:unknown)=>writeFileSync(join(runDirectory,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
save('sources-before.json',{sourceFingerprint,files:before});
const frozen=()=>assert.deepEqual(sources(),before,'Sources or input payloads changed during the diagnostic.');
async function load(root:string):Promise<Runtime>{
  const sim=await import(pathToFileURL(join(root,'src/sim/index.ts')).href) as typeof import('../src/sim/index.ts');
  const wildlife=await import(pathToFileURL(join(root,'src/sim/wildlife.ts')).href) as typeof import('../src/sim/wildlife.ts');
  return {...sim,reconcileWildlife:wildlife.reconcileWildlife};
}
const runtimes:Record<Side,Runtime>={A:await load(baseline),B:await load(resolve('.'))};
const checked=(api:Runtime,world:World)=>{assert.deepEqual(api.validateWorld(world),[]);return api.serializeWorld(world);};
const stats=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return {n:values.length,mean:values.reduce((a,b)=>a+b,0)/values.length,p50:sorted[Math.floor(values.length/2)],p95:sorted[Math.ceil(values.length*.95)-1],min:sorted[0],max:sorted.at(-1)};};
const order:Side[]=['A','B','B','A'];
type Row={cycle:number;slot:number;side:Side;milliseconds:number[]};
const summarize=(rows:Row[])=>Object.fromEntries((['A','B'] as Side[]).map(side=>[side,stats(rows.filter(row=>row.side===side).flatMap(row=>row.milliseconds))]));
const scenes:unknown[]=[];
try{
  frozen();
  for(const fixture of fixtures){
    const stored=readFileSync(fixture.path,'utf8'),raw=await decodeStoredSave(stored);
    const a=runtimes.A.deserializeWorld(raw),b=runtimes.B.deserializeWorld(raw),initial=checked(runtimes.A,a);
    assert.equal(checked(runtimes.B,b),initial);assert.equal(a.rng,b.rng);
    writeFileSync(join(runDirectory,fixture.id+'-initial.json'),initial,{flag:'wx'});
    const trace=join(runDirectory,fixture.id+'-trace.jsonl');writeFileSync(trace,'',{flag:'wx'});
    const initialTick=a.tick,initialCounts={pawns:a.pawns.length,animals:a.wildlife?.animals.length??0};let warmed='',final='';
    for(let offset=1;offset<=80;offset++){
      runtimes.A.stepWorld(a);runtimes.B.stepWorld(b);
      const left=checked(runtimes.A,a),right=checked(runtimes.B,b);
      if(left!==right){writeFileSync(join(runDirectory,fixture.id+'-mismatch-A.json'),left,{flag:'wx'});writeFileSync(join(runDirectory,fixture.id+'-mismatch-B.json'),right,{flag:'wx'});}
      assert.equal(left,right,fixture.id+' diverged at tick '+a.tick);assert.equal(a.tick,initialTick+offset);assert.equal(a.rng,b.rng);
      appendFileSync(trace,`{"tick":${a.tick},"rng":${a.rng},"sha256":"${sha(left)}","world":${left}}\n`);
      if(offset===20)warmed=left;if(offset===80)final=left;
    }
    writeFileSync(join(runDirectory,fixture.id+'-checkpoint80.json'),final,{flag:'wx'});
    const restoredA=runtimes.A.deserializeWorld(final),restoredB=runtimes.B.deserializeWorld(final);
    assert.equal(checked(runtimes.A,restoredA),final);assert.equal(checked(runtimes.B,restoredB),final);
    for(const [api,world] of [[runtimes.A,a],[runtimes.B,b],[runtimes.A,restoredA],[runtimes.B,restoredB]] as const)api.stepWorld(world);
    const continuation=checked(runtimes.A,a);
    for(const [api,world] of [[runtimes.B,b],[runtimes.A,restoredA],[runtimes.B,restoredB]] as const){assert.equal(checked(api,world),continuation);assert.equal(world.rng,a.rng);}
    writeFileSync(join(runDirectory,fixture.id+'-continuation81.json'),continuation,{flag:'wx'});
    const isolatedOracle=runtimes.A.deserializeWorld(warmed);runtimes.A.reconcileWildlife(isolatedOracle);
    const isolatedExpected=checked(runtimes.A,isolatedOracle),isolatedRows:Row[]=[],tickRows:Row[]=[];
    for(const side of ['A','B'] as Side[])for(let i=0;i<20;i++){
      const api=runtimes[side],world=api.deserializeWorld(warmed);api.reconcileWildlife(world);
      assert.equal(checked(api,world),isolatedExpected);assert.equal(world.rng,isolatedOracle.rng);
    }
    for(let cycle=0;cycle<2;cycle++)for(let slot=0;slot<order.length;slot++){
      const side=order[slot]!,api=runtimes[side],milliseconds:number[]=[];
      for(let i=0;i<20;i++){
        const world=api.deserializeWorld(warmed),start=performance.now();api.reconcileWildlife(world);const elapsed=performance.now()-start;
        assert.equal(checked(api,world),isolatedExpected);assert.equal(world.rng,isolatedOracle.rng);milliseconds.push(elapsed);
      }
      isolatedRows.push({cycle,slot,side,milliseconds});
    }
    // Unlike the oracle pass, no serialization/validation/observer runs between
    // measured full ticks. Their entire final World must match the oracle80.
    for(let cycle=0;cycle<2;cycle++)for(let slot=0;slot<order.length;slot++){
      const side=order[slot]!,api=runtimes[side],world=api.deserializeWorld(raw),milliseconds:number[]=[];
      for(let i=0;i<20;i++)api.stepWorld(world);assert.equal(checked(api,world),warmed);
      for(let i=0;i<60;i++){const start=performance.now();api.stepWorld(world);milliseconds.push(performance.now()-start);}
      assert.equal(checked(api,world),final);assert.equal(world.rng,JSON.parse(final).rng);
      tickRows.push({cycle,slot,side,milliseconds});console.log(fixture.id+' full ticks: cycle '+(cycle+1)+' slot '+(slot+1)+' '+side);
    }
    const warmWorld=runtimes.A.deserializeWorld(warmed);
    scenes.push({fixture:{...fixture,storedSha256:sha(stored),decodedSha256:sha(raw),originalSchema:JSON.parse(raw).schemaVersion,migratedSchema:a.schemaVersion,
      initialTick,width:a.width,height:a.height,...initialCounts},
      oracle:{ticks:80,equalAtEveryTick:true,rngEqualAtEveryTick:true,roundtripAndContinuation:true,initialSha256:sha(initial),warmedSha256:sha(warmed),finalSha256:sha(final),continuationSha256:sha(continuation),trace},
      isolated:{plantMealsAt20:warmWorld.wildlife?.animals.filter(animal=>animal.meal?.kind==='plant').length??0,expectedSha256:sha(isolatedExpected),rows:isolatedRows,statistics:summarize(isolatedRows)},
      fullTick:{rows:tickRows,statistics:summarize(tickRows)}});
    frozen();save(fixture.id+'-result.json',scenes.at(-1));console.log(fixture.id+' completed; exact oracle and source fingerprints pass.');
  }
  const after=sources();save('sources-after.json',{sourceFingerprint:sha(JSON.stringify(after)),files:after});assert.deepEqual(after,before);
  save('report.json',{createdAt:new Date().toISOString(),sourceFingerprint,sourcesUnchanged:true,baseline, candidate:resolve('.'),baselineCommit:'415e34727744be31382bbd4ae0004a7c1638b6f3',
    host:{node:process.version,platform:platform(),release:release(),cpu:cpus()[0]?.model,logicalCpus:cpus().length},
    protocol:{order,cycles:2,oracleTicks:80,warmupTicks:20,measuredTicks:60,isolatedWarmupsPerSide:20,isolatedSamplesPerBlock:20,
      isolatedInput:'Exact tick20 checkpoint; a fresh deserialize before each untimed warmup or timed reconcileWildlife.',
      fullTickInput:'Original decoded input; fresh deserialize per block, 20 untimed ticks then 60 timed ticks without observers.',
      exclusions:'Codec, migration, cloning, validation, serialization, hashes, IO and imports are outside timing; sequential modes and variants.',
      limits:'Local Node CPU samples only; no native cadence, browser, GPU, FPS or general ×6 claim.'},scenes});
  console.log('Report: '+join(runDirectory,'report.json'));
}catch(error){
  save('failure.json',{error:error instanceof Error?error.stack:String(error),filesAfter:sources(),sourceFingerprintBefore:sourceFingerprint});throw error;
}
