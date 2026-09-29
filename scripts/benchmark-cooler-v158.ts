/** Compare the V157 scalar cooler-face checks with the V158 step-local capture.
 * Run from the repository root: node --experimental-strip-types scripts/benchmark-cooler-v158.ts
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { advanceCoolers,coolerFaceBlocked,coolerFaces } from '../src/sim/cooler.ts';
import { deserializeWorld,serializeWorld,stepWorld } from '../src/sim/index.ts';
import { isPowerActive } from '../src/sim/power-rules.ts';
import { thermalLayout } from '../src/sim/temperature.ts';
import type { ThermalLayout } from '../src/sim/thermal-topology.ts';
import type { World } from '../src/sim/types.ts';

/** Frozen V157 implementation; the exported scalar remains its independent face oracle. */
export function legacyAdvanceCoolers(w:World,layout:ThermalLayout,outside:number):void {
  const regions=w.thermal?.regions??[];
  for(const s of w.structures){
    if(s.kind!=='cooler'||!s.cooler)continue;
    s.cooler.high=false;if(!isPowerActive(s))continue;
    const {cold,hot}=coolerFaces(s);
    if(coolerFaceBlocked(w,cold)||coolerFaceBlocked(w,hot))continue;
    const a=regions[layout.indices[cold.z*w.width+cold.x]!],b=regions[layout.indices[hot.z*w.width+hot.x]!];
    const coldT=a?.temperature??outside,hotT=b?.temperature??outside;
    const energy=21/6*Math.max(0,1-Math.max(hotT-coldT,hotT-40)/130);
    if(!a||coldT<=s.cooler.target||energy===0)continue;
    a.temperature=Math.max(s.cooler.target,coldT-energy/a.cells.length);
    if(b)b.temperature=Math.min(1000,b.temperature+energy*1.25/b.cells.length);
    s.cooler.high=true;
  }
}

function runBenchmark():void {
  const savePath='public/test-saves/v98/mixed-100.json',sourcePath='src/sim/cooler.ts',output='tmp/benchmark-cooler-v158.json';
  const stored=readFileSync(savePath,'utf8'),envelope=JSON.parse(stored);
  const raw=envelope?.format==='lisiere-save'&&envelope.codec==='gzip-base64'
    ?gunzipSync(Buffer.from(envelope.payload,'base64')).toString('utf8'):stored;
  const world=deserializeWorld(raw);
  if(world.width!==250||world.height!==250||world.structures.filter(s=>s.kind==='cooler').length!==17)throw new Error('Unexpected mixed-100 cooler fixture.');
  const fixtureSha256=createHash('sha256').update(stored).digest('hex');
  const sourceSha256=createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
  // True world ticks establish the power state; the repeated thermal calls
  // below are only an isolated CPU load and are not continued as gameplay.
  stepWorld(world,20);
  const powered=world.structures.filter(s=>s.kind==='cooler'&&s.cooler&&isPowerActive(s)).length;
  if(!powered)throw new Error('The prepared checkpoint has no powered cooler.');
  const layout=thermalLayout(world),outside=20;
  const initial=serializeWorld(world),rng={world:world.rng,fire:world.fires?.rng,wildlife:world.wildlife?.rng};
  const oldWorld=structuredClone(world),newWorld=structuredClone(world);
  legacyAdvanceCoolers(oldWorld,layout,outside);advanceCoolers(newWorld,layout,outside);
  if(serializeWorld(oldWorld)!==serializeWorld(newWorld))throw new Error('Thermal state or cooler modes differ from V157.');
  const faces=world.structures.filter(s=>s.kind==='cooler'&&isPowerActive(s)).flatMap(s=>Object.values(coolerFaces(s)));
  const faceOracle=faces.map(c=>coolerFaceBlocked(world,c));
  const temperature=world.thermal?.regions.map(r=>r.temperature)??[];
  const coolerModes=world.structures.filter(s=>s.kind==='cooler').map(s=>s.cooler!.high);
  const reset=()=>{
    for(let i=0;i<temperature.length;i++)world.thermal!.regions[i]!.temperature=temperature[i]!;
    let i=0;for(const s of world.structures)if(s.kind==='cooler')s.cooler!.high=coolerModes[i++]!;
  };
  type Variant='old'|'new';
  const run=(variant:Variant)=>variant==='old'?legacyAdvanceCoolers(world,layout,outside):advanceCoolers(world,layout,outside);
  for(let i=0;i<20;i++){reset();run('old');reset();run('new');}
  const callsPerBatch=80,samples:Array<{round:number;slot:number;variant:Variant;milliseconds:number;calls:number}>=[];
  for(let round=1;round<=4;round++)for(const [slot,variant] of (['old','new','new','old'] as const).entries()){
    reset();const start=performance.now();
    for(let i=0;i<callsPerBatch;i++)run(variant);
    samples.push({round,slot:slot+1,variant,milliseconds:performance.now()-start,calls:callsPerBatch});
  }
  reset();
  if(serializeWorld(world)!==initial||world.rng!==rng.world||world.fires?.rng!==rng.fire||world.wildlife?.rng!==rng.wildlife)
    throw new Error('Benchmark mutated the saved world or PRNG after reset.');
  if(faces.some((c,i)=>coolerFaceBlocked(world,c)!==faceOracle[i]))throw new Error('Scalar face oracle changed during benchmark.');
  if(createHash('sha256').update(readFileSync(sourcePath)).digest('hex')!==sourceSha256)throw new Error('Cooler source changed during benchmark.');
  const summary=(variant:Variant)=>{
    const values=samples.filter(s=>s.variant===variant).map(s=>s.milliseconds),ordered=[...values].sort((a,b)=>a-b);
    return {batches:values.length,callsPerBatch,meanMs:values.reduce((a,b)=>a+b,0)/values.length,
      medianMs:(ordered[3]!+ordered[4]!)/2,p95Ms:ordered[Math.ceil(ordered.length*.95)-1]!};
  };
  let commit:string|null=null;try{commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{}
  const old=summary('old'),current=summary('new');
  const report={timestamp:new Date().toISOString(),commit,runtime:process.version,platform:process.platform,cpuModel:cpus()[0]?.model??'unknown',
    source:{path:sourcePath,sha256:sourceSha256},fixture:{path:savePath,sha256:fixtureSha256,originalSchema:JSON.parse(raw).schemaVersion,
      migratedSchema:world.schemaVersion,tick:world.tick,width:world.width,height:world.height,structures:world.structures.length,coolers:17,powered},
    protocol:{sequence:'A/B/B/A',rounds:4,callsPerBatch,warmupCalls:40,oracle:'Exact serialized World after one V157/V158 thermal step; scalar coolerFaceBlocked stays independent.',
      preparation:'20 real ticks outside timing, then repeat only advanceCoolers on the same frozen geometry and reset room temperatures/modes between batches.',
      limitation:'Isolated thermal calls on a prepared checkpoint; not complete ticks, worker throughput, browser, GPU or FPS.'},
    oracle:{faces:faces.length,blocked:faceOracle.filter(Boolean).length,worldAndRngUnchanged:true},samples,old,current,ratioOldOverNew:old.meanMs/current.meanMs};
  mkdirSync('tmp',{recursive:true});writeFileSync(output,`${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify({output,fixture:report.fixture,oracle:report.oracle,old,current,ratioOldOverNew:report.ratioOldOverNew},null,2));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])runBenchmark();
