import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { expect, test } from 'vitest';
import { toolDefinitions } from '../src/ui/layout';
import { CURSOR_ATLAS, CURSOR_CELLS, CURSOR_KINDS, cursorHotspot, syncToolCursor, toolCursorKind, toolCursorIcon } from '../src/ui/tool-cursors';
import { ARCHITECT_ICON_MAPPING } from '../src/ui/architect-icons';

test('Architect tools retain their own map symbols while UI keeps nine interaction types', () => {
  for (const tool of toolDefinitions) {
    expect(toolCursorKind(tool.id), tool.id).toBe(tool.id === 'select' ? 'pointer' : tool.id);
    expect(ARCHITECT_ICON_MAPPING[toolCursorIcon(tool.id)], tool.id).toBeDefined();
  }
  for (const tool of ['install', 'small-sculpture', 'large-sculpture'] as const)
    expect(ARCHITECT_ICON_MAPPING[toolCursorIcon(tool)], tool).toBeDefined();
  const properties = new Map<string, string>();
  const viewport = { dataset: {}, removeAttribute() {}, style: { setProperty(key: string, value: string) { properties.set(key, value); } } } as unknown as HTMLElement;
  expect(syncToolCursor(viewport, 'mine')).toBe('mine');
  expect(viewport.dataset.cursor).toBe('mine');
  expect(viewport.dataset.cursorMode).toBe('order');
  expect(properties.get('--map-tool-cursor')).toBe('var(--cursor-tool-mine, crosshair)');
  expect(properties.get('--map-tool-grab-cursor')).toBe('var(--cursor-tool-mine-grab, var(--cursor-grab, grab))');
  expect(properties.get('--map-tool-grabbing-cursor')).toBe('var(--cursor-tool-mine-grabbing, var(--cursor-grabbing, grabbing))');
  expect(syncToolCursor(viewport, 'cancel')).toBe('cancel');
  expect(syncToolCursor(viewport, 'select')).toBe('pointer');
  expect(viewport.dataset.cursorMode).toBe('select');
  expect(properties.get('--map-tool-cursor')).toBe('var(--cursor-pointer, default)');
  expect(properties.get('--map-tool-grab-cursor')).toBe('var(--cursor-grab, grab)');
  expect(properties.get('--map-tool-grabbing-cursor')).toBe('var(--cursor-grabbing, grabbing)');
  expect(Object.keys(CURSOR_CELLS)).toEqual(CURSOR_KINDS);
  expect(new Set(Object.values(CURSOR_CELLS).map(([column, row]) => `${column}:${row}`)).size).toBe(9);
});

test('vector interaction atlas keeps nine independently padded cells', () => {
  const svg=readFileSync(new URL(`../public${CURSOR_ATLAS}`,import.meta.url),'utf8');
  expect(svg).toContain('width="288" height="288"');
  expect(svg.match(/<g transform="translate/g)).toHaveLength(9);
  expect(svg.match(/scale\(1\.2\)/g)).toHaveLength(9);
  for(const kind of CURSOR_KINDS)expect(CURSOR_CELLS[kind]).toBeDefined();
  expect(svg).toContain('#fff7e9');expect(svg).toContain('#262238');
});
test('pointer and fingertip hotspots differ from centred symbols', () => {
  const geometry = { x: 80, y: 40, width: 240, height: 320, apexX: 81, apexY: 40 };
  expect(cursorHotspot('pointer', geometry, 29, 38)).toEqual([1, 1]);
  expect(cursorHotspot('link', geometry, 29, 38)).toEqual([1, 1]);
  expect(cursorHotspot('wait', geometry, 29, 38)).toEqual([16, 20]);
  expect(cursorHotspot('zoom', geometry, 29, 38)).toEqual([11, 14]);
});
