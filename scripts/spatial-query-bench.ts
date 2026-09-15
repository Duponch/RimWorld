import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { doorTraffic, doorTrafficOutcome } from '../tests/scenarios/doors.ts';
import { stepWorld, validateWorld } from '../src/sim/index.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';

// Establish before changing simulation, then compare complete authoritative
// checkpoints in identical array order. Hashing/validation is outside timing.
const mode=process.argv[2];
if(mode!=='before'&&mode!=='after')throw Error('Expected before or after');
const stats=(v:number[])=>{const s=[...v].sort((a,b)=>a-b);return {samples:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const report={date:new Date().toISOString(),cpu:cpus()[0]!.model,node:process.version,mode,
  protocol:'Identical V34 door traffic, clear 250², needs active, 3/30/100 builders; separate 100-tick warmup; bound3200; snapshots every5, full-world checkpoints every25 and final, all outside tick timing. One run per population.',
  phases:[] as {count:number;ticks:ReturnType<typeof stats>;snapshots:ReturnType<typeof stats>;checkpoints:{tick:number;sha256:string}[];outcome:unknown}[]};
const baseline=mode==='after'?JSON.parse(readFileSync('artifacts/spatial-query-before.json','utf8')) as typeof report:null;
stepWorld(doorTraffic(3),100);
for(const count of [3,30,100]) {
  const w=doorTraffic(count),encoder=new SnapshotEncoder(),ticks:number[]=[],snapshots:number[]=[],checkpoints:{tick:number;sha256:string}[]=[];
  encoder.encode(w,0,6);
  for(let t=0;t<3200;t++) {
    const start=performance.now();stepWorld(w);ticks.push(performance.now()-start);
    if(t%5===0){const at=performance.now();encoder.encode(w,0,6);snapshots.push(performance.now()-at);}
    if(t%25===0)checkpoints.push({tick:w.tick,sha256:digest(w)});
    if(t%10===0){const o=doorTrafficOutcome(w);if(o.doors===count&&o.stored===count*12&&!o.trees&&!o.jobs&&!o.hauling)break;}
  }
  checkpoints.push({tick:w.tick,sha256:digest(w)});
  const outcome={tick:w.tick,...doorTrafficOutcome(w)},errors=validateWorld(w);
  if(errors.length||outcome.doors!==count||outcome.stored!==count*12||outcome.jobs||outcome.trees||outcome.hauling)throw Error(JSON.stringify({count,errors,outcome}));
  const previous=baseline?.phases.find(p=>p.count===count);
  if(previous&&JSON.stringify(checkpoints)!==JSON.stringify(previous.checkpoints)) {
    writeFileSync(`tmp/spatial-query-mismatch-${count}.json`,JSON.stringify({outcome,checkpoints,world:w}));
    throw Error(`Authoritative continuation differs for ${count} builders; inspect tmp/spatial-query-mismatch-${count}.json`);
  }
  report.phases.push({count,ticks:stats(ticks),snapshots:stats(snapshots),checkpoints,outcome});
  console.log(JSON.stringify({...report.phases.at(-1),checkpoints:checkpoints.length,identical:!!previous}));
}
writeFileSync(`artifacts/spatial-query-${mode}.json`,JSON.stringify(report,null,2)+'\n');
