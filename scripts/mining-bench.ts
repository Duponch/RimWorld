import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { miningLoad } from '../tests/scenarios/mining.ts';
import { stepWorld, validateWorld } from '../src/sim/index.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';

const stats=(values:number[])=>{const a=[...values].sort((a,b)=>a-b);return {samples:a.length,p50:a[Math.ceil(a.length*.5)-1],p95:a[Math.ceil(a.length*.95)-1],p99:a[Math.ceil(a.length*.99)-1],max:a.at(-1)};};
const report={date:new Date().toISOString(),cpu:cpus()[0]!.model,node:process.version,map:250,protocol:'3/30/100 miners; 4 sandstone cells + 1 tree each in cleared patch surrounded by the natural map. 3 repetitions of 500 ticks; 100 separate warmup ticks. Snapshots every 5 ticks measured separately; validation outside timing.',phases:[] as unknown[]};
stepWorld(miningLoad(3),100);
for(const count of [3,30,100]) {
  const ticks:number[]=[],snapshots:number[]=[],outcomes=[];
  for(let run=0;run<3;run++) {
    const w=miningLoad(count),encoder=new SnapshotEncoder();encoder.encode(w,0,1);
    for(let t=0;t<500;t++){let start=performance.now();stepWorld(w);ticks.push(performance.now()-start);if(t%5===0){start=performance.now();encoder.encode(w,0,1);snapshots.push(performance.now()-start);}}
    const errors=validateWorld(w);if(errors.length)throw new Error(errors.join(' '));
    const mined=w.tiles.filter(t=>t.terrain==='rough-stone').length;
    if(mined<count*4)throw new Error(`Only ${mined}/${count*4} mined`);
    outcomes.push({tick:w.tick,mined,chunks:w.piles.filter(p=>p.kind==='chunk').length,remaining:w.jobs.length});
  }
  report.phases.push({count,ticks:stats(ticks),snapshots:stats(snapshots),outcomes});
}
writeFileSync(process.argv[2]??'artifacts/mining-cpu.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
