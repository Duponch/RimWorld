import { performance } from 'node:perf_hooks';
import { cpus,platform,release } from 'node:os';
import { writeFileSync } from 'node:fs';
import { medicalCamp,controlledInjury } from '../tests/scenarios/health.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
const stats=(a:number[])=>{a.sort((x,y)=>x-y);return {p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1)};};
const start=performance.now(),results=[];
for(const count of [3,30,100])for(const wounds of [0,20,100]){
  const w=medicalCamp(count,250);
  w.pawns.forEach((p,i)=>{p.x=10+i%10*5;p.z=10+Math.floor(i/10)*5;p.priorities.gather=1;
    for(let n=0;n<wounds;n++)controlledInjury(w,p,n%2?'left-arm':'right-leg',50,'cut');
    for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)if(dx||dz){const x=p.x+dx,z=p.z+dz;w.resources.push({id:w.nextId++,kind:'tree',x,z,amount:12});if(!applyCommand(w,{type:'designate',kind:'chop',x,z}).ok)throw Error('Bad benchmark designation');}
  });
  if(validateWorld(w).length)throw Error(validateWorld(w).join(';'));
  const samples:number[]=[],copies:number[]=[],states:Record<string,number>={};
  for(let t=0;t<600;t++){
    const now=performance.now();stepWorld(w);if(t>=60)samples.push(performance.now()-now);
    if(t%30===0){const now=performance.now();structuredClone(w);copies.push(performance.now()-now);}
    if(t%60===0)for(const p of w.pawns)states[p.state]=(states[p.state]??0)+1;
    if(performance.now()-start>120000)throw Error('Benchmark exceeded 120 seconds');
  }
  if(validateWorld(w).length)throw Error(validateWorld(w).join(';'));
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,10);stepWorld(copy,10);if(serializeWorld(w)!==serializeWorld(copy))throw Error('Resume mismatch');
  results.push({count,woundsPerActor:wounds,map:250,samples:samples.length,stepMs:stats(samples),cloneMs:stats(copies),states,treesRemaining:w.resources.length});
}
const report={date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,os:`${platform()} ${release()}`,scope:'World 250², living wounded/healthy actors with real tree designations, full step/navigation/needs/health, structuredClone separated; no GPU/FPS claim',durationMs:performance.now()-start,results};
writeFileSync(process.argv[2]??'artifacts/health-world-cpu-v45.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
