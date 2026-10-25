import {describe, expect, it, vi} from 'vitest';
import * as THREE from 'three/webgpu';
import {NativeOverlayCache} from '../src/ui3d/NativeOverlayCache';

type RenderHook = ReturnType<THREE.WebGPURenderer['getRenderObjectFunction']>;
type MRT = ReturnType<THREE.WebGPURenderer['getMRT']>;
type BackgroundNode = THREE.Scene['backgroundNode'];
interface RecordedPass {
  scene: THREE.Scene;
  camera: THREE.Camera;
  target: THREE.RenderTarget | null;
  color: number;
  alpha: number;
  autoClear: boolean;
  clearColor: boolean;
  clearDepth: boolean;
  clearStencil: boolean;
  scissor: boolean;
  mrt: MRT;
  hook: RenderHook;
  xr: boolean;
  background: THREE.Scene['background'];
  backgroundNode: BackgroundNode;
}

/** Records the public renderer boundary; it performs no GPU work. Scene,
 * geometry, material and render-target lifetime events are genuine Three. */
class RendererDouble {
  initialized = true;
  backend: {device?: object} = {device: {}};
  readonly context = {};
  readonly xr = {enabled: true};
  readonly info = {render: {drawCalls: 0}};
  readonly passes: RecordedPass[] = [];
  readonly worldTarget = new THREE.RenderTarget(31, 29);
  readonly viewport = Object.assign(new THREE.Vector4(3, 5, 900, 500), {minDepth: .125, maxDepth: .875});
  readonly scissorRect = new THREE.Vector4(11, 13, 700, 300);
  readonly clear = vi.fn();
  readonly clearDepth = vi.fn();
  readonly dispose = vi.fn();
  readonly setViewport = vi.fn();
  readonly setScissor = vi.fn();
  width = 1920;
  height = 1080;
  samples = 4;
  outputBufferType: THREE.TextureDataType = THREE.HalfFloatType;
  outputColorSpace = THREE.SRGBColorSpace;
  toneMapping = THREE.ACESFilmicToneMapping;
  toneMappingExposure = 1.7;
  autoClear = true;
  autoClearColor = false;
  autoClearDepth = true;
  autoClearStencil = true;
  target: THREE.RenderTarget | null = this.worldTarget;
  cube = 2;
  mip = 1;
  color = new THREE.Color(0x708090);
  alpha = .42;
  scissor = true;
  mrt: MRT = {name: 'world-only-mrt'} as unknown as MRT;
  hook: RenderHook = () => {};
  failPass?: 'capture' | 'composite';

  constructor(readonly uiScene: THREE.Scene) {}
  asRenderer(): THREE.WebGPURenderer { return this as unknown as THREE.WebGPURenderer; }
  getDrawingBufferSize(vector: THREE.Vector2): THREE.Vector2 { return vector.set(this.width, this.height); }
  getOutputBufferType(): THREE.TextureDataType { return this.outputBufferType; }
  getContext(): object { return this.context; }
  getRenderTarget(): THREE.RenderTarget | null { return this.target; }
  setRenderTarget(target: THREE.RenderTarget | null, cube = 0, mip = 0): void { this.target = target; this.cube = cube; this.mip = mip; }
  getActiveCubeFace(): number { return this.cube; }
  getActiveMipmapLevel(): number { return this.mip; }
  getClearColor(color: THREE.Color): THREE.Color { return color.copy(this.color); }
  getClearAlpha(): number { return this.alpha; }
  setClearColor(color: THREE.ColorRepresentation, alpha: number): void { this.color.set(color); this.alpha = alpha; }
  getScissorTest(): boolean { return this.scissor; }
  setScissorTest(value: boolean): void { this.scissor = value; }
  getMRT(): MRT { return this.mrt; }
  setMRT(value: MRT): void { this.mrt = value; }
  getRenderObjectFunction(): RenderHook { return this.hook; }
  setRenderObjectFunction(value: RenderHook): void { this.hook = value; }
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    const capture = scene === this.uiScene;
    this.passes.push({scene, camera, target: this.target, color: this.color.getHex(), alpha: this.alpha,
      autoClear: this.autoClear, clearColor: this.autoClearColor, clearDepth: this.autoClearDepth, clearStencil: this.autoClearStencil,
      scissor: this.scissor, mrt: this.mrt, hook: this.hook, xr: this.xr.enabled, background: scene.background, backgroundNode: scene.backgroundNode});
    if (this.failPass === (capture ? 'capture' : 'composite')) throw new Error(`expected ${this.failPass} failure`);
    // Model both the UI draw and Three's normal screen-output transform. The
    // cache must not present this renderer delta as one total GPU draw call.
    this.info.render.drawCalls += capture ? 17 : 2;
  }
}

