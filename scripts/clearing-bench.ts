/** CPU tick cost only, natural 250² surroundings retained. Run separately from
 * tests and browser benchmarks; generation, validation and I/O are not timed. */
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { createWorld, stepWorld, applyCommand, validateWorld, addGroundMaterial, refreshStock } from '../src/sim/index.ts';
function fixture(count: number, obstructed: boolean) {
  const w=createWorld(42,250,250), template=w.pawns[0]!;
  w.resources=w.resources.filter(r=>r.x<80||r.x>150||r.z<80||r.z>120);w.piles=[];
  for(let z=80;z<=120;z++)for(let x=80;x<=150;x++)w.tiles[z*250+x]={terrain:'grass'};
  w.pawns=Array.from({length:count},(_,i)=>({...structuredClone(template),id:w.nextId++,x:85+i%10*6,z:85+Math.floor(i/10)*8,hunger:100,rest:100,priorities:{mine:0,grow:1,haul:0,build:0,gather:0, cook: 0 }}));
  for(const p of w.pawns) {
    const from={x:p.x+1,z:p.z},to={x:p.x+2,z:p.z+1};
    if(obstructed)for(let z=from.z;z<=to.z;z++)for(let x=from.x;x<=to.x;x++)addGroundMaterial(w,'wood',10,{x,z});
    if(!applyCommand(w,{type:'area',action:'growing',from,to}).ok)throw new Error('Invalid field');
  }
  refreshStock(w);return w;
}
const rows=[];
for(const pawns of [3,30])for(const obstructed of [false,true]) {
  const samples:number[]=[];let completed=0;
  for(let repeat=-1;repeat<3;repeat++) {
    const w=fixture(pawns,obstructed);
    for(let tick=0;tick<700;tick++){const start=performance.now();stepWorld(w);if(repeat>=0)samples.push(performance.now()-start);}
    const errors=validateWorld(w);if(errors.length)throw new Error(errors.join(';'));
    if(w.stock.wood!==(obstructed?pawns*40:0))throw new Error('Material conservation failed');
    completed=w.resources.filter(r=>r.kind==='rice').length;
  }
  samples.sort((a,b)=>a-b);const p=(q:number)=>samples[Math.ceil(q*samples.length)-1];
  rows.push({pawns,obstructed,ticks:samples.length,planted:completed,expected:pawns*4,p50Ms:p(.5),p95Ms:p(.95),p99Ms:p(.99),maxMs:samples.at(-1)});
}
const report={date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,map:'250x250 seed 42',conditions:'1 warmup + 3 measured runs, 700 ticks; generation excluded; no concurrent tests/browser load',rows};
writeFileSync('artifacts/clearing-bench.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
