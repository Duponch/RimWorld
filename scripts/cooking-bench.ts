import { stonecuttingLoad } from '../tests/scenarios/stonecutting.ts';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { stepWorld, validateWorld, hashWorld, applyCommand } from '../src/sim/index.ts';
import { cookingFixture } from './fixtures/cooking.ts';
import { isPerishable, ROT_DAYS } from '../src/sim/food-preservation.ts';
import { TICKS_PER_DAY } from '../src/sim/types.ts';

const args=new Map(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const populations=(args.get('pawns')??'3,30,100').split(',').map(Number),ticks=Number(args.get('ticks')??300),repeats=Number(args.get('repeats')??1);
const stonecutting=args.get('stonecutting')==='true';
const prioritized=args.get('prioritized')==='true';
const expireAt=Number(args.get('expire-at')??0);
if(!Number.isInteger(expireAt)||expireAt<0||expireAt>ticks)throw new Error('Expiry tick must be 0 (off) or within this run');
if(populations.some(n=>!Number.isInteger(n)||n<1||n>100)||!Number.isInteger(ticks)||ticks<50||ticks>3000||!Number.isInteger(repeats)||repeats<1||repeats>5)throw new Error('Invalid bounded benchmark options');
const rows=[];const deadline=performance.now()+90000;
for(const pawns of populations) {
  const samples:number[]=[];let result;
  for(let repeat=0;repeat<repeats;repeat++) {
    const w=stonecutting?stonecuttingLoad(pawns):cookingFixture(pawns);
    if(prioritized)for(const [i,station] of w.structures.filter(s=>s.kind==='campfire').entries()) {
      const cook=w.pawns[i*5]!,builder=w.pawns[i*5+1],job=w.jobs[i];
      if(!applyCommand(w,{type:'order-cook',pawnId:cook.id,structureId:station.id,queue:false}).ok)throw new Error('Cannot prioritize fixture kitchen');
      if(builder&&job&&!applyCommand(w,{type:'order-haul',pawnId:builder.id,target:{type:'job',jobId:job.id},queue:false}).ok)throw new Error('Cannot prioritize fixture construction');
    }
    if(expireAt)for(const p of w.piles)if(isPerishable(p.item))p.rot={progress:ROT_DAYS[p.item]*TICKS_PER_DAY-expireAt,atTick:w.tick};
    const errors=validateWorld(w);if(errors.length)throw new Error(errors.join(';'));
    let cooked=0,expiryTickMs:number|null=null;const active={cook:0,haul:0,grow:0,build:0,refuel:0};const searchTotals={all:0,nearest:0,full:0,visited:0,connectivityVisited:0,unreachedGroups:0},worst:{tick:number;ms:number;searches:unknown}[]=[];
    for(let i=0;i<ticks;i++) {
      const diagnostics={searches:[] as import('../src/sim/work-planner.ts').SearchStats['searches']};
      const start=performance.now();stepWorld(w,1,diagnostics);const ms=performance.now()-start;samples.push(ms);
      if(w.tick===expireAt)expiryTickMs=ms;
      for(const search of diagnostics.searches){searchTotals[search.mode]++;searchTotals.visited+=search.visited;searchTotals.connectivityVisited+=search.connectivityVisited??0;searchTotals.unreachedGroups+=search.unreachedGroups;}
      worst.push({tick:w.tick,ms,searches:diagnostics.searches});worst.sort((a,b)=>b.ms-a.ms);worst.length=Math.min(worst.length,3);
      for(const p of w.pawns){if(p.cooking)active.cook++;if(p.haul)active[p.haul.destination.type==='fuel'?'refuel':'haul']++;if(p.jobId){const j=w.jobs.find(j=>j.id===p.jobId);if(j)active[j.kind==='sow'?'grow':'build']++;}}
      for(const e of w.events)if(e.tick===w.tick&&e.message.includes(stonecutting?'a taillé':'a cuisiné'))cooked++;
      if(performance.now()>deadline)throw new Error(`90 s watchdog: ${pawns} pawns, tick ${w.tick}`);
    }
    const invalid=validateWorld(w);if(invalid.length)throw new Error(invalid.join(';'));
    result={blocks:w.piles.reduce((n,p)=>n+(p.kind==='blocks'?p.quantity:0),0),chunks:w.piles.filter(p=>p.kind==='chunk').length,hash:hashWorld(w),cooked,expiryTickMs,spoiled:{...w.spoiled},crops:w.resources.filter(r=>r.kind==='rice').length,walls:w.structures.filter(s=>s.kind==='wall').length,activePawnTicks:active,remainingRaw:w.piles.filter(p=>p.item==='rice'||p.item==='berries').reduce((n,p)=>n+p.quantity,0),remainingMeals:w.piles.filter(p=>p.item==='simple-meal').reduce((n,p)=>n+p.quantity,0),searchTotals,worst};
    if(stonecutting?result.chunks*20+result.blocks!==pawns*60:result.remainingRaw+w.spoiled.rice+w.spoiled.berries+cooked*10!==Math.ceil(pawns/5)*110)throw new Error('Recipe input conservation failed');
  }
  samples.sort((a,b)=>a-b);const p=(q:number)=>samples[Math.ceil(q*samples.length)-1];
  const row={pawns,ticks:samples.length,p50Ms:p(.5),p95Ms:p(.95),p99Ms:p(.99),maxMs:samples.at(-1),...result};rows.push(row);console.log(JSON.stringify(row));
}
const report={stonecutting,prioritized,date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,map:'250x250 seed 42',expireAt,conditions:`${stonecutting?'Stonecutting directed clear map, 3 chunks per artisan; ':'Mixed natural cooking camps; '}${repeats} runs × ${ticks} ticks; setup, validation and diagnostic aggregation excluded; search-counter collection inside stepWorld is timed; needs active, ${stonecutting?'only Craft enabled':'all workers cook/build/haul/grow'}; no warmup (includes first assignments); expiry injection is a separate stress fixture, not an equivalent gameplay baseline`,rows};
writeFileSync(args.get('output')??'artifacts/cooking-bench.json',JSON.stringify(report,null,2));
