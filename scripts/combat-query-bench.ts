import { performance } from 'node:perf_hooks';
import { cpus,platform,release } from 'node:os';
import { writeFileSync } from 'node:fs';
import { findShotLine,type ShotTarget } from '../src/sim/combat-space.ts';
import { shotAim,shotCover } from '../src/sim/combat-report.ts';
import { combatQueryField } from '../tests/scenarios/combat-queries.ts';
import type { Cell } from '../src/sim/types.ts';

const stats=(a:number[])=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const open=combatQueryField(250,250),wall=combatQueryField(250,250),door=combatQueryField(250,250),corner=combatQueryField(250,250);
for(const f of [open,wall,door,corner])for(let z=0;z<250;z++)for(let x=0;x<80;x++)if((x*17+z*13)%7===0)f.set(x,z,{key:`far-${x}-${z}`,fill:.5});
for(let z=0;z<250;z++){wall.walls[z*250+108]=1;door.walls[z*250+108]=1;}
open.set(119,105,{key:'target-cover',fill:.5});corner.walls[5*250+4]=1;
const scenes:Array<{field:ReturnType<typeof combatQueryField>;from:Cell;target:ShotTarget}>=[
  {field:open,from:{x:100,z:100},target:{cell:{x:120,z:105},leans:true}},
  {field:wall,from:{x:100,z:100},target:{cell:{x:120,z:105},leans:true}},
  {field:door,from:{x:100,z:105},target:{cell:{x:120,z:105},leans:true}},
  {field:corner,from:{x:3,z:3},target:{cell:{x:4,z:6},full:true}},
];
const results=[],started=performance.now();
for(const actors of [3,30,100]) {
  const times:number[]=[];let legal=0,blocked=0,estimatedHitSum=0,reads=0;
  for(let batch=-100;batch<1000;batch++) {
    const isOpen=batch%2===0;door.set(108,105,{key:'door',fill:1,full:true,openDoor:isOpen},!isOpen);
    for(const f of [open,wall,door,corner])f.resetReads();
    const start=performance.now();
    for(let i=0;i<actors;i++) {
      const {field,from,target}=scenes[(i+Math.abs(batch))%4],line=findShotLine(field.grid,from,target,25.9);
      if(line.ok){const cover=shotCover(field.grid,from,target.cell);const aim=shotAim({distance:line.distance,pawnAccuracy:.96,weaponAccuracy:[.8,.75,.55,.4],targetSize:1,standing:true,weather:1,blindSmoke:false},cover.passChance);if(batch>=0){legal++;estimatedHitSum+=aim.estimatedHit;}}
      else if(line.reason!=='blocked')throw Error(`Unexpected ${line.reason}`);
      else if(batch>=0)blocked++;
    }
    if(batch>=0){times.push(performance.now()-start);reads+=[open,wall,door,corner].reduce((n,f)=>n+f.reads(),0);}
    if(performance.now()-started>30000)throw Error('Combat query benchmark exceeded 30 seconds');
  }
  if(legal+blocked!==actors*1000||!legal||!blocked)throw Error('Invalid query totals');
  results.push({actors,queries:actors*1000,legal,blocked,estimatedHitSum,reads,queryBatchMs:stats(times)});
}
const report={date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,os:`${platform()} ${release()}`,protocol:'Isolated synchronous queries only; no World stepping, worker, renderer or real combat. Four synthetic 250² maps: clear cover, opaque wall, alternating door and full-target exposed edge. Unrelated cover populated. 100 warmup batches then 1000 measured batches of 3/30/100 candidate shooters; a local query reads current fields. Construction and door mutation excluded. Stable deterministic sequence, one pass per count.',results};
writeFileSync('artifacts/combat-queries-v53.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
