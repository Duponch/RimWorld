import { expect } from 'vitest';
import { preparePredationDemo } from '../../scripts/create-test-save-predation-v190.ts';
import { stepWorld } from '../../src/sim/engine.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../../src/sim/serialization.ts';
import type { MaterialPile, World } from '../../src/sim/types.ts';

export function predationCamp(domesticPrey = false) {
  const w = preparePredationDemo({ domesticPrey });
  return { w, foxId: w.wildlife!.animals[0]!.id, preyId: w.wildlife!.animals[1]!.id };
}
export const animal = (w: World, id: number) => w.wildlife!.animals.find(a => a.id === id)!;
export const body = (w: World, id: number): MaterialPile | undefined => w.piles.find(p => p.id === id && !!p.corpse);

export function validPredation(w: World): void {
  expect(validateWorld(w), `tick ${w.tick}: ${JSON.stringify({ animals: w.wildlife?.animals, piles: w.piles })}`).toEqual([]);
}
export function untilPredation(w: World, done: () => boolean, max = 1600): void {
  validPredation(w);
  for (let i = 0; i < max && !done(); i++) { stepWorld(w); validPredation(w); }
  expect(done(), `condition not reached at tick ${w.tick}: ${JSON.stringify({ animals: w.wildlife?.animals, piles: w.piles })}`).toBe(true);
}
/** Run both sides, including independent reconstruction of all transient caches. */
export function replayPredation(w: World, ticks = 1): void {
  validPredation(w);
  const resumed = deserializeWorld(serializeWorld(w));
  for (let i = 0; i < ticks; i++) { stepWorld(w); stepWorld(resumed); }
  expect(resumed).toEqual(w); validPredation(w);
}
