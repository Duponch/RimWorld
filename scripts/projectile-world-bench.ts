import { cpus,platform,release } from 'node:os';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { captureWorldProjectileTargets } from '../src/sim/projectile-world.ts';
import { advanceBulletFlight,createBulletFlight } from '../src/sim/bullet-flight.ts';
import { revolverProfile } from '../src/sim/ranged-statistics.ts';
import { healthRandom } from '../src/sim/health.ts';
import { miningLoad } from '../tests/scenarios/mining.ts';

const stats=(a:number[])=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const results=[],started=performance.now();
for(const count of [3,30,100]) {
  const world=miningLoad(count,true),friendly=new Set(world.pawns.map(p=>p.id)),shooter=world.pawns[0];
  const plans=world.pawns.map((_,i)=>{
    const target=world.pawns[1+i%(count-1)];
    return {launcherKey:`pawn:${shooter.id}`,equipmentKey:'fixture:revolver',intendedKey:`pawn:${target.id}`,usedKey:i%2?null:`pawn:${target.id}`,flags:i%2?6:3,preventFriendlyFire:false,origin:{x:shooter.x+.5,z:shooter.z+.5},destination:{x:target.x+.5,z:target.z+.5},speedPerCoreTick:revolverProfile('normal').projectileTilesPerCoreTick};
  });
  const captureMs:number[]=[],flightMs:number[]=[],totalMs:number[]=[],state={rng:9173};let hits=0,ground=0,checksum=0;
  for(let batch=-50;batch<300;batch++) {
    state.rng=9173;const begin=performance.now(),capture=captureWorldProjectileTargets(world),scene=capture.scene(friendly,.4),ready=performance.now();
    let sampleHits=0,sampleGround=0,sampleChecksum=0;
    for(const plan of plans) {
      let flight=createBulletFlight(plan);
      while(!flight.completed){const result=advanceBulletFlight(flight,scene,()=>healthRandom(state),10);flight=result.flight;if(result.arrival){if(result.arrival.targetKey)sampleHits++;else sampleGround++;sampleChecksum+=result.arrival.coreTick;}}
    }
    const end=performance.now();if(sampleHits+sampleGround!==count)throw Error('Missing projectile outcome');
    if(batch>=0){captureMs.push(ready-begin);flightMs.push(end-ready);totalMs.push(end-begin);hits+=sampleHits;ground+=sampleGround;checksum+=sampleChecksum;}
    if(performance.now()-started>45000)throw Error('Projectile-world audit exceeded 45 seconds');
  }
  // Exercise the deferred plant index too. Capture is excluded from this probe;
  // the first lookup includes building that index, subsequent lookups share it.
  const plantIdentityMs:number[]=[],plants=world.resources.filter(r=>r.kind!=='rock').slice(0,100);
  for(let sample=0;sample<100;sample++) {
    const capture=captureWorldProjectileTargets(world),scene=capture.scene(friendly,.4),begin=performance.now();
    for(const plant of plants)if(!scene.target(`resource:${plant.id}`))throw Error('Missing plant identity');
    plantIdentityMs.push(performance.now()-begin);
  }
  results.push({pawns:count,resources:world.resources.length,rockCells:world.tiles.filter(t=>t.terrain==='rock').length,flightsPerBatch:plans.length,hits,ground,checksum,captureMs:stats(captureMs),completeFlightsMs:stats(flightMs),totalMs:stats(totalMs),firstPlantIndexAnd100LookupsMs:stats(plantIdentityMs)});
}
const report={date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,os:`${platform()} ${release()}`,protocol:'250² generated mining fixtures with 3/30/100 actors and designations retained. 50 warmup + 300 measured batches. Every batch captures all current candidates and an explicit friendly relation view ONCE, then creates and COMPLETES 3/30/100 direct/miss flight plans sequentially. One fixture shooter aims toward the other actor positions; these synthetic plans bypass range/aim/commands. Includes columns, indexes, lazy records, relations, collision and allocation. Generation, World stepping, emission, damage, worker and renderer excluded. Additional 100 samples probe the first plant identity index plus 100 lookups, capture excluded from this separate measurement. Not simultaneous gameplay and not a frame or local-tick budget. One pass.',results};
writeFileSync('artifacts/projectile-world-v54.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
