import { performance } from 'node:perf_hooks';
import { cpus,platform,release } from 'node:os';
import { writeFileSync } from 'node:fs';
import { resolveUnarmoredBullet } from '../src/sim/bullet-impact.ts';
import { createMedicalRecord,addResolvedInjury,medicalStatus } from '../src/sim/injury-state.ts';
import { validateMedicalRecord } from '../src/sim/injury-validation.ts';
import { healthRandom } from '../src/sim/health.ts';
import { HUMAN_BODY } from '../src/sim/body-definition.ts';

const stats=(a:number[])=>{a.sort((x,y)=>x-y);return {p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1)};};
const start=performance.now(),results=[];
for(const actors of [3,30,100])for(const wounds of [0,20]) {
  const parts=HUMAN_BODY.filter(p=>p.depth==='outside'&&!p.conceptual);
  const baseline=Array.from({length:actors},()=>{const r=createMedicalRecord(3000);for(let i=0;i<wounds;i++)addResolvedInjury(r,parts[i%parts.length].id,'cut',100,()=>.999999);return r;});
  const state={rng:34791},times:number[]=[],states:Record<string,number>={};let layerCount=0;
  const run=()=>baseline.map((r,i)=>resolveUnarmoredBullet(r,i%3===0?{part:'left-thumb',damage:12}:i%3===1?{part:'brain',damage:12}:{damage:12},()=>healthRandom(state)));
  for(let n=0;n<50;n++)run();
  for(let n=0;n<500;n++) {
    const t=performance.now(),impacts=run();times.push(performance.now()-t);
    for(const result of impacts){layerCount+=result.layers.length;const status=medicalStatus(result.record);states[status]=(states[status]??0)+1;}
    if(n%100===0)for(const result of impacts)if(validateMedicalRecord(result.record))throw Error('Invalid impact record');
    if(performance.now()-start>30000)throw Error('Impact benchmark exceeded 30 seconds');
  }
  // Same state and immutable inputs must reproduce all lesions, IDs and draws.
  const resume={...state},expected=run(),replayed=baseline.map((r,i)=>resolveUnarmoredBullet(r,i%3===0?{part:'left-thumb',damage:12}:i%3===1?{part:'brain',damage:12}:{damage:12},()=>healthRandom(resume)));
  if(JSON.stringify(expected)!==JSON.stringify(replayed)||state.rng!==resume.rng)throw Error('Impact replay mismatch');
  results.push({actors,woundsPerActor:wounds,batches:times.length,impacts:actors*times.length,layers:layerCount,states,batchMs:stats(times)});
}
const report={date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,os:`${platform()} ${release()}`,scope:'isolated impact resolution + medical record copy; 1/3 exterior overkill, 1/3 brain/outer propagation, 1/3 weighted selection; fixed input reset per batch; no navigation/World steps/worker/render; validation and baseline construction excluded',durationMs:performance.now()-start,results};
writeFileSync(process.argv[2]??'artifacts/bullet-impact-v54.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
