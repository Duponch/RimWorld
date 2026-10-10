import { expect, test } from 'vitest';
import { applyCommand, createWorld } from '../src/sim/engine';
import { footprintCells } from '../src/sim/definitions';
import type { Job, World } from '../src/sim/types';
import { mapObjectActions, mapObjectGroupActions } from '../src/ui/map-object-actions';

function fixture(): World {
  const world = createWorld(303, 12, 12);
  world.tiles = world.tiles.map(() => ({ terrain: 'grass' }));
  world.resources = []; world.structures = []; world.jobs = []; world.piles = []; world.stockpiles = []; world.growingZones = [];
  return world;
}
function job(world: World, kind: Job['kind'], x = 2, z = 2): Job {
  return { id: world.nextId++, kind, x, z, orientation: 0, footprint: 'standard', status: 'pending',
    reservedBy: null, progress: 0, escrow: { wood: 0, food: 0 } };
}

test('rock inspector creates the physical mine command then cancels its exact Job', () => {
  const world = fixture(), id = 2 * world.width + 2;
  world.tiles[id] = { terrain: 'rock', stone: 'granite' };
  const before = JSON.stringify(world), selected = { kind: 'rock' as const, id };
  const actions = mapObjectActions(world, selected);
  expect(JSON.stringify(world)).toBe(before);
  expect(actions.map(action => action.id)).toEqual(['mine']);
  expect(actions[0]!.command).toEqual({ type: 'designate', kind: 'mine', x: 2, z: 2 });
  expect(applyCommand(world, actions[0]!.command).ok).toBe(true);
  const cancel = mapObjectActions(world, selected);
  expect(cancel.map(action => action.id)).toEqual(['cancel']);
  expect(applyCommand(world, cancel[0]!.command).ok).toBe(true); expect(world.jobs).toEqual([]);
  world.tiles[id] = { terrain: 'rough-stone' }; expect(mapObjectActions(world, selected)).toEqual([]);
});

test('chunks submit a one-cell area permission, never a fake haul Job or cancel permission', () => {
  const world = fixture(), id = world.nextId++;
  world.piles = [{ id, kind: 'chunk', item: 'granite-chunk', quantity: 1, owner: { type: 'ground', x: 2, z: 2 } }];
  const actions = mapObjectActions(world, { kind: 'pile', id });
  expect(actions.map(action => action.id)).toEqual(['haul-chunks']);
  expect(actions[0]!.command).toEqual({ type: 'area', action: 'haul-chunks', from: { x: 2, z: 2 }, to: { x: 2, z: 2 } });
  expect(applyCommand(world, actions[0]!.command).ok).toBe(true); expect(world.piles[0]!.haulRequested).toBe(true);
  expect(world.jobs).toEqual([]); expect(mapObjectActions(world, { kind: 'pile', id })).toEqual([]);
  delete world.piles[0]!.haulRequested; world.piles[0]!.owner = { type: 'pawn', pawnId: world.pawns[0]!.id };
  expect(mapObjectActions(world, { kind: 'pile', id })).toEqual([]);
});

test('resource offers follow species/growth and an existing designation becomes a cancellable order', () => {
  const world = fixture(), id = world.nextId++;
  world.resources = [{ id, kind: 'berries', x: 2, z: 2, amount: 10, growth: 1, growthTick: world.tick }];
  const selected = { kind: 'resource' as const, id };
  expect(mapObjectActions(world, selected).map(action => action.id)).toEqual(['harvest', 'cut']);
  world.resources[0]!.growth = .1;
  expect(mapObjectActions(world, selected).map(action => action.id)).toEqual(['cut']);
  const cut = mapObjectActions(world, selected)[0]!;
  expect(applyCommand(world, cut.command).ok).toBe(true);
  expect(mapObjectActions(world, selected).map(action => action.id)).toEqual(['cancel']);
  expect(applyCommand(world, mapObjectActions(world, selected)[0]!.command).ok).toBe(true);
  expect(world.resources).toHaveLength(1);
});

test('coordinate cancel never removes a different first overlapping Job or automatic maintenance', () => {
  const world = fixture(), first = job(world, 'build-roof'), second = job(world, 'cut');
  world.jobs = [first, second];
  world.resources = [{ id: world.nextId++, kind: 'berries', amount: 10, x: 2, z: 2, growth: 1, growthTick: world.tick }];
  expect(mapObjectActions(world, { kind: 'job', id: second.id })).toEqual([]);
  expect(mapObjectActions(world, { kind: 'resource', id: world.resources[0]!.id })).toEqual([]);
  expect(mapObjectActions(world, { kind: 'job', id: first.id }).map(action => action.id)).toEqual(['cancel']);
  world.jobs = [job(world, 'repair')];
  expect(mapObjectActions(world, { kind: 'job', id: world.jobs[0]!.id })).toEqual([]);
  world.jobs = [job(world, 'fix-breakdown')];
  expect(mapObjectActions(world, { kind: 'job', id: world.jobs[0]!.id })).toEqual([]);
});

