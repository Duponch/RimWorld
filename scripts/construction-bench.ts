import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { constructionLoad } from '../tests/scenarios/construction-load.ts';
import { stepWorld, validateWorld } from '../src/sim/index.ts';
import { requiredMaterial } from '../src/sim/construction-materials.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';

const stats=(v:number[])=>{const s=[...v].sort((a,b)=>a-b);return {samples:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const report={date:new Date().toISOString(),cpu:cpus()[0]!.model,node:process.version,map:250,
  protocol:'Synthetic clear map: 3/30/100 builders, one wood wall (5) and steel stool (25) per pawn, four real deliveries then building. 3 repetitions to completion, bounded at 2000 ticks. 100 separate warmup ticks. Snapshots every 5 ticks timed separately, validation outside timing. Not a GPU benchmark.',phases:[] as unknown[]};
stepWorld(constructionLoad(3),100);
for(const count of [3,30,100]) {
  const ticks:number[]=[],snapshots:number[]=[],outcomes=[];
  for(let run=0;run<3;run++) {
    const w=constructionLoad(count),encoder=new SnapshotEncoder();encoder.encode(w,0,1);
    for(let t=0;t<2000&&w.jobs.length;t++) {
      let start=performance.now();stepWorld(w);ticks.push(performance.now()-start);
      if(t%5===0){start=performance.now();encoder.encode(w,0,1);snapshots.push(performance.now()-start);}
    }
    const errors=validateWorld(w),materials=Object.fromEntries((['wood','steel'] as const).map(item=>[item,w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0)+w.structures.reduce((n,s)=>n+requiredMaterial(s,item),0)]));
    if(errors.length||w.jobs.length||materials.wood!==count*5||materials.steel!==count*25)throw Error(JSON.stringify({errors,jobs:w.jobs.length,materials}));
    outcomes.push({tick:w.tick,buildings:w.structures.length,materials});
  }
  report.phases.push({count,ticks:stats(ticks),snapshots:stats(snapshots),outcomes});
}
writeFileSync('artifacts/materials-cpu.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
