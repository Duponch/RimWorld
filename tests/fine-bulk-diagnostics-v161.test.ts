import { expect, test } from 'vitest';
import { AudioCueRecorder } from '../src/bridge/audio-cues.ts';
import { applyCommand } from '../src/sim/index.ts';
import { queryCookingBillStatus } from '../src/sim/cooking-diagnostics.ts';
import { cookingSpot } from '../src/sim/cooking-bills.ts';
import { ROT_DAYS } from '../src/sim/food-preservation.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { isCookingOrder } from '../src/sim/order-types.ts';
import { planCookingOrder, queuedCookingReason } from '../src/sim/player-cooking.ts';
import { TICKS_PER_DAY } from '../src/sim/types.ts';
import { foodWorkstationCamp, fixtureFoodStation } from './scenarios/food-workstations.ts';

test('fine x4 diagnostics keep Cuisine 6, both 20-unit groups and freshness in direct orders', () => {
  const world = foodWorkstationCamp(), pawn = world.pawns[0]!, station = fixtureFoodStation(world, 'fueled-stove');
  station.fuel!.ticks = 6000;
  pawn.priorities.cook = 1;
  pawn.skills.cooking!.level = 5;
  expect(applyCommand(world, { type: 'bill-add', structureId: station.id, recipe: 'cook-fine-meal-bulk' }).ok).toBe(true);
  const bill = station.bills![0]!;
  addGroundMaterial(world, 'food', 20, { x: 7, z: 7 }, 'milk');
  addGroundMaterial(world, 'food', 20, { x: 8, z: 7 }, 'rice');
  const milk = world.piles.find(p => p.item === 'milk')!;

  expect(queryCookingBillStatus(world, station, bill)).toMatchObject({ code: 'skill-required', reason: expect.stringContaining('Cuisine 6') });
  pawn.skills.cooking!.level = 6;
  expect(queryCookingBillStatus(world, station, bill).code).toBe('waiting');
  milk.rot = { progress: ROT_DAYS.milk * TICKS_PER_DAY, atTick: world.tick };
  expect(queryCookingBillStatus(world, station, bill)).toMatchObject({
    code: 'missing-ingredients', reason: expect.stringContaining('0/20 protéines'),
  });

  milk.rot.progress = 0;
  const proposal = planCookingOrder(world, pawn, station.id);
  expect(proposal.label).toBe('Cuisiner quatre plats raffinés');
  const order = proposal.order;
  if (!order || !isCookingOrder(order)) throw new Error('Expected a fine x4 recipe proposal.');
  pawn.orders.queue.push(order);
  expect(queuedCookingReason(world, order)).toBeUndefined();
  milk.rot.progress = ROT_DAYS.milk * TICKS_PER_DAY;
  expect(queuedCookingReason(world, order)).toContain('Ingrédient périmé, impropre aux quatre plats raffinés.');
  milk.rot.progress = 0;
  for (const ingredient of order.cooking.ingredients) ingredient.item = 'rice';
  expect(queuedCookingReason(world, order)).toContain('vingt protéines (viande ou lait) et vingt végétaux');
});

test('fine x4 confirmed work uses the existing cooking cue', () => {
  const world = foodWorkstationCamp(), pawn = world.pawns[0]!, station = fixtureFoodStation(world, 'fueled-stove');
  pawn.cooking = { recipe: 'cook-fine-meal-bulk', stationId: station.id, billId: world.nextId++, spot: cookingSpot(station),
    actionCell: { x: station.x, z: station.z }, phase: 'work', ingredients: [], progress: 0, productId: null, storageId: null };
  pawn.state = 'working';
  const recorder = new AudioCueRecorder(); recorder.capture(world);
  world.tick++; pawn.cooking.progress = 10000; recorder.capture(world);
  expect(recorder.drain()).toMatchObject([{ kind: 'cooking.work', x: station.x, z: station.z }]);
});
