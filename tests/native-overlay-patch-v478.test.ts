import {describe, expect, it, vi} from 'vitest';
import * as THREE from 'three/webgpu';
import {NativeOverlayCache, type NativeOverlayDamage} from '../src/ui3d/NativeOverlayCache';

type Hook = ReturnType<THREE.WebGPURenderer['getRenderObjectFunction']>;

/** Public-boundary recorder only: pixel equivalence is verified on the native
 * GPU separately. These tests close crop, resolve/copy, filtering and lifetime. */
class PatchRenderer {
  initialized = true;
  backend = {device: {}, isWebGPUBackend: true};
  samples = 4;
  width = 1537;
  height = 863;
  readonly xr = {enabled: true};
  readonly info = {render: {drawCalls: 0}};
  readonly world = new THREE.RenderTarget(1537, 863);
  target: THREE.RenderTarget | null = this.world;
  cube = 3;
  mip = 2;
  autoClear = false;
  autoClearColor = false;
  autoClearDepth = false;
  autoClearStencil = true;
  color = new THREE.Color(0x123456);
  alpha = .3;
  scissor = true;
  mrt = null;
  hook: Hook = () => {};
  readonly viewport = new THREE.Vector4(0, 0, 1537, 863);
  readonly captures: {target: THREE.RenderTarget; camera: THREE.Camera}[] = [];
  readonly submitted: THREE.Object3D[] = [];
  readonly copies: {src: THREE.Texture; dst: THREE.Texture; position: THREE.Vector2; region: THREE.Box2 | THREE.Box3 | null}[] = [];
  failCopy = false;
  failFull = false;
  constructor(readonly scene: THREE.Scene) {}
  asRenderer(): THREE.WebGPURenderer {return this as unknown as THREE.WebGPURenderer;}
  getDrawingBufferSize(v: THREE.Vector2) {return v.set(this.width, this.height);}
  getViewport(v: THREE.Vector4) {return v.copy(this.viewport);}
  getOutputBufferType() {return THREE.HalfFloatType;}
  getContext() {return this.backend.device;}
  getRenderTarget() {return this.target;}
  setRenderTarget(v: THREE.RenderTarget | null, cube = 0, mip = 0) {this.target = v; this.cube = cube; this.mip = mip;}
  getActiveCubeFace() {return this.cube;}
  getActiveMipmapLevel() {return this.mip;}
  getClearColor(v: THREE.Color) {return v.copy(this.color);}
  getClearAlpha() {return this.alpha;}
  setClearColor(v: THREE.ColorRepresentation, alpha: number) {this.color.set(v); this.alpha = alpha;}
  getScissorTest() {return this.scissor;}
  setScissorTest(v: boolean) {this.scissor = v;}
  getMRT() {return this.mrt;}
  setMRT(v: null) {this.mrt = v;}
  getRenderObjectFunction() {return this.hook;}
  setRenderObjectFunction(v: Hook) {this.hook = v;}
  renderObject(...args: Parameters<NonNullable<Hook>>) {this.submitted.push(args[0]); this.info.render.drawCalls++;}
  render(scene: THREE.Scene, camera: THREE.Camera) {
    if (scene !== this.scene) {expect(this.hook).toBeNull(); this.info.render.drawCalls++; return;}
    if (this.failFull && this.target?.width === this.width) throw new Error('full failed');
    this.captures.push({target: this.target!, camera});
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const args = [object, scene, camera, object.geometry, object.material, null, {}, {}] as unknown as Parameters<NonNullable<Hook>>;
      if (this.hook) this.hook(...args); else this.renderObject(...args);
    });
  }
  copyTextureToTexture(src: THREE.Texture, dst: THREE.Texture, region: THREE.Box2 | THREE.Box3 | null, position: THREE.Vector2) {
    if (this.failCopy) throw new Error('copy failed');
    this.copies.push({src, dst, region, position: position.clone()});
  }
}

