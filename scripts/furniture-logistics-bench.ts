import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {cpus} from 'node:os';
import {applyCommand,stepWorld,serializeWorld,validateWorld} from '../src/sim/index.ts';
import {deconstructionCamp,fixtureBuilding} from '../tests/scenarios/deconstruction.ts';
import {woodAccount} from '../tests/scenarios/colony-player.ts';

function load(count:number) {
  const w=deconstructionCamp(count,250);w.tick=2000;
  for(const [i,p] of w.pawns.entries()) {
    p.x=90+i%10*6;p.z=90+Math.floor(i/10)*6;p.priorities.build=0;p.priorities.haul=1;
    const building=fixtureBuilding(w,(['bed','table','stool','horseshoes'] as const)[i%4]!,p.x+1,p.z);w.structures.pop();w.packed.push({building,owner:{type:'ground',x:building.x,z:building.z}});
    if(!applyCommand(w,{type:'stockpile',x:p.x+2,z:p.z+3,enabled:true,filters:{wood:false,food:false,furniture:true},priority:2,capacity:1}).ok)throw new Error('Stockpile refused');
  }
  return w;
}
const stats=(v:number[])=>{const a=[...v].sort((a,b)=>a-b);return {samples:a.length,p50:a[Math.ceil(a.length*.5)-1],p95:a[Math.ceil(a.length*.95)-1],p99:a[Math.ceil(a.length*.99)-1],max:a.at(-1)};};
const report={date:new Date().toISOString(),cpu:cpus()[0]!.model,node:process.version,map:250,
  protocol:'Synthetic 3/30/100 haulers, one whole furniture parcel and one exclusive stockpile cell per pawn. Three repetitions, up to 1000 active ticks, then 200 idle ticks. Separate 100-tick warmup. Commands, validation and serialization outside timing. No browser/GPU timing.',phases:[] as unknown[]};
stepWorld(load(3),100);
for(const count of [3,30,100]) {
  const active:number[]=[],idle:number[]=[],transitions:number[]=[];let outcome;
  for(let run=0;run<3;run++) {
    const w=load(count),initial=woodAccount(w),ids=w.packed.map(p=>p.building.id);let carriedPeak=0,done=0;
    if(count===100&&run===0)writeFileSync('artifacts/furniture-logistics-load.json',serializeWorld(w));
    const stored=()=>w.packed.filter(p=>p.owner.type==='ground'&&w.stockpiles.some(z=>p.owner.type==='ground'&&z.x===p.owner.x&&z.z===p.owner.z)).length;
    for(let i=0;i<1000&&done<count;i++) {
      const before=w.packed.map(p=>p.owner.type).join(','),start=performance.now();stepWorld(w);const elapsed=performance.now()-start;
      active.push(elapsed);if(before!==w.packed.map(p=>p.owner.type).join(','))transitions.push(elapsed);carriedPeak=Math.max(carriedPeak,w.packed.filter(p=>p.owner.type==='pawn').length);done=stored();
    }
    for(let i=0;i<200;i++){const start=performance.now();stepWorld(w);idle.push(performance.now()-start);}
    const errors=validateWorld(w);
    if(errors.length||done!==count||stored()!==count||w.pawns.some(p=>p.haul)||woodAccount(w)!==initial||JSON.stringify(ids)!==JSON.stringify(w.packed.map(p=>p.building.id)))throw new Error(JSON.stringify({errors,count,done,tick:w.tick}));
    outcome={stored:done,carriedPeak,identitiesConserved:true,woodConserved:true};
  }
  report.phases.push({pawns:count,activeTickMs:stats(active),idleTickMs:stats(idle),ownershipTransitionTickMs:stats(transitions),outcome});
}
writeFileSync('artifacts/furniture-logistics-cpu.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
