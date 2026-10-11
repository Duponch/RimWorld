import * as THREE from 'three/webgpu';
import { texture, vec3 } from 'three/tsl';
import { createDioramaGeometry, type DioramaGeometryPart, type DioramaMaterialKind } from './diorama-geometry';
import type { SceneTextureLoader } from './scene-render-ports';
import { DioramaOcclusion } from './diorama-occlusion';
import { DioramaSkyMotion } from './diorama-sky';
import type { BiomeId } from '../sim/biome-flora';

const BOX_FACES = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1],
  [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]] as const;
const SIDE_BITS = { north: 1, south: 2, west: 4, east: 8 } as const;

/** Static site decor and two GPU slides in the same resident paper batch.
 * No World, cell scans, independent clock or light field belongs to this layer. */
export class DioramaLayer {
  readonly group = new THREE.Group();
  private width = 0;
  private height = 0;
  private seed = 0;
  private biome: BiomeId = 'temperate-forest';
  private skyFront = -Infinity;
  private readonly sky = new DioramaSkyMotion();
  private parts: { spec: DioramaGeometryPart; mesh: THREE.Mesh }[] = [];
  private readonly plain = this.materials();
  private readonly textured = this.materials();
  private readonly textures: THREE.Texture[] = [];
  private texturesEnabled = true;
  private disposed = false;
  private loading?: Promise<void>;
  private readonly pending = new Set<() => void>();
  private readonly occlusion = new DioramaOcclusion();
  private readonly viewProjection = new THREE.Matrix4();
  private readonly frustum = new THREE.Frustum();
  private readonly lastView = new THREE.Matrix4();
  private readonly lastProjection = new THREE.Matrix4();
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

  private materials(): Record<DioramaMaterialKind | 'movingPaper', THREE.MeshStandardNodeMaterial> {
    const make = () => new THREE.MeshStandardNodeMaterial({ color: 0xffffff,
      roughness: .96, metalness: 0, vertexColors: true });
    const movingPaper = make(); movingPaper.positionNode = this.sky.positionNode;
    return { cardboard: make(), paper: make(), wood: make(), movingPaper };
  }

