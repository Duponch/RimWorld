import * as THREE from 'three/webgpu';

export interface NativeOverlayCacheOptions {
  /** Defaults to the existing renderer's output-buffer type (HalfFloat in r186).
   * Keep a linear floating-point buffer when the game's output is HDR. */
  type?: THREE.TextureDataType;
  /** Defaults to the existing renderer's antialiasing sample count. */
  samples?: number;
}

/** A conservative damage region in physical drawing-buffer pixels, top-left
 * origin. objects includes every renderable intersecting that region, including
 * unchanged ink behind a moved or removed object. */
export interface NativeOverlayDamage {
  rect: {x: number; y: number; width: number; height: number};
  objects: ReadonlySet<THREE.Object3D>;
  full?: boolean;
}

export interface NativeOverlayCacheStats {
  cacheRenders: number;
  fullCaptures: number;
  partialCaptures: number;
  copiedPixels: number;
  totalCapturePixels: number;
  patchSize: {width: number; height: number};
  composites: number;
  /** CPU submission time of the most recent draw(), including a dirty capture. */
  renderCPUms: number;
  captureCPUms: number;
  compositeCPUms: number;
  totalRenderCPUms: number;
  /** Actual renderer draw-call delta, including its output-transform pass. */
  drawcalls: number;
  cacheDrawcalls: number;
  compositeDrawcalls: number;
  size: {width: number; height: number};
  samples: number;
  type: THREE.TextureDataType | undefined;
}

/** A retained GPU image of the real lit UI mesh scene, not a DOM raster.
 *
 * Three r186 renders the screen through a linear intermediate buffer before
 * its output transform. The cache uses that same working color space and buffer
 * type. Its RGBA is already premultiplied by normal scene alpha blending, so
 * the single composite mesh uses ONE / ONE_MINUS_SRC_ALPHA without multiplying
 * RGB by alpha again. Tone mapping/color conversion remain in the renderer's
 * normal final output pass and are never baked into this cache.
 *
 * Consequently a stable frame submits one UI mesh draw; r186 may additionally
 * submit its own output-transform draw. The counters report both honestly.
 * Keep the caller's revision current for scene/layout/paint changes. */
