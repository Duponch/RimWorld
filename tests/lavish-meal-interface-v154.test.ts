import { expect, test } from 'vitest';
import { applyCommand, addGroundMaterial } from '../src/sim/index.ts';
import { queryCookingBillStatus } from '../src/sim/cooking-diagnostics.ts';
import { cookingSpot } from '../src/sim/cooking-bills.ts';
import { queuedCookingReason } from '../src/sim/player-cooking.ts';
import { foodPolicyLayout } from '../src/ui/food-policy-controls.ts';
import { AudioCueRecorder } from '../src/bridge/audio-cues.ts';
import { foodWorkstationCamp, fixtureFoodStation } from './scenarios/food-workstations.ts';
import type { CookingOrder } from '../src/sim/order-types.ts';

test('the bill diagnoses Cuisine 8 and both filtered ingredient groups', () => {
  const world = foodWorkstationCamp(), pawn = world.pawns[0]!, station = fixtureFoodStation(world, 'fueled-stove');
  station.fuel!.ticks = 600; pawn.priorities.cook = 1; pawn.skills.cooking!.level = 7;
  expect(applyCommand(world, { type: 'bill-add', structureId: station.id, recipe: 'lavish-meal' }).ok).toBe(true);
  const bill = station.bills![0]!;
  expect(queryCookingBillStatus(world, station, bill)).toMatchObject({ code: 'skill-required', reason: expect.stringContaining('Cuisine 8') });
  pawn.skills.cooking!.level = 8;
  addGroundMaterial(world, 'food', 20, { x: 7, z: 7 }, 'rice');
  expect(queryCookingBillStatus(world, station, bill)).toMatchObject({ code: 'missing-ingredients', reason: expect.stringContaining('0/10 protéines') });
  addGroundMaterial(world, 'food', 10, { x: 8, z: 7 }, 'milk');
  expect(queryCookingBillStatus(world, station, bill).code).toBe('waiting');
  bill.filters.milk = false;
  expect(queryCookingBillStatus(world, station, bill)).toMatchObject({ code: 'missing-ingredients', reason: expect.stringContaining('0/10 protéines') });
});

test('a queued order cannot substitute twenty vegetables for the protein quota', () => {
  const world = foodWorkstationCamp(), pawn = world.pawns[0]!, station = fixtureFoodStation(world, 'fueled-stove');
  station.fuel!.ticks = 600; pawn.priorities.cook = 1;
  expect(applyCommand(world, { type: 'bill-add', structureId: station.id, recipe: 'lavish-meal' }).ok).toBe(true);
  addGroundMaterial(world, 'food', 20, { x: 7, z: 7 }, 'rice');
  const pile = world.piles.at(-1)!;
  const order: CookingOrder = { cooking: { recipe: 'lavish-meal', stationId: station.id, billId: station.bills![0]!.id,
    spot: cookingSpot(station), actionCell: { x: station.x, z: station.z }, phase: 'gather',
    ingredients: [{ pileId: pile.id, item: 'rice', quantity: 20, stage: 'source', cell: { x: station.x, z: station.z } }],
    progress: 0, productId: null, storageId: null } };
  pawn.orders.queue.push(order);
  expect(queuedCookingReason(world, order)).toContain('protéines');
});

test('the meal is offered in food policies and uses the existing cooking cue', () => {
  expect(foodPolicyLayout()).toContain('data-allowed-food="lavish-meal"');
  const world = foodWorkstationCamp(), pawn = world.pawns[0]!, station = fixtureFoodStation(world, 'fueled-stove');
  pawn.cooking = { recipe: 'lavish-meal', stationId: station.id, billId: world.nextId++, spot: cookingSpot(station),
    actionCell: { x: station.x, z: station.z }, phase: 'work', ingredients: [], progress: 0, productId: null, storageId: null };
  pawn.state = 'working'; const recorder = new AudioCueRecorder(); recorder.capture(world);
  world.tick++; pawn.cooking.progress = 10000; recorder.capture(world);
  expect(recorder.drain()).toMatchObject([{ kind: 'cooking.work', x: station.x, z: station.z }]);
});
