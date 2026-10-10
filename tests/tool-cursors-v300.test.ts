import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { installToolCursors, syncToolCursor } from '../src/ui/tool-cursors';

class Viewport extends EventTarget {
  dataset: Record<string, string> = {};
  style = { setProperty: vi.fn() };
  removeAttribute(name: string) { if (name === 'data-cursor-gesture') delete this.dataset.cursorGesture; }
}
function pointer(target: EventTarget, type: string, button: number, pointerId = 7) {
  target.dispatchEvent(Object.assign(new Event(type), { button, pointerId }));
}
let installation = 0;
function setup() {
  vi.useFakeTimers();
  const viewport = new Viewport(), browser = new EventTarget();
  vi.stubGlobal('window', browser);
  // Loading is deliberately pending: interaction fallbacks work before images load.
  vi.stubGlobal('Image', class { src = ''; });
  const root = { style: { setProperty: vi.fn() }, querySelector: (selector: string) => selector === '#viewport' ? viewport : null } as unknown as HTMLElement;
  installToolCursors(root, `test-cursor-${++installation}`);
  return { viewport, browser, element: viewport as unknown as HTMLElement };
}
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

test('right click and wheel preserve an order symbol; middle-button pan still works', async () => {
  const { viewport, browser, element } = setup();
  syncToolCursor(element, 'chop');
  pointer(viewport, 'pointerdown', 2); pointer(browser, 'pointerup', 2);
  viewport.dispatchEvent(new Event('wheel'));
  expect(viewport.dataset.cursor).toBe('chop');
  expect(viewport.dataset.cursorGesture).toBeUndefined();
  pointer(viewport, 'pointerdown', 1);
  expect(viewport.dataset.cursorGesture).toBe('grabbing');
  pointer(browser, 'pointerup', 1);
  expect(viewport.dataset.cursorGesture).toBe('grab');
  vi.advanceTimersByTime(180);
  expect(viewport.dataset.cursorGesture).toBeUndefined();
  expect(viewport.dataset.cursor).toBe('chop');
  await Promise.resolve();
});

test('selection retains right-button grab; changing to an order during pan clears it', async () => {
  const { viewport, browser, element } = setup();
  syncToolCursor(element, 'select');
  pointer(viewport, 'pointerdown', 2);
  expect(viewport.dataset.cursorGesture).toBe('grabbing');
  pointer(browser, 'pointerup', 2);
  expect(viewport.dataset.cursorGesture).toBe('grab');
  vi.advanceTimersByTime(180);
  viewport.dispatchEvent(new Event('wheel'));
  expect(viewport.dataset.cursorGesture).toBeUndefined();
  pointer(viewport, 'pointerdown', 2);
  syncToolCursor(element, 'harvest');
  pointer(browser, 'pointerup', 2);
  expect(viewport.dataset.cursorGesture).toBeUndefined();
  expect(viewport.dataset.cursor).toBe('harvest');
  await Promise.resolve();
});

test('pointer cancellation and focus loss restore the tool symbol', async () => {
  const { viewport, browser, element } = setup();
  syncToolCursor(element, 'cut');
  pointer(viewport, 'pointerdown', 1);
  pointer(browser, 'pointercancel', 1);
  expect(viewport.dataset.cursorGesture).toBeUndefined();
  pointer(viewport, 'pointerdown', 1);
  browser.dispatchEvent(new Event('blur'));
  expect(viewport.dataset.cursorGesture).toBeUndefined();
  expect(viewport.dataset.cursor).toBe('cut');
  await Promise.resolve();
});

test('map tool and pan CSS leave the semantic UI cursors available, with no wheel lens', () => {
  const css = readFileSync(new URL('../src/ui/cursors.css', import.meta.url), 'utf8');
  expect(css).toContain('var(--map-tool-cursor, var(--cursor-pointer, default))');
  expect(css).not.toContain('data-cursor-gesture="zoom"');
  for (const kind of ['link', 'text', 'forbidden', 'wait', 'resize', 'grab', 'grabbing']) expect(css).toContain(`--cursor-${kind}`);
});

test('an existing Architect SVG becomes a tool cursor with an explicit click point', async () => {
  const imageUrls: string[] = [], properties = new Map<string, string>();
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('Image', class {
    width = 40; height = 40;
    onload: (() => void) | undefined;
    set src(url: string) { imageUrls.push(url); queueMicrotask(() => this.onload?.()); }
  });
  const context = {
    clearRect() {}, drawImage() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, stroke() {},
    getImageData(_x: number, _y: number, width: number, height: number) {
      return { data: new Uint8ClampedArray(width * height * 4).fill(255) };
    },
  };
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context, toDataURL: () => 'data:image/png;base64,cursor' }) });
  const svg = 'data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2040%2040%22%2F%3E';
  const root = {
    style: { setProperty: (key: string, value: string) => properties.set(key, value) },
    querySelector: (selector: string) => selector === '[data-tool="sun-lamp"] .tool-icon'
      ? { style: { backgroundImage: `url("${svg}")` } } : null,
  } as unknown as HTMLElement;
  installToolCursors(root, 'test-cursor-svg');
  for (let step = 0; step < 8; step++) await Promise.resolve();
  expect(imageUrls).toContain(svg);
  expect(properties.get('--cursor-tool-sun-lamp')).toBe('url("data:image/png;base64,cursor") 1 1, crosshair');
});
