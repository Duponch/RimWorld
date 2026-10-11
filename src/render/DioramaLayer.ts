import * as THREE from 'three/webgpu';
import { texture, vec3 } from 'three/tsl';
import { createDioramaGeometry, type DioramaGeometryPart, type DioramaMaterialKind } from './diorama-geometry';
import type { SceneTextureLoader } from './scene-render-ports';

const BOX_FACES = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1],
  [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]] as const;

/** A handful of static batches outside the playable rectangle. No World, cell
 * scans, animation clock or light field belongs to this decorative layer. */
export class DioramaLayer {
  readonly group = new THREE.Group();
  private width = 0;
  private height = 0;
  private parts: { spec: DioramaGeometryPart; mesh: THREE.Mesh }[] = [];
  private readonly plain = this.materials();
  private readonly textured = this.materials();
  private readonly textures: THREE.Texture[] = [];
  private texturesEnabled = true;
  private disposed = false;
  private loading?: Promise<void>;
  private readonly pending = new Set<() => void>();
  private readonly direction = new THREE.Vector3();
  private readonly viewProjection = new THREE.Matrix4();
  private readonly frustum = new THREE.Frustum();
  private readonly lastView = new THREE.Matrix4();
  private readonly lastProjection = new THREE.Matrix4();
  private readonly lastTarget = new THREE.Vector3();
  private lastSpan = NaN;
  private lastCoordinates = -1;
  private lastReversedDepth = false;
  private viewValid = false;
  private readonly nearCenter = new THREE.Vector3();
  private readonly corners = Array.from({ length: 8 }, () => new THREE.Vector3());
  private readonly clipA = Array.from({ length: 16 }, () => new THREE.Vector3());
  private readonly clipB = Array.from({ length: 16 }, () => new THREE.Vector3());

  constructor(private readonly load: SceneTextureLoader) {
    this.group.name = 'cardboard-diorama';
    this.group.matrixAutoUpdate = false;
  }

  private materials(): Record<DioramaMaterialKind, THREE.MeshStandardNodeMaterial> {
    const make = () => new THREE.MeshStandardNodeMaterial({ color: 0xffffff,
      roughness: .96, metalness: 0, vertexColors: true });
    return { cardboard: make(), paper: make(), wood: make() };
  }

  private loadTextures(): Promise<void> {
    return this.loading ??= Promise.all([
      ['kraft.png', ['cardboard', 'paper']], ['wood.png', ['wood']],
    ].map(([file, kinds]) => new Promise<void>(resolve => {
      let complete = false;
      const finish = () => { complete = true; clearTimeout(timeout); this.pending.delete(finish); resolve(); };
      const timeout = setTimeout(finish, 15000);
      this.pending.add(finish);
      try { this.load(`/assets/diorama/v321/${file}`, loaded => {
        if (this.disposed || complete) { loaded.dispose(); finish(); return; }
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.wrapS = loaded.wrapT = THREE.RepeatWrapping;
        loaded.magFilter = THREE.LinearFilter;
        loaded.minFilter = THREE.LinearMipmapLinearFilter;
        loaded.generateMipmaps = true;
        loaded.anisotropy = 4;
        this.textures.push(loaded);
        const sample = texture(loaded);
        // Preserve authored paper colours: texture supplies fibre/grain relief
        // rather than multiplying sage and cream by brown cardboard pigment.
        const grain = sample.r.mul(1.6).add(.28).clamp(.68, 1.3);
        for (const kind of kinds as DioramaMaterialKind[]) {
          const mat = this.textured[kind];
          mat.colorNode = kind === 'wood' ? sample.rgb.div(vec3(.63, .43, .23)).clamp(.55, 1.4).mul(.35).add(.65)
            : kind === 'paper' ? grain.mul(.4).add(.6) : grain;
          mat.needsUpdate = true;
        }
        finish();
      }, undefined, finish); } catch { finish(); } // Solid pigments remain usable offline.
    }))).then(() => {});
  }

  configure(width: number, height: number, texturesEnabled: boolean): void {
    if (this.disposed) return;
    this.setTexturesEnabled(texturesEnabled);
    if (width === this.width && height === this.height) return;
    this.clearGeometry();
    this.width = width; this.height = height;
    const geometry = createDioramaGeometry(width, height);
    for (const spec of geometry.parts) {
      const mesh = new THREE.Mesh(spec.geometry, (this.texturesEnabled ? this.textured : this.plain)[spec.material]);
      mesh.name = `diorama-${spec.name}`;
      mesh.matrixAutoUpdate = false;
      // Cardboard uses authored contact shading. Giant scenery does not cast
      // game-scale shadows over the colony or expand its 2048² shadow budget.
      mesh.castShadow = false; mesh.receiveShadow = false;
      this.parts.push({ spec, mesh }); this.group.add(mesh);
    }
  }

