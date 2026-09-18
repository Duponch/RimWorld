import { cpus,platform,release } from 'node:os';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { miningLoad } from '../tests/scenarios/mining.ts';
import { registerWorldProjectile } from '../src/sim/projectile-system.ts';
import { createBulletFlight } from '../src/sim/bullet-flight.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import type { World } from '../src/sim/types.ts';

const stats=(a:number[])=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
function burst(w:World):number {
  const living=w.pawns.filter(p=>p.state!=='dead'),friendly=w.pawns.map(p=>p.id);let count=0;
  for(const [i,p] of living.entries()) {
    const target=living[(i+1)%living.length];if(target===p)continue;
    // Injection of already-emitted bullets, not firing commands or fighting AI.
    const origin={x:target.x-2.5,z:target.z+.5};
    registerWorldProjectile(w,createBulletFlight({origin,destination:{x:target.x+.5,z:target.z+.5},launcherKey:`pawn:${p.id}`,equipmentKey:null,intendedKey:`pawn:${target.id}`,usedKey:`pawn:${target.id}`,flags:3,preventFriendlyFire:false,speedPerCoreTick:.55}),'normal',{friendlyPawnIds:friendly,friendlyFireFactor:.4});count++;
  }
  return count;
}
const started=performance.now(),results=[];
for(const count of [3,30,100]) {
  const base=miningLoad(count,true),burstMs:number[]=[],quietMs:number[]=[],mixedMs:number[]=[];let impacts=0,injected=0;
  for(let sample=-5;sample<30;sample++) {
    const w=structuredClone(base);burst(w);const before=performance.now();stepWorld(w);const elapsed=performance.now()-before;
    if(sample>=0){burstMs.push(elapsed);impacts+=w.projectiles?.filter(p=>p.arrival?.effect==='pawn').length??0;}
    if(sample===0){const errors=validateWorld(w);if(errors.length)throw Error(errors.join('; '));}
  }
  const quiet=structuredClone(base),mixed=structuredClone(base);let completions=0;
  for(let tick=0;tick<240;tick++) {
    if(tick%60===0)injected+=burst(mixed);
    let before=performance.now();stepWorld(quiet);const q=performance.now()-before;
    before=performance.now();stepWorld(mixed);const m=performance.now()-before;
    if(tick>=20){quietMs.push(q);mixedMs.push(m);}
    completions+=mixed.projectiles?.filter(p=>p.arrival).length??0;
    if(performance.now()-started>60000)throw Error('Projectile-system audit exceeded 60 seconds');
  }
  for(const w of [quiet,mixed]){const errors=validateWorld(w);if(errors.length)throw Error(errors.join('; '));}
  results.push({pawns:count,resources:base.resources.length,burstTickMs:stats(burstMs),measuredBurstImpacts:impacts,quietTickMs:stats(quietMs),mixedTickMs:stats(mixedMs),injected,completions,mixedDead:mixed.pawns.filter(p=>p.state==='dead').length,mixedDowned:mixed.pawns.filter(p=>p.state==='downed').length,quietResourcesRemoved:base.resources.length-quiet.resources.length,mixedResourcesRemoved:base.resources.length-mixed.resources.length,mixedGroundPiles:mixed.piles.length});
}
const report={date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,os:`${platform()} ${release()}`,protocol:'Generated 250² mining/chopping camp, 3/30/100 actors. Burst: 5 warmup + 30 independent measured first ticks, one synthetic close aimed bullet per actor, cloning/registration excluded. Mixed and quiet controls: 240 sequential real stepWorld ticks, first 20 omitted; injected burst every 60 ticks, actual wounds/deaths/needs/work retained, not reset. Active flight/health/capture/simulation included; aim/commands/emission/worker/render excluded. One pass, no claim of playable combat or frame cost.',results};
writeFileSync(process.argv[2]??'artifacts/projectile-system-v55.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
