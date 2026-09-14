import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { cpus } from 'node:os';
import { applyCommand, stepWorld, serializeWorld, validateWorld } from '../src/sim/index.ts';
import { deconstructionCamp, fixtureBuilding } from '../tests/scenarios/deconstruction.ts';
import { woodAccount } from '../tests/scenarios/colony-player.ts';

function load(count:number) {
  const w=deconstructionCamp(count,250);w.tick=2000;
  const targets=new Map<number,{x:number;z:number}>();
  for(const [i,p] of w.pawns.entries()) {
    p.x=90+i%10*6;p.z=90+Math.floor(i/10)*6;
    const building=fixtureBuilding(w,(['bed','table','stool','horseshoes'] as const)[i%4]!,p.x+1,p.z);
    const target={x:p.x+2,z:p.z+3};targets.set(building.id,target);
    if(!applyCommand(w,{type:'install',structureId:building.id,...target,orientation:1}).ok)throw new Error('Installation refused');
  }
  return {w,targets};
}
const stats=(values:number[])=>{const a=[...values].sort((a,b)=>a-b);return {samples:a.length,p50:a[Math.ceil(a.length*.5)-1],p95:a[Math.ceil(a.length*.95)-1],p99:a[Math.ceil(a.length*.99)-1],max:a.at(-1)};};
const report={date:new Date().toISOString(),cpu:cpus()[0]!.model,node:process.version,map:250,
  protocol:'Synthetic 3/30/100 builders, one relocation per pawn, four furniture types. Three repetitions of 500 ticks; separate 100-tick warmup. Setup, commands and validation outside timing. Active ticks also reported separately; no browser/GPU measurement.',phases:[] as unknown[]};
stepWorld(load(3).w,100);
for(const count of [3,30,100]) {
  const times:number[]=[],active:number[]=[],transitions:number[]=[];let outcome;
  for(let run=0;run<3;run++) {
    const {w,targets}=load(count),initial=woodAccount(w);let carriedPeak=0;
    if(count===100&&run===0)writeFileSync('artifacts/furniture-transfer-load.json',serializeWorld(w));
    for(let i=0;i<500;i++) {
      const busy=w.jobs.length>0,before=w.packed.length,start=performance.now();stepWorld(w);const elapsed=performance.now()-start;
      times.push(elapsed);if(busy)active.push(elapsed);if(before!==w.packed.length)transitions.push(elapsed);carriedPeak=Math.max(carriedPeak,w.packed.length);
    }
    const errors=validateWorld(w),installed=w.structures.filter(s=>s.x===targets.get(s.id)?.x&&s.z===targets.get(s.id)?.z&&s.orientation===1).length;
    if(errors.length||installed!==count||w.packed.length||w.jobs.length||woodAccount(w)!==initial)throw new Error(JSON.stringify({errors,count,installed,packed:w.packed.length,jobs:w.jobs.length,initial,wood:woodAccount(w)}));
    outcome={installed,carriedPeak,woodConserved:true};
  }
  report.phases.push({pawns:count,tickMs:stats(times),activeTickMs:stats(active),ownershipTransitionTickMs:stats(transitions),outcome});
}
writeFileSync('artifacts/furniture-transfer-cpu.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