function fixture(camera: THREE.Camera = new THREE.PerspectiveCamera(53, 1537 / 863, .1, 200)) {
  const scene = new THREE.Scene();
  const changed = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial());
  const behind = new THREE.Mesh(changed.geometry, changed.material);
  const unrelated = new THREE.Mesh(changed.geometry, changed.material);
  scene.add(changed, behind, unrelated);
  camera.position.set(2, 3, 5); camera.updateMatrixWorld(); camera.layers.set(2);
  const cache = new NativeOverlayCache(), renderer = new PatchRenderer(scene);
  const originalHook = renderer.hook;
  const damage: NativeOverlayDamage = {rect: {x: 129, y: 73, width: 272, height: 160}, objects: new Set([changed, behind])};
  const draw = (revision = 1, region: NativeOverlayDamage | undefined = damage, animated = false) => cache.draw(renderer.asRenderer(), scene, camera, revision, animated, region);
  const restored = () => {
    expect(renderer.target).toBe(renderer.world); expect([renderer.cube, renderer.mip]).toEqual([3, 2]);
    expect([renderer.autoClear, renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil]).toEqual([false, false, false, true]);
    expect(renderer.color.getHex()).toBe(0x123456); expect(renderer.alpha).toBe(.3);
    expect(renderer.scissor).toBe(true); expect(renderer.xr.enabled).toBe(true); expect(renderer.hook).toBe(originalHook);
  };
  const dispose = () => {cache.dispose(); renderer.world.dispose(); changed.geometry.dispose(); (changed.material as THREE.Material).dispose();};
  return {scene, camera, cache, renderer, damage, draw, restored, dispose, changed, behind, unrelated};
}

