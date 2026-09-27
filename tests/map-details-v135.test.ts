import { expect, test } from 'vitest';
import { createWorld } from '../src/sim/engine';
import { mapCellDetails } from '../src/ui/map-cell-details';

test('Alt inspection reports the actual stack and terrain without selecting a cell', () => {
  const world = createWorld(135, 16, 16), cell = { x: 3, z: 4 };
  world.tiles = world.tiles.map(() => ({ terrain: 'grass' }));
  world.resources = []; world.structures = []; world.piles = [];
  world.packed = []; world.jobs = []; world.growingZones = []; world.stockpiles = [];
  world.piles.push({ id: world.nextId++, kind: 'food', item: 'simple-meal', quantity: 4, owner: { type: 'ground', ...cell } });
  const details = mapCellDetails(world, cell, 0.37)!;
  expect(details.heading).toBe('Repas simple ×4');
  expect(details.rows).toContainEqual({ label: 'Terrain', value: 'Terre ordinaire' });
  expect(details.rows).toContainEqual({ label: 'Luminosité', value: '37 %' });
});
