import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { installToolCursors, syncToolCursor } from '../src/ui/tool-cursors';

class Viewport extends EventTarget {
  dataset: Record<string, string> = {};
  style = { setProperty: vi.fn() };
  removeAttribute(name: string) { if (name === 'data-cursor-gesture') delete this.dataset.cursorGesture; }
}
function pointer(target: EventTarget, type: string, button: number, pointerId = 7, buttons = type === 'pointerdown' ? 1 << (button === 1 ? 2 : button === 2 ? 1 : 0) : 0) {
  target.dispatchEvent(Object.assign(new Event(type), { button, pointerId, buttons }));
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

test('right and middle pan keep the selected order artwork, including a stationary hold', async () => {
  const { viewport, browser, element } = setup();
  syncToolCursor(element, 'chop');
  pointer(viewport, 'pointerdown', 2);
  expect(viewport.dataset.cursorGesture).toBe('grabbing');
  vi.advanceTimersByTime(400);
  expect(viewport.dataset.cursorGesture).toBe('grabbing');
  expect(viewport.dataset.cursor).toBe('chop');
  pointer(browser, 'pointerup', 2);
  expect(viewport.dataset.cursorGesture).toBe('grab');
  vi.advanceTimersByTime(180);
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

test('a left-right chord does not claim pan, and another button release keeps a held pan', async () => {
  const { viewport, browser, element } = setup();
  syncToolCursor(element, 'mine');
  pointer(viewport, 'pointerdown', 2, 7, 3);
  expect(viewport.dataset.cursorGesture).toBeUndefined();
  pointer(viewport, 'pointerdown', 2);
  pointer(browser, 'pointerup', 0, 7, 2);
  expect(viewport.dataset.cursorGesture).toBe('grabbing');
  pointer(browser, 'pointerup', 2, 9, 0);
  expect(viewport.dataset.cursorGesture).toBe('grabbing');
  // Releasing right while left remains held is delivered as pointermove.
  pointer(browser, 'pointermove', 2, 7, 1);
  expect(viewport.dataset.cursorGesture).toBe('grab');
  vi.advanceTimersByTime(180);
  expect(viewport.dataset.cursorGesture).toBeUndefined();
  expect(viewport.dataset.cursor).toBe('mine');
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

test('pointer cancellation and focus loss restore the tool symbol without a stale release', async () => {
  const { viewport, browser, element } = setup();
  syncToolCursor(element, 'cut');
  pointer(viewport, 'pointerdown', 1);
  pointer(browser, 'pointercancel', 1);
  expect(viewport.dataset.cursorGesture).toBeUndefined();
  pointer(viewport, 'pointerdown', 1);
  browser.dispatchEvent(new Event('blur'));
  expect(viewport.dataset.cursorGesture).toBeUndefined();
  pointer(browser, 'pointerup', 1);
  expect(viewport.dataset.cursorGesture).toBeUndefined();
  expect(viewport.dataset.cursor).toBe('cut');
  await Promise.resolve();
});

test('map tool and pan CSS leave the semantic UI cursors available, with no wheel lens', () => {
  const css = readFileSync(new URL('../src/ui/cursors.css', import.meta.url), 'utf8');
  expect(css).toContain('var(--map-tool-cursor, var(--cursor-pointer, default))');
  expect(css).toContain('var(--map-tool-grab-cursor, var(--cursor-grab, grab))');
  expect(css).toContain('var(--map-tool-grabbing-cursor, var(--cursor-grabbing, grabbing))');
  expect(css).not.toContain('data-cursor-gesture="zoom"');
  for (const kind of ['link', 'text', 'forbidden', 'wait', 'resize', 'grab', 'grabbing']) expect(css).toContain(`--cursor-${kind}`);
});

test('an existing Architect SVG gets cached arrow and atlas-hand variants with explicit hotspots', async () => {
  const imageUrls: string[] = [], properties = new Map<string, string>();
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('Image', class {
    width = 40; height = 40;
    onload: (() => void) | undefined;
    set src(url: string) { imageUrls.push(url); queueMicrotask(() => this.onload?.()); }
  });
  const drawImage = vi.fn(), lineTo = vi.fn();
  const context = {
    clearRect() {}, drawImage, beginPath() {}, moveTo() {}, lineTo, closePath() {}, fill() {}, stroke() {},
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
  for (let step = 0; step < 16; step++) await Promise.resolve();
  expect(imageUrls).toContain(svg);
  expect(properties.get('--cursor-tool-sun-lamp')).toBe('url("data:image/png;base64,cursor") 1 1, crosshair');
  expect(properties.get('--cursor-tool-sun-lamp-grab')).toBe('url("data:image/png;base64,cursor") 10 10, grab');
  expect(properties.get('--cursor-tool-sun-lamp-grabbing')).toBe('url("data:image/png;base64,cursor") 10 10, grabbing');
  expect(lineTo).toHaveBeenCalledWith(1, 17);
  expect(drawImage.mock.calls.some(args => args.length === 3 && args[0].width === 20 && args[0].height === 20)).toBe(true);
  const painted = drawImage.mock.calls.length, requested = imageUrls.length;
  installToolCursors(root, 'test-cursor-svg');
  for (let step = 0; step < 16; step++) await Promise.resolve();
  expect(drawImage.mock.calls.length).toBe(painted);
  expect(imageUrls.length).toBe(requested);
});
