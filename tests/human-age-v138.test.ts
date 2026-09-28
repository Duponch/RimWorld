import { expect,test } from 'vitest';
import { stepWorld } from '../src/sim/engine.ts';
import { updatePawnHealth } from '../src/sim/health.ts';
import { advanceHumanAges,biologicalYears,chronologicalYears,HUMAN_YEAR_TICKS,humanAgeImmunityFactor,initialHumanAge } from '../src/sim/human-age.ts';
import { assessMedical,createMedicalRecord } from '../src/sim/injury-state.ts';
import { startingPawn } from '../src/sim/starting-pawns.ts';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { acquireFlu } from '../src/sim/flu-state.ts';
import { pawnBody } from '../src/sim/health-rules.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { medicalCamp } from './scenarios/health.ts';

test('new human ages are adult, deterministic and advance only with confirmed ticks',()=>{
  const world=medicalCamp(2),[a,b]=world.pawns,random=world.rng;
  expect(initialHumanAge(world.seed,77)).toEqual(initialHumanAge(world.seed,77));
  expect(initialHumanAge(world.seed,77)).not.toEqual(initialHumanAge(world.seed,78));
  expect(a!.age).toBeDefined();expect(b!.age).toBeDefined();
  expect(biologicalYears(a!.age!)).toBeGreaterThanOrEqual(18);
  expect(chronologicalYears(a!.age!)).toBe(biologicalYears(a!.age!));
  expect(world.rng).toBe(random);
  const initial=structuredClone(a!.age);
  stepWorld(world,0);expect(a!.age).toEqual(initial);
  stepWorld(world,3);
  expect(a!.age).toEqual({biologicalTicks:initial!.biologicalTicks+3,chronologicalTicks:initial!.chronologicalTicks+3});
  expect(validateWorld(world)).toEqual([]);
});

test('new older actors replay earlier birthday ailments without spending world RNG',()=>{
  const first=startingPawn(74,'Aînée',8,8,0,55,42,250_000);
  const second=startingPawn(74,'Aînée',8,8,0,55,42,250_000);
  expect(first).toEqual(second);
  expect(biologicalYears(first.age!)).toBe(70);
  expect(first.health?.ageAilments).toEqual(['bad-back','frail']);
  expect(first.health?.tick).toBe(250_000);
  const world=medicalCamp(1),random=world.rng;
  startingPawn(74,'Aînée',8,8,0,55,42,250_000);
  expect(world.rng).toBe(random);
});

test('death stops biological aging while chronological time continues',()=>{
  const world=medicalCamp(1),pawn=world.pawns[0]!,before={...pawn.age!};
  pawn.state='dead';world.tick++;
  advanceHumanAges(world);
  expect(pawn.age).toEqual({biologicalTicks:before.biologicalTicks,chronologicalTicks:before.chronologicalTicks+1});
});

test('Crashlanded starters have stable cryptosleep years while generic survivors do not',()=>{
  const crash=createScenarioWorld(42,32,'crashlanded'),repeat=createScenarioWorld(42,32,'crashlanded');
  const generic=createScenarioWorld(42,32,'survivors');
  expect(crash.pawns.map(p=>p.age)).toEqual(repeat.pawns.map(p=>p.age));
  expect(crash.pawns.every(p=>p.age!.chronologicalTicks>=p.age!.biologicalTicks)).toBe(true);
  expect(crash.pawns.some(p=>p.age!.chronologicalTicks>p.age!.biologicalTicks)).toBe(true);
  expect(generic.pawns.every(p=>p.age!.chronologicalTicks===p.age!.biologicalTicks)).toBe(true);
  expect(validateWorld(crash)).toEqual([]);
});

test('biological birthdays can cause both Core chronic conditions and change real capacities',()=>{
  const world=medicalCamp(1),pawn=world.pawns[0]!;
  pawn.age={biologicalTicks:80*HUMAN_YEAR_TICKS-1,chronologicalTicks:80*HUMAN_YEAR_TICKS-1};
  world.rng=1; // Two low xorshift draws, below the Core age-fraction chances.
  const before=pawnBody(pawn).capacities;
  stepWorld(world,1);
  expect(biologicalYears(pawn.age)).toBe(80);
  expect(pawn.health?.ageAilments).toEqual(['bad-back','frail']);
  expect(pawnBody(pawn).capacities.moving).toBeLessThan(before.moving);
  expect(pawnBody(pawn).capacities.manipulation).toBeLessThan(before.manipulation);
  expect(world.events.filter(e=>e.message.includes('80 ans'))).toHaveLength(2);
  expect(validateWorld(world)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(world));
  stepWorld(world,12);stepWorld(resumed,12);
  expect(resumed).toEqual(world);
});

