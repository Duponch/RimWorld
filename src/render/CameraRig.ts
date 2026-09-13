import { MathUtils, MOUSE, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WORLD_SCALE } from '../world/scale';

export type CameraMode = 'orthographic' | 'perspective';
const halfHeight = WORLD_SCALE.cameraSpan * 0.53;
const slope = Math.tan(MathUtils.degToRad(45) / 2);

/** Projection and navigation are presentation state, never part of a World. */
export class CameraRig {
  readonly orthographic = new OrthographicCamera(-20, 20, 20, -20, 0.1, 1000);
  readonly perspective = new PerspectiveCamera(45, 1, 0.1, 2000);
  readonly controls: OrbitControls;
  mode: CameraMode = 'orthographic';
  private diagonal = Math.hypot(32, 32);
  private readonly offset = new Vector3();

  constructor(element: HTMLElement | null) {
    this.orthographic.position.set(41, 34, 44);
    this.controls = new OrbitControls(this.orthographic, element);
    Object.assign(this.controls, {
      enableDamping: true, dampingFactor: 0.09, screenSpacePanning: false,
      minPolarAngle: 0.2, maxPolarAngle: Math.PI / 2 - 0.2, minZoom: 0.25, maxZoom: 4.5,
    });
    this.controls.mouseButtons = { LEFT: null as unknown as MOUSE, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.ROTATE };
    this.controls.target.set(15.5, 0, 15.5);
    this.resize(1, 1);
    this.controls.update();
  }

  get camera(): OrthographicCamera | PerspectiveCamera {
    return this.mode === 'orthographic' ? this.orthographic : this.perspective;
  }

  /** Height in world units at the orbit target, shared by zoom, pan and toggle. */
  get span(): number {
    return this.mode === 'orthographic' ? 2 * halfHeight / this.orthographic.zoom
      : 2 * slope * this.perspective.position.distanceTo(this.controls.target);
  }

  setMode(mode: CameraMode): void {
    if (mode === this.mode) return;
    // Consume residual orbit damping before transferring the pose. Otherwise
    // the old camera's unconsumed deltas kick the new projection on the next RAF.
    const damping = this.controls.enableDamping;
    this.controls.enableDamping = false; this.controls.update();
    const span = this.span;
    this.offset.copy(this.camera.position).sub(this.controls.target).normalize();
    this.mode = mode;
    this.configureDistanceLimits();
    const distance = mode === 'perspective' ? span / (2 * slope) : this.diagonal + 2 * WORLD_SCALE.treeMaxHeight;
    this.camera.position.copy(this.controls.target).addScaledVector(this.offset, distance);
    this.camera.zoom = mode === 'orthographic' ? 2 * halfHeight / span : 1;
    this.camera.updateProjectionMatrix();
    this.controls.object = this.camera;
    this.controls.update(); this.controls.enableDamping = damping;
  }

  configureMap(width: number, height: number): void {
    this.controls.enableDamping = false; this.controls.update();
    this.diagonal = Math.hypot(width, height);
    this.controls.target.set((width - 1) / 2, 0, (height - 1) / 2);
    this.offset.set(0.85, 2, 0.9).normalize();
    const distance = this.mode === 'orthographic' ? this.diagonal + 2 * WORLD_SCALE.treeMaxHeight : halfHeight / slope;
    this.camera.position.copy(this.controls.target).addScaledVector(this.offset, distance);
    this.camera.zoom = 1;
    this.controls.update(); this.controls.enableDamping = true;
  }

  resize(width: number, height: number): void {
    const aspect = Math.max(1, width) / Math.max(1, height);
    Object.assign(this.orthographic, { left: -halfHeight * aspect, right: halfHeight * aspect, top: halfHeight, bottom: -halfHeight });
    this.perspective.aspect = aspect;
    this.controls.minZoom = Math.min(0.25, 2 * halfHeight * Math.min(1, aspect) / (this.diagonal + 2 * WORLD_SCALE.treeMaxHeight + 8));
    this.configureDistanceLimits();
    this.orthographic.far = Math.max(300, 2 * this.diagonal + 4 * WORLD_SCALE.treeMaxHeight);
    this.perspective.far = halfHeight / (slope * this.controls.minZoom) + this.diagonal + 2 * WORLD_SCALE.treeMaxHeight;
    this.orthographic.updateProjectionMatrix(); this.perspective.updateProjectionMatrix();
  }

  private configureDistanceLimits(): void {
    this.controls.minDistance = this.mode === 'perspective' ? halfHeight / (slope * this.controls.maxZoom) : 0;
    this.controls.maxDistance = this.mode === 'perspective' ? halfHeight / (slope * this.controls.minZoom) : Infinity;
  }

  /** Conservative size of the NEAREST possible canopy. Using target distance
   * alone would turn near trees into overview glyphs in a low perspective view. */
  pixelsPerCell(viewportHeight: number): number {
    if (this.mode === 'orthographic') return viewportHeight / this.span;
    this.offset.copy(this.controls.target).sub(this.camera.position).normalize();
    const angle = Math.acos(MathUtils.clamp(-this.offset.y, 0, 1));
    const viewHalfAngle = Math.atan(slope * Math.hypot(1, this.perspective.aspect));
    const depth = Math.max(0.1, this.camera.position.y - WORLD_SCALE.treeMaxHeight)
      * Math.cos(viewHalfAngle) / Math.cos(Math.max(0, angle - viewHalfAngle));
    return viewportHeight / (2 * slope * depth);
  }

  dispose(): void { if (this.controls.domElement) this.controls.dispose(); }
}
