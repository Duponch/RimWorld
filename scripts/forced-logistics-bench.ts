import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { addGroundMaterial, applyCommand, createWorld, refreshStock, stepWorld, validateWorld } from '../src/sim/index.ts';
import { queryOrderOptions } from '../src/sim/player-orders.ts';
import { hashWorld } from '../src/sim/serialization.ts';

const percentile=(values:number[],q:number)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*q)-1];
const deadline=performance.now()+90000,rows=[];
for(const count of [3,30,100]) {
  const w=createWorld(42,250,250),model=w.pawns[0]!;
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.structures=[];w.jobs=[];w.stockpiles=[];
  w.pawns=Array.from({length:count},(_,i)=>({...structuredClone(model),id:w.nextId++,x:20+(i%10)*3,z:20+Math.floor(i/10)*3,hunger:100,rest:100,priorities:{haul:1,build:0,gather:0,grow:0,cook:0}}));
  refreshStock(w);
  for(const p of w.pawns) {
    p.schedule.fill('anything');
    const r=applyCommand(w,{type:'stockpile',x:p.x+1,z:p.z+1,enabled:true,capacity:30,priority:2,filters:{wood:true,food:false}});if(!r.ok)throw new Error(r.reason);
    addGroundMaterial(w,'wood',30,{x:p.x+1,z:p.z},'wood');
  }
  const queryMs:number[]=[],commandMs:number[]=[];
  for(const p of w.pawns) {
    const pile=w.piles.find(s=>s.owner.type==='ground'&&s.owner.x===p.x+1&&s.owner.z===p.z)!;
    let start=performance.now();const menu=queryOrderOptions(w,p.id,{x:p.x+1,z:p.z});queryMs.push(performance.now()-start);
    if(!menu[0]?.enabled)throw new Error('Fixture menu refused');
    for(const queue of [false,true]) {
      start=performance.now();const r=applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:pile.id},queue});commandMs.push(performance.now()-start);if(!r.ok)throw new Error(r.reason);
    }
    applyCommand(w,{type:'priority',pawnId:p.id,work:'haul',value:0});
  }
  let errors=validateWorld(w);if(errors.length)throw new Error(errors.join(';'));
  const samples:number[]=[],activeSamples:number[]=[];let activePawnTicks=0,maxQueued=0;
  for(let i=0;i<300;i++) {
    const active=w.pawns.some(p=>p.haul||p.orders.queue.length);
    const start=performance.now();stepWorld(w);const ms=performance.now()-start;samples.push(ms);if(active)activeSamples.push(ms);
    activePawnTicks+=w.pawns.filter(p=>p.haul).length;maxQueued=Math.max(maxQueued,w.pawns.reduce((n,p)=>n+p.orders.queue.length,0));
    if(performance.now()>deadline)throw new Error('90 s watchdog');
  }
  errors=validateWorld(w);if(errors.length)throw new Error(errors.join(';'));
  const stored=w.piles.filter(p=>p.owner.type==='ground'&&w.stockpiles.some(z=>p.owner.type==='ground'&&z.x===p.owner.x&&z.z===p.owner.z)).reduce((n,p)=>n+p.quantity,0);
  if(stored!==count*20||w.stock.wood!==count*30||w.pawns.some(p=>p.haul||p.orders.queue.length||p.orders.active!==null))throw new Error('Incomplete or non-conservative deliveries');
  const row={pawns:count,ticks:300,activeTicks:activeSamples.length,activeP95Ms:percentile(activeSamples,.95),p50Ms:percentile(samples,.5),p95Ms:percentile(samples,.95),p99Ms:percentile(samples,.99),maxMs:Math.max(...samples),queryP95Ms:percentile(queryMs,.95),commandP95Ms:percentile(commandMs,.95),maxQueued,activePawnTicks,stored,wood:w.stock.wood,hash:hashWorld(w)};
  rows.push(row);console.log(JSON.stringify(row));
}
writeFileSync('artifacts/forced-logistics-queues-cpu.json',JSON.stringify({date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,conditions:'Synthetic clear 250x250 camp, 2 forced trips per actor, all actors active at start, 300 ticks, no warmup; query/commands separately timed, setup and validation excluded, no rendering; automatic hauling disabled after acceptance; one run per population, no guarantee of worst case.',rows},null,2));
