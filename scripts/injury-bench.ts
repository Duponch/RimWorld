import { performance } from 'node:perf_hooks';
import { cpus,platform,release } from 'node:os';
import { writeFileSync } from 'node:fs';
import { createMedicalRecord,addResolvedInjury,medicalStatus } from '../src/sim/injury-state.ts';
import { advanceMedical } from '../src/sim/injury-evolution.ts';
import { validateMedicalRecord } from '../src/sim/injury-validation.ts';
import { HUMAN_BODY } from '../src/sim/body-definition.ts';

/** Medical kernel only: no World, worker, GPU or FPS claim. */
const quantiles=(times:number[])=>{times.sort((a,b)=>a-b);return {p50:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],p99:times[Math.floor(times.length*.99)],max:times.at(-1)};};
const start=performance.now(),results=[];
for(const count of [3,30,100])for(const wounds of [0,1,20,100]) {
  const parts=HUMAN_BODY.filter(p=>p.depth==='outside'&&!p.conceptual);
  const records=Array.from({length:count},()=>{
    const r=createMedicalRecord();for(let i=0;i<wounds;i++)addResolvedInjury(r,parts[i%parts.length]!.id,'cut',100,()=>.999999);
    return r;
  });
  const contexts=records.map((_,i)=>({phase:i%60,posture:'standing' as const,starving:true}));
  const step=()=>records.forEach((r,i)=>advanceMedical(r,1,contexts[i]!,()=>.999999));
  for(let i=0;i<60;i++)step();
  const times:number[]=[],copies:number[]=[];
  for(let i=0;i<1200;i++) {
    const t=performance.now();step();times.push(performance.now()-t);
    if(i%40===0){const t=performance.now();const copy=structuredClone(records);copies.push(performance.now()-t);if(copy[0]!.tick!==records[0]!.tick)throw Error('Stale copy');}
    if(performance.now()-start>30000)throw Error('Medical benchmark exceeded 30 seconds');
  }
  for(const r of records)if(validateMedicalRecord(r))throw Error('Invalid benchmark record');
  const resumed=structuredClone(records);for(let i=0;i<60;i++)step();
  resumed.forEach((r,i)=>advanceMedical(r,60,contexts[i]!,()=>.999999));
  if(JSON.stringify(records)!==JSON.stringify(resumed))throw Error('Medical continuation mismatch');
  results.push({actors:count,woundsPerActor:wounds,samples:times.length,stepMs:quantiles(times),cloneMs:quantiles(copies),states:records.reduce((counts,r)=>{const state=medicalStatus(r);counts[state]=(counts[state]??0)+1;return counts;},{} as Record<string,number>)});
}
const report={date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,os:`${platform()} ${release()}`,scope:'isolated mutable medical records, phased bleeding; starvation deliberately inhibits healing; no World/worker/render/navigation',durationMs:performance.now()-start,results};
writeFileSync(process.argv[2]??'artifacts/injury-cpu-latest.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