function fixture() {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const background = new THREE.Color(0x123456);
  const backgroundNode = {name: 'original-background-node'} as unknown as BackgroundNode;
  scene.background = background; scene.backgroundNode = backgroundNode;
  const renderer = new RendererDouble(scene), cache = new NativeOverlayCache();
  const originalMrt = renderer.mrt, originalHook = renderer.hook;
  const draw = (revision = 1, animated = false, otherCamera: THREE.Camera = camera) => cache.draw(renderer.asRenderer(), scene, otherCamera, revision, animated);
  const expectRestored = () => {
    expect(renderer.target).toBe(renderer.worldTarget);
    expect([renderer.cube, renderer.mip]).toEqual([2, 1]);
    expect([renderer.autoClear, renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil]).toEqual([true, false, true, true]);
    expect(renderer.color.getHex()).toBe(0x708090); expect(renderer.alpha).toBe(.42);
    expect(renderer.scissor).toBe(true); expect(renderer.mrt).toBe(originalMrt); expect(renderer.hook).toBe(originalHook); expect(renderer.xr.enabled).toBe(true);
    expect(scene.background).toBe(background); expect(scene.backgroundNode).toBe(backgroundNode);
    expect(renderer.outputColorSpace).toBe(THREE.SRGBColorSpace); expect(renderer.toneMapping).toBe(THREE.ACESFilmicToneMapping); expect(renderer.toneMappingExposure).toBe(1.7);
    expect(renderer.viewport.toArray()).toEqual([3, 5, 900, 500]);
    expect([renderer.viewport.minDepth, renderer.viewport.maxDepth]).toEqual([.125, .875]);
    expect(renderer.scissorRect.toArray()).toEqual([11, 13, 700, 300]);
    expect(renderer.setViewport).not.toHaveBeenCalled(); expect(renderer.setScissor).not.toHaveBeenCalled();
    expect(renderer.clear).not.toHaveBeenCalled(); expect(renderer.clearDepth).not.toHaveBeenCalled();
  };
  return {scene, camera, renderer, cache, draw, expectRestored, dispose: () => {cache.dispose(); renderer.worldTarget.dispose();}};
}

