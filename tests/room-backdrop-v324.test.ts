import { expect, test } from 'vitest';
import { Color, OrthographicCamera, RenderTarget, Scene, Vector2, type WebGPURenderer } from 'three/webgpu';
import { RoomBackdrop } from '../src/render/RoomBackdrop';

function fakeRenderer() {
  const draws: { scene: unknown; target: RenderTarget | null }[] = [];
  const state = { target: null as RenderTarget | null, autoClear: false, size: new Vector2(2560, 1440),
    clear: new Color(0x123456), alpha: .4, fail: false };
  const renderer = {
    get autoClear() { return state.autoClear; }, set autoClear(value: boolean) { state.autoClear = value; },
    getDrawingBufferSize: (out: Vector2) => out.copy(state.size),
    getRenderTarget: () => state.target,
    setRenderTarget: (target: RenderTarget | null) => { state.target = target; },
    getClearColor: (out: Color) => out.copy(state.clear), getClearAlpha: () => state.alpha,
    setClearColor: (color: Color, alpha: number) => { state.clear.copy(color); state.alpha = alpha; },
    render: (scene: unknown) => { if (state.fail) throw Error('Backend failure'); draws.push({ scene, target: state.target }); },
  } as unknown as WebGPURenderer;
  return { renderer, state, draws };
}

test('room blur is cached with its image, while full-resolution composition restores renderer state', () => {
  const backdrop = new RoomBackdrop(), scene = new Scene(), camera = new OrthographicCamera();
  const { renderer, state, draws } = fakeRenderer();
  try {
    backdrop.render(renderer, scene, camera, 1, 30, 32);
    expect([backdrop.target.width, backdrop.target.height]).toEqual([1280, 720]);
    expect(draws).toHaveLength(3); // Room, half-resolution blur, screen composite.
    expect(draws[0]!.scene).toBe(scene); expect(draws[0]!.target).toBe(backdrop.target);
    expect(draws[1]!.target).not.toBe(backdrop.target);
    expect([draws[1]!.target!.width, draws[1]!.target!.height]).toEqual([1280, 720]);
    expect(draws[2]!.target).toBeNull(); expect(state.autoClear).toBe(false);
    backdrop.render(renderer, scene, camera, 1, 30, 32);
    expect(draws).toHaveLength(4); expect(backdrop.stats).toEqual({ roomRenders: 1, composites: 2 });
    camera.position.x = 3;
    backdrop.render(renderer, scene, camera, 1, 30, 32);
    expect(draws).toHaveLength(7);
    backdrop.render(renderer, scene, camera, 2, 30, 32);
    expect(draws).toHaveLength(10);
    state.size.set(800, 600);
    backdrop.render(renderer, scene, camera, 2, 30, 32);
    expect([backdrop.target.width, backdrop.target.height]).toEqual([400, 300]);
    expect(draws).toHaveLength(13); expect(state.target).toBeNull(); expect(state.alpha).toBe(.4);
  } finally { backdrop.dispose(); }
});

test('a failing room pass restores its callers target, clear colour and automatic clearing', () => {
  const backdrop = new RoomBackdrop(), caller = new RenderTarget(), { renderer, state } = fakeRenderer();
  state.target = caller; state.fail = true;
  try {
    expect(() => backdrop.render(renderer, new Scene(), new OrthographicCamera(), 1, 20, 32)).toThrow('Backend failure');
    expect(state.target).toBe(caller); expect(state.autoClear).toBe(false);
    expect(state.clear.getHex()).toBe(0x123456); expect(state.alpha).toBe(.4);
    expect(backdrop.stats).toEqual({ roomRenders: 0, composites: 0 });
  } finally { backdrop.dispose(); caller.dispose(); }
});
