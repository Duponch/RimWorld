import { expect, test } from 'vitest';
import { addGroundMaterial, applyCommand, createWorld, deserializeWorld, queryArea, refreshStock, serializeWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import type { AreaAction, AreaCommand, Command, World } from '../src/sim/types.ts';

const area = (action: AreaAction, x: number, z: number, endX = x, endZ = z): AreaCommand => ({ type: 'area', action, from: { x, z }, to: { x: endX, z: endZ } });
const json = (world: World) => JSON.stringify(world);
const mass = (world: World) => world.piles.reduce((sum, pile) => sum + (pile.kind === 'wood' ? pile.quantity : 0), 0)
  + world.resources.reduce((sum, resource) => sum + (resource.kind === 'tree' ? resource.amount : 0), 0)
  + world.structures.reduce((sum, structure) => sum + (structure.kind === 'wall' ? 5 : 8), 0);
function fixture(): World {
  const world = createWorld(42, 16, 16);
  world.tiles = world.tiles.map(() => ({ terrain: 'grass' })); world.resources = []; world.piles = [];
  world.pawns.forEach((pawn, i) => { pawn.x = 2 + i; pawn.z = 2; pawn.hunger = 100; pawn.rest = 100; });
  addGroundMaterial(world, 'wood', 32, { x: 1, z: 5 }); addGroundMaterial(world, 'food', 18, { x: 1, z: 6 });
  return world;
}
function until(world: World, condition: () => boolean): void {
  const total = mass(world);
  for (let tick = 0; tick < 1200 && !condition(); tick++) {
    stepWorld(world); expect(validateWorld(world)).toEqual([]); expect(mass(world)).toBe(total);
  }
  expect(condition(), `Transition absente au tick ${world.tick}`).toBe(true);
}

test('rectangles : sélection exacte, frontières, reprise, concurrence et conservation des annulations', () => {
  const world = fixture();
  for (const [x, z, kind] of [[5, 5, 'tree'], [6, 5, 'tree'], [9, 7, 'tree'], [7, 5, 'berries'], [8, 5, 'rock']] as const) world.resources.push({ id: world.nextId++, x, z, kind, amount: 12 });
  world.resources.push({id:world.nextId++,kind:'berries',x:9,z:5,amount:10,growth:.3,growthTick:0});
  world.tiles[6 * 16 + 6]!.terrain = 'water'; world.tiles[6 * 16 + 7]!.terrain = 'rock';
  world.structures.push({ id: world.nextId++, x: 8, z: 6, kind: 'bed', orientation: 0, footprint: 'standard' });
  expect(applyCommand(world, { type: 'designate', kind: 'bed', x: 10, z: 6 }).ok).toBe(true);
  expect(applyCommand(world, { type: 'stockpile', x: 4, z: 4, enabled: true, filters: { wood: false, food: true }, priority: 4, capacity: 9 }).ok).toBe(true);
  const original = serializeWorld(world);

  // The existing single-cell command is an independent oracle for admissibility.
  // Existing storage is deliberately skipped by the additive rectangle tool.
  for (const action of ['chop', 'harvest', 'cut', 'cancel', 'stockpile', 'remove-stockpile'] as const) {
    const expected: number[] = [];
    for (let z = 4; z <= 8; z++) for (let x = 4; x <= 10; x++) {
      if (action === 'stockpile' && world.stockpiles.some(cell => cell.x === x && cell.z === z)) continue;
      const copy = deserializeWorld(original);
      const command: Command = action === 'stockpile' || action === 'remove-stockpile' ? { type: 'stockpile', x, z, enabled: action === 'stockpile' }
        : action === 'cancel' ? { type: 'cancel', x, z } : { type: 'designate', kind: action, x, z };
      if (applyCommand(copy, command).ok) expected.push(z * 16 + x);
    }
    for (const rectangle of [area(action, 4, 4, 10, 8), area(action, 10, 8, 4, 4), area(action, 4, 8, 10, 4), area(action, 10, 4, 4, 8)]) {
      const preview = queryArea(world, rectangle); expect(preview.ok).toBe(true);
      if (preview.ok) { expect(preview.cells).toEqual(expected); expect(preview.selected).toBe(35); expect(preview.skipped).toBe(35 - expected.length); }
    }
  }
  expect(json(world)).toBe(original);
  for (const bad of [
    { ...area('chop', 4, 4), from: null }, { ...area('chop', 4, 4), to: { x: NaN, z: 4 } },
    area('chop', -1, 4), area('chop', 0, 0, 16, 15), area('chop', 0.5, 4), { ...area('chop', 4, 4), action: 'wall' },
    { ...area('stockpile', 4, 4, 10, 8), filters: null }, { ...area('stockpile', 4, 4), priority: 0 },
    { ...area('stockpile', 4, 4), capacity: 76 }, { ...area('stockpile', 4, 4), filters: { wood: true } },
  ]) {
    expect(applyCommand(world, bad as unknown as Command).ok).toBe(false); expect(json(world)).toBe(original);
  }
  const storage = { ...area('stockpile', 10, 8, 4, 4), filters: { wood: true, food: false }, priority: 2, capacity: 15 };
  const preview = queryArea(world, storage); if (!preview.ok) throw new Error(preview.reason);
  const result = applyCommand(world, storage);
  expect(result).toEqual({ ok: true, affected: preview.cells.length, skipped: preview.skipped });
  expect(world.stockpiles[0]).toEqual(JSON.parse(original).stockpiles[0]);
  expect(world.stockpiles.slice(1).every(cell => cell.filters.wood && !cell.filters.food && cell.capacity === 15 && cell.priority === 2)).toBe(true);
  expect(world.stockpiles[1]!.filters).not.toBe(world.stockpiles[2]!.filters);
  const added = serializeWorld(world);
  expect(applyCommand(world, storage).ok).toBe(false); expect(json(world)).toBe(added);
  expect(json(deserializeWorld(added))).toBe(added);
  const reversed = deserializeWorld(original); applyCommand(reversed, { ...storage, from: storage.to, to: storage.from }); expect(json(reversed)).toBe(added);

  // A full 250² rectangle includes the far boundary and preserves exact resource identities.
  const large = createWorld(7, 250, 250);
  const targets = large.resources.filter(resource => resource.kind === 'tree').map(resource => resource.z * 250 + resource.x).sort((a, b) => a - b);
  const before = json(large), selection = queryArea(large, area('chop', 249, 249, 0, 0));
  expect(selection.ok && selection.cells).toEqual(targets); expect(json(large)).toBe(before);
  expect(applyCommand(large, area('chop', 249, 249, 0, 0))).toEqual({ ok: true, affected: targets.length, skipped: 62500 - targets.length });
  expect(large.jobs.map(job => job.z * 250 + job.x)).toEqual(targets);
  expect(large.resources).toEqual(JSON.parse(before).resources); expect(large.piles).toEqual(JSON.parse(before).piles);
  const after = serializeWorld(large); expect(applyCommand(large, area('chop', 0, 0, 249, 249)).ok).toBe(false); expect(json(large)).toBe(after);
  const overflow = fixture(); overflow.nextId = Number.MAX_SAFE_INTEGER;
  const overflowBefore = json(overflow); expect(applyCommand(overflow, area('stockpile', 5, 5, 7, 7)).ok).toBe(false); expect(json(overflow)).toBe(overflowBefore);

  // Removing a rectangle during either reservation or carrying must release all
  // affected commitments, preserve matter, and resume identically from a save.
  for (const phase of ['pickup', 'deliver'] as const) {
    const busy = fixture(); applyCommand(busy, area('stockpile', 12, 4, 13, 5));
    until(busy, () => busy.pawns.some(pawn => pawn.haul?.phase === phase));
    const saved = serializeWorld(busy), resumed = deserializeWorld(saved), total = mass(busy);
    if (phase === 'deliver') {
      const exhausted = deserializeWorld(saved); exhausted.nextId = Number.MAX_SAFE_INTEGER;
      const unchanged = serializeWorld(exhausted);
      expect(applyCommand(exhausted, area('remove-stockpile', 12, 4, 13, 5)).ok).toBe(false);
      expect(serializeWorld(exhausted)).toBe(unchanged);
    }
    for (const current of [busy, resumed]) {
      expect(applyCommand(current, area('remove-stockpile', 13, 5, 12, 4))).toEqual({ ok: true, affected: 4, skipped: 0 });
      expect(current.stockpiles).toEqual([]); expect(current.pawns.every(pawn => pawn.haul === null)).toBe(true);
      expect(validateWorld(current)).toEqual([]); expect(mass(current)).toBe(total); stepWorld(current, 50);
    }
    expect(serializeWorld(busy)).toBe(serializeWorld(resumed));
  }

  const building = fixture();
  applyCommand(building, { type: 'designate', kind: 'bed', x: 10, z: 8 });
  applyCommand(building, { type: 'designate', kind: 'wall', x: 12, z: 8 });
  until(building, () => building.piles.some(pile => pile.owner.type === 'job') && building.pawns.some(pawn => pawn.haul?.phase === 'deliver'));
  const total = mass(building), resumed = deserializeWorld(serializeWorld(building));
  const exhausted = deserializeWorld(serializeWorld(building)); exhausted.nextId = Number.MAX_SAFE_INTEGER;
  const unchanged = serializeWorld(exhausted);
  expect(applyCommand(exhausted, area('cancel', 10, 8, 12, 9)).ok).toBe(false);
  expect(serializeWorld(exhausted)).toBe(unchanged);
  for (const current of [building, resumed]) {
    // Both cells of the bed are selected, but only one cancellation and refund occur.
    expect(applyCommand(current, area('cancel', 10, 8, 10, 9))).toEqual({ ok: true, affected: 1, skipped: 0 });
    expect(current.jobs).toHaveLength(1); expect(current.jobs[0]!.kind).toBe('wall');
    expect(validateWorld(current)).toEqual([]); expect(mass(current)).toBe(total);
    until(current, () => current.jobs.length === 0); expect(mass(current)).toBe(total);
  }
  expect(serializeWorld(building)).toBe(serializeWorld(resumed));
  refreshStock(building); expect(validateWorld(building)).toEqual([]);
});