test('deconstruction pins targetId and preserves independent layers while refusing an existing removal', () => {
  const world = fixture(), id = world.nextId++;
  world.structures = [{ id, kind: 'bed', x: 2, z: 2, orientation: 0, footprint: 'standard' }];
  world.jobs = [job(world, 'power-conduit')];
  const actions = mapObjectActions(world, { kind: 'structure', id });
  expect(actions.map(action => action.id)).toEqual(['deconstruct']);
  expect(actions[0]!.command).toEqual({ type: 'designate', kind: 'deconstruct', targetId: id, x: 2, z: 2 });
  expect(applyCommand(world, actions[0]!.command).ok).toBe(true);
  // Conduit remains first at the anchor; a secondary bed cell still resolves
  // exactly to its removal Job and must not cancel the independent conduit.
  const cancel = mapObjectActions(world, { kind: 'structure', id });
  expect(cancel.map(action => action.id)).toEqual(['cancel']);
  const secondary = footprintCells(world.structures[0]!).find(cell => cell.x !== 2 || cell.z !== 2)!;
  expect(cancel[0]!.command).toEqual({ type: 'cancel', x: secondary.x, z: secondary.z });
  expect(applyCommand(world, cancel[0]!.command).ok).toBe(true); expect(world.structures).toHaveLength(1);
  expect(world.jobs.map(job => job.kind)).toEqual(['power-conduit']);
});

test('group action deduplication retains target identities and removes duplicate physical cell commands', () => {
  const world = fixture(), first = world.nextId++, second = world.nextId++;
  world.piles = [first, second].map(id => ({ id, kind: 'chunk', item: 'granite-chunk', quantity: 1, owner: { type: 'ground', x: 2, z: 2 } }));
  const groups = mapObjectGroupActions(world, [{ kind: 'pile', id: first }, { kind: 'pile', id: second }, { kind: 'pile', id: first }]);
  expect(groups).toHaveLength(1); expect(groups[0]!.commands).toHaveLength(1);
  world.structures = [{ id: world.nextId++, kind: 'bed', x: 5, z: 5, orientation: 0, footprint: 'standard' },
    { id: world.nextId++, kind: 'power-conduit', x: 5, z: 5, orientation: 0, footprint: 'standard' }];
  const structures = mapObjectGroupActions(world, world.structures.map(structure => ({ kind: 'structure', id: structure.id })));
  expect(structures[0]!.commands).toHaveLength(2);
  expect(structures[0]!.commands.map(command => 'targetId' in command && command.targetId)).toEqual(world.structures.map(structure => structure.id));
});

test('other inspector controls remain independent and disappearing targets offer nothing', () => {
  const world = fixture();
  for (const kind of ['packed', 'growing', 'stockpile', 'structure', 'resource', 'pile', 'job'] as const)
    expect(mapObjectActions(world, { kind, id: 999999 })).toEqual([]);
});

test('a busy ground packed source can cancel its exact distant installation via furniture fallback', () => {
  const world = fixture(), id = world.nextId++;
  world.packed = [{ building: { id, kind: 'bed', x: 4, z: 4, orientation: 0, footprint: 'standard' }, owner: { type: 'ground', x: 2, z: 2 } }];
  const install = { ...job(world, 'install', 8, 8), furniture: { structureId: id, kind: 'bed' as const } };
  world.jobs = [install];
  const actions = mapObjectActions(world, { kind: 'packed', id });
  expect(actions.map(action => action.id)).toEqual(['cancel']);
  expect(actions[0]!.command).toEqual({ type: 'cancel', x: 2, z: 2 });
  expect(applyCommand(world, actions[0]!.command).ok).toBe(true);
  expect(world.jobs).toEqual([]); expect(world.packed[0]!.building.id).toBe(id);
});

test('packed cancellation never skips an incompatible first coordinate Job to reach its installation', () => {
  const world = fixture(), id = world.nextId++;
  world.packed = [{ building: { id, kind: 'bed', x: 4, z: 4, orientation: 0, footprint: 'standard' }, owner: { type: 'ground', x: 2, z: 2 } }];
  world.jobs = [job(world, 'build-roof'), { ...job(world, 'install', 8, 8), furniture: { structureId: id, kind: 'bed' } }];
  expect(mapObjectActions(world, { kind: 'packed', id })).toEqual([]);
  expect(mapObjectGroupActions(world, [{ kind: 'packed', id }])).toEqual([]);
});

test('group resource facts belong to one call and refresh when a secondary plant becomes harvestable', () => {
  const world = fixture();
  world.resources = [1, 2].map(x => ({ id: world.nextId++, kind: 'berries', x, z: 2, amount: 10, growth: .1, growthTick: world.tick }));
  const selected = world.resources.map(resource => ({ kind: 'resource' as const, id: resource.id }));
  expect(mapObjectGroupActions(world, selected).map(action => action.id)).toEqual(['cut']);
  world.resources[1]!.growth = 1;
  const actions = mapObjectGroupActions(world, selected);
  expect(actions.map(action => action.id)).toEqual(['cut', 'harvest']);
  expect(actions.find(action => action.id === 'harvest')!.commands).toEqual([{ type: 'designate', kind: 'harvest', x: 2, z: 2 }]);
  expect(mapObjectActions(world, selected[0]!).map(action => action.id)).toEqual(['cut']);
});
