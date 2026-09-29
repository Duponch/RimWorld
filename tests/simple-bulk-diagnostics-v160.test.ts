import { expect, test } from 'vitest';
import { applyCommand } from '../src/sim/index.ts';
import { queryCookingBillStatus } from '../src/sim/cooking-diagnostics.ts';
import { planCookingOrder, queuedCookingReason } from '../src/sim/player-cooking.ts';
import { ROT_DAYS } from '../src/sim/food-preservation.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { isCookingOrder } from '../src/sim/order-types.ts';
import { TICKS_PER_DAY } from '../src/sim/types.ts';
import { foodWorkstationCamp, fixtureFoodStation } from './scenarios/food-workstations.ts';

test('bulk simple meal diagnostics exclude expired raw food and reject a queued source that spoils', () => {
  const world = foodWorkstationCamp(), pawn = world.pawns[0]!, station = fixtureFoodStation(world, 'fueled-stove');
  station.fuel!.ticks = 6000;
  pawn.priorities.cook = 1;
  expect(applyCommand(world, { type: 'bill-add', structureId: station.id, recipe: 'cook-simple-meal-bulk' }).ok).toBe(true);
  const bill = station.bills![0]!;
  addGroundMaterial(world, 'food', 40, { x: 7, z: 7 }, 'rice');
  const pile = world.piles.at(-1)!;
  expect(queryCookingBillStatus(world, station, bill).code).toBe('waiting');

  pile.rot = { progress: ROT_DAYS.rice * TICKS_PER_DAY, atTick: world.tick };
  expect(queryCookingBillStatus(world, station, bill)).toMatchObject({
    code: 'missing-ingredients', reason: expect.stringContaining('0/40'),
  });

  pile.rot.progress = 0;
  const proposal = planCookingOrder(world, pawn, station.id);
  expect(proposal.label).toBe('Cuisiner quatre repas simples');
  const order = proposal.order;
  if (!order || !isCookingOrder(order)) throw new Error('Expected a bulk recipe proposal.');
  pawn.orders.queue.push(order);
  expect(queuedCookingReason(world, order)).toBeUndefined();
  pile.rot.progress = ROT_DAYS.rice * TICKS_PER_DAY;
  expect(queuedCookingReason(world, order)).toContain('Ingrédient périmé, impropre aux quatre repas simples.');
});