describe('native UI GPU cache · renderer and alpha boundaries', () => {
  it('captures transparent linear RGBA and composites premultiplied ink without clearing world color/depth', () => {
    const f = fixture();
    try {
      f.draw();
      const [capture, composite] = f.renderer.passes;
      expect(capture!.scene).toBe(f.scene); expect(capture!.camera).toBe(f.camera);
      expect(capture!.target).not.toBe(f.renderer.worldTarget);
      expect([capture!.color, capture!.alpha, capture!.background, capture!.backgroundNode]).toEqual([0, 0, null, null]);
      expect([capture!.autoClear, capture!.clearColor, capture!.clearDepth, capture!.clearStencil, capture!.scissor]).toEqual([true, true, true, false, false]);
      const target = capture!.target!;
      expect([target.width, target.height, target.samples]).toEqual([1920, 1080, 4]);
      expect(target.depthBuffer).toBe(true); expect(target.texture.type).toBe(THREE.HalfFloatType);
      expect(target.texture.colorSpace).toBe(THREE.ColorManagement.workingColorSpace);
      expect(target.texture.generateMipmaps).toBe(false);
      expect(composite!.target).toBe(f.renderer.worldTarget);
      expect([composite!.autoClear, composite!.clearColor, composite!.clearDepth, composite!.clearStencil]).toEqual([false, false, false, false]);
      for (const pass of [capture!, composite!]) expect([pass.mrt, pass.hook, pass.xr]).toEqual([null, null, false]);
      const meshes = composite!.scene.children.filter((child): child is THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> => child instanceof THREE.Mesh);
      expect(meshes).toHaveLength(1);
      const material = meshes[0]!.material;
      expect(material.map).toBe(target.texture);
      expect([material.transparent, material.depthTest, material.depthWrite, material.toneMapped, material.premultipliedAlpha]).toEqual([true, false, false, false, false]);
      expect(material.blending).toBe(THREE.CustomBlending);
      expect([material.blendSrc, material.blendDst, material.blendSrcAlpha, material.blendDstAlpha]).toEqual([THREE.OneFactor, THREE.OneMinusSrcAlphaFactor, THREE.OneFactor, THREE.OneMinusSrcAlphaFactor]);
      f.expectRestored();
    } finally { f.dispose(); }
  });

  it('retains one image through stable world frames and reports the real composite renderer delta', () => {
    const f = fixture();
    try {
      for (let frame = 0; frame < 80; frame++) f.draw();
      const captures = f.renderer.passes.filter(pass => pass.scene === f.scene);
      expect(captures).toHaveLength(1);
      expect(f.renderer.passes.filter(pass => pass.scene !== f.scene)).toHaveLength(80);
      expect(f.cache.stats).toMatchObject({cacheRenders: 1, composites: 80, drawcalls: 2, cacheDrawcalls: 0, compositeDrawcalls: 2});
      f.expectRestored();
    } finally { f.dispose(); }
  });

  it('refreshes revision/explicit invalidation and captures the last settled animation pose', () => {
    const f = fixture();
    try {
      f.draw(1); f.draw(1); f.draw(2); f.draw(2, true); f.draw(2, true); f.draw(2, false); f.draw(2, false);
      expect(f.renderer.passes.filter(pass => pass.scene === f.scene)).toHaveLength(5);
      f.cache.invalidate(); f.draw(2);
      expect(f.renderer.passes.filter(pass => pass.scene === f.scene)).toHaveLength(6);
      f.draw(2, false, new THREE.PerspectiveCamera());
      expect(f.renderer.passes.filter(pass => pass.scene === f.scene)).toHaveLength(7);
      f.expectRestored();
    } finally { f.dispose(); }
  });

  it.each(['capture', 'composite'] as const)('restores every borrowed state after a thrown %s and retries a fresh capture', failure => {
    const f = fixture();
    try {
      f.renderer.failPass = failure;
      expect(() => f.draw()).toThrow(`expected ${failure} failure`);
      f.expectRestored();
      const capturesBeforeRetry = f.renderer.passes.filter(pass => pass.scene === f.scene).length;
      f.renderer.failPass = undefined;
      f.draw();
      expect(f.renderer.passes.filter(pass => pass.scene === f.scene)).toHaveLength(capturesBeforeRetry + 1);
      expect(f.cache.stats.composites).toBe(1);
      f.expectRestored();
    } finally { f.dispose(); }
  });

  it('resizes GPU storage and releases the former target before device/renderer replacement', () => {
    const f = fixture(), secondRenderer = new RendererDouble(f.scene);
    const worldDisposed = vi.fn(), secondWorldDisposed = vi.fn();
    f.renderer.worldTarget.addEventListener('dispose', worldDisposed);
    secondRenderer.worldTarget.addEventListener('dispose', secondWorldDisposed);
    try {
      f.draw();
      const firstTarget = f.renderer.passes[0]!.target!, firstDisposed = vi.fn();
      firstTarget.addEventListener('dispose', firstDisposed);
      f.renderer.width = 1280; f.renderer.height = 720; f.draw();
      expect(f.renderer.passes.at(-2)!.target).toBe(firstTarget);
      expect([firstTarget.width, firstTarget.height]).toEqual([1280, 720]);
      expect(firstDisposed).toHaveBeenCalledTimes(1); // old storage, same target object
      f.renderer.backend.device = {}; f.draw();
      expect(firstDisposed).toHaveBeenCalledTimes(2);
      const secondTarget = f.renderer.passes.at(-2)!.target!, secondDisposed = vi.fn();
      expect(secondTarget).not.toBe(firstTarget); secondTarget.addEventListener('dispose', secondDisposed);
      f.cache.draw(secondRenderer.asRenderer(), f.scene, f.camera, 1, false);
      expect(secondDisposed).toHaveBeenCalledTimes(1);
      const finalTarget = secondRenderer.passes[0]!.target!, finalDisposed = vi.fn();
      expect(finalTarget).not.toBe(secondTarget); finalTarget.addEventListener('dispose', finalDisposed);
      expect(worldDisposed).not.toHaveBeenCalled(); expect(secondWorldDisposed).not.toHaveBeenCalled();
      f.cache.dispose(); f.cache.dispose();
      expect(finalDisposed).toHaveBeenCalledTimes(1);
      const passes = secondRenderer.passes.length;
      f.cache.draw(secondRenderer.asRenderer(), f.scene, f.camera, 2, true);
      expect(secondRenderer.passes).toHaveLength(passes);
      expect(f.renderer.dispose).not.toHaveBeenCalled(); expect(secondRenderer.dispose).not.toHaveBeenCalled();
    } finally { f.dispose(); secondRenderer.worldTarget.dispose(); }
  });

  it('matches renderer output-buffer precision by default and respects an explicit cache format', () => {
    const f = fixture(), overridden = new NativeOverlayCache({type: THREE.UnsignedByteType, samples: 0});
    try {
      f.draw();
      const first = f.renderer.passes[0]!.target!, firstDisposed = vi.fn(); first.addEventListener('dispose', firstDisposed);
      f.renderer.outputBufferType = THREE.UnsignedByteType; f.draw();
      const replacement = f.renderer.passes.at(-2)!.target!;
      expect(firstDisposed).toHaveBeenCalledTimes(1); expect(replacement.texture.type).toBe(THREE.UnsignedByteType);
      overridden.draw(f.renderer.asRenderer(), f.scene, f.camera, 1, false);
      const explicit = f.renderer.passes.at(-2)!.target!;
      expect([explicit.texture.type, explicit.samples]).toEqual([THREE.UnsignedByteType, 0]);
      f.expectRestored();
    } finally { overridden.dispose(); f.dispose(); }
  });
});
