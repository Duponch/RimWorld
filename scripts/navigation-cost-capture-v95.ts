import { createWorld } from '../src/sim/engine.ts';
import { navigationCosts } from '../src/sim/furniture-travel.ts';
import { resolveSite } from '../src/sim/site.ts';

// Small isolated diagnostic. This is not the mixed colony throughput benchmark.
const world=createWorld(42,16,16);
world.width=250;world.height=250;world.tiles=Array.from({length:250*250},(_,i)=>({terrain:i%7===0?'soil':'grass'}));
world.site=resolveSite(42);world.structures=[];world.jobs=[];world.piles=[];world.fires=undefined;
for(let i=0;i<3;i++)navigationCosts(world);
const timings:number[]=[];let checksum=0;
for(let i=0;i<30;i++){
  const start=performance.now(),costs=navigationCosts(world);timings.push(performance.now()-start);
  checksum+=costs.costs?.get((i*1237)%world.tiles.length)??0;
}
timings.sort((a,b)=>a-b);
console.log(JSON.stringify({captureMs:{p50:timings[14],p95:timings[28]},checksum}));
