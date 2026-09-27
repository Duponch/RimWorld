import { expect,test } from 'vitest';
import { crashlandedProfile } from '../src/sim/game-profile.ts';
import { validFluIncidents } from '../src/sim/flu-incidents-save.ts';
import { adoptFluIncidents,advanceFluIncidents,FLU_CHECK_INTERVAL,FLU_FIRST_CHECK,resolveFluIncident } from '../src/sim/flu-incidents.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';

function colony(count=1){
  const world=deconstructionCamp(count);
  world.gameProfile=crashlandedProfile();
  adoptFluIncidents(world);
  return world;
}

test('Cassandra disease clock is future-only, saveable, and never touches world RNG',()=>{
  const world=colony(),calendar=world.fluIncidents!,initialWorldRng=world.rng;
  expect(calendar.nextCheck).toBe(FLU_FIRST_CHECK);
  expect(validFluIncidents(world,127)).toBe(true);
  expect(validFluIncidents(world,125)).toBe(false);
  world.tick=FLU_FIRST_CHECK-1;advanceFluIncidents(world);
  expect(calendar.checks).toBe(0);
  calendar.rng=1; // First two draws select the category and Flu at Adventure Story.
  world.tick=FLU_FIRST_CHECK;advanceFluIncidents(world);
  expect(calendar.checks).toBe(1);
  expect(calendar.fluDraws).toBe(1);
  expect(calendar.episodes).toBe(1);
  expect(calendar.cases).toBe(1);
  expect(calendar.nextCheck).toBe(FLU_FIRST_CHECK+FLU_CHECK_INTERVAL);
  expect(world.pawns[0]!.health?.flu?.severity).toBeGreaterThan(0);
  expect(world.events.filter(e=>e.message.startsWith('Grippe :'))).toHaveLength(1);
  expect(world.rng).toBe(initialWorldRng);
  expect(validFluIncidents(world,127)).toBe(true);
  const old=structuredClone(world);delete old.fluIncidents;
  expect(validFluIncidents(old,127)).toBe(false);
  const forgery=structuredClone(world);forgery.fluIncidents!.nextCheck--;
  expect(validFluIncidents(forgery,127)).toBe(false);
});

test('other human diseases keep their category share without creating a Flu or journal entry',()=>{
  const world=colony();world.tick=FLU_FIRST_CHECK;
  // Category passes; second draw 0.213375 falls between 100/470 and
  // 100/460, so omitting human OrganDecay's weight would spuriously add Flu.
  world.fluIncidents!.rng=388948;
  advanceFluIncidents(world);
  expect(world.fluIncidents).toMatchObject({checks:1,fluDraws:0,episodes:0,cases:0});
  expect(world.pawns[0]!.health?.flu).toBeUndefined();
  expect(world.events.filter(e=>e.message.startsWith('Grippe :'))).toHaveLength(0);
});

test('selected victims are bounded; residual immunity and an active case resist another incident',()=>{
  const world=colony(5),calendar=world.fluIncidents!,worldRng=world.rng;
  const first=resolveFluIncident(world);
  expect(first).toBeGreaterThanOrEqual(1);
  expect(first).toBeLessThanOrEqual(2); // Core rounds 5 × 0.5 to even = 2.
  expect(world.pawns.filter(p=>!!p.health?.flu?.severity)).toHaveLength(first);
  expect(world.rng).toBe(worldRng);
  const active=colony();expect(resolveFluIncident(active)).toBe(1);
  expect(resolveFluIncident(active)).toBe(0);
  expect(active.fluIncidents!.episodes).toBe(1);
  const alone=colony();alone.pawns[0]!.health=createMedicalRecord(0);
  alone.pawns[0]!.health!.flu={bornAt:0,severity:0,immunity:600_000_000,luck:1_000_000};
  expect(resolveFluIncident(alone)).toBe(0);
  expect(alone.fluIncidents!.episodes).toBe(0);
  expect(alone.events.some(e=>e.message.startsWith('Grippe :'))).toBe(false);
  expect(calendar.episodes).toBe(1);
});

test('adoption of an older ongoing Crashlanded game never backfills earlier disease rolls',()=>{
  const world=deconstructionCamp();world.gameProfile=crashlandedProfile();
  world.tick=FLU_FIRST_CHECK+17;
  const rng=world.rng,health=world.pawns[0]!.health;
  adoptFluIncidents(world);adoptFluIncidents(world);
  expect(world.fluIncidents).toMatchObject({nextCheck:FLU_FIRST_CHECK+FLU_CHECK_INTERVAL,checks:0,episodes:0,cases:0});
  expect(world.rng).toBe(rng);
  expect(world.pawns[0]!.health).toBe(health);
  expect(validFluIncidents(world,127)).toBe(true);
});
