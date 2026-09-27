import { expect, test } from 'vitest';
import { createWorld, deserializeWorld, serializeWorld } from '../src/sim/index.ts';

test('loading a legacy decorative rock removes only the decoration, preserving real chunks', () => {
  const world = createWorld(42, 32, 32);
  const occupied = new Set([
    ...world.piles.flatMap(pile => pile.owner.type === 'ground' ? [`${pile.owner.x},${pile.owner.z}`] : []),
    ...world.resources.map(resource => `${resource.x},${resource.z}`),
  ]);
  const index = world.tiles.findIndex((tile, index) => {
    const x = index % world.width, z = Math.floor(index / world.width);
    return tile.terrain === 'grass' && !occupied.has(`${x},${z}`);
  });
  expect(index).toBeGreaterThanOrEqual(0);
  const x = index % world.width, z = Math.floor(index / world.width);
  world.resources.push({ id: world.nextId++, kind: 'rock', x, z, amount: 7, stone: 'limestone' });
  const originalPiles = structuredClone(world.piles), originalNextId = world.nextId;
  const loaded = deserializeWorld(serializeWorld(world));
  expect(loaded.resources.some(resource => resource.kind === 'rock')).toBe(false);
  expect(loaded.piles).toEqual(originalPiles);
  expect(loaded.nextId).toBe(originalNextId);
  expect(deserializeWorld(serializeWorld(loaded))).toEqual(loaded);

  const invalid = structuredClone(world);
  invalid.resources.at(-1)!.stone = 'vacstone' as 'limestone';
  expect(() => deserializeWorld(JSON.stringify(invalid))).toThrow();
});
