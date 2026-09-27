import { performance } from 'node:perf_hooks';
import { cpus } from 'node:os';
import { advanceHumanAges,HUMAN_YEAR_TICKS } from '../src/sim/human-age.ts';
import { createWorld } from '../src/sim/engine.ts';
import type { World } from '../src/sim/types.ts';

/** Isolated age pass: no worker, medical scheduler, renderer, GPU or FPS claim. */
const TICKS=3000,ACTORS=100,REPEATS=15;
const template=createWorld(42),source=template.pawns[0]!;
const measure=(birthday:boolean):{medianMs:number;minMs:number;maxMs:number;conditions:number}=>{
  const samples:number[]=[];
  let conditions=0;
  for(let run=0;run<REPEATS;run++){
    const world:World={...template,tick:0,rng:1,events:[],pawns:Array.from({length:ACTORS},(_,i)=>({
      ...source,id:10_000+i,state:'idle' as const,health:undefined,
      age:{biologicalTicks:(birthday?80*HUMAN_YEAR_TICKS-1500:30*HUMAN_YEAR_TICKS+1),chronologicalTicks:(birthday?80*HUMAN_YEAR_TICKS-1500:30*HUMAN_YEAR_TICKS+1)},
    }))};
    const start=performance.now();
    for(let i=0;i<TICKS;i++){world.tick++;advanceHumanAges(world);}
    samples.push(performance.now()-start);
    conditions+=world.pawns.filter(p=>p.health?.ageAilments?.length).length;
  }
  samples.sort((a,b)=>a-b);
  return {medianMs:samples[Math.floor(samples.length/2)]!,minMs:samples[0]!,maxMs:samples.at(-1)!,conditions};
};
const without=measure(false),withBirthday=measure(true);
console.log(JSON.stringify({actors:ACTORS,ticks:TICKS,repeats:REPEATS,cpu:cpus()[0]?.model,node:process.version,scope:'advanceHumanAges only; 100 actors × 3000 ticks; birthday case crosses age 80 once',withoutBirthday:without,withBirthday},null,2));
