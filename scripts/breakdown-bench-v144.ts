import {performance} from 'node:perf_hooks';
import {cpus} from 'node:os';
import {advanceBreakdowns,newBreakdownCalendar} from '../src/sim/breakdowns.ts';
import {emptyLandscape} from '../src/sim/generation.ts';
import {newPowerState} from '../src/sim/power-rules.ts';

/** Isolates the confirmed-tick breakdown calendar, not the power grid, worker,
 * pathfinding, UI or GPU. Kept bounded and repeatable for V144 regressions. */
const ticks=200_000,repeats=7;
const median=(values:number[]):number=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)]!;
const rows=[];
for(const count of [0,3,30,100]){
  const samples:number[]=[];
  for(let run=0;run<repeats;run++){
    const world=emptyLandscape(42+run,64,64);
    world.breakdown=newBreakdownCalendar(world.seed,0);
    for(let i=0;i<count;i++)world.structures.push({
      id:world.nextId++,kind:'battery',x:2+i%30,z:2+Math.floor(i/30),
      orientation:0,footprint:'standard',material:'steel',power:newPowerState('battery'),battery:{stored:0},
    });
    const start=performance.now();
    for(let tick=1;tick<=ticks;tick++){world.tick=tick;advanceBreakdowns(world);}
    samples.push(performance.now()-start);
  }
  rows.push({buildings:count,localTicks:ticks,medianMs:+median(samples).toFixed(3),runsMs:samples.map(v=>+v.toFixed(3))});
}
console.log(JSON.stringify({cpu:cpus()[0]?.model,method:'Calendar only, seven fresh worlds per count; includes 1041-Core-tick checks and separate RNG, excludes all other simulation/rendering costs. Timings are not an A/B FPS claim.',rows},null,2));
