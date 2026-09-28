import { expect, test } from 'vitest';
import { copyTerrainPaintRect, singleTerrainPaintPatchRect } from '../src/render/TerrainLayer';

test('one changed tile selects only its three-by-three-cell painted margin', () => {
  const width = 250;
  const middle = 125 * width + 125;

  expect(singleTerrainPaintPatchRect({ width, height: 250 }, [middle])).toEqual({
    x: 124 * 8,
    y: 124 * 8,
    width: 24,
    height: 24,
  });
  expect(singleTerrainPaintPatchRect({ width, height: 250 }, [0])).toEqual({
    x: 0,
    y: 0,
    width: 16,
    height: 16,
  });
  expect(singleTerrainPaintPatchRect({ width, height: 250 }, [249 * width + 249])).toEqual({
    x: 248 * 8,
    y: 248 * 8,
    width: 16,
    height: 16,
  });
  expect(singleTerrainPaintPatchRect({ width, height: 250 }, [125 * width])).toEqual({
    x: 0,
    y: 124 * 8,
    width: 16,
    height: 24,
  });
});

test('patch rectangle follows the capped paint resolution and rejects multi-tile updates', () => {
  // The 2048-pixel limit reduces this map from eight to four texels per cell.
  const wide = { width: 512, height: 250 };
  expect(singleTerrainPaintPatchRect(wide, [100 * wide.width + 200])).toEqual({
    x: 199 * 4,
    y: 99 * 4,
    width: 12,
    height: 12,
  });
  expect(singleTerrainPaintPatchRect({ width: 1, height: 1 }, [0])).toEqual({
    x: 0,
    y: 0,
    width: 8,
    height: 8,
  });
  expect(singleTerrainPaintPatchRect(wide, [])).toBeNull();
  expect(singleTerrainPaintPatchRect(wide, [100 * wide.width + 200, 100 * wide.width + 201])).toBeNull();
  expect(singleTerrainPaintPatchRect(wide, [1.5])).toBeNull();
});

test('staging copy preserves all RGBA channels and row stride without changing atlas pixels', () => {
  const atlasWidth = 6;
  const atlasHeight = 5;
  const source = new Uint8Array(atlasWidth * atlasHeight * 4);
  for (let y = 0; y < atlasHeight; y++) for (let x = 0; x < atlasWidth; x++) {
    const i = (y * atlasWidth + x) * 4;
    source.set([y * 10 + x, 100 + x, 200 + y, 255 - x - y], i);
  }
  const original = source.slice();
  const stagingWidth = 24;
  const staging = new Uint8Array(stagingWidth * stagingWidth * 4).fill(17);
  const rect = { x: 2, y: 1, width: 3, height: 2 };

  copyTerrainPaintRect(source, atlasWidth, rect, stagingWidth, staging);

  for (let y = 0; y < rect.height; y++) for (let x = 0; x < rect.width; x++) {
    const actual = Array.from(staging.slice((y * stagingWidth + x) * 4, (y * stagingWidth + x + 1) * 4));
    const expected = Array.from(source.slice(((rect.y + y) * atlasWidth + rect.x + x) * 4,
      ((rect.y + y) * atlasWidth + rect.x + x + 1) * 4));
    expect(actual).toEqual(expected);
  }
  expect(staging[(0 * stagingWidth + rect.width) * 4]).toBe(17);
  expect(staging[(rect.height * stagingWidth) * 4]).toBe(17);
  expect(source).toEqual(original);
});

test('a clipped corner patch copies only its active rows into the reusable staging texture', () => {
  const atlasWidth = 4;
  const source = Uint8Array.from({ length: atlasWidth * 3 * 4 }, (_, i) => i);
  const stagingWidth = 24;
  const staging = new Uint8Array(stagingWidth * stagingWidth * 4).fill(255);
  const rect = { x: 0, y: 1, width: 2, height: 2 };

  copyTerrainPaintRect(source, atlasWidth, rect, stagingWidth, staging);

  expect(Array.from(staging.slice(0, 8))).toEqual(Array.from(source.slice(16, 24)));
  expect(Array.from(staging.slice(stagingWidth * 4, stagingWidth * 4 + 8))).toEqual(
    Array.from(source.slice(32, 40)),
  );
  expect(staging[8]).toBe(255);
  expect(staging[stagingWidth * 4 + 8]).toBe(255);
});
