import { expect,test } from 'vitest';
import { predationCamp,animal } from './helpers/predation-v190-fixture.ts';
import { startAnimalManhunter,recoverAnimalManhunter } from '../src/sim/animal-manhunter.ts';
import { advanceAnimalMelee,animalMeleeTools } from '../src/sim/wildlife-melee.ts';
import { strikeLivingTarget } from '../src/sim/living-melee.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import { captureWorldShotGrid } from '../src/sim/combat-world.ts';
import { disturbanceEvents } from '../src/sim/disturbance.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { reconcileAnimalHealth } from '../src/sim/wildlife-health.ts';
import { barrierMaxHp } from '../src/sim/barriers.ts';
import { attachAnimalFire } from '../src/sim/fire.ts';
import { validateFires } from '../src/sim/fire-save.ts';
import { ingestFoodRisk,processAnimalVomiting } from '../src/sim/food-hygiene.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { adultAgeTicks } from '../src/sim/animal-life.ts';
import { animalNavigation,moveAnimal } from '../src/sim/wildlife-navigation.ts';

function camp(){const {w,foxId}=predationCamp();const a=animal(w,foxId),p=w.pawns[0]!;a.food=.5;p.x=a.x+1;p.z=a.z;startAnimalManhunter(w,a);a.manhunter!.targetId=p.id;
  return {w,a,p,hit:(core=w.tick*10)=>advanceAnimalMelee(w,a,core,()=>blockedCells(w,true),()=>captureWorldShotGrid(w),disturbanceEvents(w))};}
