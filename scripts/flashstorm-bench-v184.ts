/** Isolated V184 CPU costs on the prepared natural 250² save.
 * Run alone from the repository root after freezing sources:
 * node --experimental-strip-types scripts/flashstorm-bench-v184.ts
 * No worker, snapshot adoption, RAF, browser, or GPU is measured here.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { cpus,totalmem } from 'node:os';
import { performance } from 'node:perf_hooks';
import { addMaterial,materialCanFit } from '../src/sim/materials.ts';
import { groundCapacity } from '../src/sim/ground-placement.ts';
import { FireContent } from '../src/sim/fire-content.ts';
import { advanceSurfaceWeather } from '../src/sim/environment-step.ts';
import { advanceFlashstorm,resolveSelectedFlashstorm } from '../src/sim/flashstorm.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld } from '../src/sim/serialization.ts';
import type { Cell,World } from '../src/sim/types.ts';

const FIXTURE='public/test-saves/v184/orage-sec-et-incendies.json';
const OUTPUT='tmp/flashstorm-bench-v184.json';
const SAMPLES=30,WARMUPS=4,IDLE_CALLS=1000,MAX_HEAP=1_200_000_000;
const sourcePaths=['scripts/flashstorm-bench-v184.ts','src/sim/types.ts','src/sim/serialization.ts',
  'src/sim/flashstorm.ts','src/sim/flashstorm-save.ts','src/sim/cassandra-misc.ts',
  'src/sim/weather.ts','src/sim/environment-step.ts','src/sim/fire.ts'];
const sha256=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
const stored=readFileSync(FIXTURE);
const fixture=deserializeWorld(stored.toString('utf8'));
assert.equal(fixture.width,250);assert.equal(fixture.height,250);
assert.equal(fixture.flashstorm,undefined);
assert.equal(fixture.fires?.items.length??0,0);
const sourceHashes=Object.fromEntries(sourcePaths.map(path=>[path,sha256(readFileSync(path))]));
function heapGuard():void {
  if(process.memoryUsage().heapUsed>MAX_HEAP)throw new Error('Flashstorm benchmark stopped at its 1.2 GB heap guard.');
}
function clone(world:World):World {heapGuard();return structuredClone(world);}
function same(a:World,b:World,context:string):void {
  assert.deepEqual(a,b,`${context}: independently prepared twins diverged`);
}
function summary(values:number[]) {
  assert.equal(values.length,SAMPLES);
  const sorted=[...values].sort((a,b)=>a-b);
  return {samples:values.length,p50Ms:(sorted[14]!+sorted[15]!)/2,
    p95Ms:sorted[Math.ceil(values.length*.95)-1]!,meanMs:values.reduce((sum,v)=>sum+v,0)/values.length};
}
function measure(name:string,run:()=>number):{name:string;samplesMs:number[];summary:ReturnType<typeof summary>} {
  for(let i=0;i<WARMUPS;i++)run();
  const samplesMs:number[]=[];
  for(let i=0;i<SAMPLES;i++){heapGuard();samplesMs.push(run());}
  return {name,samplesMs,summary:summary(samplesMs)};
}

// The real Misc opportunity is resolved by the unmodified engine outside time.
const selected=clone(fixture);stepWorld(selected,1);
assert.equal(selected.tick,fixture.tick+1);
assert.equal(selected.flashstorm?.active?.start,selected.tick);
assert.equal(selected.flashstorm?.active?.strikes,0);

// Selection's committed ticket/seed is staged on a separate copy. The timed
// operation is only the private radius and center choice, never fixture setup.
const selectionBase=clone(fixture);
selectionBase.tick++;
selectionBase.miscIncidents!.introDone=true;
selectionBase.miscIncidents!.opportunities++;
const selectionSeed=0x184184;
const selectionOracleA=clone(selectionBase),selectionOracleB=clone(selectionBase);
assert.equal(resolveSelectedFlashstorm(selectionOracleA,selectionSeed),true);
assert.equal(resolveSelectedFlashstorm(selectionOracleB,selectionSeed),true);
same(selectionOracleA,selectionOracleB,'open-map selection');
const selectionOpen=measure('select-center-natural-250',()=>{
  const world=clone(selectionBase); // excluded from measured interval
  const start=performance.now();
  const accepted=resolveSelectedFlashstorm(world,selectionSeed);
  const ms=performance.now()-start;
  assert.equal(accepted,true);assert.deepEqual(world.flashstorm,selectionOracleA.flashstorm);
  return ms;
});

// This prepared all-roof map deliberately exercises ten rejected centers and
// the final-center fallback. It is a worst-case search, not a natural episode.
const roofedBase=clone(selectionBase);
roofedBase.roofing={constructed:Array.from({length:roofedBase.width*roofedBase.height},(_,i)=>i),build:[],remove:[],cursor:0};
const roofedOracleA=clone(roofedBase),roofedOracleB=clone(roofedBase);
assert.equal(resolveSelectedFlashstorm(roofedOracleA,selectionSeed),true);
assert.equal(resolveSelectedFlashstorm(roofedOracleB,selectionSeed),true);
same(roofedOracleA,roofedOracleB,'roofed-map selection');
const selectionRoofed=measure('select-center-roofed-250',()=>{
  const world=clone(roofedBase);
  const start=performance.now();
  const accepted=resolveSelectedFlashstorm(world,selectionSeed);
  const ms=performance.now()-start;
  assert.equal(accepted,true);assert.deepEqual(world.flashstorm,roofedOracleA.flashstorm);
  return ms;
});

// Absence is explicitly the no-incident path. Every invocation sees a new
// local tick; clock setup is outside the timed interval. Per-call timer reads
// remain in the reported cost and can dominate this tiny path.
const absent=clone(fixture);
const absentBefore=JSON.stringify(absent.flashstorm);
const absentOracle=clone(absent);absentOracle.tick++;
advanceFlashstorm(absentOracle,()=>{throw Error('An absent incident struck.');});
assert.equal(absentOracle.flashstorm,undefined);
const absence=measure('absent-1000-calls',()=>{
  const expected=clone(absent);expected.tick+=IDLE_CALLS;
  let ms=0;
  for(let i=0;i<IDLE_CALLS;i++){
    absent.tick++; // setup outside this invocation's timer
    const start=performance.now();
    advanceFlashstorm(absent,()=>{throw Error('An absent incident struck.');});
    ms+=performance.now()-start;
  }
  assert.equal(JSON.stringify(absent.flashstorm),absentBefore);
  same(absent,expected,'absent 1000-call world');
  return ms;
});

// Find the first actual Flashstorm impact using the real surface path. Keep
// the complete world immediately before it, so weather and fire clocks match.
let firstBase:World|undefined,firstCell:Cell|undefined,firstCore:number|undefined;
let probe=clone(selected);
for(let tick=0;tick<80;tick++){
  const before=clone(probe),priorStrikes=probe.flashstorm!.active!.strikes;
  probe.tick++;advanceSurfaceWeather(probe,()=>{});
  if(probe.flashstorm!.active!.strikes>priorStrikes){
    firstBase=before;
    const lightning=probe.weather!.lastLightning!;
    firstCell={x:lightning.x,z:lightning.z};firstCore=lightning.coreTick;
    break;
  }
}
if(!firstBase||!firstCell||firstCore===undefined)
  throw new Error('No physical strike found in the first 80 local ticks.');
// A prepared wood stack within the confirmed 1.9-cell Flame footprint lets
// the oracle verify damage and ignition. A strike cell can already hold a
// different pile, so select only a genuinely available cell without moving it.
const footprint=new FireContent(firstBase);
let woodCell:Cell|undefined;
for(let dz=-1;dz<=1&&!woodCell;dz++)for(let dx=-1;dx<=1&&!woodCell;dx++){
  const cell={x:firstCell.x+dx,z:firstCell.z+dz};
  if(!footprint.inside(cell)||!footprint.line(firstCell,cell)||
    ['water','rock'].includes(firstBase.tiles[cell.z*firstBase.width+cell.x]!.terrain)||
    groundCapacity(firstBase,cell,'wood')<20||
    !materialCanFit(firstBase,'wood',20,{type:'ground',...cell},'wood'))continue;
  woodCell=cell;
}
if(!woodCell)throw new Error('The confirmed Flame footprint has no legal prepared wood placement.');
addMaterial(firstBase,'wood',20,{type:'ground',...woodCell},'wood');
const strikeOracleA=clone(firstBase),strikeOracleB=clone(firstBase);
const firstBefore={count:firstBase.flashstorm!.totalStrikes,weather:firstBase.weather!.lightningCount,
  ignitions:firstBase.fires!.ledger.ignitions};
strikeOracleA.tick++;strikeOracleB.tick++;
advanceSurfaceWeather(strikeOracleA,()=>{});
advanceSurfaceWeather(strikeOracleB,()=>{});
same(strikeOracleA,strikeOracleB,'first physical strike');
assert.equal(strikeOracleA.flashstorm!.totalStrikes,firstBefore.count+1);
assert.ok(strikeOracleA.weather!.lightningCount>firstBefore.weather);
assert.ok(strikeOracleA.fires!.ledger.ignitions>firstBefore.ignitions);
assert.ok(strikeOracleA.piles.some(p=>p.item==='wood'&&p.owner.type==='ground'&&p.owner.x===woodCell.x&&p.owner.z===woodCell.z&&p.damage!==undefined));
assert.equal(strikeOracleA.weather!.lastLightning!.coreTick,firstCore);
const physicalStrike=measure('first-physical-surface-250',()=>{
  const world=clone(firstBase);
  world.tick++;
  const start=performance.now();
  advanceSurfaceWeather(world,()=>{});
  const ms=performance.now()-start;
  same(world,strikeOracleA,'measured physical strike');
  return ms;
});

// After the confirmed strike there is at least a 321-Core gap. Each measured
// call advances ten Core ticks; the clock is reset outside its timed interval.
const waiting=clone(strikeOracleA),active=waiting.flashstorm!.active!;
const waitFrom=waiting.tick*10;
assert.ok(active.nextStrikeCore>=waitFrom+10);
waiting.tick++;
const waitTwin=clone(waiting);advanceFlashstorm(waitTwin,()=>{throw Error('Waiting phase struck.');});
assert.equal(waitTwin.flashstorm!.active!.strikes,active.strikes);
const waitingBefore={strikes:active.strikes,total:waiting.flashstorm!.totalStrikes,rng:waiting.flashstorm!.rng};
const waitingPhase=measure('waiting-1000-one-tick-calls',()=>{
  let ms=0;
  for(let i=0;i<IDLE_CALLS;i++){
    active.lastCoreTick=waitFrom; // reset is deliberately outside the timer
    const start=performance.now();
    advanceFlashstorm(waiting,()=>{throw Error('Waiting phase struck.');});
    ms+=performance.now()-start;
  }
  assert.equal(active.lastCoreTick,waiting.tick*10);
  assert.deepEqual({strikes:active.strikes,total:waiting.flashstorm!.totalStrikes,rng:waiting.flashstorm!.rng},waitingBefore);
  same(waiting,waitTwin,'waiting 1000-call world');
  return ms;
});

for(const path of sourcePaths)assert.equal(sha256(readFileSync(path)),sourceHashes[path],`Source changed during benchmark: ${path}`);
let gitBase:string|null=null,gitStatus:string|null=null;
try{gitBase=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  gitStatus=execFileSync('git',['status','--short'],{encoding:'utf8'}).trim();}catch{/* Hashes still identify sources. */}
const report={timestamp:new Date().toISOString(),gitBase,gitStatus,
  machine:{platform:process.platform,arch:process.arch,cpu:cpus()[0]?.model??'unknown',logicalCpus:cpus().length,
    totalMemoryBytes:totalmem(),runtime:process.version},
  fixture:{path:FIXTURE,sha256:sha256(stored),schema:fixture.schemaVersion,tick:fixture.tick,
    width:fixture.width,height:fixture.height,pawns:fixture.pawns.length},
  sources:sourceHashes,
  protocol:{warmups:WARMUPS,samples:SAMPLES,idleCallsPerSample:IDLE_CALLS,maxHeapBytes:MAX_HEAP,
    selectionSeed,firstStrikeCore:firstCore,firstStrikeCell:firstCell,preparedWoodAt:woodCell,
    setup:'Deserialization, cloning, clock setup, source hashing, prepared wood, and all twin oracles are outside timed intervals.',
    oracle:'Deterministic twin runs must agree as full worlds; absence and waiting preserve all state except the explicit clock. The surface impact increases Flashstorm/weather counters, burns prepared wood, and creates an ignition. This is not an independent algorithmic oracle.',
    limits:'Phase costs only on a prepared 250² map; no whole stepWorld/worker/snapshot/RAF/GPU timing or revision A/B. Per-call timers can dominate tiny absent/waiting costs.'},
  cases:[absence,waitingPhase,selectionOpen,selectionRoofed,physicalStrike]};
mkdirSync('tmp',{recursive:true});writeFileSync(OUTPUT,`${JSON.stringify(report,null,2)}\n`);
process.stdout.write(JSON.stringify({output:OUTPUT,fixtureSha256:report.fixture.sha256,
  cases:report.cases.map(c=>({name:c.name,...c.summary}))},null,2)+'\n');