export class NativeOverlayCache {
  private readonly size = new THREE.Vector2();
  private readonly savedClearColor = new THREE.Color();
  private readonly compositeScene = new THREE.Scene();
  private readonly compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    fog: false,
    premultipliedAlpha: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquationAlpha: THREE.AddEquation,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor
  });
  private readonly mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
  private renderer: THREE.WebGPURenderer | undefined;
  private backend: object | undefined;
  private device: unknown;
  private target: THREE.RenderTarget | undefined;
  private patchTarget: THREE.RenderTarget | undefined;
  private patchCamera: THREE.Camera | undefined;
  private readonly cropMatrix = new THREE.Matrix4();
  private readonly copyPosition = new THREE.Vector2();
  private readonly cameraProjection = new THREE.Matrix4();
  private readonly cameraWorld = new THREE.Matrix4();
  private readonly cameraWorldInverse = new THREE.Matrix4();
  private readonly cameraPosition = new THREE.Vector3();
  private readonly cameraQuaternion = new THREE.Quaternion();
  private readonly cameraScale = new THREE.Vector3();
  private cameraLayers = 0;
  private cameraCoordinateSystem: THREE.CoordinateSystem | undefined;
  private cameraReversedDepth = false;
  private readonly viewport = new THREE.Vector4();
  private readonly cachedViewport = new THREE.Vector4();
  private hasViewport = false;
  private sourceScene: THREE.Scene | undefined;
  private sourceCamera: THREE.Camera | undefined;
  private workingColorSpace = '';
  private targetType: THREE.TextureDataType | undefined;
  private targetSamples = 0;
  private cachedRevision = Number.NaN;
  private dirty = true;
  private previouslyAnimated = false;
  private drawing = false;
  private disposed = false;
  private cacheRenders = 0;
  private fullCaptures = 0;
  private partialCaptures = 0;
  private copiedPixels = 0;
  private totalCapturePixels = 0;
  private composites = 0;
  private renderCPUms = 0;
  private captureCPUms = 0;
  private compositeCPUms = 0;
  private totalRenderCPUms = 0;
  private drawcalls = 0;
  private cacheDrawcalls = 0;
  private compositeDrawcalls = 0;

  constructor(private readonly options: NativeOverlayCacheOptions = {}) {
    // Render-target sampling follows Three's QuadMesh convention: top=0,
    // bottom=1. PlaneGeometry's image UV convention is vertically opposite.
    const uv=this.mesh.geometry.getAttribute('uv');
    for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i));
    uv.needsUpdate=true;
    this.mesh.name = 'Native UI cached RGBA composite';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.compositeScene.add(this.mesh);
  }

  invalidate(): void { this.dirty = true; }

  draw(renderer: THREE.WebGPURenderer, scene: THREE.Scene, camera: THREE.Camera, revision: number, animated: boolean, damage?: NativeOverlayDamage): void {
    if (this.disposed || this.drawing || !renderer.initialized) return;
    renderer.getDrawingBufferSize(this.size);
    const width = Math.floor(this.size.x), height = Math.floor(this.size.y);
    if (width < 1 || height < 1) return;

    this.ensureTarget(renderer, width, height);
    const target = this.target!;
    // Keep old callers' settled-animation capture. Damage-aware callers supply
    // the last changed pose through their revision and region.
    const cameraChanged = this.sourceCamera !== camera || !this.cameraMatches(camera);
    const viewportAvailable = typeof renderer.getViewport === 'function';
    if (viewportAvailable) renderer.getViewport(this.viewport);
    const viewportChanged = viewportAvailable !== this.hasViewport || (viewportAvailable && !this.viewport.equals(this.cachedViewport));
    if (viewportChanged) this.releasePatch();
    const forceFull = this.dirty || this.sourceScene !== scene || cameraChanged || viewportChanged;
    const capture = forceFull || this.cachedRevision !== revision || animated || (damage === undefined && this.previouslyAnimated);
    const start = performance.now(), drawsBefore = renderer.info.render.drawCalls;
    // setRenderTarget() in the pinned renderer does not mutate the canvas
    // viewport/scissor rectangles. They are deliberately never rewritten here,
    // preserving their minDepth/maxDepth and any output-target subviewport.
    const savedTarget = renderer.getRenderTarget();
    const savedCubeFace = renderer.getActiveCubeFace();
    const savedMipmap = renderer.getActiveMipmapLevel();
    const savedAutoClear = renderer.autoClear;
    const savedAutoClearColor = renderer.autoClearColor;
    const savedAutoClearDepth = renderer.autoClearDepth;
    const savedAutoClearStencil = renderer.autoClearStencil;
    const savedClearAlpha = renderer.getClearAlpha();
    const savedScissorTest = renderer.getScissorTest();
    const savedMRT = renderer.getMRT();
    const savedRenderObject = renderer.getRenderObjectFunction();
    const savedXR = renderer.xr.enabled;
    const savedBackground = scene.background;
    const savedBackgroundNode = scene.backgroundNode;
    renderer.getClearColor(this.savedClearColor);
    this.captureCPUms = this.compositeCPUms = this.cacheDrawcalls = this.compositeDrawcalls = 0;
    this.drawing = true;

    try {
      // World-specific output hooks/MRTs must not interpret UI geometry. All
      // these switches are restored even if a shader/render callback throws.
      renderer.setMRT(null);
      renderer.setRenderObjectFunction(null);
      renderer.xr.enabled = false;

      if (capture) {
        renderer.setScissorTest(false);
        renderer.setClearColor(0x000000, 0);
        renderer.autoClear = true;
        renderer.autoClearColor = true;
        renderer.autoClearDepth = true;
        renderer.autoClearStencil = false;
        scene.background = null;
        scene.backgroundNode = null;
        const captureStart = performance.now(), captureDraws = renderer.info.render.drawCalls;
        const region = !forceFull && this.validPatch(renderer, damage, width, height) ? damage!.rect : undefined;
        let partial = false;
        if (region) {
          try {
            const patch = this.ensurePatch(region.width, region.height);
            const patchCamera = this.cropCamera(camera, region, width, height);
            renderer.setRenderTarget(patch);
            renderer.setRenderObjectFunction((...args) => {
              if (damage!.objects.has(args[0])) renderer.renderObject(...args);
            });
            renderer.render(scene, patchCamera);
            renderer.setRenderObjectFunction(null);
            // r186 WebGPU copyTextureToTexture copies resolved texture bytes
            // with top-left GPU origins. It neither blends nor converts color.
            // Never render a scissored MSAA pass into the retained global target:
            // its resolve could overwrite the otherwise untouched cached pixels.
            renderer.copyTextureToTexture(patch.texture, target.texture, null, this.copyPosition.set(region.x, region.y));
            partial = true;
            this.partialCaptures++;
            this.copiedPixels += region.width * region.height;
            this.totalCapturePixels += region.width * region.height;
          } catch {
            // An unsupported copy or failed patch must not leave a partially
            // updated image visible. A fresh full capture repairs it immediately.
            renderer.setRenderObjectFunction(null);
            this.releasePatch();
          }
        }
        if (!partial) {
          renderer.setRenderTarget(target);
          renderer.render(scene, camera);
          this.fullCaptures++;
          this.totalCapturePixels += width * height;
        }
        this.captureCPUms = performance.now() - captureStart;
        this.cacheDrawcalls = renderer.info.render.drawCalls - captureDraws;
        this.cacheRenders++;
        this.cachedRevision = revision;
        this.sourceScene = scene;
        this.sourceCamera = camera;
        this.rememberCamera(camera);
        this.hasViewport = viewportAvailable;
        if (viewportAvailable) this.cachedViewport.copy(this.viewport);
        this.dirty = false;
      }

      scene.background = savedBackground;
      scene.backgroundNode = savedBackgroundNode;
      renderer.setRenderTarget(savedTarget, savedCubeFace, savedMipmap);
      renderer.setScissorTest(savedScissorTest);
      renderer.setClearColor(this.savedClearColor, savedClearAlpha);
      renderer.autoClear = false;
      renderer.autoClearColor = false;
      renderer.autoClearDepth = false;
      renderer.autoClearStencil = false;
      // Never clear the world depth or color. The composite neither tests nor
      // writes depth and blends its retained premultiplied linear RGBA.
      const compositeStart = performance.now(), compositeDraws = renderer.info.render.drawCalls;
      renderer.render(this.compositeScene, this.compositeCamera);
      this.compositeCPUms = performance.now() - compositeStart;
      this.compositeDrawcalls = renderer.info.render.drawCalls - compositeDraws;
      this.composites++;
      this.previouslyAnimated = animated;
    } catch (error) {
      this.dirty = true;
      throw error;
    } finally {
      scene.background = savedBackground;
      scene.backgroundNode = savedBackgroundNode;
      renderer.setRenderTarget(savedTarget, savedCubeFace, savedMipmap);
      renderer.setMRT(savedMRT);
      renderer.setRenderObjectFunction(savedRenderObject);
      renderer.setClearColor(this.savedClearColor, savedClearAlpha);
      renderer.setScissorTest(savedScissorTest);
      renderer.autoClear = savedAutoClear;
      renderer.autoClearColor = savedAutoClearColor;
      renderer.autoClearDepth = savedAutoClearDepth;
      renderer.autoClearStencil = savedAutoClearStencil;
      renderer.xr.enabled = savedXR;
      this.renderCPUms = performance.now() - start;
      this.totalRenderCPUms += this.renderCPUms;
      this.drawcalls = renderer.info.render.drawCalls - drawsBefore;
      this.drawing = false;
    }
  }

  private cameraMatches(camera: THREE.Camera): boolean {
    return this.cameraProjection.equals(camera.projectionMatrix) && this.cameraWorld.equals(camera.matrixWorld)
      && this.cameraWorldInverse.equals(camera.matrixWorldInverse) && this.cameraPosition.equals(camera.position)
      && this.cameraQuaternion.equals(camera.quaternion) && this.cameraScale.equals(camera.scale)
      && this.cameraLayers === camera.layers.mask && this.cameraCoordinateSystem === camera.coordinateSystem
      && this.cameraReversedDepth === camera.reversedDepth;
  }

  private rememberCamera(camera: THREE.Camera): void {
    this.cameraProjection.copy(camera.projectionMatrix);
    this.cameraWorld.copy(camera.matrixWorld);
    this.cameraWorldInverse.copy(camera.matrixWorldInverse);
    this.cameraPosition.copy(camera.position);
    this.cameraQuaternion.copy(camera.quaternion);
    this.cameraScale.copy(camera.scale);
    this.cameraLayers = camera.layers.mask;
    this.cameraCoordinateSystem = camera.coordinateSystem;
    this.cameraReversedDepth = camera.reversedDepth;
  }

  private validPatch(renderer: THREE.WebGPURenderer, damage: NativeOverlayDamage | undefined, width: number, height: number): boolean {
    if (!damage || damage.full || !(renderer.backend as unknown as {isWebGPUBackend?: boolean}).isWebGPUBackend
      || typeof renderer.copyTextureToTexture !== 'function' || typeof renderer.renderObject !== 'function') return false;
    const rect = damage.rect;
    return !!rect && !!damage.objects && typeof damage.objects.has === 'function'
      && [rect.x, rect.y, rect.width, rect.height].every(Number.isSafeInteger)
      && rect.x >= 0 && rect.y >= 0 && rect.width > 0 && rect.height > 0
      && rect.x + rect.width <= width && rect.y + rect.height <= height
      && rect.width * rect.height <= width * height * .35;
  }

  private cropCamera(source: THREE.Camera, rect: NativeOverlayDamage['rect'], width: number, height: number): THREE.Camera {
    if (!this.patchCamera || this.patchCamera.constructor !== source.constructor) {
      const CameraType = source.constructor as new () => THREE.Camera;
      this.patchCamera = new CameraType();
    }
    const camera = this.patchCamera;
    camera.copy(source, false);
    // The source projection already includes exact DPR/aspect, coordinate-system
    // and asymmetric-view choices. setViewOffset would recompute and round them.
    this.cropMatrix.set(width / rect.width, 0, 0, (width - 2 * rect.x - rect.width) / rect.width,
      0, height / rect.height, 0, (rect.height - height + 2 * rect.y) / rect.height,
      0, 0, 1, 0, 0, 0, 0, 1);
    camera.projectionMatrix.multiplyMatrices(this.cropMatrix, source.projectionMatrix);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.matrix.copy(source.matrix);
    camera.matrixWorld.copy(source.matrixWorld);
    camera.matrixWorldInverse.copy(source.matrixWorldInverse);
    camera.position.copy(source.position);
    camera.quaternion.copy(source.quaternion);
    camera.scale.copy(source.scale);
    camera.layers.mask = source.layers.mask;
    camera.coordinateSystem = source.coordinateSystem;
    // Pinned r186's renderer checks this flag before deciding whether to replace
    // the projection. Camera.copy() does not copy it.
    (camera as unknown as {_reversedDepth: boolean})._reversedDepth = source.reversedDepth;
    camera.matrixAutoUpdate = false;
    camera.matrixWorldAutoUpdate = false;
    return camera;
  }

  private createTarget(width: number, height: number): THREE.RenderTarget {
    return new THREE.RenderTarget(width, height, {
      type: this.targetType,
      format: THREE.RGBAFormat,
      colorSpace: this.workingColorSpace as THREE.ColorSpace,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      depthBuffer: true,
      stencilBuffer: false,
      samples: this.targetSamples,
      resolveDepthBuffer: false,
      storeMultisampledColorBuffer: false,
      storeMultisampledDepthBuffer: false
    });
  }

  private ensurePatch(width: number, height: number): THREE.RenderTarget {
    if (!this.patchTarget) {
      this.patchTarget = this.createTarget(width, height);
      this.patchTarget.texture.name = 'Native UI linear premultiplied RGBA patch';
    } else if (this.patchTarget.width !== width || this.patchTarget.height !== height) this.patchTarget.setSize(width, height);
    return this.patchTarget;
  }

  private releasePatch(): void {
    this.patchTarget?.dispose();
    this.patchTarget = undefined;
  }

  private ensureTarget(renderer: THREE.WebGPURenderer, width: number, height: number): void {
    const backend = renderer.backend;
    // WebGPU's actual GPUDevice is replaced on a device lifetime change. The
    // WebGL fallback's context is the corresponding device identity.
    const device = (backend as unknown as {device?: unknown}).device ?? renderer.getContext();
    const type = this.options.type ?? renderer.getOutputBufferType();
    const samples = this.options.samples ?? renderer.samples;
    const workingColorSpace = THREE.ColorManagement.workingColorSpace;
    const deviceChanged = this.renderer !== renderer || this.backend !== backend || this.device !== device;
    const formatChanged = this.targetType !== type || this.targetSamples !== samples || this.workingColorSpace !== workingColorSpace;
    if (deviceChanged || formatChanged) {
      this.releaseTarget();
      if (this.renderer && deviceChanged) {
        // These are our resources only; the shared world renderer is never
        // disposed or reconfigured. Objects can be uploaded by its successor.
        this.mesh.geometry.dispose();
        this.material.dispose();
      }
      this.renderer = renderer;
      this.backend = backend;
      this.device = device;
      this.targetType = type;
      this.targetSamples = samples;
      this.workingColorSpace = workingColorSpace;
    }
    if (!this.target) {
      this.target = this.createTarget(width, height);
      this.target.texture.name = 'Native UI linear premultiplied RGBA cache';
      this.material.map = this.target.texture;
      this.material.needsUpdate = true;
      this.dirty = true;
    } else if (this.target.width !== width || this.target.height !== height) {
      this.releasePatch();
      this.target.setSize(width, height);
      this.dirty = true;
    }
  }

  get stats(): NativeOverlayCacheStats {
    return {
      cacheRenders: this.cacheRenders,
      fullCaptures: this.fullCaptures,
      partialCaptures: this.partialCaptures,
      copiedPixels: this.copiedPixels,
      totalCapturePixels: this.totalCapturePixels,
      patchSize: {width: this.patchTarget?.width ?? 0, height: this.patchTarget?.height ?? 0},
      composites: this.composites,
      renderCPUms: this.renderCPUms,
      captureCPUms: this.captureCPUms,
      compositeCPUms: this.compositeCPUms,
      totalRenderCPUms: this.totalRenderCPUms,
      drawcalls: this.drawcalls,
      cacheDrawcalls: this.cacheDrawcalls,
      compositeDrawcalls: this.compositeDrawcalls,
      size: {width: this.target?.width ?? 0, height: this.target?.height ?? 0},
      samples: this.targetSamples,
      type: this.targetType
    };
  }

  private releaseTarget(): void {
    this.releasePatch();
    this.material.map = null;
    this.target?.dispose();
    this.target = undefined;
    this.dirty = true;
    this.cachedRevision = Number.NaN;
    this.previouslyAnimated = false;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.releaseTarget();
    this.material.dispose();
    this.mesh.geometry.dispose();
    this.compositeScene.clear();
    this.renderer = undefined;
    this.backend = undefined;
    this.device = undefined;
    this.sourceScene = undefined;
    this.sourceCamera = undefined;
    this.patchCamera = undefined;
  }
}