test('sleeping human is bitten only at physical contact after both edges, with one retained recovery',()=>{
  const {w,a,p,hit}=camp();p.state='sleeping';p.motion={from:{x:p.x+1,z:p.z},to:{x:p.x,z:p.z},start:w.tick,end:w.tick+1,speedFactor:3,terrainDelay:0};
  expect(hit()).toBe(false);expect(a.strike).toBeUndefined();p.motion=null;
  expect(hit()).toBe(true);expect(a.strike!.targetId).toBe(p.id);const strike=structuredClone(a.strike),rng=w.rng;
  expect(hit(w.tick*10+1)).toBe(false);expect(a.strike).toEqual(strike);expect(w.rng).toBe(rng);expect(a.retaliation).toBeUndefined();expect(a.predation).toBeUndefined();
});
test('animal defender retains rage when struck; no threat or retaliation is installed',()=>{
  const {w,a,p}=camp();p.melee={order:null,strike:null};const tool=animalMeleeTools(a)[0]!;
  strikeLivingTarget(w,p,a,tool,w.tick*10,{rng:w.rng});expect(a.manhunter).toBeDefined();expect(a.threat).toBeUndefined();expect(a.retaliation).toBeUndefined();
});
test('door damage consumes a bounded blow and destruction preserves the independent structural recovery',()=>{
  const {w,a,p,hit}=camp();p.x=20;
  const door={id:w.nextId++,kind:'door' as const,material:'wood' as const,x:a.x+1,z:a.z,orientation:0 as const,footprint:'standard' as const,door:newDoorState(w.tick)};
  w.structures.push(door);Object.assign(door,{damage:barrierMaxHp(door)-1});expect(barrierMaxHp(door)).toBeGreaterThan(1);
  a.manhunter!.door={targetId:door.id,remaining:2,untilCore:w.tick*10+2000};
  expect(hit()).toBe(true);expect(w.structures.includes(door)).toBe(false);expect(a.manhunter!.door).toBeUndefined();
  expect(a.strike!.structure).toEqual({x:door.x,z:door.z});const strike=structuredClone(a.strike);
  recoverAnimalManhunter(w,a);expect(a.strike).toEqual(strike);expect(hit(w.tick*10+1)).toBe(false);
});
test('recovery immediately cancels automatic hostility, preserves cooldowns and captured human motion; manual order remains',()=>{
  const {w,a,p}=camp();const other=w.pawns[1]!;
  p.melee={order:{targetId:a.id,startedDowned:false,auto:'response'},strike:{targetId:a.id,atCore:w.tick*10,untilCore:w.tick*10+30,tool:'left-fist',outcome:'miss'}};
  p.motion={from:{x:8,z:12},to:{x:p.x,z:p.z},start:w.tick,end:w.tick+2,speedFactor:3,terrainDelay:0};
  const motion=structuredClone(p.motion),strike=structuredClone(p.melee.strike);
  other.melee={order:{targetId:a.id,startedDowned:false},strike:null};
  recoverAnimalManhunter(w,a);expect(p.melee!.order).toBeNull();expect(p.melee!.strike).toEqual(strike);expect(p.motion).toEqual(motion);expect(other.melee!.order).toBeDefined();
});
test('medical death recovers immediately without creating food, and clears automatic aim at the same boundary',()=>{
  const {w,a,p}=camp();p.shooting={order:{targetId:a.id,weaponId:1,startedDowned:false,auto:{kind:'draft'}},stance:{phase:'aim',startedAtCore:w.tick*10,endsAtCore:w.tick*10+30,targetStartedDowned:false}};
  a.health!.death={tick:w.tick,cause:'trauma'};reconcileAnimalHealth(w,a);
  expect(a.manhunter).toBeUndefined();expect(a.state).toBe('dead');expect(p.shooting).toBeUndefined();expect(a.predation).toBeUndefined();expect(a.meal).toBeUndefined();expect(w.piles).toEqual([]);
});
test('ignition retains a committed recovery; real burns continue and extinguishing resumes at its exact physical deadline',()=>{
  const {w,a,hit}=camp();for(const p of w.pawns)p.hostilityResponse='ignore';
  // A larger represented body survives several physical burn pulses while
  // the independently committed attack finishes its ordinary recovery.
  a.species='muffalo';a.ageTicks=adultAgeTicks('muffalo');a.food=2.4;a.health={...createMedicalRecord(w.tick),body:'muffalo'};
  expect(hit()).toBe(true);const strike=structuredClone(a.strike!);
  expect(attachAnimalFire(w,a.id,.1)).toBe(true);expect(a.strike).toEqual(strike);
  a.burning={phase:'extinguish',remainingCore:150};
  expect(validateWorld(w)).toEqual([]);expect(validateFires(w,182)).toContain('Invalid animal burning activity.');
  const copy=deserializeWorld(serializeWorld(w));let firstReaction:number|undefined;
  while(w.tick*10<strike.untilCore){
    stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);
    expect(a.state).not.toBe('downed');expect(a.state).not.toBe('dead');
    if(w.tick*10<strike.untilCore){expect(a.strike).toEqual(strike);expect(a.burning!.remainingCore).toBe(150);expect((a.motion?.end??0)<=w.tick).toBe(true);}
    else if(a.burning!.remainingCore<150)firstReaction=w.tick;
  }
  expect(firstReaction).toBe(Math.ceil(strike.untilCore/10));expect(a.health!.injuries.some(i=>i.kind==='burn')).toBe(true);expect(a.strike).toBeUndefined();
  expect(a.burning!.remainingCore).toBe(140);
  stepWorld(w,14);stepWorld(copy,14);expect(copy).toEqual(w);expect(a.burning).toBeUndefined();expect(w.fires!.ledger.extinguished).toBe(1);expect(validateWorld(w)).toEqual([]);
});
test('ignition preserves a captured movement edge and prevents all new melee during its burning reaction',()=>{
  const {w,a,hit}=camp();for(const p of w.pawns)p.hostilityResponse='ignore';
  a.path=[{x:a.x+1,z:a.z},{x:a.x+2,z:a.z}];moveAnimal(w,a,animalNavigation(w).step);const edge=structuredClone(a.motion);
  expect(attachAnimalFire(w,a.id,.1)).toBe(true);expect(a.motion).toEqual(edge);expect(a.path).toEqual([]);expect(hit()).toBe(false);
  expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w));
  for(let i=0;i<3;i++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);expect(a.strike).toBeUndefined();if(w.tick<edge!.end)expect(a.motion).toEqual(edge);}
});
test('clinical poisoning starts physical vomiting, retains an earlier cooldown and blocks new attacks across save/reload',()=>{
  const {w,a,p,hit}=camp();for(const pawn of w.pawns)pawn.hostilityResponse='ignore';
  recoverAnimalManhunter(w,a);a.nextDecision=w.tick+100;
  while((w.tick+1)%60!==a.id%60)stepWorld(w);
  startAnimalManhunter(w,a);a.manhunter!.targetId=p.id;p.x=a.x+1;p.z=a.z;p.motion=null;p.moveCooldown=0;
  // Exposure is the real ingestion producer; the seeded next phase test starts
  // the episode, rather than preparing a completed vomit or a cancelled strike.
  w.rng=1;ingestFoodRisk(w,a,{item:'simple-meal',foodPoison:{fraction:1,cause:'filthy-kitchen'}},false);
  expect(a.health!.foodPoisoning).toBeDefined();stepWorld(w);
  expect(a.health!.foodPoisoning!.vomit).toBeDefined();expect(a.strike).toBeUndefined();expect(hit()).toBe(false);expect(validateWorld(w)).toEqual([]);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,5);stepWorld(copy,5);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);expect(a.strike).toBeUndefined();
  // A separate genuine attempt demonstrates that initiation cannot erase a
  // recovery when the next clinical hash happens during that cooldown.
  const second=camp();for(const pawn of second.w.pawns)pawn.hostilityResponse='ignore';
  recoverAnimalManhunter(second.w,second.a);second.a.nextDecision=second.w.tick+100;
  while(second.w.tick%60!==second.a.id%60)stepWorld(second.w);
  startAnimalManhunter(second.w,second.a);second.a.manhunter!.targetId=second.p.id;second.p.x=second.a.x+1;second.p.z=second.a.z;second.p.motion=null;second.p.moveCooldown=0;
  expect(second.hit()).toBe(true);const strike=structuredClone(second.a.strike);
  second.w.rng=1;ingestFoodRisk(second.w,second.a,{item:'simple-meal',foodPoison:{fraction:1,cause:'filthy-kitchen'}},false);
  const withoutCooldown=structuredClone(second.w),free=withoutCooldown.wildlife!.animals.find(a=>a.id===second.a.id)!;delete free.strike;
  expect(processAnimalVomiting(withoutCooldown,free)).toBe(true);
  expect(processAnimalVomiting(second.w,second.a)).toBe(false);expect(second.a.strike).toEqual(strike);
  expect(validateWorld(second.w)).toEqual([]);
});
