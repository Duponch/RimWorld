import { writeFileSync } from 'node:fs';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { stonecuttingLoad } from '../tests/scenarios/stonecutting.ts';
import { fixtureFire } from '../tests/scenarios/work-environment.ts';
import { WorkEnvironmentCache } from '../src/sim/work-environment.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { validateWorld,serializeWorld,deserializeWorld } from '../src/sim/serialization.ts';
const stats=(a:number[])=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const results=[];
for(const count of [3,30,100]) {
  const w=stonecuttingLoad(count),cache=new WorkEnvironmentCache(),samples:number[]=[],reads:number[]=[],mutations:number[]=[];
  for(const p of w.pawns)fixtureFire(w,p.x+3,p.z+3);
  for(let i=0;i<100;i++){const start=performance.now();cache.read(w);reads.push(performance.now()-start);}
  for(let i=0;i<20;i++){const fire=w.structures.find(s=>s.kind==='campfire')!;fire.fuel!.ticks=i%2?12000:0;const start=performance.now();cache.read(w);mutations.push(performance.now()-start);}
  let peakWorkers=0;const deadline=performance.now()+90000;
  for(let t=0;t<3000;t++) {
    if(performance.now()>deadline)throw new Error(`Production watchdog, ${count} actors, tick ${w.tick}`);
    const start=performance.now();stepWorld(w);samples.push(performance.now()-start);
    peakWorkers=Math.max(peakWorkers,w.pawns.filter(p=>p.cooking?.phase==='work').length);
    if(t%100===0){const errors=validateWorld(w);if(errors.length)throw new Error(errors.join(' '));}
    if(!w.pawns.some(p=>p.cooking)&&w.structures.filter(s=>s.kind==='stonecutter').every(s=>s.bills![0]!.target===0))break;
  }
  const blocks=w.piles.filter(p=>p.kind==='blocks').reduce((n,p)=>n+p.quantity,0);
  if(blocks!==count*60)throw new Error(`Production result ${blocks}, expected ${count*60}`);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,30);stepWorld(copy,30);if(serializeWorld(w)!==serializeWorld(copy))throw new Error('Replay mismatch');
  results.push({count,blocks,peakWorkers,ticks:samples.length,stepMs:stats(samples),unchangedReadMs:stats(reads.slice(1)),changedEmitterMs:stats(mutations),lightRebuilds:cache.localLight.rebuilds});
}
const report={date:new Date().toISOString(),cpu:os.cpus()[0]!.model,node:process.version,protocol:'250², 3/30/100 artisans, three actual chunks each, equal number of lit campfires; production and deposit. Environment reads and emitter changes measured separately. No rendering.',results};
writeFileSync('artifacts/work-environment-cpu.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
