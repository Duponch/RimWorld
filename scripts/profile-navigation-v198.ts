/** Bounded CPU diagnostic on the migrated mixed 250² fixture.
 * Native worker publication, rendering and GPU costs are not measured here.
 * Run sequentially: node --experimental-strip-types scripts/profile-navigation-v198.ts
 */
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cpus } from 'node:os';
import { Session } from 'node:inspector/promises';
import { gunzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { stepWorld,deserializeWorld,serializeWorld,validateWorld } from '../src/sim/index.ts';
import { WeightedSearch } from '../src/sim/weighted-search.ts';

const path='public/test-saves/v98/mixed-100.json',stored=readFileSync(path,'utf8'),envelope=JSON.parse(stored);
const raw=envelope.format==='lisiere-save'&&envelope.codec==='gzip-base64'?gunzipSync(Buffer.from(envelope.payload,'base64')).toString('utf8'):stored;
const warmup=20,ticks=60,hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const summarize=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return {mean:values.reduce((a,b)=>a+b,0)/values.length,p50:sorted[Math.ceil(values.length*.5)-1],p95:sorted[Math.ceil(values.length*.95)-1],max:sorted.at(-1)};};
async function run(instrumented:boolean){
  const w=deserializeWorld(raw),startTick=w.tick;
  if(validateWorld(w).length)throw Error('Invalid initial fixture');
  for(let i=0;i<warmup;i++)stepWorld(w);
  let advanceCalls=0,advanceMs=0,visited=0;const searches=new Set<WeightedSearch>(),original=WeightedSearch.prototype.advance;
  const session=new Session();
  if(instrumented){
    WeightedSearch.prototype.advance=function(...args){const began=performance.now(),before=this.field.visited;try{return original.apply(this,args);}finally{advanceMs+=performance.now()-began;visited+=this.field.visited-before;advanceCalls++;searches.add(this);}};
    session.connect();await session.post('Profiler.enable');await session.post('Profiler.setSamplingInterval',{interval:1000});await session.post('Profiler.start');
  }
  const measured:number[]=[];
  try {for(let i=0;i<ticks;i++){const start=performance.now();stepWorld(w);measured.push(performance.now()-start);}}
  finally {WeightedSearch.prototype.advance=original;}
  let sampled:unknown;
  if(instrumented){const {profile}=await session.post('Profiler.stop');session.disconnect();writeFileSync('tmp/v198/navigation.cpuprofile',JSON.stringify(profile));
    const nodeById=new Map(profile.nodes.map(n=>[n.id,n])),self=new Map<number,number>();
    for(let i=0;i<(profile.samples?.length??0);i++){const id=profile.samples![i]!;self.set(id,(self.get(id)??0)+(profile.timeDeltas?.[i]??0));}
    const total=[...self.values()].reduce((a,b)=>a+b,0);
    sampled={totalUs:total,top:[...self].sort((a,b)=>b[1]-a[1]).slice(0,18).map(([id,us])=>({function:nodeById.get(id)?.callFrame.functionName,url:nodeById.get(id)?.callFrame.url,selfPercent:100*us/total}))};
  }
  if(validateWorld(w).length)throw Error('Invalid final fixture');
  return {startTick,endTick:w.tick,schema:w.schemaVersion,pawns:w.pawns.length,animals:w.wildlife?.animals.length,stepWorldMs:summarize(measured),finalHash:hash(serializeWorld(w)),...(instrumented?{navigationAdvance:{advanceCalls,searches:searches.size,visited,totalMs:advanceMs,meanMsPerTick:advanceMs/ticks,fractionOfInstrumentedStep:advanceMs/measured.reduce((a,b)=>a+b,0),excludes:'constructor, topology/cost capture, route reconstruction and candidate scoring'},sampled}: {})};
}
mkdirSync('tmp/v198',{recursive:true});
const uninstrumented=await run(false),instrumented=await run(true);
if(uninstrumented.finalHash!==instrumented.finalHash)throw Error('Instrumentation changed simulation continuation');
const sourcePaths=['src/sim/engine.ts','src/sim/weighted-search.ts','src/sim/wildlife.ts','src/sim/threats.ts','src/sim/production-output.ts'];
const report={date:new Date().toISOString(),runtime:process.version,cpu:cpus()[0]?.model,warmup,ticks,fixture:path,fixtureHash:hash(stored),sourceHashes:Object.fromEntries(sourcePaths.map(p=>[p,hash(readFileSync(p,'utf8'))])),prepared:true,uninstrumented,instrumented,limits:'Absolute prepared CPU cost only; instrumentation/sampling adds overhead. No before/after gain, browser, GPU or 6× throughput claim.'};
writeFileSync('tmp/v198/navigation-cpu.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
