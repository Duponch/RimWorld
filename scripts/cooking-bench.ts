import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { stepWorld, validateWorld, hashWorld } from '../src/sim/index.ts';
import { cookingFixture } from './fixtures/cooking.ts';

const args=new Map(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const populations=(args.get('pawns')??'3,30,100').split(',').map(Number),ticks=Number(args.get('ticks')??300),repeats=Number(args.get('repeats')??1);
if(populations.some(n=>!Number.isInteger(n)||n<1||n>100)||!Number.isInteger(ticks)||ticks<50||ticks>3000||!Number.isInteger(repeats)||repeats<1||repeats>5)throw new Error('Invalid bounded benchmark options');
const rows=[];const deadline=performance.now()+90000;
for(const pawns of populations) {
  const samples:number[]=[];let result;
  for(let repeat=0;repeat<repeats;repeat++) {
    const w=cookingFixture(pawns);const errors=validateWorld(w);if(errors.length)throw new Error(errors.join(';'));
    let cooked=0;const active={cook:0,haul:0,grow:0,build:0,refuel:0};const searchTotals={all:0,nearest:0,full:0,visited:0,unreachedGroups:0},worst:{tick:number;ms:number;searches:unknown}[]=[];
    for(let i=0;i<ticks;i++) {
      const diagnostics={searches:[] as import('../src/sim/work-planner.ts').SearchStats['searches']};
      const start=performance.now();stepWorld(w,1,diagnostics);const ms=performance.now()-start;samples.push(ms);
      for(const search of diagnostics.searches){searchTotals[search.mode]++;searchTotals.visited+=search.visited;searchTotals.unreachedGroups+=search.unreachedGroups;}
      worst.push({tick:w.tick,ms,searches:diagnostics.searches});worst.sort((a,b)=>b.ms-a.ms);worst.length=Math.min(worst.length,3);
      for(const p of w.pawns){if(p.cooking)active.cook++;if(p.haul)active[p.haul.destination.type==='fuel'?'refuel':'haul']++;if(p.jobId){const j=w.jobs.find(j=>j.id===p.jobId);if(j)active[j.kind==='sow'?'grow':'build']++;}}
      for(const e of w.events)if(e.tick===w.tick&&e.message.includes('a cuisiné'))cooked++;
      if(performance.now()>deadline)throw new Error(`90 s watchdog: ${pawns} pawns, tick ${w.tick}`);
    }
    const invalid=validateWorld(w);if(invalid.length)throw new Error(invalid.join(';'));
    result={hash:hashWorld(w),cooked,crops:w.resources.filter(r=>r.kind==='rice').length,walls:w.structures.filter(s=>s.kind==='wall').length,activePawnTicks:active,remainingRaw:w.piles.filter(p=>p.item==='rice'||p.item==='berries').reduce((n,p)=>n+p.quantity,0),remainingMeals:w.piles.filter(p=>p.item==='simple-meal').reduce((n,p)=>n+p.quantity,0),searchTotals,worst};
    if(result.remainingRaw+cooked*10!==Math.ceil(pawns/5)*110)throw new Error('Recipe input conservation failed');
  }
  samples.sort((a,b)=>a-b);const p=(q:number)=>samples[Math.ceil(q*samples.length)-1];
  const row={pawns,ticks:samples.length,p50Ms:p(.5),p95Ms:p(.95),p99Ms:p(.99),maxMs:samples.at(-1),...result};rows.push(row);console.log(JSON.stringify(row));
}
const report={date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,map:'250x250 seed 42',conditions:`${repeats} runs × ${ticks} ticks; setup, validation and diagnostic aggregation excluded; search-counter collection inside stepWorld is timed; needs active, all workers cook/build/haul/grow; no warmup (includes first assignments)`,rows};
writeFileSync(args.get('output')??'artifacts/cooking-bench.json',JSON.stringify(report,null,2));
