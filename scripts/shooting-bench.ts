import { cpus,platform,release } from 'node:os';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { shootingLoad } from '../tests/scenarios/shooting.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';
import type { World } from '../src/sim/types.ts';

const stats=(a:number[])=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const proofVersion=process.env.VALIDATION_VERSION??'v57',movingTargets=process.env.MOVING_TARGETS==='1';
const began=performance.now(),results=[];
for(const count of [3,30,100]) {
  const {world:w,pairs}=shootingLoad(count,movingTargets),commands:number[]=[],initialResources=w.resources.length;
  const quiet=structuredClone(w),mixedMs:number[]=[],quietMs:number[]=[],encodedMs:number[]=[],activeMs:number[]=[];
  const encoder=new SnapshotEncoder();encoder.encode(w,0,6);let accepted=0,refused=0,impacts=0,emissions=new Set<number>(),slowed=new Set<number>(),retimed=new Set<string>();
  for(let tick=0;tick<240;tick++) {
    if(tick%60===0)for(const [pawnId,targetId] of pairs){const t=performance.now();const result=applyCommand(w,{type:'shoot',pawnIds:[pawnId],targetId});commands.push(performance.now()-t);result.ok?accepted++:refused++;}
    const advance=(world:World)=>{const t=performance.now();stepWorld(world);return performance.now()-t;};
    const active=w.pawns.some(p=>p.shooting?.order);
    let q:number,m:number;if(tick%2){m=advance(w);q=advance(quiet);}else{q=advance(quiet);m=advance(w);}
    const t=performance.now();encoder.encode(w,0,6);const e=performance.now()-t;
    if(tick>=20){mixedMs.push(m);quietMs.push(q);encodedMs.push(e);}if(active)activeMs.push(m);
    for(const p of w.pawns){if(p.stagger)slowed.add(p.id);if(p.motion?.stagger)retimed.add(`${p.id}:${p.motion.start}`);}
    for(const p of w.projectiles??[]){emissions.add(p.id);if(p.arrival?.effect==='pawn')impacts++;}
    if(performance.now()-began>90000)throw Error('Shooting audit exceeded 90s');
  }
  for(const world of [w,quiet]){const errors=validateWorld(world);if(errors.length)throw Error(errors.join('; '));}
  results.push({actors:count,pairs:pairs.length,movingTargets,slowedPawns:slowed.size,retimedEdges:retimed.size,accepted,refused,emissions:emissions.size,impacts,commandsMs:stats(commands),mixedTickMs:stats(mixedMs),quietTickMs:stats(quietMs),activeCombatTickMs:stats(activeMs),encodeMs:stats(encodedMs),dead:w.pawns.filter(p=>p.state==='dead').length,downed:w.pawns.filter(p=>p.state==='downed').length,mixedResourcesRemoved:initialResources-w.resources.length,quietResourcesRemoved:initialResources-quiet.resources.length});
}
const report={date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,os:`${platform()} ${release()}`,protocol:'250², 3/30/100 actors; one third shoots commanded friendly targets, one third remains mobilized (MOVING_TARGETS=1: sixteen queued four-cell legs), rest mines/chops/hauls. 240 ticks per case, first 20 excluded from mixed/quiet/encoding percentiles; active-combat includes initial ticks. Independent quiet twin without shot orders, alternating run order. Real health/cadence/XP/PRNG, retarget every 60 ticks, no healing reset. Worker/render excluded. Single pass, timings include JIT/GC and are not a frame guarantee.',results};
writeFileSync(`artifacts/shooting-cpu-${proofVersion}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
