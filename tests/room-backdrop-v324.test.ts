import { expect, test } from 'vitest';
import { AlwaysDepth, Color, HalfFloatType, Mesh, OrthographicCamera, RenderTarget, Scene, Vector2, type WebGPURenderer } from 'three/webgpu';
import { RoomBackdrop } from '../src/render/RoomBackdrop';

function fakeRenderer() {
  const draws: { scene: unknown; target: RenderTarget | null; autoClear: boolean }[] = [];
  const state = { target: null as RenderTarget | null, autoClear: false, size: new Vector2(2560, 1440),
    clear: new Color(0x123456), alpha: .4, fail: false };
  const renderer = {
    get autoClear() { return state.autoClear; }, set autoClear(value: boolean) { state.autoClear = value; },
    getDrawingBufferSize: (out: Vector2) => out.copy(state.size),
    getRenderTarget: () => state.target,
    setRenderTarget: (target: RenderTarget | null) => { state.target = target; },
    getClearColor: (out: Color) => out.copy(state.clear), getClearAlpha: () => state.alpha,
    setClearColor: (color: Color, alpha: number) => { state.clear.copy(color); state.alpha = alpha; },
    render: (scene: unknown) => { if (state.fail) throw Error('Backend failure'); draws.push({ scene, target: state.target, autoClear: state.autoClear }); },
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

test('deferred composition reuses the exact HDR/MSAA target, depth rule and cached backdrop', () => {
  const backdrop = new RoomBackdrop(), scene = new Scene(), camera = new OrthographicCamera();
  const hdr = new RenderTarget(2560, 1440, { type: HalfFloatType, samples: 4, depthBuffer: true });
  const { renderer, state, draws } = fakeRenderer();
  try {
    backdrop.render(renderer, scene, camera, 1, 30, 32, false);
    expect(draws).toHaveLength(2); expect(state.target).toBeNull();
    expect(backdrop.stats).toEqual({ roomRenders: 1, composites: 0 });
    state.target = hdr;
    backdrop.compose(renderer);
    const composite = draws[2]!;
    expect(composite.target).toBe(hdr); expect(composite.autoClear).toBe(true);
    const material = (composite.scene as Mesh).material as any;
    expect(material.depthFunc).toBe(AlwaysDepth); expect(material.depthWrite).toBe(true);
    expect(material.depthNode).not.toBeNull();
    expect([hdr.width, hdr.height, hdr.samples, hdr.texture.type]).toEqual([2560, 1440, 4, HalfFloatType]);
    expect(state.target).toBe(hdr); expect(state.autoClear).toBe(false);
    backdrop.render(renderer, scene, camera, 1, 30, 32, false);
    expect(draws).toHaveLength(3); expect(backdrop.stats).toEqual({ roomRenders: 1, composites: 1 });
    backdrop.compose(renderer);
    expect(draws[3]!.scene).toBe(composite.scene); expect(draws[3]!.target).toBe(hdr);
  } finally { backdrop.dispose(); hdr.dispose(); }
});

test('a failing deferred composite restores its caller state and does not report a completed composite', () => {
  const backdrop = new RoomBackdrop(), hdr = new RenderTarget(), { renderer, state } = fakeRenderer();
  state.target = hdr; state.fail = true;
  try {
    expect(() => backdrop.compose(renderer)).toThrow('Backend failure');
    expect(state.target).toBe(hdr); expect(state.autoClear).toBe(false);
    expect(state.clear.getHex()).toBe(0x123456); expect(state.alpha).toBe(.4);
    expect(backdrop.stats.composites).toBe(0);
  } finally { backdrop.dispose(); hdr.dispose(); }
});
