import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { applyCommand, stepWorld, validateWorld } from '../src/sim/index.ts';
import { cookingFixture } from './fixtures/cooking.ts';
import { foodAccount, woodAccount } from '../tests/scenarios/colony-player.ts';
import { allowedFood, MAX_FOOD_POLICIES, type FoodItemId } from '../src/sim/food-policy.ts';
import type { Command } from '../src/sim/types.ts';

const rows=[],deadline=performance.now()+90000;
const stats=(samples:number[])=>{const sorted=[...samples].sort((a,b)=>a-b),p=(q:number)=>sorted[Math.ceil(q*sorted.length)-1];return {p50:p(.5),p95:p(.95),p99:p(.99),max:sorted.at(-1)};};
for(const population of [3,30,100]) {
  const w=cookingFixture(population),initialWood=woodAccount(w),initialFood=foodAccount(w),samples:number[]=[],commands:number[]=[];
  const checkedCommand=(c:Command)=>{const start=performance.now(),result=applyCommand(w,c);commands.push(performance.now()-start);if(!result.ok)throw new Error(result.reason);};
  while(w.foodPolicies.length<MAX_FOOD_POLICIES)checkedCommand({type:'food-policy-create',name:`Charge ${w.nextFoodPolicyId}`});
  const policyIds=w.foodPolicies.slice(-3).map(p=>p.id);
  for(const [i,p] of w.pawns.entries())checkedCommand({type:'food-policy-assign',pawnId:p.id,policyId:policyIds[i%3]!});
  let consumed=0,cooked=0,meals=0,accepted=0,blocked=0;const active={cook:0,haul:0,build:0,grow:0};
  for(let tick=0;tick<450;tick++) {
    if(tick===100) {
      for(const p of w.pawns){p.hunger=20;p.needCooldown=0;} // Explicit synthetic simultaneous hunger burst.
      for(const [i,id] of policyIds.entries())checkedCommand({type:'food-policy-update',policyId:id,name:`Charge ${id}`,allowed:i===0?['simple-meal']:i===1?['berries','rice','simple-meal']:[]});
    }
    const previous=w.pawns.map(p=>p.need?.kind==='eat'?p.need.sourcePileId:null);
    const finishing=w.pawns.filter(p=>p.need?.kind==='eat'&&p.need.phase==='ingest'&&p.need.progress===49).map(p=>({name:p.name,quantity:p.need!.kind==='eat'?p.need!.quantity:0,id:p.id}));
    const start=performance.now();stepWorld(w);samples.push(performance.now()-start);
    for(const e of w.events)if(e.tick===w.tick&&e.message.includes('a cuisiné 1 repas simple'))cooked++;
    // Pawns in this synthetic fixture share a display name; count completed jobs,
    // not names in the human event log, and keep quantity from the pre-step task.
    for(const f of finishing){const p=w.pawns.find(p=>p.id===f.id)!;if(p.need?.kind!=='eat'){consumed+=f.quantity;meals++;}}
    for(const [i,p] of w.pawns.entries()) {
      if(p.need?.kind==='eat'&&previous[i]!==p.need.sourcePileId){const pile=w.piles.find(s=>s.id===(p.need!.kind==='eat'?(p.need!.carryPileId??p.need!.sourcePileId):0));if(!pile||!allowedFood(w,p).includes(pile.item as FoodItemId))throw new Error('Forbidden new meal accepted');accepted++;}
      if(p.state==='hungry'&&!allowedFood(w,p).length)blocked++;
      if(p.cooking)active.cook++;if(p.haul)active.haul++;if(p.jobId){const job=w.jobs.find(j=>j.id===p.jobId)!;active[job.kind==='sow'?'grow':'build']++;}
    }
    if(tick%50===0||tick===449){const errors=validateWorld(w);if(errors.length){writeFileSync('tmp/food-policy-invalid-world.json',JSON.stringify(w));throw new Error(JSON.stringify({population,tick:w.tick,errors,pawns:w.pawns.filter(p=>p.jobId!==null&&p.state!=='working'&&p.state!=='moving')}));}if(foodAccount(w)+consumed+9*cooked!==initialFood||woodAccount(w)!==initialWood)throw new Error('Material ledger diverged');}
    if(performance.now()>deadline)throw new Error(`90 s watchdog: ${population} pawns, ${tick}`);
  }
  const row={population,ticks:450,policies:w.foodPolicies.length,tickMs:stats(samples),commandMs:stats(commands),hungryTransitionMs:samples[100],meals,acceptedNewMeals:accepted,blockedPawnTicks:blocked,cooked,activePawnTicks:active,foodConserved:true,woodConserved:true};rows.push(row);console.log(JSON.stringify(row));
}
writeFileSync('artifacts/food-policy-bench.json',JSON.stringify({date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,conditions:'250x250 seed42; synthetic cooking/construction/hauling/growing camps; 32 policies; all hungry at tick101, last three shared policies modified to meals/raw/nothing; 450 ticks, no warmup; stepWorld only timed, setup/commands/validation/ledger excluded; command costs separate; no render; 90s deadline; not ordinary player progression or an A/B baseline',rows},null,2));
