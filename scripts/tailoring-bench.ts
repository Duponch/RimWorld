import { cpus,platform,release } from 'node:os';
import { writeFileSync } from 'node:fs';
import { tailoringLoad } from '../tests/scenarios/tailoring-load.ts';
import { stepWorld,validateWorld } from '../src/sim/index.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';
const stats=(v:number[])=>{const s=[...v].sort((a,b)=>a-b);return {n:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const rows=[];stepWorld(tailoringLoad(3),100);
for(const count of [3,30,100]){
  const w=tailoringLoad(count),enc=new SnapshotEncoder(),ticks:number[]=[],snapshots:number[]=[];enc.encode(w,0,6);const started=performance.now();
  for(let i=0;i<650;i++){let t=performance.now();stepWorld(w);ticks.push(performance.now()-t);if(i%5===0){t=performance.now();enc.encode(w,0,6);snapshots.push(performance.now()-t);}if(performance.now()-started>60000)throw Error('Tailoring measurement exceeded 60s');}
  const errors=validateWorld(w);if(errors.length)throw Error(errors.join('; '));
  if(w.tailoring?.completed!==Math.ceil(count/2))throw Error(`Incomplete garments ${count}: ${w.tailoring?.completed}`);
  rows.push({actors:count,tickMs:stats(ticks),steadyTickMs:stats(ticks.slice(20)),snapshotMs:stats(snapshots),completed:w.tailoring.completed,mined:w.tiles.filter(t=>t.terrain==='rough-stone').length});
}
const report={date:new Date().toISOString(),cpu:cpus()[0]!.model,os:platform()+' '+release(),node:process.version,protocol:'Natural 250² map, 3/30/100 actors wearing tribalwear. Half gather 60 cloth and craft one garment, others mine/chop. 650 ticks, 100 separate warmup ticks, encoding every five ticks. Single pass, CPU only; no 6× guarantee.',rows};
writeFileSync('artifacts/tailoring-cpu-v72.json',JSON.stringify(report,null,2));console.log(JSON.stringify(rows));