describe('native overlay cropped HDR patch · V478', () => {
  it('keeps the full cache and copies a resolved same-format MSAA patch without a second blend', () => {
    const f = fixture();
    try {
      f.draw(); const full = f.renderer.captures[0]!.target;
      f.renderer.submitted.length = 0; f.draw(2);
      const patch = f.renderer.captures[1]!.target;
      expect([patch.width, patch.height, patch.samples]).toEqual([272, 160, 4]);
      expect([patch.texture.type, patch.texture.format, patch.texture.colorSpace, patch.depthBuffer]).toEqual([full.texture.type, full.texture.format, full.texture.colorSpace, full.depthBuffer]);
      expect(full.width).toBe(1537); expect(full.height).toBe(863);
      expect(f.renderer.submitted).toEqual([f.changed, f.behind]);
      expect(f.renderer.copies).toHaveLength(1);
      expect(f.renderer.copies[0]).toMatchObject({src: patch.texture, dst: full.texture, region: null});
      expect(f.renderer.copies[0]!.position.toArray()).toEqual([129, 73]);
      expect(f.cache.stats).toMatchObject({cacheRenders: 2, fullCaptures: 1, partialCaptures: 1, composites: 2, copiedPixels: 272 * 160, totalCapturePixels: 1537 * 863 + 272 * 160});
      f.restored();
    } finally {f.dispose();}
  });

  it.each([new THREE.PerspectiveCamera(53, 1537 / 863, .1, 200), new THREE.OrthographicCamera(-11.3, 15.7, 8.9, -6.1, .1, 200)])('crops the exact source projection and preserves source camera %s', camera => {
    const f = fixture(camera);
    try {
      f.draw();
      const original = camera.clone(), sourceProjection = camera.projectionMatrix.toArray();
      f.draw(2);
      const crop = f.renderer.captures[1]!.camera;
      expect(crop.constructor).toBe(camera.constructor); expect(crop).not.toBe(camera);
      expect(crop.layers.mask).toBe(camera.layers.mask); expect(crop.coordinateSystem).toBe(camera.coordinateSystem);
      expect(crop.matrixWorld.toArray()).toEqual(camera.matrixWorld.toArray());
      expect(crop.matrixWorldInverse.toArray()).toEqual(camera.matrixWorldInverse.toArray());
      expect([crop.matrixAutoUpdate, crop.matrixWorldAutoUpdate]).toEqual([false, false]);
      const {x, y, width, height} = f.damage.rect;
      for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1], [.5, .5]]) {
        const originalNDC = new THREE.Vector3((x + u! * width) / f.renderer.width * 2 - 1, 1 - (y + v! * height) / f.renderer.height * 2, .4);
        const view = originalNDC.clone().applyMatrix4(camera.projectionMatrixInverse);
        const croppedNDC = view.applyMatrix4(crop.projectionMatrix);
        expect(croppedNDC.x).toBeCloseTo(u! * 2 - 1, 11);
        expect(croppedNDC.y).toBeCloseTo(1 - v! * 2, 11);
        expect(croppedNDC.z).toBeCloseTo(originalNDC.z, 11);
      }
      expect(camera.projectionMatrix.toArray()).toEqual(sourceProjection);
      expect(camera.matrixWorld.toArray()).toEqual(original.matrixWorld.toArray());
      expect(camera.position.toArray()).toEqual(original.position.toArray());
      f.draw(3); expect(f.renderer.captures[2]!.camera).toBe(crop);
      f.restored();
    } finally {f.dispose();}
  });

  it('repairs removed ink with an empty renderable set and does not recapture an unchanged settled pose', () => {
    const f = fixture();
    try {
      f.draw(); f.draw(2, {...f.damage, objects: new Set()}, true); f.draw(2, f.damage, false);
      expect(f.renderer.captures).toHaveLength(2); expect(f.renderer.copies).toHaveLength(1);
      expect(f.cache.stats).toMatchObject({fullCaptures: 1, partialCaptures: 1, composites: 3});
    } finally {f.dispose();}
  });

  it.each([
    {x: -1, y: 0, width: 5, height: 5}, {x: .5, y: 0, width: 5, height: 5},
    {x: 0, y: 0, width: 0, height: 5}, {x: 0, y: 0, width: Number.NaN, height: 5},
    {x: 1530, y: 0, width: 16, height: 16}, {x: 0, y: 0, width: 1000, height: 700}
  ])('falls back to full capture for an invalid or large region %j', rect => {
    const f = fixture();
    try {f.draw(); f.draw(2, {...f.damage, rect}); expect(f.cache.stats).toMatchObject({fullCaptures: 2, partialCaptures: 0}); f.restored();}
    finally {f.dispose();}
  });

  it('forces full capture for explicit invalidation, camera/viewport changes and an unsupported backend', () => {
    const f = fixture();
    try {
      f.draw(); f.cache.invalidate(); f.draw(2); f.camera.position.x++; f.camera.updateMatrixWorld(); f.draw(3);
      f.renderer.viewport.x++; f.draw(4); f.draw(5, {...f.damage, full: true});
      f.renderer.backend.isWebGPUBackend = false; f.draw(6);
      expect(f.cache.stats).toMatchObject({fullCaptures: 6, partialCaptures: 0}); f.restored();
    } finally {f.dispose();}
  });

  it('repairs a failed patch copy with a full capture and restores hooks if that fallback also throws', () => {
    const f = fixture();
    try {
      f.draw(); f.renderer.failCopy = true; f.draw(2);
      expect(f.cache.stats).toMatchObject({fullCaptures: 2, partialCaptures: 0}); f.restored();
      f.renderer.failFull = true; expect(() => f.draw(3)).toThrow('full failed'); f.restored();
      f.renderer.failFull = false; f.renderer.failCopy = false; f.draw(3);
      expect(f.cache.stats).toMatchObject({fullCaptures: 3, partialCaptures: 0}); f.restored();
    } finally {f.dispose();}
  });

  it('reuses patch storage and releases it on viewport dimensions, format/device lifetime and disposal', () => {
    const f = fixture();
    try {
      f.draw(); f.draw(2); const first = f.renderer.captures.at(-1)!.target, released = vi.fn(); first.addEventListener('dispose', released);
      f.draw(3); expect(f.renderer.captures.at(-1)!.target).toBe(first); expect(released).not.toHaveBeenCalled();
      f.renderer.width--; f.draw(4); expect(released).toHaveBeenCalledTimes(1);
      f.draw(5); const second = f.renderer.captures.at(-1)!.target, releasedSecond = vi.fn(); second.addEventListener('dispose', releasedSecond);
      f.renderer.backend.device = {}; f.draw(6); expect(releasedSecond).toHaveBeenCalledTimes(1);
      f.draw(7); const last = f.renderer.captures.at(-1)!.target, releasedLast = vi.fn(); last.addEventListener('dispose', releasedLast);
      f.cache.dispose(); f.cache.dispose(); expect(releasedLast).toHaveBeenCalledTimes(1);
    } finally {f.dispose();}
  });
});
