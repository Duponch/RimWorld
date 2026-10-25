import * as THREE from 'three/webgpu';

export interface NativeRendererStandbyStats {
  active: boolean;
  parked: boolean;
  transitions: number;
  parks: number;
  failures: number;
  drawingBuffer: {width: number; height: number};
}

/** Retains an exclusively owned renderer, but shrinks its hidden output surfaces.
 *
 * Three r186 resizes its output-transform target lazily: resizing the canvas
 * alone retains the old HDR/MSAA attachments. A single clear of the tiny canvas
 * reaches Renderer._getFrameBufferTarget and Textures.updateRenderTarget, then
 * its normal output pass updates the canvas attachments. Only public APIs are
 * used; scene textures, geometry, pipelines and the device remain owned/alive.
 *
 * Hide the canvas BEFORE parking. Restore with setActive(true) BEFORE showing
 * and rendering the real scene. Never use this on the shared world renderer.
 * After init resolves, repeat setActive(false) if already hidden; an earlier
 * request can shrink the canvas but cannot submit the release pass before init.
 */
export class NativeRendererStandby {
  private width: number;
  private height: number;
  private pixelRatio: number;
  private active = true;
  private parked = false;
  private transitions = 0;
  private parks = 0;
  private failures = 0;
  private readonly bufferSize = new THREE.Vector2();
  private readonly logicalSize = new THREE.Vector2();

  constructor(private readonly renderer: THREE.WebGPURenderer) {
    const size = renderer.getSize(new THREE.Vector2());
    this.width = size.x; this.height = size.y;
    this.pixelRatio = renderer.getPixelRatio();
  }

  resize(width: number, height: number, pixelRatio: number): void {
    if (![width, height, pixelRatio].every(value => Number.isFinite(value) && value > 0)) {
      throw new RangeError('Native renderer size and pixel ratio must be finite and positive');
    }
    this.width = width; this.height = height; this.pixelRatio = pixelRatio;
    if (this.active) this.restoreSize();
    else if (!this.parked) this.park();
  }

  setActive(active: boolean): void {
    if (active !== this.active) this.transitions++;
    this.active = active;
    if (active) {
      this.restoreSize();
      this.parked = false;
    } else if (!this.parked) this.park();
  }

  get stats(): NativeRendererStandbyStats {
    this.renderer.getDrawingBufferSize(this.bufferSize);
    return {active: this.active, parked: this.parked, transitions: this.transitions,
      parks: this.parks, failures: this.failures,
      drawingBuffer: {width: this.bufferSize.x, height: this.bufferSize.y}};
  }

  private restoreSize(): void {
    this.renderer.getSize(this.logicalSize);
    if(this.logicalSize.x===this.width&&this.logicalSize.y===this.height&&this.renderer.getPixelRatio()===this.pixelRatio)return;
    this.renderer.setDrawingBufferSize(this.width, this.height, this.pixelRatio);
  }

  private park(): void {
    const renderer = this.renderer;
    // DPR must also become one: a 1 CSS px canvas at DPR 2 is still 2x2.
    renderer.setDrawingBufferSize(1, 1, 1);
    if (!renderer.initialized) return;

    const target = renderer.getRenderTarget(), output = renderer.getOutputRenderTarget();
    const cube = renderer.getActiveCubeFace(), mip = renderer.getActiveMipmapLevel();
    const mrt = renderer.getMRT(), hook = renderer.getRenderObjectFunction();
    const scissor = renderer.getScissorTest(), xr = renderer.xr.enabled;
    const autoClear = renderer.autoClear;
    const autoColor = renderer.autoClearColor, autoDepth = renderer.autoClearDepth, autoStencil = renderer.autoClearStencil;
    try {
      renderer.setRenderTarget(null);
      renderer.setOutputRenderTarget(null);
      renderer.setMRT(null);
      renderer.setRenderObjectFunction(null);
      renderer.setScissorTest(false);
      renderer.xr.enabled = false;
      // clear() preserves clear color/alpha/depth/stencil values. It also runs
      // the existing output transform, so shrinking is real rather than lazy.
      renderer.clear(true, true, true);
      this.parked = true;
      this.parks++;
    } catch (error) {
      this.failures++;
      throw error;
    } finally {
      renderer.setOutputRenderTarget(output);
      renderer.setRenderTarget(target, cube, mip);
      renderer.setMRT(mrt);
      renderer.setRenderObjectFunction(hook);
      renderer.setScissorTest(scissor);
      renderer.xr.enabled = xr;
      // Three's output pass mutates these internally, without a finally when
      // submission throws. Preserve them even when device recovery is needed.
      renderer.autoClear = autoClear;
      renderer.autoClearColor = autoColor;
      renderer.autoClearDepth = autoDepth;
      renderer.autoClearStencil = autoStencil;
    }
  }
}
