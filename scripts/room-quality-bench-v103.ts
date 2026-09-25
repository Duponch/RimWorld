import {writeFileSync} from 'node:fs';
import {cpus} from 'node:os';
import {performance} from 'node:perf_hooks';
import {roomCamp} from '../tests/scenarios/rooms.ts';
import {RoomTopologyCache} from '../src/sim/room-topology.ts';
import {RoomQualityCapture} from '../src/sim/room-quality.ts';
import {captureWorldBeauty} from '../src/sim/beauty-need.ts';

// A derived-field microbenchmark, not a simulation/FPS benchmark. Same room,
// same topology, same physical contributors and exact beauty oracle per read.
const world=roomCamp();world.width=250;world.height=250;world.tiles=Array.from({length:62500},()=>({terrain:'grass'}));world.resources=[];
const topology=new RoomTopologyCache().read(world),cell={x:13,z:13};
const old=()=>captureWorldBeauty(world,topology).room(cell)!,current=()=>new RoomQualityCapture(world,topology).room(cell)!;
const expected=old().beauty;if(current().beauty!==expected)throw new Error('Beauty oracle mismatch');
const samples={old:[] as number[],current:[] as number[]};
for(let i=0;i<180;i++)for(const key of (i%2?['old','current']:['current','old']) as (keyof typeof samples)[]){const start=performance.now();const value=(key==='old'?old:current)();if(value.beauty!==expected)throw new Error('Beauty oracle changed');if(i>=20)samples[key].push(performance.now()-start);}
const stats=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return {n:sorted.length,mean:values.reduce((n,v)=>n+v,0)/values.length,p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)};};
const report={date:new Date().toISOString(),cpu:cpus()[0]!.model,node:process.version,protocol:'250×250, prepared 36-cell enclosure, 20 warmups + 160 reads per implementation; alternating order, retained topology; old full-map beauty field vs current local room quality. CPU microbenchmark, no frame-rate/worker guarantee.',beauty:expected,old:stats(samples.old),current:stats(samples.current)};
writeFileSync('artifacts/room-quality-cost-v103.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
