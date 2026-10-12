import { BundleGroup, Color, Frustum, Group, Matrix4, Mesh, MeshStandardNodeMaterial, Scene, Vector2, Vector3, Vector4,
  type Camera, type WebGPURenderer } from 'three/webgpu';
import { attribute, positionLocal, sin, uniform, vec3, viewportSize, viewportUV } from 'three/tsl';
import { createRoomGeometry, sampleRoomOrbit, type RoomGeometryPart } from './room-geometry';
import { RoomLighting } from './RoomLighting';
import { RoomBackdrop } from './RoomBackdrop';
import type { DaylightSample } from './daylight';
import { parseLightingSettings, type LightingSettings } from './lighting-settings';
import { DEFAULT_ROOM_MASK_RADIUS, roomMaskRadius } from './room-mask-settings';

/** Optional presentation owner. No World, simulation random stream, independent
 * clock, asset request or animation mixer. OFF destroys this entire owner. */
export class RoomLayer {
  readonly scene = new Scene();
  readonly lighting = new RoomLighting();
  readonly backdrop = new RoomBackdrop();
  readonly sun = new Group();
  readonly moon = new Group();
  private readonly carriers = [this.sun, this.moon] as const;
  private readonly staticGroup = new BundleGroup();
  private readonly ordinaryGroup = new Group();
  private readonly staticMeshes: Mesh[] = [];
  private orderedStatic: Mesh[] = [];
  private readonly bundleFrustum = new Frustum();
  private readonly bundleProjectionView = new Matrix4();
  private readonly sortPoint = new Vector4();
  private bundled = true;
  private readonly bundleView = new Matrix4();
  private readonly bundleViewInverse = new Matrix4();
  private readonly bundleProjection = new Matrix4();
  private readonly drawingSize = new Vector2();
  private bundleCamera: Camera | undefined;
  private bundleCoordinates = -1;
  private bundleLayers = 0;
  private bundleReversedDepth = false;
  private bundleWidth = 0;
  private bundleHeight = 0;
  private bundleViewValid = false;
  private geometry: ReturnType<typeof createRoomGeometry> | null = null;
  private readonly materials = new Map<string, MeshStandardNodeMaterial>();
  private readonly meshes: { part: RoomGeometryPart; mesh: Mesh }[] = [];
  private readonly sunGlow = uniform(0);
  private readonly moonGlow = uniform(0);
  private readonly sunCenter = new Vector3();
  private readonly moonCenter = new Vector3();
  private readonly local = new Vector3();
  private readonly maskRadius = uniform(DEFAULT_ROOM_MASK_RADIUS);
  private width = 0;
  private height = 0;
  private seed = 0;
  private artVersion = 0;
  private textures = true;
  private disposed = false;
  private lightingSettings = parseLightingSettings(null);

  constructor(private readonly gameScene: Scene) {
    this.scene.name = 'room-background'; this.scene.background = new Color(0x17151a);
    this.sun.name = 'paper-sun-carrier'; this.moon.name = 'paper-moon-carrier';
    this.scene.add(this.sun, this.moon);
    this.lighting.attach(gameScene, this.scene);
    this.staticGroup.name = 'room-static-commands';
    this.staticGroup.matrixAutoUpdate = false;
    this.ordinaryGroup.name = 'room-ordinary-commands';
    this.ordinaryGroup.matrixAutoUpdate = false;
    this.scene.add(this.staticGroup, this.ordinaryGroup);
  }

  get span(): number { return Math.min(this.width, this.height); }

  configure(width: number, height: number, seed: number): void {
    if (this.disposed || (this.width === width && this.height === height && this.seed === seed)) return;
    this.clearGeometry(); this.width = width; this.height = height; this.seed = seed;
    this.lighting.configure(width, height);
    this.geometry = createRoomGeometry(width, height, seed);
    for (const part of this.geometry.parts) {
      // The installation uses separate materials from furniture with the same
      // pigment, so its screen aperture never cuts a wall, bed or bookshelf.
      const key = part.motionKind && part.material === 'paper' ? part.motionKind
        : part.section === 'orbit' || part.motionKind ? `overhead-${part.material}` : part.material;
      const mesh = new Mesh(part.geometry, this.material(key)); mesh.name = part.name;
      mesh.castShadow = false; mesh.receiveShadow = false; mesh.matrixAutoUpdate = false;
      this.meshes.push({ part, mesh });
      if (!part.motionKind) this.staticMeshes.push(mesh);
      (part.motionKind ? this[part.motionKind] : this.staticGroup).add(mesh);
    }
    this.artVersion++; this.backdrop.invalidate();
  }

