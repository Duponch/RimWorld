import { expect, test } from 'vitest';
import { createWorld } from '../src/sim/index.ts';
import { HEALTHY_BODY } from '../src/sim/body-capacities.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { plantHarvestYield, plantSkill, plantWorkRate, plantWorkSpeed } from '../src/sim/plant-skills.ts';
import { tickSkills } from '../src/sim/skills.ts';

test('Plants stat curves use the verified Core levels and a missing historical profile reads neutrally', () => {
  const world=createWorld(42),pawn=world.pawns[0]!;
  delete pawn.skills.plants;
  const oldSkills=structuredClone(pawn.skills);
  expect(plantSkill(pawn)).toMatchObject({level:8,xp:0,dailyXp:0,passion:0});
  expect(plantWorkSpeed(pawn)).toBe(1);
  expect(plantHarvestYield(pawn)).toBe(1);
  expect(pawn.skills).toEqual(oldSkills);
  for(const [level,speed,yieldStat] of [[0,.1,.60],[4,.54,.85],[8,1,1],[10,1.23,1.02],[20,2.38,1.13]]){
    pawn.skills.plants={level:level!,xp:0,dailyXp:0,passion:0};
    expect(plantWorkSpeed(pawn)).toBeCloseTo(speed!,10);
    expect(plantHarvestYield(pawn)).toBeCloseTo(yieldStat!,10);
  }
  pawn.skills.plants={level:8,xp:0,dailyXp:0,passion:0};
  pawn.health=createMedicalRecord(world.tick);
  const body={...HEALTHY_BODY,capacities:{...HEALTHY_BODY.capacities,manipulation:.5,sight:.5}};
  expect(plantWorkSpeed(pawn,body)).toBeCloseTo(.5*(.7+.3*.5),10);
  expect(plantHarvestYield(pawn,body)).toBeCloseTo((1+.3*(.5-1))*(1+.2*(.5-1)),10);
});

test('only an executable trained work tick creates historical Plants XP, then common saturation and forgetting apply', () => {
  const world=createWorld(42),pawn=world.pawns[0]!;
  delete pawn.skills.plants;
  pawn.health=createMedicalRecord(world.tick);
  const unable={...HEALTHY_BODY,capacities:{...HEALTHY_BODY.capacities,manipulation:0}};
  expect(plantWorkRate(pawn,unable)).toBe(0);
  expect(pawn.skills.plants).toBeUndefined();
  expect(plantWorkRate(pawn,undefined,false)).toBe(1);
  expect(pawn.skills.plants).toBeUndefined();
  expect(plantWorkRate(pawn)).toBe(1);
  expect(pawn.skills.plants).toMatchObject({level:8,xp:298,dailyXp:298,passion:0});
  pawn.skills.plants!.dailyXp=4000001;
  const before=pawn.skills.plants!.xp;
  plantWorkRate(pawn);
  expect(pawn.skills.plants!.xp-before).toBe(59);
  pawn.skills.plants!.level=20;pawn.skills.plants!.xp=1000000;pawn.skills.plants!.dailyXp=4000001;
  world.tick=3000+(20-(3000+pawn.id)%20)%20;
  tickSkills(world,pawn);
  expect(pawn.skills.plants!.xp).toBe(988000);
  const resetTick=6000+(20-pawn.id%20)%20;
  world.tick=resetTick;tickSkills(world,pawn);
  expect(pawn.skills.lastResetTick).toBe(resetTick);
  expect(pawn.skills.plants!.dailyXp).toBe(-12000);
});
