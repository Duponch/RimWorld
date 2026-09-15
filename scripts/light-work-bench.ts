import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { miningLoad } from '../tests/scenarios/mining.ts';
import { fixtureFire } from '../tests/scenarios/work-environment.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { LightEnvironmentCache } from '../src/sim/light-environment.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';

const stats=(values:number[])=>{const v=values.slice().sort((a,b)=>a-b);return {count:v.length,p50:v[Math.ceil(v.length*.5)-1],p95:v[Math.ceil(v.length*.95)-1],p99:v[Math.ceil(v.length*.99)-1],max:v.at(-1)};};
const results=[];
for(const count of [3,30,100])for(const lit of [false,true]) {
  const w=miningLoad(count); // Generated 250² surroundings, commands for rocks and trees.
  // Move the fixture to night without future events/growth checkpoints.
  w.tick=6000;for(const p of w.pawns){p.schedule.fill('anything');p.recreation.level=100;}
  for(const p of w.pawns)if(lit)fixtureFire(w,p.x-1,p.z-1);
  const initialRocks=w.jobs.filter(j=>j.kind==='mine').length,initialWood=w.resources.filter(r=>r.kind==='tree').reduce((n,r)=>n+r.amount,0);
  const cache=new LightEnvironmentCache(),reads:number[]=[],samples:number[]=[],worst:{tick:number;ms:number;jobs:number}[]=[];
  for(let i=0;i<61;i++){const start=performance.now();cache.read(w);if(i)reads.push(performance.now()-start);}
  const checkpoints:string[]=[];
  let peakWorkers=0,slowEdges=0,edges=0;const deadline=performance.now()+90000;
  for(let i=0;i<2000&&w.jobs.length;i++) {
    if(performance.now()>deadline)throw new Error(`Watchdog ${count}/${lit} at ${w.tick}, ${w.jobs.length} jobs`);
    const start=performance.now();stepWorld(w);const ms=performance.now()-start;samples.push(ms);
    peakWorkers=Math.max(peakWorkers,w.pawns.filter(p=>p.state==='working').length);
    for(const p of w.pawns)if(p.motion&&p.motion.start>w.tick-1){edges++;if((p.motion.speedFactor??1)<1)slowEdges++;}
    if(ms>10)worst.push({tick:w.tick,ms,jobs:w.jobs.length});
    if(i%100===0){const errors=validateWorld(w);if(errors.length)throw new Error(errors.join(' '));checkpoints.push(createHash('sha256').update(serializeWorld(w)).digest('hex'));}
  }
  const pending=w.jobs.length,producedWood=w.piles.filter(p=>p.kind==='wood').reduce((n,p)=>n+p.quantity,0),remainingWood=w.resources.filter(r=>r.kind==='tree').reduce((n,r)=>n+r.amount,0);
  if(pending||producedWood!==count*12||remainingWood+producedWood!==initialWood)throw new Error(`Unfinished or unconserved load ${count}/${lit}: ${pending}/${producedWood}`);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,25);stepWorld(copy,25);if(serializeWorld(w)!==serializeWorld(copy))throw new Error('Replay mismatch');
  checkpoints.push(createHash('sha256').update(serializeWorld(w)).digest('hex'));
  results.push({count,lit,mined:initialRocks,producedWood,peakWorkers,edges,slowEdges,checkpoints,stepMs:stats(samples),lightReadMs:stats(reads),worst:worst.sort((a,b)=>b.ms-a.ms).slice(0,5)});
}
const report={date:new Date().toISOString(),cpu:os.cpus()[0]!.model,node:process.version,protocol:'No rendering or concurrent benchmark. Seed 42, natural 250², 3/30/100 workers, four rocks and one tree each, dark versus one campfire per worker. Real commands, needs, navigation and yields; state validation outside timed steps. 90s watchdog per case. Includes initial tick/cache warmup in simulation maxima; light-read stats discard first read.',results};
writeFileSync('artifacts/light-work-cpu.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