  private material(kind: string): MeshStandardNodeMaterial {
    let material = this.materials.get(kind);
    if (material) return material;
    const metal = kind === 'metal' || kind === 'overhead-metal';
    material = new MeshStandardNodeMaterial({ color: 0xffffff, roughness: metal ? .52 : .94,
      metalness: metal ? .12 : 0, vertexColors: true });
    if (kind.startsWith('overhead-') || kind === 'sun' || kind === 'moon') {
      const pixels = viewportUV.sub(.5).mul(viewportSize);
      // Opaque discard retains the correct room depth and requires no sorting,
      // geometry rebuild, per-object updates or extra render pass.
      material.maskNode = this.maskRadius.lessThanEqual(0).or(pixels.length()
        .greaterThanEqual(viewportSize.x.min(viewportSize.y).mul(this.maskRadius)));
    }
    this.materials.set(kind, material);
    this.applySurface(kind, material);
    return material;
  }

  private applySurface(kind: string, material: MeshStandardNodeMaterial): void {
    // Bounded surface detail, evaluated only for the deliberately soft backdrop.
    const grain = sin(positionLocal.x.mul(31).add(positionLocal.y.mul(83)).add(positionLocal.z.mul(17)))
      .mul(.025).add(sin(positionLocal.x.mul(137).add(positionLocal.z.mul(149))).mul(.016)).add(.96);
    material.colorNode = this.textures ? vec3(grain) : null;
    if (kind === 'sun' || kind === 'moon') {
      const glow = kind === 'sun' ? this.sunGlow : this.moonGlow;
      material.emissiveNode = attribute('color', 'vec3').mul(glow);
    }
    material.needsUpdate = true;
    this.invalidateStaticCommands();
  }

  setTexturesEnabled(enabled: boolean): void {
    if (this.textures === enabled) return;
    this.textures = enabled;
    for (const [kind, material] of this.materials) this.applySurface(kind, material);
    this.artVersion++; this.backdrop.invalidate();
  }

  setSettings(settings: LightingSettings): void {
    this.lightingSettings = parseLightingSettings(settings);
    this.lighting.setSettings(this.lightingSettings);
    this.invalidateStaticCommands();
  }

  setMaskRadius(radius: number): void {
    const value = roomMaskRadius(radius);
    if (value === this.maskRadius.value) return;
    this.maskRadius.value = value;
    this.invalidateStaticCommands();
    this.artVersion++; this.backdrop.invalidate();
  }

  /** Both carriages remain on their own physical rail throughout a full day.
   * The opposite lantern returns along its parallel rail while its bulb fades. */
  present(sample: DaylightSample, camera: Camera): void {
    if (this.disposed || !this.geometry) return;
    const orbit = this.geometry.orbit;
    sampleRoomOrbit(orbit, (1 - sample.x) * .5, this.sun.position, 'sun');
    sampleRoomOrbit(orbit, (1 + sample.x) * .5, this.moon.position, 'moon');
    this.sunCenter.copy(this.sun.position).add(this.local.fromArray(orbit.sun.center));
    this.moonCenter.copy(this.moon.position).add(this.local.fromArray(orbit.moon.center));
    const changed = this.lighting.sync(this.sunCenter, this.moonCenter, sample, this.span);
    const sun = sample.daylight * 1.15 * this.lightingSettings.sun;
    const moon = (1 - sample.daylight) * .72 * this.lightingSettings.moon;
    if (this.sunGlow.value !== sun || this.moonGlow.value !== moon) {
      this.sunGlow.value = sun; this.moonGlow.value = moon; this.artVersion++;
    }
    // Room walls stay physical at every pose. Navigation is constrained inside
    // the shell by CameraRig; its backdrop already invalidates on camera motion.
    camera.updateMatrixWorld();
    this.lighting.fitShadow(camera, this.width, this.height);
    // Lighting version is monotone; sum also changes for geometry/material/camera.
    this.currentVersion = changed + this.artVersion;
  }

  private currentVersion = 0;

  private invalidateStaticCommands(): void {
    this.staticGroup.needsUpdate = true;
    this.bundleViewValid = false;
  }

