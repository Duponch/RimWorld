import { afterEach, expect, test, vi } from 'vitest';
import { CURSOR_KINDS, cursorHotspot, installToolCursors } from '../src/ui/tool-cursors';

afterEach(() => vi.unstubAllGlobals());

test('all interaction cursors and tool compositions shrink once, retaining cached artwork and hotspots', async () => {
  const urls: string[] = [], properties = new Map<string, string>(), drawn: number[][] = [], canvasSizes: number[][] = [];
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('Image', class {
    width = 288; height = 288; onload: (() => void) | undefined;
    set src(url: string) { urls.push(url); queueMicrotask(() => this.onload?.()); }
  });
  vi.stubGlobal('document', {
    createElement() {
      const canvas = { width: 0, height: 0, getContext: () => context, toDataURL() { canvasSizes.push([canvas.width, canvas.height]); return `data:image/png;base64,${canvas.width}x${canvas.height}`; } };
      const context = {
        clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, stroke() {},
        drawImage(...args: unknown[]) { if (args.length === 3) { const source = args[0] as { width: number; height: number }; drawn.push([source.width, source.height]); } },
        getImageData(_x: number, _y: number, width: number, height: number) { return { data: new Uint8ClampedArray(width * height * 4).fill(255) }; },
      };
      return canvas;
    },
  });
  const root = { style: { setProperty: (key: string, value: string) => properties.set(key, value) }, querySelector: () => null } as unknown as HTMLElement;
  installToolCursors(root, 'v306-all-cursors');
  for (let n = 0; n < 32; n++) await Promise.resolve();
  for (const kind of CURSOR_KINDS) expect(properties.get(`--cursor-${kind}`)).toContain('32x32');
  expect(properties.get('--cursor-tool-mine')).toBe('url("data:image/png;base64,35x35") 1 1, crosshair');
  expect(properties.get('--cursor-tool-mine-grab')).toBe('url("data:image/png;base64,35x35") 8 8, grab');
  expect(properties.get('--cursor-tool-mine-grabbing')).toBe('url("data:image/png;base64,35x35") 8 8, grabbing');
  expect(drawn).toContainEqual([16, 16]);
  const paints = canvasSizes.length, requests = urls.length;
  installToolCursors(root, 'v306-all-cursors');
  for (let n = 0; n < 32; n++) await Promise.resolve();
  expect(canvasSizes).toHaveLength(paints);
  expect(urls).toHaveLength(requests);
});

test('cropped tips, glass and centres use the reduced artwork coordinates', () => {
  const geometry = { x: 80, y: 40, width: 240, height: 320, apexX: 96, apexY: 40 };
  expect(cursorHotspot('pointer', geometry, 23, 30)).toEqual([3, 1]);
  expect(cursorHotspot('link', geometry, 23, 30)).toEqual([3, 1]);
  expect(cursorHotspot('zoom', geometry, 23, 30)).toEqual([9, 12]);
  for (const kind of ['wait', 'text', 'grab', 'grabbing', 'forbidden', 'resize'] as const)
    expect(cursorHotspot(kind, geometry, 23, 30)).toEqual([13, 16]);
});