  private loadTextures(): Promise<void> {
    return this.loading ??= Promise.all([
      ['kraft.png', ['cardboard', 'paper', 'movingPaper']], ['wood.png', ['wood']],
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
        for (const kind of kinds as (DioramaMaterialKind | 'movingPaper')[]) {
          const mat = this.textured[kind];
          mat.colorNode = kind === 'wood' ? sample.rgb.div(vec3(.63, .43, .23)).clamp(.55, 1.4).mul(.35).add(.65)
            : kind === 'paper' || kind === 'movingPaper' ? grain.mul(.4).add(.6) : grain;
          mat.needsUpdate = true;
        }
        finish();
      }, undefined, finish); } catch { finish(); } // Solid pigments remain usable offline.
    }))).then(() => {});
  }

  configure(width: number, height: number, texturesEnabled: boolean, seed = 0, biome: BiomeId = 'temperate-forest'): void {
    if (this.disposed) return;
    this.setTexturesEnabled(texturesEnabled);
    if (width === this.width && height === this.height && seed === this.seed && biome === this.biome) return;
    this.clearGeometry();
    this.width = width; this.height = height; this.seed = seed; this.biome = biome;
    this.sky.present(0, Math.min(width, height));
    const geometry = createDioramaGeometry(width, height, seed, biome);
    this.skyFront = -Infinity;
    for (const spec of geometry.parts) {
      const celestial = spec.geometry.getAttribute('dioramaCelestial');
      if (celestial) {
        const position = spec.geometry.getAttribute('position');
        for (let i = 0; i < celestial.count; i++) if (celestial.getX(i) !== 0) this.skyFront = Math.max(this.skyFront, position.getZ(i));
      }
      const mesh = new THREE.Mesh(spec.geometry, this.material(spec));
      mesh.name = `diorama-${spec.name}`;
      mesh.matrixAutoUpdate = false;
      // Cardboard uses authored contact shading. Giant scenery does not cast
      // game-scale shadows over the colony or expand its 2048² shadow budget.
      mesh.castShadow = false; mesh.receiveShadow = false;
      this.parts.push({ spec, mesh }); this.group.add(mesh);
    }
    this.occlusion.configure(geometry.parts);
  }

  setTexturesEnabled(enabled: boolean): void {
    this.texturesEnabled = enabled;
    if (enabled && !this.disposed) void this.loadTextures();
    for (const { spec, mesh } of this.parts) mesh.material = this.material(spec);
  }

  private material(spec: DioramaGeometryPart): THREE.MeshStandardNodeMaterial {
    return (this.texturesEnabled ? this.textured : this.plain)[spec.geometry.hasAttribute('dioramaCelestial') ? 'movingPaper' : spec.material];
  }

  /** Called with the existing lighting sample, before the camera-cache early out. */
  presentSky(elevation: number): void {
    if (!this.disposed) this.sky.present(elevation, Math.min(this.width, this.height));
  }

  async prepare(): Promise<() => void> {
    if (this.texturesEnabled) await this.loadTextures();
    const visibility = this.parts.map(({ mesh }) => mesh.visible);
    for (const { mesh } of this.parts) mesh.visible = true;
    return () => { this.parts.forEach(({ mesh }, i) => { mesh.visible = visibility[i]!; }); this.viewValid = false; };
  }

  /** Static world-space bounds, recomputed only for a camera change. A wall's
   * bounding sphere overlaps the colony even when its thin box is offscreen;
   * reject that work before Three traverses the visible render list. */
  present(camera: THREE.Camera, _target: THREE.Vector3, _span: number): void {
    camera.updateMatrixWorld();
    if (this.viewValid && this.lastView.equals(camera.matrixWorld)
      && this.lastProjection.equals(camera.projectionMatrix) && this.lastCoordinates === camera.coordinateSystem
      && this.lastReversedDepth === camera.reversedDepth) return;
    this.lastView.copy(camera.matrixWorld); this.lastProjection.copy(camera.projectionMatrix);
    this.lastCoordinates = camera.coordinateSystem; this.lastReversedDepth = camera.reversedDepth;
    this.viewValid = true;
    // Glued slides are viewed from the inside of the north wall. Suppress their
    // back view, including a camera entering the cardboard thickness. From the
    // interior, every ray toward playable ground stays in front of the slides,
    // so their motion cannot require invalidating the static occlusion index.
    const perspective = (camera as THREE.PerspectiveCamera).isPerspectiveCamera === true;
    this.sky.offsets.value.w = (perspective ? camera.matrixWorld.elements[14]! > this.skyFront
      : camera.matrixWorld.elements[10]! > 0) ? 1 : 0;
    this.viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.viewProjection, camera.coordinateSystem, camera.reversedDepth);
    this.nearCenter.set(0, 0, camera.reversedDepth ? 1
      : camera.coordinateSystem === THREE.WebGPUCoordinateSystem ? 0 : -1).unproject(camera);
    let occlusionReady = false, hiddenSides = 0;
    for (const { spec, mesh } of this.parts) {
      // Lower cardboard is never cut away, at any zoom. Only offscreen geometry
      // is rejected; an upper side disappears only if it covers visible ground.
      const upperSide = spec.layer === 'upper' && spec.side ? SIDE_BITS[spec.side] : 0;
      if (upperSide & hiddenSides) { mesh.visible = false; continue; }
      mesh.visible = this.intersectsBounds(spec.geometry.boundingBox!);
      if (mesh.visible && upperSide) {
        // Colony closeups reject every upper bound. Do not even prepare the
        // ground-ray constraints until a visible upper batch needs them.
        if (!occlusionReady) {
          this.occlusion.begin(camera, this.frustum, this.width, this.height);
          occlusionReady = true;
        }
        mesh.visible = !this.occlusion.hides(spec.side!);
        if (!mesh.visible) hiddenSides |= upperSide;
      }
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
        count = nextCount; const swap = input; input = output; output = swap;
        if (!count) break;
      }
      if (count) return true;
    }
    return false;
  }

  private clearGeometry(): void {
    this.viewValid = false;
    this.occlusion.clear();
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