  /** Native bundle lists skip sorting and precede ordinary opaque objects.
   * Sort fixed leaves exactly; use the ordinary path while any carrier submits.
   * Native frustum culling, materials and node/binding updates remain live. */
  private prepareStaticCommands(renderer: WebGPURenderer, camera: Camera): void {
    camera.updateMatrixWorld();
    renderer.getDrawingBufferSize(this.drawingSize);
    const sameCamera = this.bundleViewValid && this.bundleCamera === camera
      && this.bundleView.equals(camera.matrixWorld) && this.bundleViewInverse.equals(camera.matrixWorldInverse)
      && this.bundleProjection.equals(camera.projectionMatrix) && this.bundleLayers === camera.layers.mask
      && this.bundleCoordinates === camera.coordinateSystem && this.bundleReversedDepth === camera.reversedDepth
      && this.bundleWidth === this.drawingSize.x && this.bundleHeight === this.drawingSize.y;
    if (!sameCamera) {
      this.staticGroup.needsUpdate = true;
      this.bundleView.copy(camera.matrixWorld); this.bundleViewInverse.copy(camera.matrixWorldInverse);
      this.bundleProjection.copy(camera.projectionMatrix); this.bundleLayers = camera.layers.mask;
      this.bundleCoordinates = camera.coordinateSystem; this.bundleReversedDepth = camera.reversedDepth;
      this.bundleWidth = this.drawingSize.x; this.bundleHeight = this.drawingSize.y;
      this.bundleCamera = camera; this.bundleViewValid = true;
      this.bundleProjectionView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      this.bundleFrustum.setFromProjectionMatrix(this.bundleProjectionView, camera.coordinateSystem, camera.reversedDepth);
      // Same homogeneous z and id tie break as Renderer/RenderList, no divide.
      const sorted = this.staticMeshes.map(mesh => {
        mesh.updateWorldMatrix(true, false);
        if (mesh.geometry.boundingSphere === null) mesh.geometry.computeBoundingSphere();
        const center = mesh.geometry.boundingSphere!.center;
        this.sortPoint.set(center.x, center.y, center.z, 1).applyMatrix4(mesh.matrixWorld)
          .applyMatrix4(this.bundleProjectionView);
        return { mesh, z: camera.reversedDepth ? -this.sortPoint.z : this.sortPoint.z };
      });
      sorted.sort((a, b) => a.mesh.renderOrder !== b.mesh.renderOrder ? a.mesh.renderOrder - b.mesh.renderOrder
        : a.z !== b.z ? a.z - b.z : a.mesh.id - b.mesh.id);
      this.orderedStatic = sorted.map(({ mesh }) => mesh);
    }
    // Four owned carrier leaves only. Neither intensity nor mask implies cull.
    this.sun.updateWorldMatrix(true, true); this.moon.updateWorldMatrix(true, true);
    const mobileSubmitted = this.carriers.some(carrier => carrier.visible && carrier.children.some(object => {
      const mesh = object as Mesh;
      const materialVisible = Array.isArray(mesh.material) ? mesh.material.some(material => material.visible) : mesh.material.visible;
      return mesh.visible && mesh.layers.test(camera.layers) && materialVisible
        && (!mesh.frustumCulled || mesh.intersectsFrustum(this.bundleFrustum));
    }));
    const useBundle = renderer.sortObjects && !mobileSubmitted;
    if (this.bundled !== useBundle || (useBundle && !sameCamera)) {
      const parent = useBundle ? this.staticGroup : this.ordinaryGroup;
      for (const mesh of useBundle ? this.orderedStatic : this.staticMeshes) parent.add(mesh);
      // Remove the empty bundle while using the ordinary render list.
      this.staticGroup.visible = useBundle;
      this.staticGroup.needsUpdate = true;
      this.bundled = useBundle;
    }
  }

  renderBackground(renderer: WebGPURenderer, camera: Camera, focus: Vector3, compose = true): void {
    if (this.disposed || !this.geometry) return;
    this.prepareStaticCommands(renderer, camera);
    this.local.copy(focus).applyMatrix4(camera.matrixWorldInverse);
    this.backdrop.render(renderer, this.scene, camera, this.currentVersion, -this.local.z, this.span, compose);
  }

  composeBackground(renderer: WebGPURenderer): void {
    if (this.disposed || !this.geometry) return;
    this.backdrop.compose(renderer);
  }

  async prepare(renderer: WebGPURenderer, camera: Camera): Promise<void> {
    if (this.disposed || !this.geometry) return;
    const target = renderer.getRenderTarget();
    const visibility = this.meshes.map(({ mesh }) => [mesh.visible, mesh.frustumCulled] as const);
    try {
      for (const { mesh } of this.meshes) { mesh.visible = true; mesh.frustumCulled = false; }
      this.invalidateStaticCommands();
      // Warm the actual half-float/depth target, including offscreen furnishings.
      renderer.setRenderTarget(this.backdrop.target);
      await renderer.compileAsync(this.scene, camera);
      renderer.setRenderTarget(target);
      this.renderBackground(renderer, camera, this.local.set((this.width - 1) / 2, 0, (this.height - 1) / 2));
    } finally {
      try { renderer.setRenderTarget(target); }
      finally {
        this.meshes.forEach(({ mesh }, i) => { [mesh.visible, mesh.frustumCulled] = visibility[i]!; });
        this.invalidateStaticCommands();
        this.backdrop.invalidate();
      }
    }
  }

  private clearGeometry(): void {
    this.invalidateStaticCommands(); this.bundleCamera = undefined;
    for (const { mesh } of this.meshes) { mesh.removeFromParent(); mesh.geometry.dispose(); }
    this.meshes.length = 0; this.geometry = null;
    this.staticMeshes.length = 0; this.orderedStatic.length = 0;
    this.bundled = true; this.staticGroup.visible = true;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.clearGeometry(); this.lighting.dispose(); this.backdrop.dispose();
    for (const material of this.materials.values()) material.dispose(); this.materials.clear();
    this.scene.clear();
  }
}
