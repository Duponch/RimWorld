import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { stepWorld, validateWorld, hashWorld } from '../src/sim/index.ts';
import { recreationFixture } from './fixtures/recreation.ts';

const rows=[],deadline=performance.now()+90000;
for(const population of [3,30,100]) {
  const samples:number[]=[],active={skygaze:0,horseshoes:0,travel:0,work:0};let final;
  for(let run=0;run<2;run++) {
    const world=recreationFixture(population);let errors=validateWorld(world);if(errors.length)throw new Error(errors.join(';'));
    for(let tick=0;tick<600;tick++) {
      const start=performance.now();stepWorld(world);samples.push(performance.now()-start);
      for(const p of world.pawns){const task=p.recreation.task;if(task)active[task.phase==='travel'?'travel':task.activity]++;else if(p.cooking||p.haul||p.jobId)active.work++;}
      if(performance.now()>deadline)throw new Error('Recreation audit exceeded 90 seconds');
    }
    errors=validateWorld(world);if(errors.length)throw new Error(errors.join(';'));
    final={hash:hashWorld(world),minimumRecreation:Math.min(...world.pawns.map(p=>p.recreation.level)),bored:world.pawns.filter(p=>Object.values(p.recreation.bored).some(Boolean)).length};
  }
  samples.sort((a,b)=>a-b);const at=(q:number)=>samples[Math.ceil(q*samples.length)-1];
  const row={population,ticks:samples.length,p50Ms:at(.5),p95Ms:at(.95),p99Ms:at(.99),maxMs:samples.at(-1),activePawnTicks:active,...final};rows.push(row);console.log(JSON.stringify(row));
}
writeFileSync(process.argv[2]??'artifacts/recreation-bench.json',JSON.stringify({date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,conditions:'250² seed 42; synthetic low joy, shared pins, camp work and physical needs. Two runs of 600 ticks from tick 2000, no warmup; setup/validation/activity counting excluded; activity totals span both runs, final state describes the last. No concurrent heavy tests.',rows},null,2)+'\n');
