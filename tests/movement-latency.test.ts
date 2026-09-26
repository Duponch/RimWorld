import { expect, test } from 'vitest';
import { applyCommand, createWorld, stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { TICKS_PER_SECOND, type Pawn, type World } from '../src/sim/types.ts';

function camp(): { world: World; pawn: Pawn } {
  const world = createWorld(42, 32, 32);
  world.tick = 2000;
  world.tiles = world.tiles.map(() => ({ terrain: 'grass' }));
  world.resources = []; world.jobs = []; world.structures = []; world.piles = []; world.stockpiles = [];
  world.pawns = world.pawns.slice(0, 1);
  const pawn = world.pawns[0]!;
  Object.assign(pawn, { x: 8, z: 10, hunger: 100, rest: 100, needCooldown: 20 });
  pawn.schedule.fill('anything');
  pawn.priorities = { handle:0, art:0, clean:0, firefight:0, warden:0, basic:0, hunt:0, research:0,
    patient:0, bedrest:0, doctor:0, mine:0, gather:0, build:0, haul:0, grow:0, cook:0, craft:0 };
  return { world, pawn };
}

test('mobiliser puis déplacer ne consomme aucun tick ni aléa ; le premier segment part au tick suivant', () => {
  const { world, pawn } = camp(), beforeTick = world.tick, beforeRng = structuredClone(world.rng);
  expect(TICKS_PER_SECOND).toBe(6);
  expect(applyCommand(world, { type:'draft', pawnIds:[pawn.id], enabled:true }).ok).toBe(true);
  expect(applyCommand(world, { type:'draft-move', pawnIds:[pawn.id], target:{x:14,z:10}, queue:false }).ok).toBe(true);
  expect(world.tick).toBe(beforeTick);
  expect(world.rng).toEqual(beforeRng);
  expect(pawn.motion).toBeUndefined();
  expect(pawn.path.length).toBeGreaterThan(0);
  stepWorld(world);
  expect(world.tick).toBe(beforeTick + 1);
  expect(pawn.motion).toMatchObject({from:{x:8,z:10},to:{x:9,z:10},start:beforeTick + 1});
  expect(validateWorld(world)).toEqual([]);
});

test('un nouveau clic conserve le segment en cours puis reprend au point et au temps exacts', () => {
  const { world, pawn } = camp();
  expect(applyCommand(world, { type:'draft', pawnIds:[pawn.id], enabled:true }).ok).toBe(true);
  expect(applyCommand(world, { type:'draft-move', pawnIds:[pawn.id], target:{x:14,z:10}, queue:false }).ok).toBe(true);
  stepWorld(world);
  const captured = structuredClone(pawn.motion)!;
  expect(captured).toMatchObject({from:{x:8,z:10},to:{x:9,z:10}});
  const tick = world.tick, rng = structuredClone(world.rng);
  expect(applyCommand(world, { type:'draft-move', pawnIds:[pawn.id], target:{x:4,z:10}, queue:false }).ok).toBe(true);
  expect(world.tick).toBe(tick);
  expect(world.rng).toEqual(rng);
  expect(pawn.motion).toEqual(captured);
  const resumed = deserializeWorld(serializeWorld(world));
  while (world.tick + 1 < captured.end) {
    stepWorld(world); stepWorld(resumed);
    expect(pawn.motion).toEqual(captured);
  }
  stepWorld(world); stepWorld(resumed);
  expect(pawn.motion).toMatchObject({from:captured.to,to:{x:8,z:10},start:captured.end});
  expect(world).toEqual(resumed);
  stepWorld(world, 5); stepWorld(resumed, 5);
  expect(world).toEqual(resumed);
  expect(validateWorld(world)).toEqual([]);
});

test('un travail autonome prêt démarre son trajet dans le tick de planification ; la désignation réveille le cooldown', () => {
  const { world, pawn } = camp();
  pawn.priorities.gather = 1;
  pawn.planCooldown = 20;
  world.resources.push({ id:world.nextId++, kind:'tree', x:15, z:10, amount:12 });
  const startTick = world.tick;
  expect(applyCommand(world, { type:'designate', kind:'chop', x:15, z:10 }).ok).toBe(true);
  expect(world.tick).toBe(startTick);
  expect(pawn.planCooldown).toBe(0);
  expect(pawn.motion).toBeUndefined();
  stepWorld(world);
  expect(pawn.jobId).toBe(world.jobs[0]!.id);
  expect(pawn.motion?.start).toBe(startTick + 1);
  expect(pawn.motion?.from).toEqual({x:8,z:10});
  expect(validateWorld(world)).toEqual([]);
});