test('chronic-only projections match the full medical path and react to in-place changes',()=>{
  const world=medicalCamp(1),pawn=world.pawns[0]!,record=pawn.health=createMedicalRecord(world.tick);
  const full=()=>assessMedical({...record,infections:{nextId:1,cases:[],immunity:0}});
  for(const ailments of [['bad-back'],['frail'],['bad-back','frail']] as const){
    record.ageAilments=[...ailments];
    expect(pawnBody(pawn)).toEqual(full());
    expect(pawnBody(pawn)).toEqual(full());
  }
  record.ageAilments=['bad-back'];
  const back=pawnBody(pawn);
  record.ageAilments.push('frail');
  expect(pawnBody(pawn)).toEqual(full());
  expect(pawnBody(pawn)).not.toEqual(back);
  record.bloodLoss=100_000_000;
  expect(pawnBody(pawn)).toEqual(full());
  record.bloodLoss=0;record.heatstroke=400_000_000;
  expect(pawnBody(pawn)).toEqual(full());
  delete record.heatstroke;
  const rng=world.rng;
  world.tick++;updatePawnHealth(world,pawn);
  expect(world.rng).toBe(rng);
  expect(record.tick).toBe(world.tick);
  expect(validateWorld(world)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(world));
  stepWorld(world,12);stepWorld(resumed,12);
  expect(resumed).toEqual(world);
});

test('age affects existing infection and flu immunity through the Core age curve',()=>{
  expect(humanAgeImmunityFactor({biologicalTicks:52*HUMAN_YEAR_TICKS,chronologicalTicks:52*HUMAN_YEAR_TICKS})).toBe(1);
  expect(humanAgeImmunityFactor({biologicalTicks:64*HUMAN_YEAR_TICKS,chronologicalTicks:64*HUMAN_YEAR_TICKS})).toBe(.95);
  expect(humanAgeImmunityFactor({biologicalTicks:80*HUMAN_YEAR_TICKS,chronologicalTicks:80*HUMAN_YEAR_TICKS})).toBe(.9);
  const young=medicalCamp(1),old=structuredClone(young),a=young.pawns[0]!,b=old.pawns[0]!;
  a.age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:30*HUMAN_YEAR_TICKS};
  b.age={biologicalTicks:80*HUMAN_YEAR_TICKS,chronologicalTicks:80*HUMAN_YEAR_TICKS};
  a.health=createMedicalRecord(0);b.health=createMedicalRecord(0);
  acquireFlu(a.health,1_000_000);acquireFlu(b.health,1_000_000);
  young.tick=1;old.tick=1;
  updatePawnHealth(young,a);updatePawnHealth(old,b);
  expect(a.health.flu!.immunity).toBeGreaterThan(b.health.flu!.immunity);
});

test('V135 migration validates first, gives neutral adult age and never fabricates illness',()=>{
  const current=medicalCamp(2),previous=structuredClone(current) as typeof current;
  previous.schemaVersion=135 as typeof previous.schemaVersion;
  for(const pawn of previous.pawns)delete pawn.age;
  const rng=previous.rng,oldTick=previous.tick;
  const forged=structuredClone(previous);
  forged.pawns[0]!.age=initialHumanAge(forged.seed,forged.pawns[0]!.id);
  expect(()=>deserializeWorld(JSON.stringify(forged))).toThrow(/Invalid version 135 save/);
  const badHealth=structuredClone(previous);
  badHealth.pawns[0]!.health=createMedicalRecord(oldTick);
  badHealth.pawns[0]!.health!.ageAilments=['frail'];
  expect(()=>deserializeWorld(JSON.stringify(badHealth))).toThrow(/Invalid version 135 save/);
  const loaded=deserializeWorld(JSON.stringify(previous));
  expect(loaded.pawns.map(p=>p.age)).toEqual(previous.pawns.map(()=>({biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:30*HUMAN_YEAR_TICKS})));
  expect(loaded.pawns.every(p=>!p.health?.ageAilments)).toBe(true);
  expect(loaded.rng).toBe(rng);expect(loaded.tick).toBe(oldTick);
  expect(validateWorld(loaded)).toEqual([]);
  for(const mutate of [
    (pawn:typeof loaded.pawns[number])=>{pawn.age!.chronologicalTicks=pawn.age!.biologicalTicks-1;},
    (pawn:typeof loaded.pawns[number])=>{pawn.age!.biologicalTicks=-1;},
    (pawn:typeof loaded.pawns[number])=>{(pawn.age as object as Record<string,unknown>).unknown=1;},
    (pawn:typeof loaded.pawns[number])=>{pawn.health=createMedicalRecord(loaded.tick);pawn.health.ageAilments=['frail','frail'];},
  ]){const invalid=structuredClone(loaded);mutate(invalid.pawns[0]!);expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow();}
});
