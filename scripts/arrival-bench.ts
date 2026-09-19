import { performance } from 'node:perf_hooks';
import { cpus,platform,release } from 'node:os';
import { writeFileSync } from 'node:fs';
import { pursuitLoad } from '../tests/scenarios/pursuit.ts';
import { dressLoad } from '../tests/scenarios/apparel.ts';
import { addMentalLoad } from '../tests/scenarios/mental-break.ts';
import { enableArrivals } from '../src/sim/arrivals.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';
const stats=(a:number[])=>{const s=[...a].sort((a,b)=>a-b);return {n:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const results=[];
for(const count of [3,30,100]) {
  const base=pursuitLoad(count).world;dressLoad(base);const mentalActors=addMentalLoad(base);enableArrivals(base);
  // Acceptance at heavy load is a controlled pending-offer stress fixture;
  // the provisional producer itself does not offer joins above 11 colonists.
  base.arrivals!.serial=1;base.arrivals!.pending={id:1,openedAt:base.tick,expiresAt:base.tick+6000,name:'Alix',profile:1};
  const acceptance:number[]=[],ticks:number[]=[],encoding:number[]=[];
  for(let run=0;run<12;run++) {
    const w=structuredClone(base),t=performance.now();const answer=applyCommand(w,{type:'answer-arrival',offerId:1,accept:true});const ms=performance.now()-t;
    if(!answer.ok)throw new Error(answer.reason);if(run>=2)acceptance.push(ms);
    const encoder=new SnapshotEncoder();encoder.encode(w,0,6);
    for(let i=0;i<120;i++){
      let t=performance.now();stepWorld(w);if(run>=2)ticks.push(performance.now()-t);
      if(i%4===0){t=performance.now();encoder.encode(w,0,6);if(run>=2)encoding.push(performance.now()-t);}
    }
    const errors=validateWorld(w);if(errors.length)throw new Error(errors.join('\n'));
  }
  results.push({initialActors:count,finalActors:base.pawns.length+1,mentalActors,acceptanceMs:stats(acceptance),tickMs:stats(ticks),encodingMs:stats(encoding)});
  console.log(JSON.stringify(results.at(-1)));
}
writeFileSync('artifacts/arrival-cpu-v66.json',JSON.stringify({date:new Date().toISOString(),hardware:{cpu:cpus()[0]?.model,platform:platform(),release:release(),node:process.version},controlledHeavyPopulation:true,results},null,2)+'\n');
