import { cpus } from 'node:os';
import { writeFileSync } from 'node:fs';
import { doorTraffic,doorTrafficOutcome } from '../tests/scenarios/doors.ts';
import { stepWorld,validateWorld,serializeWorld,deserializeWorld } from '../src/sim/index.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { initialSkills } from '../src/sim/skills.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';

const stats=(a:number[])=>{const v=[...a].sort((a,b)=>a-b);return {samples:v.length,p50:v[Math.ceil(v.length*.5)-1],p95:v[Math.ceil(v.length*.95)-1],p99:v[Math.ceil(v.length*.99)-1],max:v.at(-1)};};
const output=process.argv[2]??'artifacts/skills-cpu-latest.json';
const report={date:new Date().toISOString(),cpu:cpus()[0]!.model,node:process.version,protocol:'250², 3/30/100 actors, build doors and automatic roofs, then chop and haul through them. Level cycle 0/4/8/12/20, all passions, ordinary needs and eight physically accessible survival meals per person. Separate 100 tick warmup. Tick and snapshot clone measured separately, validation outside timing. 9000 tick watchdog per population. This is CPU/transfer work, not an FPS claim.',runs:[] as unknown[]};
stepWorld(doorTraffic(3),100);
for(const count of [3,30,100]) {
  const w=doorTraffic(count),ticks:number[]=[],copies:number[]=[],encoder=new SnapshotEncoder();
  w.pawns.forEach((p,i)=>p.skills=initialSkills([0,4,8,12,20][i%5]!,i%3 as 0|1|2,w.tick));
  for(const p of w.pawns)addGroundMaterial(w,'food',8,{x:p.x,z:p.z-2},'survival-meal');
  if(new Set(w.pawns.map(p=>p.skills.construction)).size!==count)throw Error('Aliased skill records');
  let peak=0;
  for(let t=0;t<9000;t++) {
    const start=performance.now();stepWorld(w);ticks.push(performance.now()-start);
    peak=Math.max(peak,w.pawns.filter(p=>p.state==='working').length);
    if(t%5===0){const at=performance.now();structuredClone(encoder.encode(w,0,6));copies.push(performance.now()-at);}
    if(t%1000===0)console.log(JSON.stringify({count,tick:w.tick,...doorTrafficOutcome(w)}));
    if(t%100===0&&validateWorld(w).length)throw Error(validateWorld(w).join(';'));
    if(t%10===0){const o=doorTrafficOutcome(w);if(o.doors===count&&o.stored===count*12&&!o.jobs&&!o.hauling&&!o.trees)break;}
  }
  const o=doorTrafficOutcome(w);
  writeFileSync('tmp/skills-bench-last-world.json',JSON.stringify(w));
  if(o.doors!==count||o.stored!==count*12||o.jobs||o.hauling||o.trees)throw Error(JSON.stringify({count,o}));
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,30);stepWorld(copy,30);
  if(JSON.stringify(w)!==JSON.stringify(copy))throw Error('Continuation mismatch');
  const row={count,peakWorkers:peak,elapsedTicks:ticks.length,tick:stats(ticks),snapshotClone:stats(copies),outcome:o,skills:w.pawns.map(p=>p.skills)};
  report.runs.push(row);writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...row,skills:undefined}));
}
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
