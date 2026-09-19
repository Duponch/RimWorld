import { performance } from 'node:perf_hooks';
import { cpus,platform,release } from 'node:os';
import { writeFileSync } from 'node:fs';
import { medicalCamp } from '../tests/scenarios/health.ts';
import { advanceSocial } from '../src/sim/social.ts';
import { tickSkills } from '../src/sim/skills.ts';
import { validateWorld } from '../src/sim/serialization.ts';
const percentile=(a:number[],p:number)=>a[Math.ceil(a.length*p)-1];
const results=[];
for(const count of [3,30,100]){
  const w=medicalCamp(count,250),samples:number[]=[];
  w.pawns.forEach((p,i)=>{p.x=120+i%10;p.z=120+Math.floor(i/10);});
  for(let i=0;i<6000;i++){
    w.tick++;for(const p of w.pawns)tickSkills(w,p);
    const start=performance.now();advanceSocial(w);if(i>=60)samples.push(performance.now()-start);
  }
  const errors=validateWorld(w);if(errors.length)throw new Error(errors.join('\n'));
  samples.sort((a,b)=>a-b);results.push({count,samples:samples.length,p50:percentile(samples,.5),p95:percentile(samples,.95),p99:percentile(samples,.99),max:samples.at(-1),memories:w.pawns.reduce((n,p)=>n+(p.social?.memories.length??0),0),initiators:w.pawns.filter(p=>p.skills.social).length});
}
const proof={date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,os:`${platform()} ${release()}`,protocol:'Social pass only, not a game/frame benchmark. 250², 3/30/100 awake stationary civilians in a 10x10 cluster; 6000 local ticks, first 60 excluded. No sleep/combat, no injected memories. Full local validation after run. Skill tick outside timed interval. Separate mixed simulation/native audit remains required.',results};
writeFileSync('artifacts/social-cpu-v70.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(results));
