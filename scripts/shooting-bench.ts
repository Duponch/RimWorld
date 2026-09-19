import { addMentalLoad } from '../tests/scenarios/mental-break.ts';
import { dressLoad } from '../tests/scenarios/apparel.ts';
import { pursuitLoad } from '../tests/scenarios/pursuit.ts';
import { automaticLoad } from '../tests/scenarios/automatic-combat.ts';
import { meleeLoad } from '../tests/scenarios/melee.ts';
import { encounterLoad } from '../tests/scenarios/encounter.ts';
import { cpus,platform,release } from 'node:os';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { shootingLoad } from '../tests/scenarios/shooting.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';
import type { World } from '../src/sim/types.ts';

const stats=(a:number[])=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const pursuit=process.env.PURSUIT==='1';
const melee=process.env.MELEE==='1',automatic=pursuit||process.env.AUTOMATIC==='1';
const proofVersion=process.env.VALIDATION_VERSION??'v57',movingTargets=process.env.MOVING_TARGETS==='1',hostileTargets=process.env.HOSTILE_TARGETS==='1';
const began=performance.now(),results=[];
for(const count of [3,30,100]) {
  const {world:w,pairs}=(pursuit?pursuitLoad(count):automatic?automaticLoad(count):melee?meleeLoad(count):hostileTargets?encounterLoad(count):shootingLoad(count,movingTargets)),commands:number[]=[],initialResources=w.resources.length,initialRocks=w.tiles.filter(t=>t.terrain==='rock').length;
  if(process.env.APPAREL==='1')dressLoad(w);
    const mentalActors=process.env.MENTAL_BREAKS==='1'?addMentalLoad(w):0;
  const quiet=structuredClone(w),mixedMs:number[]=[],quietMs:number[]=[],allTickMs:number[]=[],encodedMs:number[]=[],activeMs:number[]=[];
  const encoder=new SnapshotEncoder();encoder.encode(w,0,6);let accepted=0,refused=0,impacts=0,emissions=new Set<number>(),slowed=new Set<number>(),retimed=new Set<string>();
  for(let tick=0;tick<240;tick++) {
    if(!automatic&&tick%60===0)for(const [pawnId,targetId] of pairs){const t=performance.now();const result=applyCommand(w,{type:melee?'melee':'shoot',pawnIds:[pawnId],targetId});commands.push(performance.now()-t);result.ok?accepted++:refused++;}
    const advance=(world:World)=>{const t=performance.now();stepWorld(world);return performance.now()-t;};
    const active=w.pawns.some(p=>p.shooting?.order||p.melee?.order);
    let q:number,m:number;if(tick%2){m=advance(w);q=advance(quiet);}else{q=advance(quiet);m=advance(w);}
    const t=performance.now();encoder.encode(w,0,6);const e=performance.now()-t;
    allTickMs.push(m);
    if(tick>=20){mixedMs.push(m);quietMs.push(q);encodedMs.push(e);}if(active)activeMs.push(m);
    for(const p of w.pawns){if(p.stagger)slowed.add(p.id);if(p.motion?.stagger)retimed.add(`${p.id}:${p.motion.start}`);}
    for(const p of w.projectiles??[]){emissions.add(p.id);if(p.arrival?.effect==='pawn')impacts++;}
    if(performance.now()-began>90000)throw Error('Shooting audit exceeded 90s');
  }
  for(const world of [w,quiet]){const errors=validateWorld(world);if(errors.length){writeFileSync(`artifacts/shooting-invalid-${proofVersion}.json`,JSON.stringify(world));throw Error(`${count} actors tick ${world.tick}: ${errors.join('; ')}`);}}
  results.push({mentalActors,pursuit,automatic,actors:count,pairs:pairs.length,movingTargets,hostileTargets,slowedPawns:slowed.size,retimedEdges:retimed.size,accepted,refused,emissions:emissions.size,impacts,commandsMs:stats(commands),allTickMs:stats(allTickMs),initialTickMs:stats(allTickMs.slice(0,20)),mixedTickMs:stats(mixedMs),quietTickMs:stats(quietMs),activeCombatTickMs:stats(activeMs),encodeMs:stats(encodedMs),apparelRemaining:w.piles.filter(p=>p.kind==='apparel').length,apparelDamaged:w.piles.filter(p=>p.apparel&&p.apparel.hitPoints<(p.item==='cloth-shirt'?100:200)).length,dead:w.pawns.filter(p=>p.state==='dead').length,downed:w.pawns.filter(p=>p.state==='downed').length,mixedExcavatedTiles:initialRocks-w.tiles.filter(t=>t.terrain==='rock').length,mixedResourcesRemoved:initialResources-w.resources.length,quietResourcesRemoved:initialResources-quiet.resources.length});
}
const report={mentalBreaks:process.env.MENTAL_BREAKS==='1',apparel:process.env.APPAREL==='1',melee,date:new Date().toISOString(),hostileTargets,variant:pursuit?'Mobile visible-threat pursuit and firing positions, drafted autofire, civilian responses and mixed work; enemies start 35 cells from defenders.':automatic?'Drafted autofire, civilian Attack/Flee and armed sentries; remaining workers mine/chop. Quiet twin has the same automatic decisions.':melee?'Paired melee approach and real strikes; remaining civilian flight/work. Quiet twin retains initial melee orders.':hostileTargets?'Hostile sentries return fire; half the civilian workers begin near a sentry and flee. Other workers mine/chop. Quiet twin still has hostile AI.':'Friendly-fire baseline',cpu:cpus()[0]?.model,node:process.version,os:`${platform()} ${release()}`,protocol:(pursuit?'250², 3/30/100 actors, mobile enemies initially 35 cells from defenders; shared path budget and real combat plus civilian work. ':automatic?'250², 3/30/100 actors; stationary drafted autofire, armed sentries, civilian Attack/Flee and mixed work. No commanded shots or healing reset. ':melee?'250², paired melee approach and strikes against armed sentries; remaining civilians flee/work. ':hostileTargets?'250², 3/30/100 actors; one third shoots commanded hostile sentries, one third returns fire, half the remaining civilians flee and the others mine/chop. ':'250², 3/30/100 actors; one third shoots commanded friendly targets, one third remains mobilized (MOVING_TARGETS=1: sixteen queued four-cell legs), rest mines/chops/hauls. ')+'240 ticks per case, first 20 excluded from mixed/quiet/encoding percentiles; active-combat includes initial ticks. Independent twin, alternating run order (AUTOMATIC: identical initial autonomous decisions; other modes: no extra shot orders). Real health/cadence/XP/PRNG, retarget every 60 ticks only outside AUTOMATIC, no healing reset. Worker/render excluded. Single pass, timings include JIT/GC and are not a frame guarantee.',results};
writeFileSync(`artifacts/shooting-cpu-${proofVersion}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
