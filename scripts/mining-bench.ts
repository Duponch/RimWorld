import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { miningLoad } from '../tests/scenarios/mining.ts';
import { createWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';

const steel=process.argv[3]==='steel',limit=steel?1200:500;
const stats=(values:number[])=>{const a=[...values].sort((a,b)=>a-b);return {samples:a.length,p50:a[Math.ceil(a.length*.5)-1],p95:a[Math.ceil(a.length*.95)-1],p99:a[Math.ceil(a.length*.99)-1],max:a.at(-1)};};
const report={date:new Date().toISOString(),cpu:cpus()[0]!.model,node:process.version,map:250,ore:steel?'steel':'stone',measuredTicks:limit,protocol:'3/30/100 miners; 4 sandstone or steel cells + 1 tree each in cleared patch surrounded by the natural map. 3 repetitions; 100 separate warmup ticks. Snapshots every 5 ticks measured separately; validation outside timing.',generation:[] as {seed:number;milliseconds:number;oreCells:number}[],phases:[] as unknown[]};
for(const seed of [42,93,2048]){const start=performance.now(),w=createWorld(seed,250,250),milliseconds=performance.now()-start;report.generation.push({seed,milliseconds,oreCells:w.tiles.filter(t=>t.ore).length});}
stepWorld(miningLoad(3),100);
for(const count of [3,30,100]) {
  const ticks:number[]=[],snapshots:number[]=[],outcomes=[];
  for(let run=0;run<3;run++) {
    const w=miningLoad(count,steel),encoder=new SnapshotEncoder();encoder.encode(w,0,1);
    for(let t=0;t<limit;t++){let start=performance.now();stepWorld(w);ticks.push(performance.now()-start);if(t%5===0){start=performance.now();encoder.encode(w,0,1);snapshots.push(performance.now()-start);}}
    const errors=validateWorld(w);if(errors.length)throw new Error(errors.join(' '));
    const mined=w.tiles.filter(t=>t.terrain==='rough-stone').length;
    if(mined<count*4)throw new Error(`Only ${mined}/${count*4} mined`);
    const steelUnits=w.piles.reduce((n,p)=>n+(p.item==='steel'?p.quantity:0),0);if(steel&&steelUnits!==count*160)throw new Error('Steel conservation failure');
    outcomes.push({steelUnits,tick:w.tick,mined,chunks:w.piles.filter(p=>p.kind==='chunk').length,remaining:w.jobs.length});
  }
  report.phases.push({count,ticks:stats(ticks),snapshots:stats(snapshots),outcomes});
}
writeFileSync(process.argv[2]??'artifacts/mining-cpu.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
