import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { doorTraffic, doorTrafficOutcome } from '../tests/scenarios/doors.ts';
import { stepWorld, validateWorld } from '../src/sim/index.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';
const stats=(v:number[])=>{const s=[...v].sort((a,b)=>a-b);return {samples:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const report={date:new Date().toISOString(),cpu:cpus()[0]!.model,node:process.version,map:250,protocol:'Clear 250², 3/30/100 colonists build 25-wood doors in walled plots, cut an inside tree and haul 12 wood outside. One run per population, bound 3200 ticks, separate warmup 100 ticks; needs enabled. Snapshot every 5 ticks, validation outside timing. CPU only.',phases:[] as unknown[]};
stepWorld(doorTraffic(3),100);
for(const count of [3,30,100]) {
  const ticks:number[]=[],snapshots:number[]=[],outcomes=[];
  for(let run=0;run<1;run++) {
    const w=doorTraffic(count),encoder=new SnapshotEncoder();encoder.encode(w,0,6);
    for(let t=0;t<3200;t++) {
      const start=performance.now();stepWorld(w);ticks.push(performance.now()-start);
      if(t%5===0){const start=performance.now();encoder.encode(w,0,6);snapshots.push(performance.now()-start);}
      if(t%10===0){const o=doorTrafficOutcome(w);if(o.doors===count&&o.stored===count*12&&!o.trees&&!o.jobs&&!o.hauling)break;}
    }
    const outcome=doorTrafficOutcome(w),errors=validateWorld(w);
    if(errors.length||outcome.doors!==count||outcome.stored!==count*12||outcome.jobs||outcome.trees||outcome.hauling)throw Error(JSON.stringify({count,tick:w.tick,errors,outcome}));
    outcomes.push({tick:w.tick,...outcome});
  }
  report.phases.push({count,ticks:stats(ticks),snapshots:stats(snapshots),outcomes});
  console.log(JSON.stringify(report.phases.at(-1)));
}
writeFileSync('artifacts/doors-cpu.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
