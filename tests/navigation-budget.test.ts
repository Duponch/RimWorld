import { expect, test } from 'vitest';
import { createWorld } from '../src/sim/engine';
import { routeCost, blockedCells, foodInteractionGoals, reachableCells, routeToJob } from '../src/sim/pathfinding';

test('goal-bounded floods retain the full-flood nearest food and exact path across ties, walls and unreachable goals', () => {
  let random = 123456789, reduced = 0;
  const draw = () => { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return random; };
  for (let run = 0; run < 120; run++) {
    const w = createWorld(run, 16, 16), start = { x: 2, z: 2 };
    w.structures = []; w.jobs = []; w.resources = [];
    w.tiles = w.tiles.map(() => ({ terrain: draw() % 5 === 0 ? 'rock' : 'grass' })); w.tiles[34] = { terrain: 'grass' };
    const foods = Array.from({ length: 12 }, (_, id) => ({ id, x: draw() % 16, z: (draw() >>> 9) % 16 }));
    const blocked = blockedCells(w), occupied = new Set<number>();
    const full = reachableCells(w, start, blocked, occupied);
    const bounded = reachableCells(w, start, blocked, occupied, foodInteractionGoals(w, foods));
    const select = (reach: typeof full) => foods.flatMap(food => {
      const path = routeToJob(w, food, reach, true); return path ? [{ id: food.id, path }] : [];
    }).sort((a, b) => routeCost(w,a.path,reach) - routeCost(w,b.path,reach) || a.id - b.id)[0] ?? null;
    expect(select(bounded), `seed ${run}`).toEqual(select(full));
    if (bounded.parents.filter(parent => parent !== -2).length < full.parents.filter(parent => parent !== -2).length) reduced++;
  }
  expect(reduced).toBeGreaterThan(70);
});
