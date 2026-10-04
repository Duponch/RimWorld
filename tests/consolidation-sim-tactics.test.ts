import { expect, test } from 'vitest';
import { applyCommand, stepWorld } from '../src/sim/engine.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { enableRaids } from '../src/sim/raids.ts';
import { createRaidGroup } from '../src/sim/raid-spawn.ts';
import { raidRoute } from '../src/sim/raid-space.ts';
import { processRaider } from '../src/sim/raid-behavior.ts';
import { startTravel } from '../src/sim/movement.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import { LightEnvironmentCache } from '../src/sim/light-environment.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';

function approach(armed=true, visible=true) {
  const w = deconstructionCamp(1,64); w.tick = 2000;
  const target = w.pawns[0]!; target.x = visible?12:1; target.z = visible?16:1;
  expect(applyCommand(w, {type:'draft',pawnIds:[target.id],enabled:true}).ok).toBe(true);
  expect(applyCommand(w, {type:'fire-at-will',pawnIds:[target.id],enabled:false}).ok).toBe(true);
  enableRaids(w);
  expect(createRaidGroup(w, {count:1,sites:[{x:63,z:16}],random:{rng:81733}})).not.toBeNull();
  const enemy = w.pawns.find(p => p.raid)!; enemy.x = visible?52:63;
  if (armed) addMaterial(w, 'weapon', 1, {type:'equipment',pawnId:enemy.id}, 'revolver');
  const route = raidRoute(w, enemy, false, blockedCells(w))!;
  enemy.path = route.path; enemy.raid!.goal = route.goal; enemy.state = 'moving'; enemy.planCooldown = 0;
  expect(enemy.path.length).toBeGreaterThan(1); expect(validateWorld(w)).toEqual([]);
  return {w, enemy, target};
}

test.each([0,1,2])('ranged acquisition with budget %i gives route ownership to the chosen controller and remains saveable', remaining => {
  const {w,enemy,target} = approach(); const strategicGoal = {...enemy.raid!.goal!};
  const budget = {remaining,pairs:32768};
  processRaider(w,enemy,()=>blockedCells(w),budget,()=>new LightEnvironmentCache().read(w));
  expect(validateWorld(w)).toEqual([]); expect(() => serializeWorld(w)).not.toThrow();
  if (remaining===0) {
    expect(enemy.tactics).toBeUndefined(); expect(enemy.raid!.goal).toEqual(strategicGoal);
  } else {
    expect(enemy.tactics?.targetId).toBe(target.id); expect(enemy.raid!.goal).toBeNull();
    if (remaining===1) {expect(enemy.path).toEqual([]); expect(enemy.tactics?.post).toBeNull();}
    else {expect(enemy.tactics?.post).not.toBeNull(); expect(enemy.path.at(-1)).toEqual(enemy.tactics?.post);}
  }
  const copy = deserializeWorld(serializeWorld(w));
  for (let i=0;i<8;i++) {stepWorld(w);stepWorld(copy);expect(validateWorld(w)).toEqual([]);expect(serializeWorld(w)).toBe(serializeWorld(copy));}
});

test('failed acquisition restores the exact strategic route and consumes its next ordinary edge', () => {
  const {w,enemy} = approach(true,false); const route = enemy.path, remaining = route.slice(1), goal = {...enemy.raid!.goal!};
  processRaider(w,enemy,()=>blockedCells(w),{remaining:2,pairs:32768},()=>new LightEnvironmentCache().read(w));
  expect(enemy.tactics).toBeUndefined(); expect(enemy.path).toBe(route); expect(enemy.path).toEqual(remaining);
  expect(enemy.raid!.goal).toEqual(goal); expect(enemy.motion).not.toBeNull(); expect(validateWorld(w)).toEqual([]);
});

test.each([true,false])('strategic transition preserves the already captured edge, armed=%s, and exact saved continuation', armed => {
  const {w,enemy,target} = approach(armed);
  expect(startTravel(w,enemy,enemy.path[0]!)).toBe(true); enemy.path.shift();
  const edge = structuredClone(enemy.motion)!; const copy = deserializeWorld(serializeWorld(w));
  while (w.tick+1<edge.end) {
    stepWorld(w); stepWorld(copy); expect(enemy.motion).toEqual(edge); expect(enemy.tactics).toBeUndefined();
    expect(validateWorld(w)).toEqual([]); expect(serializeWorld(w)).toBe(serializeWorld(copy));
  }
  stepWorld(w);stepWorld(copy); expect(enemy.tactics?.targetId).toBe(target.id);
  expect(enemy.motion?.start).toBeGreaterThanOrEqual(edge.end);
  if (armed) expect(enemy.path.at(-1)).toEqual(enemy.tactics?.post);
  else expect(enemy.melee?.order?.targetId).toBe(target.id);
  expect(validateWorld(w)).toEqual([]); expect(serializeWorld(w)).toBe(serializeWorld(copy));
});
