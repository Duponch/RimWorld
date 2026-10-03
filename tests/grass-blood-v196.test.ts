import { expect, test } from 'vitest';
import { GroundBlood } from '../src/render/ground-blood';
import type { FilthRecord } from '../src/sim/filth-rules';
const stain = (id: number, x: number, z: number, thickness = 1): FilthRecord => ({ id, x, z, thickness, kind: 'blood', grownCore: 0, expiresAfterCore: 1_000_000, nextCheckCore: 100 });

test('sparse tint cache marks actual cell changes, including removal, instead of every existing stain', () => {
  const cache = new GroundBlood(), items = [stain(1, 2, 3, 5), stain(2, 4, 3, 1)];
  expect(cache.adopt(items, 250, 250).sort()).toEqual([752, 754]);
  expect(cache.adopt(items, 250, 250)).toEqual([]);
  items[1]!.thickness = 2; expect(cache.adopt(items, 250, 250)).toEqual([754]);
  expect(cache.adopt(items.slice(1), 250, 250)).toEqual([752]);
  expect(cache.adopt([], 250, 250)).toEqual([754]);
  expect(cache.cells.size).toBe(0);
});
