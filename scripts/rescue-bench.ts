import { performance } from 'node:perf_hooks';
import { cpus,platform,release } from 'node:os';
import { writeFileSync } from 'node:fs';
import { feedingCamp } from '../tests/scenarios/feeding.ts';
import { selfTendingCamp } from '../tests/scenarios/self-tending.ts';
import { urgentSelfCamp } from '../tests/scenarios/urgent-care.ts';
import { careCamp } from '../tests/scenarios/care.ts';
import { rescueCamp } from '../tests/scenarios/rescue.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
const stats=(a:number[])=>{a.sort((x,y)=>x-y);return {p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1)};};
const feeding=process.argv.includes('--feeding');
const care=process.argv.includes('--care');
const urgent=process.argv.includes('--urgent');
const self=urgent||process.argv.includes('--self');
const start=performance.now(),results=[];
for(const pairs of [1,15,50]){
  const w=self?(urgent?urgentSelfCamp:selfTendingCamp)(pairs*2,250):(feeding?feedingCamp:care?careCamp:rescueCamp)(pairs,250),samples:number[]=[],copies:number[]=[];let carryTicks=0;
  if(self)for(const p of w.pawns)p.selfTend=true;
  if(validateWorld(w).length)throw Error(validateWorld(w).join(';'));
  for(let t=0;t<(feeding||care||self?800:400);t++){
    const now=performance.now();stepWorld(w);samples.push(performance.now()-now);
    carryTicks+=w.pawns.filter(p=>feeding?p.feed?.phase==='feed':care||self?p.tend?.phase==='tend':p.rescue?.phase==='carry').length;
    if(t%30===0){const a=performance.now();structuredClone(w);copies.push(performance.now()-a);}
    if(performance.now()-start>90000)throw Error('Rescue benchmark exceeded 90 seconds');
  }
  const rescued=feeding?w.pawns.filter((p,i)=>i%2===1&&p.hunger>80).length:care||self?w.pawns.reduce((n,p)=>n+p.skills.medicine.xp,0)/175000:w.pawns.filter(p=>p.state==='downed'&&p.need?.kind==='sleep'&&p.need.bedId!==null).length;
  if(rescued!==pairs*(self?2:1)||!carryTicks||validateWorld(w).length)throw Error(JSON.stringify({pairs,rescued,carryTicks,errors:validateWorld(w)}));
  const copy=deserializeWorld(serializeWorld(w));stepWorld(copy,10);stepWorld(w,10);if(serializeWorld(copy)!==serializeWorld(w))throw Error('Continuation differs');
  results.push({actors:pairs*2,pairs,stepMs:stats(samples),cloneMs:stats(copies),rescued,carryTicks});
}
const report={date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,os:`${platform()} ${release()}`,scope:(urgent?'Urgent self-treatment then ordinary reevaluation; carryTicks counts work ticks; rescued counts fully treated adults. ':self?'Ordinary self-treatment; carryTicks counts work ticks; rescued counts fully self-treated adults. ':feeding?'Physical feeding; carryTicks counts bedside ticks; rescued counts fed patients. ':care?'Physical treatments and medical rest; carryTicks counts active doctor ticks; rescued counts fully treated patients. ':'Physical rescues; carryTicks counts active carrying ticks. ')+'Cleared 250x250 map; concurrent reservations, continuing health/needs; cold and warm ticks included, clones separate',results};
writeFileSync(urgent?'artifacts/urgent-care-cpu-v50.json':self?'artifacts/self-tending-cpu-v49.json':feeding?'artifacts/feeding-cpu-v48.json':care?'artifacts/care-cpu-v47.json':'artifacts/rescue-cpu-v46.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
