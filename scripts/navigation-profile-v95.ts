import { researchLoad } from '../tests/scenarios/research-load.ts';
import { habitatApparelLoad } from '../tests/scenarios/habitat-apparel-load.ts';
import { stepWorld,validateWorld } from '../src/sim/index.ts';
import { Session } from 'node:inspector';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const habitat=process.env.HABITAT==='1',world=habitat?habitatApparelLoad(100):researchLoad(100),timings:number[]=[];
for(let i=0;i<20;i++)stepWorld(world);
const session=new Session();session.connect();session.post('Profiler.enable');session.post('Profiler.start');
const modes={all:0,nearest:0,full:0},sameActorDecisions={any:0,nearestThenAll:0},allWithoutWeighted={count:0,connectivityVisited:0};
for(let i=0;i<200;i++){
  const start=performance.now(),stats={searches:[] as {pawnId:number;mode:'all'|'nearest'|'full';visited:number;unreachedGroups:number;connectivityVisited?:number}[]};
  stepWorld(world,1,stats);timings.push(performance.now()-start);
  const byPawn=new Map<number,string[]>();
  for(const search of stats.searches){modes[search.mode]++;if(search.mode==='all'&&search.visited===0){allWithoutWeighted.count++;allWithoutWeighted.connectivityVisited+=search.connectivityVisited??0;}const entries=byPawn.get(search.pawnId)??[];entries.push(search.mode);byPawn.set(search.pawnId,entries);}
  for(const entries of byPawn.values())if(entries.length>1){sameActorDecisions.any++;if(entries.includes('nearest')&&entries.includes('all'))sameActorDecisions.nearestThenAll++;}
}
const profile=await new Promise<unknown>((resolve,reject)=>session.post('Profiler.stop',(error,result)=>error?reject(error):resolve(result.profile)));
session.disconnect();writeFileSync(join(tmpdir(),'lisiere-v95-navigation-steady.cpuprofile'),JSON.stringify(profile));
const errors=validateWorld(world);if(errors.length)throw Error(errors.join('; '));
timings.sort((a,b)=>a-b);
console.log(JSON.stringify({scenario:habitat?'habitat-apparel/100':'research/100',ticks:200,p50:timings[99],p95:timings[189],max:timings[199],rng:world.rng,modes,sameActorDecisions,allWithoutWeighted}));
