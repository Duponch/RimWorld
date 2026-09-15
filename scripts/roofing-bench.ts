import { writeFileSync } from 'node:fs';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { roofTraffic } from '../tests/scenarios/roofing.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { validateWorld, serializeWorld, deserializeWorld } from '../src/sim/serialization.ts';
import { isRoofJob } from '../src/sim/roof-rules.ts';
const stats=(a:number[])=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const results=[];
for(const count of [3,30,100]) {
  const w=roofTraffic(count),samples:number[]=[],snapshots:number[]=[];let peakWorkers=0;
  for(let t=0;t<2400;t++) {
    const start=performance.now();stepWorld(w);samples.push(performance.now()-start);
    peakWorkers=Math.max(peakWorkers,w.jobs.filter(j=>isRoofJob(j)&&j.reservedBy!==null).length);
    if(t%100===0){const errors=validateWorld(w);if(errors.length)throw new Error(errors.join(' '));const s=performance.now();structuredClone(w);snapshots.push(performance.now()-s);}
    if(w.roofing!.constructed.length===25*count&&!w.jobs.length)break;
  }
  if(w.roofing!.constructed.length!==25*count||w.resources.length)throw new Error(`Roofing outcome failed for ${count}`);
  const wood=w.piles.reduce((n,p)=>n+p.quantity,0);if(wood!==12*count)throw new Error('Lost tree products');
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,100);stepWorld(copy,100);if(serializeWorld(w)!==serializeWorld(copy))throw new Error('Replay mismatch');
  results.push({count,roofCells:w.roofing!.constructed.length,wood,peakWorkers,ticks:samples.length,stepMs:stats(samples),structuredCloneMs:stats(snapshots)});
}
const report={date:new Date().toISOString(),cpu:os.cpus()[0]!.model,node:process.version,protocol:'250² clear map, 3/30/100 builders, 25 roof cells and one real tree per support; synchronous CPU step and structuredClone measured separately, no rendering.',results};
writeFileSync('artifacts/roofing-cpu.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