  setTexturesEnabled(enabled: boolean): void {
    this.texturesEnabled = enabled;
    if (enabled && !this.disposed) void this.loadTextures();
    for (const { spec, mesh } of this.parts) mesh.material = (enabled ? this.textured : this.plain)[spec.material];
  }

  async prepare(): Promise<() => void> {
    if (this.texturesEnabled) await this.loadTextures();
    const visibility = this.parts.map(({ mesh }) => mesh.visible);
    for (const { mesh } of this.parts) mesh.visible = true;
    return () => { this.parts.forEach(({ mesh }, i) => { mesh.visible = visibility[i]!; }); };
  }

  /** Static world-space bounds, recomputed only for a camera change. A wall's
   * bounding sphere overlaps the colony even when its thin box is offscreen;
   * reject that work before Three traverses the visible render list. */
  present(camera: THREE.Camera, target: THREE.Vector3, span: number): void {
    camera.updateMatrixWorld();
    if (this.viewValid && this.lastView.equals(camera.matrixWorld)
      && this.lastProjection.equals(camera.projectionMatrix) && this.lastTarget.equals(target)
      && this.lastSpan === span && this.lastCoordinates === camera.coordinateSystem
      && this.lastReversedDepth === camera.reversedDepth) return;
    this.lastView.copy(camera.matrixWorld); this.lastProjection.copy(camera.projectionMatrix);
    this.lastTarget.copy(target); this.lastSpan = span;
    this.lastCoordinates = camera.coordinateSystem; this.lastReversedDepth = camera.reversedDepth;
    this.viewValid = true;
    this.viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.viewProjection, camera.coordinateSystem, camera.reversedDepth);
    this.nearCenter.set(0, 0, camera.reversedDepth ? 1
      : camera.coordinateSystem === THREE.WebGPUCoordinateSystem ? 0 : -1).unproject(camera);
    this.direction.copy(camera.position).sub(target);
    const close = span < Math.min(this.width, this.height) * .72;
    for (const { spec, mesh } of this.parts) {
      const near = spec.side === 'north' ? this.direction.z < 0
        : spec.side === 'south' ? this.direction.z > 0
        : spec.side === 'west' ? this.direction.x < 0
        : spec.side === 'east' ? this.direction.x > 0 : false;
      mesh.visible = !(near && (spec.layer === 'upper' || (close && spec.layer === 'lower')))
        && this.intersectsBounds(spec.geometry.boundingBox!);
    }
  }

  private intersectsBounds(box: THREE.Box3): boolean {
    if (!this.frustum.intersectsBox(box)) return false;
    if (box.containsPoint(this.nearCenter)) return true;
    // Six plane tests alone still admit long walls diagonally outside a narrow
    // view. Clip the six box faces against the frustum, with fixed scratch space.
    // If the whole frustum is inside the box, nearCenter already accepted it.
    for (let i = 0; i < 8; i++) this.corners[i]!.set(i & 1 ? box.max.x : box.min.x,
      i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
    for (const face of BOX_FACES) {
      let input = this.clipA, output = this.clipB, count = 4;
      for (let i = 0; i < 4; i++) input[i]!.copy(this.corners[face[i]!]!);
      for (const plane of this.frustum.planes) {
        let nextCount = 0;
        for (let i = 0; i < count; i++) {
          const a = input[i]!, b = input[(i + 1) % count]!;
          const da = plane.distanceToPoint(a) + 1e-6, db = plane.distanceToPoint(b) + 1e-6;
          if (da >= 0) output[nextCount++]!.copy(a);
          if ((da < 0) !== (db < 0)) output[nextCount++]!.copy(a).lerp(b, da / (da - db));
        }
        count = nextCount; [input, output] = [output, input];
        if (!count) break;
      }
      if (count) return true;
    }
    return false;
  }

  private clearGeometry(): void {
    this.viewValid = false;
    for (const { mesh } of this.parts) mesh.geometry.dispose();
    this.parts = []; this.group.clear();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.group.removeFromParent(); this.clearGeometry();
    for (const finish of this.pending) finish();
    for (const mat of [...Object.values(this.plain), ...Object.values(this.textured)]) mat.dispose();
    for (const map of this.textures) map.dispose();
    this.textures.length = 0;
  }
}
