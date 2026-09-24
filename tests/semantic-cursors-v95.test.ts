import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { expect, test } from 'vitest';
import { toolDefinitions } from '../src/ui/layout';
import { CURSOR_ATLAS, CURSOR_CELLS, CURSOR_KINDS, cursorHotspot, syncToolCursor, toolCursorKind } from '../src/ui/tool-cursors';

test('all Architect tools use one standard pointer while the atlas contains nine semantic types', () => {
  for (const tool of toolDefinitions) expect(toolCursorKind(tool.id), tool.id).toBe('pointer');
  const viewport = { dataset: {} } as HTMLElement;
  expect(syncToolCursor(viewport, 'mine')).toBe('pointer');
  expect(viewport.dataset.cursor).toBe('pointer');
  expect(syncToolCursor(viewport, 'cancel')).toBe('pointer');
  expect(Object.keys(CURSOR_CELLS)).toEqual(CURSOR_KINDS);
  expect(new Set(Object.values(CURSOR_CELLS).map(([column, row]) => `${column}:${row}`)).size).toBe(9);
});

test('V95 atlas has isolated, opaque content in each transparent cell', () => {
  const png = readFileSync(new URL(`../public${CURSOR_ATLAS}`, import.meta.url));
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  expect([width, height, png[24], png[25], png[28]]).toEqual([1254, 1254, 8, 6, 0]);
  const chunks: Buffer[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset), type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * 4;
  const cells = CURSOR_KINDS.map(() => ({ count: 0, left: width, top: height, right: -1, bottom: -1 }));
  let previous = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const line = new Uint8Array(stride), offset = y * (stride + 1), filter = raw[offset]!;
    for (let i = 0; i < stride; i++) {
      const left = i >= 4 ? line[i - 4]! : 0, above = previous[i]!, upperLeft = i >= 4 ? previous[i - 4]! : 0;
      const predictor = left + above - upperLeft;
      const paeth = Math.abs(predictor - left) <= Math.abs(predictor - above) && Math.abs(predictor - left) <= Math.abs(predictor - upperLeft)
        ? left : Math.abs(predictor - above) <= Math.abs(predictor - upperLeft) ? above : upperLeft;
      line[i] = (raw[offset + 1 + i]! + [0, left, above, (left + above) >> 1, paeth][filter]!) & 255;
    }
    for (let x = 0; x < width; x++) {
      if (line[x * 4 + 3]! < 8) continue;
      const column = Math.floor(x / (width / 3)), row = Math.floor(y / (height / 3));
      const cell = cells[row * 3 + column]!;
      cell.count++; cell.left = Math.min(cell.left, x % (width / 3)); cell.top = Math.min(cell.top, y % (height / 3));
      cell.right = Math.max(cell.right, x % (width / 3)); cell.bottom = Math.max(cell.bottom, y % (height / 3));
    }
    previous = line;
  }
  for (const [index, cell] of cells.entries()) {
    expect(cell.count, CURSOR_KINDS[index]).toBeGreaterThan(1000);
    expect(Math.min(cell.left, cell.top, width / 3 - 1 - cell.right, height / 3 - 1 - cell.bottom), CURSOR_KINDS[index]).toBeGreaterThan(20);
  }
});

test('pointer and fingertip hotspots differ from centred symbols', () => {
  const geometry = { x: 80, y: 40, width: 240, height: 320, apexX: 81, apexY: 40 };
  expect(cursorHotspot('pointer', geometry, 29, 38)).toEqual([1, 1]);
  expect(cursorHotspot('link', geometry, 29, 38)).toEqual([1, 1]);
  expect(cursorHotspot('wait', geometry, 29, 38)).toEqual([16, 20]);
  expect(cursorHotspot('zoom', geometry, 29, 38)).toEqual([11, 14]);
});
