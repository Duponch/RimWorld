import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { cookingFixture } from './fixtures/cooking.ts';
import { applyCommand, serializeWorld, stepWorld, validateWorld } from '../src/sim/index.ts';

const deadline=performance.now()+90000,rows=[];
for(const count of [3,30,100]) {
  const w=cookingFixture(count);w.tick=5400;
  for(const pawn of w.pawns) {
    pawn.rest=60;
    const bed={id:w.nextId++,kind:'bed' as const,x:pawn.x,z:pawn.z-2,orientation:0 as const,footprint:'standard' as const};
    w.structures.push(bed);pawn.bedId=bed.id;
  }
  const initialErrors=validateWorld(w);if(initialErrors.length)throw new Error(initialErrors.join(';'));
  const samples:number[]=[],phaseCosts:{phase:string;ms:number}[]=[];let asleepTicks=0,workTicks=0;
  const slept=new Set<number>(),working=new Set<number>();
  for(let i=0;i<450;i++) {
    const start=performance.now();stepWorld(w);const ms=performance.now()-start;samples.push(ms);
    if(w.tick===5500)phaseCosts.push({phase:'22h: begin sleep schedule',ms});
    for(const p of w.pawns) {if(p.state==='sleeping'){asleepTicks++;slept.add(p.id);}if(p.jobId!==null||p.haul||p.cooking){workTicks++;working.add(p.id);}}
    if(performance.now()>deadline)throw new Error(`90 s watchdog at ${count} pawns tick ${w.tick}`);
  }
  for(const p of w.pawns)applyCommand(w,{type:'schedule-paint',pawnId:p.id,hours:[23],assignment:'work'});
  const wakeStart=performance.now();stepWorld(w);phaseCosts.push({phase:'23h: work assignment after sleep',ms:performance.now()-wakeStart});
  const errors=validateWorld(w);if(errors.length)throw new Error(errors.join(';'));
  if(!workTicks||!asleepTicks)throw new Error('Fixture must exercise both work and physical sleep');
  const json=serializeWorld(w);samples.sort((a,b)=>a-b);const p=(q:number)=>samples[Math.ceil(samples.length*q)-1];
  const row={pawns:count,p50Ms:p(.5),p95Ms:p(.95),p99Ms:p(.99),maxMs:samples.at(-1),workTicks,asleepTicks,actorsWorked:working.size,actorsSlept:slept.size,phaseCosts,saveBytes:Buffer.byteLength(json),finalTick:w.tick,errors};rows.push(row);console.log(JSON.stringify(row));
}
writeFileSync('artifacts/schedules-bench.json',JSON.stringify({date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,map:'250x250 seed 42',conditions:'Synthetic cooking/hauling/growing/building camp, assigned beds; 450 ticks crossing 22h then Work painted at 23h; no warmup. Only stepWorld timed; setup/validation/JSON serialization excluded. Needs and traffic active; not FPS and not a throughput guarantee.',rows},null,2));
