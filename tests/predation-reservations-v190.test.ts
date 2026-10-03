import { expect, test } from 'vitest';
import { applyCommand, stepWorld } from '../src/sim/engine.ts';
import { reservedSource, addGroundMaterial, refreshStock } from '../src/sim/materials.ts';
import type { World } from '../src/sim/types.ts';
import { animal, body, predationCamp, replayPredation, untilPredation, validPredation } from './helpers/predation-v190-fixture.ts';

function storage(w: World, x: number, z: number, corpse: boolean) {
  expect(applyCommand(w, { type: 'stockpile', enabled: true, x, z,
    filters: { wood: false, food: !corpse, corpse }, capacity: corpse ? 1 : 75, priority: 4 }).ok).toBe(true);
  return w.stockpiles.find(s => s.x === x && s.z === z)!;
}

test.each(['approach', 'eating'] as const)('automatic hauling respects the whole corpse already reserved during %s, then carries the remaining physical body after release', phase => {
  const { w, foxId, preyId } = predationCamp();
  // Prepared initial hunger yields a real partial ingestion rather than
  // granting a pre-consumed body or a fabricated medical injury.
  animal(w, foxId).food = .16;
  untilPredation(w, () => !!body(w, preyId) && animal(w, foxId).meal?.id === preyId);
  if (phase === 'eating') untilPredation(w, () => animal(w, foxId).state === 'eating');
  else expect(animal(w, foxId).state).toBe('moving');
  const corpse = body(w, preyId)!, medical = structuredClone(corpse.corpse!.health), originalItem = corpse.item;
  const zone = storage(w, 22, 18, true), worker = w.pawns[0]!;
  expect(reservedSource(w, preyId)).toBe(1);
  expect(applyCommand(w, { type: 'priority', pawnId: worker.id, work: 'haul', value: 1 }).ok).toBe(true);
  worker.planCooldown = 0;
  // The idle gate sees a useful storage destination; the actual planner must
  // reject the claimed source instead of preempting the animal's meal.
  for (let i = 0; i < 10; i++) {
    stepWorld(w); validPredation(w);
    expect(animal(w, foxId).meal?.id).toBe(preyId);
    expect(reservedSource(w, preyId)).toBe(1);
    expect(w.pawns.every(p => !p.haul)).toBe(true);
    expect(body(w, preyId)!.owner.type).toBe('ground');
    expect(body(w, preyId)!.quantity).toBe(1);
  }
  replayPredation(w, 3);
  expect(animal(w, foxId).meal?.id).toBe(preyId); expect(worker.haul).toBeNull();
  untilPredation(w, () => !animal(w, foxId).meal && !!body(w, preyId)?.corpse!.consumedParts?.length);
  const remaining = body(w, preyId)!, anatomy = structuredClone(remaining.corpse), nutrition = w.wildlife!.eatenNutrition;
  expect(remaining.quantity).toBe(1); expect(remaining.corpse!.health).toEqual(medical);
  expect(nutrition).toBeGreaterThan(0); expect(w.wildlife!.eatenItems).toBe(0);
  untilPredation(w, () => worker.haul?.phase === 'deliver');
  expect(worker.haul!.sourcePileId).toBe(preyId); expect(worker.haul!.carryPileId).toBe(preyId);
  expect(body(w, preyId)!.owner).toEqual({ type: 'pawn', pawnId: worker.id });
  expect(body(w, preyId)!.corpse).toEqual(anatomy); replayPredation(w, 3);
  untilPredation(w, () => {
    const p = body(w, preyId);
    return !worker.haul && p?.owner.type === 'ground' && p.owner.x === zone.x && p.owner.z === zone.z;
  });
  expect(w.piles).toHaveLength(1);
  expect(body(w, preyId)).toMatchObject({ id: preyId, item: originalItem, quantity: 1, owner: { type: 'ground', x: zone.x, z: zone.z }, corpse: anatomy });
  expect(w.wildlife!.eatenNutrition).toBe(nutrition); expect(w.wildlife!.eatenItems).toBe(0);
  expect(reservedSource(w, preyId)).toBe(0); replayPredation(w, 12);
});

test('the planner counts an animal meal quantity once and can physically haul only the unreserved portion of a food pile', () => {
  const { w, foxId, preyId } = predationCamp(), worker = w.pawns[0]!;
  // Prepared worker location gives the real pickup time to occur before the
  // distant fox reaches its reserved portion. No transport task is granted.
  worker.x = 26; worker.z = 25;
  addGroundMaterial(w, 'food', 2, { x: 27, z: 25 }, 'survival-meal'); refreshStock(w);
  const source = w.piles.find(p => p.item === 'survival-meal')!, sourceId = source.id;
  const zone = storage(w, 29, 25, false);
  untilPredation(w, () => animal(w, foxId).meal?.id === sourceId);
  expect(animal(w, foxId).meal!.quantity).toBe(1); expect(reservedSource(w, sourceId)).toBe(1);
  expect(applyCommand(w, { type: 'priority', pawnId: worker.id, work: 'haul', value: 1 }).ok).toBe(true);
  worker.planCooldown = 0;
  untilPredation(w, () => worker.haul?.phase === 'deliver', 20);
  expect(worker.haul!.quantity).toBe(1);
  expect(worker.haul!.carryPileId).not.toBe(sourceId);
  expect(w.piles.find(p => p.id === sourceId)).toMatchObject({ quantity: 1, owner: { type: 'ground', x: 27, z: 25 } });
  expect(animal(w, foxId).meal?.id).toBe(sourceId); expect(reservedSource(w, sourceId)).toBe(1);
  expect(w.piles.reduce((n, p) => n + p.quantity, 0)).toBe(2);
  replayPredation(w);
  untilPredation(w, () => !worker.haul && w.piles.some(p => p.id !== sourceId && p.owner.type === 'ground' && p.owner.x === zone.x && p.owner.z === zone.z));
  expect(animal(w, foxId).meal?.id).toBe(sourceId);
  untilPredation(w, () => w.wildlife!.eatenItems === 1);
  expect(w.piles.some(p => p.id === sourceId)).toBe(false);
  expect(w.piles.filter(p => p.item === 'survival-meal').reduce((n, p) => n + p.quantity, 0)).toBe(1);
  expect(animal(w, preyId).health!.death).toBeUndefined(); validPredation(w); replayPredation(w, 12);
});
