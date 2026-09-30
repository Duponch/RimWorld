import { expect, test } from 'vitest';
import type { WorldEvent } from '../src/sim/types.ts';
import { createSimpleMealLedger, observeSimpleMealLedger } from './scenarios/simple-meal-ledger.ts';

const single = (tick: number, cook = 'Ada'): WorldEvent => ({ tick, type: 'job', message: `${cook} a cuisiné 1 repas simple (4 baies, 6 riz).` });
const bulk = (tick: number, cook = 'Noé'): WorldEvent => ({ tick, type: 'job', message: `${cook} a cuisiné 4 repas simples.` });

test('unit and bulk completions account for physical portions instead of bill operations', () => {
  const ledger = createSimpleMealLedger();
  observeSimpleMealLedger(ledger, [single(10), bulk(11), single(12)]);
  expect(ledger.totals).toEqual({ operations: 3, singleOperations: 2, bulkOperations: 1, portions: 6, ingredients: 60, unitDelta: 54 });
  expect(9 * ledger.totals.operations).not.toBe(ledger.totals.unitDelta); // The old unit-only campaign counter fails on x4.
  const initialFood = 120;
  const physicalFoodAfterCooking = initialFood - ledger.totals.ingredients + ledger.totals.portions;
  expect(physicalFoodAfterCooking + ledger.totals.unitDelta).toBe(initialFood);
});

test('overlapping event windows count only new completions, including identical same-tick messages', () => {
  const ledger = createSimpleMealLedger();
  const repeated = single(20);
  observeSimpleMealLedger(ledger, [single(19), repeated]);
  observeSimpleMealLedger(ledger, [single(19), repeated]);
  expect(ledger.totals.portions).toBe(2);
  observeSimpleMealLedger(ledger, [repeated, { ...repeated }, bulk(21)]);
  expect(ledger.totals).toMatchObject({ operations: 4, singleOperations: 3, bulkOperations: 1, portions: 7, ingredients: 70, unitDelta: 63 });
  observeSimpleMealLedger(ledger, [repeated, { ...repeated }, bulk(21)]);
  expect(ledger.totals.operations).toBe(4);
  // The first identical message can leave the bounded event window before another completion at the same tick.
  observeSimpleMealLedger(ledger, [bulk(21), { tick: 21, type: 'need', message: 'Autre événement.' }]);
  observeSimpleMealLedger(ledger, [{ tick: 21, type: 'need', message: 'Autre événement.' }, repeated]);
  expect(ledger.totals).toMatchObject({ operations: 5, singleOperations: 4, portions: 8, unitDelta: 72 });
});

test('initial events and serialized checkpoints do not grant retroactive credit', () => {
  const history = [single(2), bulk(3)];
  const ledger = createSimpleMealLedger(history);
  expect(observeSimpleMealLedger(ledger, history).portions).toBe(0);
  observeSimpleMealLedger(ledger, [...history, single(4)]);
  const resumed = JSON.parse(JSON.stringify(ledger)) as typeof ledger;
  observeSimpleMealLedger(resumed, [...history, single(4)]);
  expect(resumed.totals).toEqual(ledger.totals);
  observeSimpleMealLedger(resumed, [single(4), bulk(5)]);
  expect(resumed.totals).toMatchObject({ operations: 2, singleOperations: 1, bulkOperations: 1, portions: 5, ingredients: 50, unitDelta: 45 });
});

test('an old snapshot cannot rewind the event window, and an empty window preserves the tick guard', () => {
  const ledger = createSimpleMealLedger();
  observeSimpleMealLedger(ledger, [single(10), bulk(11)]);
  const currentWindow = [...ledger.window];
  observeSimpleMealLedger(ledger, [single(10)]);
  observeSimpleMealLedger(ledger, []);
  expect(ledger.lastTick).toBe(11);
  expect(ledger.window).toEqual(currentWindow);
  expect(ledger.totals).toMatchObject({ operations: 2, portions: 5 });
  observeSimpleMealLedger(ledger, [bulk(11), single(12)]);
  expect(ledger.totals).toMatchObject({ operations: 3, portions: 6, ingredients: 60, unitDelta: 54 });
});

test('a delayed prefix at the same tick cannot credit a completion twice', () => {
  const ledger = createSimpleMealLedger();
  const first = single(10), second = bulk(10);
  observeSimpleMealLedger(ledger, [first, second]);
  const checkpoint = JSON.stringify(ledger);
  observeSimpleMealLedger(ledger, [first]);
  expect(JSON.stringify(ledger)).toBe(checkpoint);
  observeSimpleMealLedger(ledger, [second, single(11)]);
  expect(ledger.totals).toMatchObject({ operations: 3, portions: 6, ingredients: 60, unitDelta: 54 });
});

test('non-job, other recipes and malformed simple completions do not count', () => {
  const valid = single(8);
  const ledger = createSimpleMealLedger();
  const malformed = [
    { ...valid, type: 'need' },
    { ...valid, message: 'Ada a cuisiné 1 plat raffiné.' },
    { ...valid, message: 'Ada a cuisiné 1 repas simple (5 baies, 6 riz).' },
    { ...valid, message: 'Ada a cuisiné 4 repas simples' },
    { ...valid, message: 'Ada a cuisiné 4 repas simples. Puis l’a mangé.' },
    { ...valid, tick: Number.NaN },
  ] as WorldEvent[];
  observeSimpleMealLedger(ledger, malformed);
  expect(ledger.totals.operations).toBe(0);
  observeSimpleMealLedger(ledger, [valid]);
  expect(ledger.totals).toMatchObject({ operations: 1, portions: 1, ingredients: 10, unitDelta: 9 });
});
