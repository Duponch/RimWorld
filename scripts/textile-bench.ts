import { cpus,platform,release } from 'node:os';
import { writeFileSync } from 'node:fs';
import { textileLoad } from '../tests/scenarios/textile-load.ts';
import { stepWorld,validateWorld } from '../src/sim/index.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';
const stats=(v:number[])=>{const s=[...v].sort((a,b)=>a-b);return {n:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const rows=[];stepWorld(textileLoad(3),100);
for(const count of [3,30,100]){
  const w=textileLoad(count),enc=new SnapshotEncoder(),ticks:number[]=[],snapshots:number[]=[];enc.encode(w,0,6);const started=performance.now();
  for(let i=0;i<600;i++){let t=performance.now();stepWorld(w);ticks.push(performance.now()-t);if(i%5===0){t=performance.now();enc.encode(w,0,6);snapshots.push(performance.now()-t);}if(performance.now()-started>60000)throw Error('Textile measurement exceeded 60s');}
  const errors=validateWorld(w);if(errors.length)throw Error(errors.join('; '));
  const cloth=w.piles.filter(p=>p.item==='cloth').reduce((n,p)=>n+p.quantity,0);if(cloth!==Math.ceil(count/2)*10)throw Error(`Incomplete textile yield ${count}: ${cloth}`);
  rows.push({actors:count,tickMs:stats(ticks),steadyTickMs:stats(ticks.slice(20)),snapshotMs:stats(snapshots),cloth,stored:w.piles.filter(p=>p.item==='cloth'&&p.owner.type==='ground'&&w.stockpiles.some(s=>s.x===(p.owner as {x:number}).x&&s.z===(p.owner as {z:number}).z)).reduce((n,p)=>n+p.quantity,0),mined:w.tiles.filter(t=>t.terrain==='rough-stone').length,treesRemaining:w.jobs.filter(j=>j.kind==='chop').length});
}
const report={date:new Date().toISOString(),cpu:cpus()[0]!.model,os:platform()+' '+release(),node:process.version,protocol:'Natural 250² map, 3/30/100 actors. Half harvest mature cotton, replant and haul; other work includes sandstone mining and tree chopping. 600 ticks, 100 separate warmup ticks, encoding every five ticks. One run per population; CPU only, no 6× guarantee. Maturity is a load fixture, never a gameplay acceleration.',rows};
writeFileSync('artifacts/textile-cpu-v71.json',JSON.stringify(report,null,2));console.log(JSON.stringify(rows));
