import { performance } from 'node:perf_hooks';
import { cpus,platform,release } from 'node:os';
import { writeFileSync } from 'node:fs';
import { captureWorldShotGrid } from '../src/sim/combat-world.ts';
import { findShotLine } from '../src/sim/combat-space.ts';
import { shotAim,shotCover } from '../src/sim/combat-report.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { miningLoad } from '../tests/scenarios/mining.ts';

const stats=(a:number[])=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const results=[],started=performance.now();
for(const actors of [3,30,100]) {
  const world=miningLoad(actors,true),inside=(x:number,z:number)=>x>=48&&x<=80&&z>=50&&z<=80;
  for(let z=50;z<=80;z++)for(let x=48;x<=80;x++)world.tiles[z*250+x]={terrain:'grass'};
  world.resources=world.resources.filter(r=>!inside(r.x,r.z));
  for(let z=50;z<=62;z++)world.tiles[z*250+60]={terrain:'rock',stone:'granite'};
  world.tiles[60*250+60]={terrain:'grass'};
  const door={id:world.nextId++,kind:'door' as const,x:60,z:60,orientation:0 as const,footprint:'standard' as const,material:'wood' as const,door:newDoorState(world.tick)};
  world.structures.push(door);
  world.structures.push({id:world.nextId++,kind:'stonecutter',x:69,z:66,orientation:0,footprint:'standard',material:'wood',bills:[]});
  world.resources.push({id:world.nextId++,kind:'tree',x:69,z:74,amount:12});
  const captures:number[]=[],queries:number[]=[],totals:number[]=[];let legal=0,blocked=0,hitSum=0;
  for(let batch=-50;batch<500;batch++) {
    door.door.open=batch%2===0;
    const rng=world.rng,start=performance.now(),grid=captureWorldShotGrid(world),captured=performance.now();
    for(let i=0;i<actors;i++) {
      const z=[54,60,66,74][(i+Math.abs(batch))%4],from={x:51,z},target={cell:{x:70,z},leans:true};
      const line=findShotLine(grid,from,target,25.9);
      if(line.ok) {
        const cover=shotCover(grid,from,target.cell),aim=shotAim({distance:line.distance,pawnAccuracy:.96,weaponAccuracy:[.8,.75,.55,.4],targetSize:1,standing:true,weather:1,blindSmoke:false},cover.passChance);
        if(batch>=0){legal++;hitSum+=aim.estimatedHit;}
      } else if(line.reason!=='blocked')throw Error(`Unexpected ${line.reason}`);
      else if(batch>=0)blocked++;
    }
    const end=performance.now();
    if(batch>=0){captures.push(captured-start);queries.push(end-captured);totals.push(end-start);}
    if(world.rng!==rng||grid.blocksSight(60,60)===door.door.open)throw Error('Invalid world capture');
    if(end-started>45000)throw Error('Combat world benchmark exceeded 45 seconds');
  }
  if(legal+blocked!==actors*500||!legal||!blocked)throw Error('Invalid query totals');
  results.push({actors,map:[world.width,world.height],resources:world.resources.length,rockCells:world.tiles.filter(t=>t.terrain==='rock').length,jobs:world.jobs.length,legal,blocked,hitSum,captureMs:stats(captures),queryBatchMs:stats(queries),totalBatchMs:stats(totals)});
}
const report={date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,os:`${platform()} ${release()}`,protocol:'Concrete 250² generated World, seed 42, 3/30/100 miners with existing mining/chopping designations; fixed geometric query corridor injected apart from working patch. 50 warmup + 500 measured batches per count, alternating logical door; one full capture shared by all candidate shots, then line/cover/aim. Capture allocations included; generation and door mutation excluded. No simulation stepping, worker, renderer, projectiles or actual firing. One pass; unrelated scene content retained.',results};
writeFileSync('artifacts/combat-world-v54.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
