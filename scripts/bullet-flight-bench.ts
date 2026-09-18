import { performance } from 'node:perf_hooks';
import { cpus,platform,release } from 'node:os';
import { writeFileSync } from 'node:fs';
import { advanceBulletFlight,createBulletFlight } from '../src/sim/bullet-flight.ts';
import { ballisticObject,ballisticPawn,projectileRandom,projectileScene } from '../tests/scenarios/projectiles.ts';
import { revolverProfile } from '../src/sim/ranged-statistics.ts';

const stats=(a:number[])=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const results=[],started=performance.now();
for(const count of [3,30,100]) {
  const field=projectileScene(250,250),plans=[];
  for(let i=0;i<count;i++) {
    const z=2+i%30*2,openDoor=i%2===0,target=ballisticPawn(`target:${i}`,26,z);
    if(target.kind==='pawn'){target.standing=i%4!==0;target.friendly=i%3===0;}
    field.set(target);field.set(ballisticObject(`door:${z}`,13,z,1,openDoor));field.set(ballisticObject(`chunk:${z}`,21,z,.5));
    const incidental=ballisticPawn(`incidental:${z}`,17,z);if(incidental.kind==='pawn')incidental.friendly=true;field.set(incidental);
    plans.push({launcherKey:`shooter:${i}`,equipmentKey:`weapon:${i}`,intendedKey:target.key,usedKey:i%3===0?null:i%3===1?`chunk:${z}`:target.key,flags:i%3===2?3:6,preventFriendlyFire:i%4===0,origin:{x:1.5,z:z+.5},destination:{x:26.5,z:z+.5},speedPerCoreTick:revolverProfile('normal').projectileTilesPerCoreTick});
  }
  const times:number[]=[],random=projectileRandom();let hits=0,ground=0,checksum=0,draws=0,reads=0;
  for(let batch=-50;batch<300;batch++) {
    random.state.rng=9173;const beforeDraws=random.draws(),beforeReads=field.reads(),start=performance.now();
    let sampleHits=0,sampleGround=0,sampleChecksum=0;
    for(const plan of plans) {
      let flight=createBulletFlight(plan);
      while(!flight.completed) {
        const result=advanceBulletFlight(flight,field.scene,random.draw,10);flight=result.flight;
        if(result.arrival){if(result.arrival.targetKey)sampleHits++;else sampleGround++;sampleChecksum+=result.arrival.coreTick;}
      }
    }
    const duration=performance.now()-start;
    if(sampleHits+sampleGround!==count)throw Error('Missing projectile outcome');
    if(batch>=0){times.push(duration);hits+=sampleHits;ground+=sampleGround;checksum+=sampleChecksum;draws+=random.draws()-beforeDraws;reads+=field.reads()-beforeReads;}
    if(performance.now()-started>45000)throw Error('Bullet-flight benchmark exceeded 45 seconds');
  }
  results.push({flightsPerBatch:count,completeFlights:300*count,hits,ground,checksum,draws,cellQueries:reads,fullFlightBatchMs:stats(times)});
}
const report={date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,os:`${platform()} ${release()}`,protocol:'Isolated projectile kernel and explicit indexed scene fixture 250², not World combat. 3/30/100 flight plans (25 cells), directed/wild/cover permission profiles, open/closed doors, chunks and standing/lying/friendly candidates. 50 warmup + 300 measured batches per count; each batch CREATES AND COMPLETES every flight in ten-Core-step slices with PRNG reset to 9173. Includes flight allocation, geometry, queries, probability, shuffle and termination. Scene creation excluded; no launch aim/warmup, damage, World stepping, worker or rendering. One pass; full-flight batch is not a frame cost.',results};
writeFileSync('artifacts/bullet-flight-v54.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
