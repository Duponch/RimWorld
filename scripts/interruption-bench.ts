import { performance } from 'node:perf_hooks';
import { cpus,platform,release } from 'node:os';
import { writeFileSync } from 'node:fs';
import { createWorld,stepWorld,validateWorld,serializeWorld,deserializeWorld } from '../src/sim/index.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';
import type { Pawn } from '../src/sim/types.ts';

/** Synthetic simultaneous exhaustion; all drops fail in the congested case.
 * Real simulation ticks and copied snapshots, no renderer/FPS claim. */
const stats=(v:number[])=>{v.sort((a,b)=>a-b);const q=(p:number)=>v[Math.min(v.length-1,Math.floor(v.length*p))];return {p50:q(.5),p95:q(.95),p99:q(.99),max:v.at(-1)};};
const started=performance.now(),results=[];
for(const count of [3,30,100])for(const congested of [false,true]) {
  const w=createWorld(44,250,250),template=structuredClone(w.pawns[0]!);w.tick=3000;w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.pawns=[];w.structures=[];w.stockpiles=[];
  if(congested)for(let z=75;z<175;z++)for(let x=75;x<175;x++)w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:75,owner:{type:'ground',x,z}});
  for(let i=0;i<count;i++) {
    const p:Pawn=structuredClone(template);p.id=w.nextId++;p.x=125;p.z=125;p.hunger=100;p.rest=0;p.collapsePending=true;p.restZeroTicks=200;p.recreation.level=100;p.schedule.fill('work');
    const zone={id:w.nextId++,x:220,z:20+i*2,filters:{wood:false,food:false,steel:true},priority:2,capacity:75};w.stockpiles.push(zone);
    const held={id:w.nextId++,kind:'steel' as const,item:'steel' as const,quantity:10,owner:{type:'pawn' as const,pawnId:p.id}};w.piles.push(held);
    p.haul={sourcePileId:held.id,carryPileId:held.id,quantity:10,phase:'deliver',destination:{type:'stockpile',stockpileId:zone.id},pickupCell:{x:125,z:125}};p.state='moving';w.pawns.push(p);
  }
  refreshStock(w);const beforeErrors=validateWorld(w);if(beforeErrors.length)throw Error(beforeErrors.join(';'));
  const first=performance.now();stepWorld(w);const interruptionMs=performance.now()-first;
  for(let i=0;i<40;i++)stepWorld(w);
  const encoder=new SnapshotEncoder(),ticks:number[]=[],snapshots:number[]=[];encoder.encode(w,0,6,true);
  for(let i=0;i<120;i++) {
    if(performance.now()-started>90000)throw Error('Interruption audit exceeded 90 seconds');
    const t=performance.now();stepWorld(w);ticks.push(performance.now()-t);
    if(i%5===0){const c=performance.now();structuredClone(encoder.encode(w,0,6));snapshots.push(performance.now()-c);}
  }
  const errors=validateWorld(w);if(errors.length)throw Error(errors.join(';'));
  const save=serializeWorld(w),replay=deserializeWorld(save);stepWorld(w,20);stepWorld(replay,20);if(serializeWorld(w)!==serializeWorld(replay))throw Error('Continuation diverged');
  const sleeping=w.pawns.filter(p=>p.state==='sleeping').length,retained=w.pawns.filter(p=>p.interruptedCargo).length;
  const steel=w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0);
  if(sleeping!==count||steel!==count*10||(congested&&retained!==count))throw Error('Interruption outcome invalid');
  results.push({actors:count,congested,groundStacks:congested?10000:0,interruptionMs,tickMs:stats(ticks),snapshotCopyMs:stats(snapshots),sleeping,retained,steel,errors});
  console.log(JSON.stringify(results.at(-1)));
}
writeFileSync(process.argv[2]??'artifacts/interruption-cpu-latest.json',JSON.stringify({date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,os:`${platform()} ${release()}`,map:'250x250',scope:'synthetic exhaustion; same-cell civil actors, 40 warmup ticks and 120 measured ticks; snapshot copy every 5; no rendering',results},null,2)+'\n');
