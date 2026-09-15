import { performance } from 'node:perf_hooks';
import { cpus,platform,release } from 'node:os';
import { writeFileSync } from 'node:fs';
import { assessBody,type BodyAssessmentInput } from '../src/sim/body-capacities.ts';
import { HUMAN_BODY } from '../src/sim/body-definition.ts';

/** Isolated physiological kernel: this measures neither game ticks nor FPS. */
const percentile=(values:number[],p:number)=>values[Math.min(values.length-1,Math.floor(values.length*p))]!;
const results=[];
let checksum=0;
for(const count of [3,30,100])for(const lesions of [0,1,20,100]) {
  const bodies:BodyAssessmentInput[]=Array.from({length:count},(_,actor)=>({pain:lesions?actor%70/100:0,missing:[],damage:Array.from({length:lesions},(_,i)=>({part:HUMAN_BODY[(i*7+actor*3)%HUMAN_BODY.length]!.id,loss:.1+(i%5)/10}))}));
  for(let warmup=0;warmup<100;warmup++)for(const body of bodies)checksum+=assessBody(body).capacities.moving;
  const times:number[]=[],cloneTimes:number[]=[];
  for(let batch=0;batch<500;batch++) {
    const start=performance.now();for(const body of bodies)checksum+=assessBody(body).capacities.moving;times.push(performance.now()-start);
    if(batch%10===0){const startCopy=performance.now();const copy=structuredClone(bodies);cloneTimes.push(performance.now()-startCopy);if(copy.length!==count)throw new Error('Copy lost a body');}
  }
  times.sort((a,b)=>a-b);cloneTimes.sort((a,b)=>a-b);
  results.push({actors:count,lesionsPerActor:lesions,batches:500,assessmentMs:{p50:percentile(times,.5),p95:percentile(times,.95),p99:percentile(times,.99),max:times.at(-1)},projectionCloneMs:{p95:percentile(cloneTimes,.95),max:cloneTimes.at(-1)}});
}
const report={date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,os:`${platform()} ${release()}`,scope:'isolated anatomy/capacity kernel; no World integration, GPU, frame or pathfinding workload',bodyParts:HUMAN_BODY.length,checksum,results};
writeFileSync(process.argv[2]??'artifacts/body-cpu-latest.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
