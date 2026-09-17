import { performance } from 'node:perf_hooks';
import { cpus,platform,release } from 'node:os';
import { writeFileSync } from 'node:fs';
import { miningLoad } from '../tests/scenarios/mining.ts';
import { controlledInjury } from '../tests/scenarios/health.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';
import type { Command } from '../src/sim/types.ts';

const stats=(a:number[])=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const results=[],started=performance.now();
for(const count of [3,30,100]) {
  const w=miningLoad(count),ids=w.pawns.filter((_,i)=>i%2===0).map(p=>p.id),commands:{type:string;ms:number}[]=[],ticks:number[]=[],encoding:number[]=[],encoder=new SnapshotEncoder();
  for(const p of w.pawns){addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'revolver');for(let i=0;i<20;i++)controlledInjury(w,p,i%2?'left-arm':'right-leg',100,'cut');}
  const send=(c:Command)=>{const start=performance.now(),r=applyCommand(w,c);commands.push({type:c.type,ms:performance.now()-start});if(!r.ok)throw Error(r.reason);};
  send({type:'draft',pawnIds:ids,enabled:true});send({type:'draft-move',pawnIds:ids,target:{x:140,z:140},queue:false});send({type:'draft-move',pawnIds:ids,target:{x:109,z:142},queue:true});
  let movingTicks=0,maxDrafted=0;
  for(let i=0;i<800;i++) {
    if(i===400)send({type:'draft',pawnIds:ids,enabled:false});
    const start=performance.now();stepWorld(w);ticks.push(performance.now()-start);
    movingTicks+=w.pawns.filter(p=>p.draft&&p.moveCooldown>0).length;maxDrafted=Math.max(maxDrafted,w.pawns.filter(p=>p.draft).length);
    if(i%20===0){const start=performance.now();encoder.encode(w,0,6);encoding.push(performance.now()-start);}
    if(i%100===0){const errors=validateWorld(w);if(errors.length)throw Error(errors.join(';'));}
    if(performance.now()-started>120000)throw Error('Draft benchmark exceeded 120 seconds');
  }
  const errors=validateWorld(w),copy=deserializeWorld(serializeWorld(w));stepWorld(w,5);stepWorld(copy,5);
  const mined=count*4-w.jobs.filter(j=>j.kind==='mine').length;
  if(errors.length||serializeWorld(w)!==serializeWorld(copy)||!movingTicks||!mined||w.pawns.some(p=>p.draft)||w.piles.filter(p=>p.owner.type==='equipment').length!==count)throw Error(JSON.stringify({errors,mined,movingTicks}));
  results.push({actors:count,map:250,resources:w.resources.length,injuriesPerPawn:20,commands,tickMs:stats(ticks),encodingMs:stats(encoding),movingTicks,maxDrafted,mined,remainingJobs:w.jobs.length});
}
const report={date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,os:`${platform()} ${release()}`,protocol:'One pass per count, natural 250² with cleared working patch. Every actor armed and twenty small injuries. Half drafted with two directed moves, others mine/chop; manual undraft at tick 400, 800 measured ticks, strict continuation. Initial commands and periodic encoding measured separately, cold work included. No browser running this benchmark.',results};
writeFileSync('artifacts/drafting-cpu-v53.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
