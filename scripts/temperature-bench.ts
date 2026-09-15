import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import { stonecuttingLoad } from '../tests/scenarios/stonecutting.ts';
import { fixtureFire } from '../tests/scenarios/work-environment.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { reconcileTemperature } from '../src/sim/temperature.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';
const stats=(a:number[])=>{const s=a.slice().sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const results=[];
for(const count of [3,30,100]) {
  const w=stonecuttingLoad(count),roof:number[]=[];
  for(const p of w.pawns) {
    const add=(x:number,z:number)=>w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard'});
    for(let x=p.x-2;x<=p.x+3;x++)for(const z of [p.z-2,p.z+3])add(x,z);
    for(let z=p.z-1;z<p.z+3;z++)for(const x of [p.x-2,p.x+3])add(x,z);
    for(let z=p.z-1;z<p.z+3;z++)for(let x=p.x-1;x<p.x+3;x++)roof.push(z*w.width+x);
    fixtureFire(w,p.x-1,p.z-1);p.recreation.level=100;
  }
  w.roofing={constructed:roof.sort((a,b)=>a-b),build:[],remove:[],cursor:0};
  const setup=performance.now();reconcileTemperature(w);const initialMs=performance.now()-setup;
  if(w.thermal?.regions.length!==count)throw Error('Missing rooms');
  const reads:number[]=[],steps:number[]=[],clones:number[]=[];
  for(let i=0;i<60;i++){const start=performance.now();reconcileTemperature(w);reads.push(performance.now()-start);}
  const encoder=new SnapshotEncoder();let peakWorkers=0,maxBytes=0;const deadline=performance.now()+90000;
  for(let tick=0;tick<2000;tick++) {
    if(performance.now()>deadline)throw Error('Thermal production watchdog');
    const start=performance.now();stepWorld(w);steps.push(performance.now()-start);
    peakWorkers=Math.max(peakWorkers,w.pawns.filter(p=>p.cooking?.phase==='work').length);
    if(tick%20===0){const packet=encoder.encode(w,0,1);const start=performance.now();structuredClone(packet);clones.push(performance.now()-start);maxBytes=Math.max(maxBytes,JSON.stringify(packet).length);}
    if(tick%100===0){const errors=validateWorld(w);if(errors.length)throw Error(errors.join(' '));}
    if(!w.pawns.some(p=>p.cooking)&&w.structures.filter(s=>s.kind==='stonecutter').every(s=>s.bills![0]!.target===0))break;
  }
  const blocks=w.piles.filter(p=>p.kind==='blocks').reduce((n,p)=>n+p.quantity,0);
  if(blocks!==count*60)throw Error('Incomplete production');
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,30);stepWorld(copy,30);if(serializeWorld(w)!==serializeWorld(copy))throw Error('Non-deterministic continuation');
  results.push({count,blocks,peakWorkers,initialMs,stepMs:stats(steps),unchangedReadMs:stats(reads),snapshotCloneMs:stats(clones),maxSnapshotCharacters:maxBytes,thermalJsonCharacters:JSON.stringify(w.thermal).length,temperatures:w.thermal!.regions.map(r=>r.temperature)});
}
const report={date:new Date().toISOString(),cpu:os.cpus()[0]!.model,node:process.version,protocol:'250² synthetic map; 3/30/100 separate fully roofed rooms, one artisan, three chunks and a campfire per room. Actual crafting and storage, six thousand blocks at largest load. Initialization and snapshot clone outside step timing; clone maxima include first full checkpoint. No rendering or concurrent benchmark; 90s watchdog per case.',results};
writeFileSync('artifacts/temperature-cpu.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
