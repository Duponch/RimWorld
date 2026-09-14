import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { cpus } from 'node:os';
import { applyCommand, stepWorld, serializeWorld, validateWorld } from '../src/sim/index.ts';
import { deconstructionCamp, fixtureBuilding } from '../tests/scenarios/deconstruction.ts';
import { woodAccount } from '../tests/scenarios/colony-player.ts';

export function removalLoad(count:number) {
  const w=deconstructionCamp(count,250);w.tick=2000;
  for(const [i,p] of w.pawns.entries()) {
    p.x=110+i%10*3;p.z=110+Math.floor(i/10)*3;p.priorities.gather=2;
    const s=fixtureBuilding(w,(['wall','stool','bed','table','campfire'] as const)[i%5]!,p.x+1,p.z);
    w.resources.push({id:w.nextId++,kind:'tree',x:p.x-1,z:p.z,amount:12});
    for(const command of [{type:'designate',kind:'deconstruct',x:s.x,z:s.z},{type:'designate',kind:'chop',x:p.x-1,z:p.z}] as const)
      if(!applyCommand(w,command).ok)throw new Error('Load designation refused.');
  }
  return w;
}
const stats=(values:number[])=>{const a=[...values].sort((a,b)=>a-b);return {samples:a.length,p50:a[Math.ceil(a.length*.5)-1],p95:a[Math.ceil(a.length*.95)-1],p99:a[Math.ceil(a.length*.99)-1],max:a.at(-1)};};
const report={date:new Date().toISOString(),cpu:cpus()[0]!.model,node:process.version,map:250,
  protocol:'Synthetic 3/30/100 builders, one removal and one tree per pawn. 3 repetitions × 500 ticks; separate 100-tick warmup. Commands and validation outside measurements. Empty terrain isolates active simulation, not full-map rendering.',phases:[] as unknown[]};
const warm=removalLoad(3);stepWorld(warm,100);
for(const count of [3,30,100]) {
  const times:number[]=[],removals:number[]=[];let outcome;
  for(let run=0;run<3;run++) {
    const w=removalLoad(count),initial=woodAccount(w);
    if(count===100&&run===0)writeFileSync('artifacts/deconstruction-load.json',serializeWorld(w));
    for(let i=0;i<500;i++) {
      const before=w.deconstructed.count,start=performance.now();stepWorld(w);const elapsed=performance.now()-start;times.push(elapsed);
      if(w.deconstructed.count>before)removals.push(elapsed);
    }
    const errors=validateWorld(w);if(errors.length||woodAccount(w)!==initial||w.deconstructed.count!==count)throw new Error(JSON.stringify({errors,count,removed:w.deconstructed.count,wood:woodAccount(w),initial}));
    outcome={removed:w.deconstructed.count,treesRemaining:w.resources.length,ledger:w.deconstructed};
  }
  report.phases.push({pawns:count,tickMs:stats(times),ticksWithRemovalMs:stats(removals),outcome});
}
writeFileSync('artifacts/deconstruction-cpu.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
