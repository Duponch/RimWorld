import { afterEach, expect, test, vi } from 'vitest';
import { ColonyRenderer } from '../src/render/ColonyRenderer';

const renderer = vi.hoisted(() => ({ init: vi.fn(), dispose: vi.fn(), setAnimationLoop: vi.fn(), domElement: { remove: vi.fn() } }));
vi.mock('../src/render/ReentrantRenderer', () => ({ ReentrantRenderer: class { constructor() { return renderer; } } }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

test('initialization failure closes the allocated renderer and removes its canvas exactly once', async () => {
  renderer.init.mockRejectedValueOnce(Error('init failed'));
  await expect(ColonyRenderer.create({} as HTMLElement, () => {})).rejects.toThrow('init failed');
  expect(renderer.dispose).toHaveBeenCalledOnce(); expect(renderer.domElement.remove).toHaveBeenCalledOnce();
  expect(renderer.setAnimationLoop).toHaveBeenCalledWith(null);
});

test('constructor failure after device initialization closes the renderer too', async () => {
  renderer.init.mockResolvedValueOnce(undefined);
  vi.stubGlobal('document', { createElement() { throw Error('canvas assembly failed'); }, createElementNS() { throw Error('canvas assembly failed'); } });
  await expect(ColonyRenderer.create({} as HTMLElement, () => {})).rejects.toThrow('canvas assembly failed');
  expect(renderer.dispose).toHaveBeenCalledOnce(); expect(renderer.domElement.remove).toHaveBeenCalledOnce();
});

test('fatal entry stops frames and reports once; later bursts and disposed views cannot report again', () => {
  const view = Object.create(ColonyRenderer.prototype) as ColonyRenderer;
  const state = view as unknown as { renderer: typeof renderer; keys: Set<string>; disposed: boolean; hostPort: { selectionReady(): boolean }; frame(time: number): void };
  state.renderer = renderer; state.keys = new Set(['w']); state.disposed = false;
  // The incomplete constructor has not attached its input owner yet.
  state.hostPort = { selectionReady: () => false };
  const report = vi.fn(); view.onFatalError = report;
  view.reportFailure('device lost'); view.reportFailure('validation burst');
  expect(report).toHaveBeenCalledExactlyOnceWith('device lost'); expect(state.keys.size).toBe(0);
  expect(renderer.setAnimationLoop).toHaveBeenCalledExactlyOnceWith(null);
  expect(() => state.frame(10)).not.toThrow(); expect(view.fatalError).toBe('device lost');
  state.disposed = true; view.fatalError = undefined; view.reportFailure('disposed'); expect(report).toHaveBeenCalledOnce();
});
