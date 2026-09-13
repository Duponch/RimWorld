import * as THREE from 'three/webgpu';
import { Fn, If, attribute, cos, float, mix, positionLocal, sin, uniform, vec3 } from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { World, Terrain, MaterialKind, Orientation, AreaAction, Cell } from '../sim/types';
import { TICKS_PER_SECOND } from '../sim/types';
import { CARRY_CAPACITY, JOB_DURATION, MAX_STACK, footprintCells } from '../sim/definitions';
import { canDesignate } from '../sim/engine';
import { buildAreaIndex, isAreaAction, queryArea } from '../sim/designation';
import type { AreaIndex } from '../sim/designation';
import { PAWN_MODEL_SCALE, WORLD_SCALE } from '../world/scale';

type Placement = { x: number; y: number; z: number; sx?: number; sy?: number; sz?: number; ry?: number; color?: number };
type VisualPawn = { from: THREE.Vector4; to: THREE.Vector4 };
type VisualChunk = { signature: string; group: THREE.Group };

const PAWN_COLORS = [0xeab969, 0x639eac, 0xc57c65, 0x809864, 0xaa8db2];
const TERRAIN_COLORS: Record<Terrain, number> = { grass: 0x81946c, soil: 0xa39b75, rock: 0x899182, water: 0x78a7a4 };
const scratchObject = new THREE.Object3D();
const scratchColor = new THREE.Color();

function noise(x: number, z: number, salt = 0): number {
  let value = Math.imul(x + 1, 374761393) ^ Math.imul(z + 1, 668265263) ^ Math.imul(salt + 1, 1274126177);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function material(color: number, extra: THREE.MeshStandardNodeMaterialParameters = {}): THREE.MeshStandardNodeMaterial {
  return new THREE.MeshStandardNodeMaterial({ color, roughness: 0.93, metalness: 0, flatShading: true, ...extra });
}

function instances(group: THREE.Group, geometry: THREE.BufferGeometry, mat: THREE.Material, items: Placement[], shadows = true): THREE.InstancedMesh | undefined {
  if (!items.length) { geometry.dispose(); mat.dispose(); return; }
  const mesh = new THREE.InstancedMesh(geometry, mat, items.length);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    scratchObject.position.set(item.x, item.y, item.z);
    scratchObject.rotation.set(0, item.ry ?? 0, 0);
    scratchObject.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1);
    scratchObject.updateMatrix();
    mesh.setMatrixAt(i, scratchObject.matrix);
    if (item.color !== undefined) mesh.setColorAt(i, scratchColor.setHex(item.color));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  group.add(mesh);
  return mesh;
}

function clearGroup(group: THREE.Group): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const mat of Array.isArray(object.material) ? object.material : [object.material]) materials.add(mat);
    if (object instanceof THREE.InstancedMesh) object.dispose();
  });
  group.clear();
  for (const geometry of geometries) geometry.dispose();
  for (const mat of materials) if (!mat.userData.rendererOwned) mat.dispose();
}

/** Six rigid bones, authored entirely in code. Each vertex has one bone influence.
 * The bind position/pivot and animation state are evaluated in the vertex shader.
 * There is no per-pawn AnimationMixer, bone Object3D tree or CPU bone update.
 * This deliberately small prototype rig is not yet the future glTF atlas importer.
 */
function pawnGeometry(): THREE.InstancedBufferGeometry {
  const positions: number[] = [], normals: number[] = [], colors: number[] = [];
  const bones: number[] = [], pivots: number[] = [], dyes: number[] = [];
  const addPart = (size: number[], center: number[], bone: number, pivot: number[], color: number, dye = 0) => {
    const box = new THREE.BoxGeometry(size[0], size[1], size[2]).toNonIndexed();
    const pos = box.getAttribute('position'), normal = box.getAttribute('normal');
    const col = new THREE.Color(color);
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i) + center[0], pos.getY(i) + center[1], pos.getZ(i) + center[2]);
      normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
      colors.push(col.r, col.g, col.b);
      bones.push(bone); pivots.push(...pivot); dyes.push(dye);
    }
    box.dispose();
  };
  addPart([0.35, 0.43, 0.22], [0, 0.82, 0], 0, [0, 0.61, 0], 0xffffff, 1);
  addPart([0.3, 0.3, 0.28], [0, 1.19, 0.01], 1, [0, 1.04, 0], 0xe2b899);
  addPart([0.32, 0.11, 0.3], [0, 1.35, -0.02], 1, [0, 1.04, 0], 0x554741);
  addPart([0.27, 0.15, 0.08], [0, 1.23, -0.13], 1, [0, 1.04, 0], 0x554741);
  for (const side of [-1, 1]) {
    const arm = side < 0 ? 2 : 3, leg = side < 0 ? 4 : 5;
    addPart([0.12, 0.28, 0.15], [side * 0.23, 0.85, 0], arm, [side * 0.23, 1.01, 0], 0xffffff, 1);
    addPart([0.115, 0.12, 0.14], [side * 0.23, 0.65, 0], arm, [side * 0.23, 1.01, 0], 0xe2b899);
    addPart([0.135, 0.43, 0.17], [side * 0.105, 0.38, 0], leg, [side * 0.105, 0.61, 0], 0x495052);
    addPart([0.145, 0.12, 0.23], [side * 0.105, 0.11, 0.03], leg, [side * 0.105, 0.61, 0], 0x443e37);
    addPart([0.035, 0.035, 0.014], [side * 0.07, 1.2, 0.157], 1, [0, 1.04, 0], 0x433e39);
  }
  const geometry = new THREE.InstancedBufferGeometry();
  // WebGPU guarantees only eight vertex-buffer slots. Keeping authored attributes
  // interleaved leaves room for the five independent per-instance attributes.
  const vertexData = new Float32Array(bones.length * 14);
  for (let i = 0; i < bones.length; i++) {
    vertexData.set(positions.slice(i * 3, i * 3 + 3), i * 14);
    vertexData.set(normals.slice(i * 3, i * 3 + 3), i * 14 + 3);
    vertexData.set(colors.slice(i * 3, i * 3 + 3), i * 14 + 6);
    vertexData[i * 14 + 9] = bones[i];
    vertexData.set(pivots.slice(i * 3, i * 3 + 3), i * 14 + 10);
    vertexData[i * 14 + 13] = dyes[i];
  }
  const vertices = new THREE.InterleavedBuffer(vertexData, 14);
  geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(vertices, 3, 0));
  geometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(vertices, 3, 3));
  geometry.setAttribute('color', new THREE.InterleavedBufferAttribute(vertices, 3, 6));
  geometry.setAttribute('boneId', new THREE.InterleavedBufferAttribute(vertices, 1, 9));
  geometry.setAttribute('bindPivot', new THREE.InterleavedBufferAttribute(vertices, 3, 10));
  geometry.setAttribute('dye', new THREE.InterleavedBufferAttribute(vertices, 1, 13));
  geometry.instanceCount = 0;
  return geometry;
}

/** Static chunk meshes batch different procedural shapes together. Their exact
 * per-cell silhouettes and colors stay intact; only submissions are combined.
 * Dynamic pawns and cargo remain GPU-instanced and are never baked here.
 */
function mergedInstances(group: THREE.Group, parts: { geometry: THREE.BufferGeometry; items: Placement[] }[], mat: THREE.Material, shadows = true): THREE.Mesh | undefined {
  const vertexCount = parts.reduce((sum, part) => sum + part.geometry.getAttribute('position').count * part.items.length, 0);
  const indexCount = parts.reduce((sum, part) => sum + (part.geometry.index?.count ?? part.geometry.getAttribute('position').count) * part.items.length, 0);
  if (!vertexCount) { for (const part of parts) part.geometry.dispose(); if (!mat.userData.rendererOwned) mat.dispose(); return; }
  const positions = new Float32Array(vertexCount * 3), normals = new Float32Array(vertexCount * 3), colors = new Float32Array(vertexCount * 3);
  const indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
  let vertex = 0, index = 0;
  for (const { geometry, items } of parts) {
    const pos = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
    for (const item of items) {
      const sx = item.sx ?? 1, sy = item.sy ?? 1, sz = item.sz ?? 1;
      const cosine = Math.cos(item.ry ?? 0), sine = Math.sin(item.ry ?? 0);
      scratchColor.setHex(item.color ?? 0xffffff);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) * sx, z = pos.getZ(i) * sz;
        const nx = normal.getX(i) / sx, ny = normal.getY(i) / sy, nz = normal.getZ(i) / sz;
        const length = Math.hypot(nx, ny, nz), offset = (vertex + i) * 3;
        positions[offset] = item.x + x * cosine + z * sine;
        positions[offset + 1] = item.y + pos.getY(i) * sy;
        positions[offset + 2] = item.z + z * cosine - x * sine;
        normals[offset] = (nx * cosine + nz * sine) / length;
        normals[offset + 1] = ny / length;
        normals[offset + 2] = (nz * cosine - nx * sine) / length;
        colors[offset] = scratchColor.r; colors[offset + 1] = scratchColor.g; colors[offset + 2] = scratchColor.b;
      }
      for (let i = 0; i < (geometry.index?.count ?? pos.count); i++) indices[index++] = vertex + (geometry.index?.getX(i) ?? i);
      vertex += pos.count;
    }
    geometry.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = shadows; mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  group.add(mesh);
  return mesh;
}

/** Cargo is a second instanced batch sharing the pawn pose attributes. Its
 * attachment and interpolation stay on the GPU, including during camera motion.
 * These bundles indicate kind/load; individual logs are not individual items.
 */
function cargoGeometry(): THREE.InstancedBufferGeometry {
  const data: number[] = [];
  const part = (size: number[], center: number[], kind: number, color: number) => {
    const box = new THREE.BoxGeometry(size[0], size[1], size[2]).toNonIndexed();
    const positions = box.getAttribute('position'), normals = box.getAttribute('normal');
    const tint = new THREE.Color(color);
    for (let i = 0; i < positions.count; i++) data.push(
      positions.getX(i) + center[0], positions.getY(i) + center[1], positions.getZ(i) + center[2],
      normals.getX(i), normals.getY(i), normals.getZ(i), tint.r, tint.g, tint.b, kind,
    );
    box.dispose();
  };
  part([0.56, 0.105, 0.12], [0, -0.025, -0.08], 1, 0xa37b4d);
  part([0.56, 0.105, 0.12], [0, -0.025, 0.08], 1, 0xb08c5d);
  part([0.54, 0.105, 0.12], [0, 0.07, 0], 1, 0xc6a477);
  part([0.07, 0.22, 0.3], [0.14, 0.015, 0], 1, 0x66584b);
  part([0.44, 0.2, 0.32], [0, -0.035, 0], 2, 0x947653);
  for (const x of [-0.1, 0.1]) for (const z of [-0.075, 0.075]) {
    part([0.15, 0.1, 0.12], [x, 0.09, z], 2, x * z > 0 ? 0xba7e65 : 0xb9705c);
  }
  const vertices = new THREE.InterleavedBuffer(new Float32Array(data), 10);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(vertices, 3, 0));
  geometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(vertices, 3, 3));
  geometry.setAttribute('color', new THREE.InterleavedBufferAttribute(vertices, 3, 6));
  geometry.setAttribute('cargoKind', new THREE.InterleavedBufferAttribute(vertices, 1, 9));
  geometry.instanceCount = 0;
  return geometry;
}

export class ColonyRenderer {
  readonly stats = { fps: 0, drawCalls: 0, triangles: 0 };
  readonly backend: string;
  private readonly renderer: THREE.WebGPURenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 300);
  private readonly controls: OrbitControls;
  private readonly terrainGroup = new THREE.Group();
  private readonly resourceGroup = new THREE.Group();
  private readonly structureGroup = new THREE.Group();
  private readonly jobGroup = new THREE.Group();
  private readonly pileGroup = new THREE.Group();
  private readonly storageGroup = new THREE.Group();
  private readonly pawnGroup = new THREE.Group();
  private readonly uTime = uniform(0);
  private readonly uBlend = uniform(1);
  private readonly hover: THREE.Mesh;
  private readonly selection: THREE.Mesh;
  private areaMesh: THREE.InstancedMesh | null = null;
  private areaIndex: AreaIndex | undefined;
  private areaSignature = '';
  private areaDrag: { pointerId: number; action: AreaAction; from: Cell } | null = null;
  onArea: (action: AreaAction, from: Cell, to: Cell) => void = () => {};
  onAreaPreview: (info: { width: number; height: number; eligible: number; skipped: number } | null) => void = () => {};
  private readonly raycaster = new THREE.Raycaster();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly pointer = new THREE.Vector2();
  private readonly hit = new THREE.Vector3();
  private readonly resizeObserver: ResizeObserver;
  private readonly keys = new Set<string>();
  private readonly pawnVisuals = new Map<number, VisualPawn>();
  private readonly pileChunks = new Map<string, VisualChunk>();
  private readonly resourceChunks = new Map<string, VisualChunk>();
  private readonly staticMaterial = material(0xffffff, { vertexColors: true });
  private readonly waterMaterial = material(0xffffff, { vertexColors: true, roughness: 0.45, metalness: 0.08 });
  private readonly sun: THREE.DirectionalLight;
  private pawnMesh: THREE.Mesh | null = null;
  private cargoMesh: THREE.Mesh | null = null;
  private world: World | null = null;
  private terrainKey = '';
  private structureKey = '';
  private jobKey = '';
  private storageKey = '';
  private tool = 'select';
  private placementRotation: Orientation = 0;
  private hoverCell: { x: number; z: number } | null = null;
  private selectedPawn: number | null = null;
  private wallCutaway = false;
  private foliageVisible = true;
  private lastFrame = 0;
  private lastStats = 0;
  private frameCount = 0;
  private snapshotAt = 0;
  private timeFrom = 0;
  private timeTo = 0;
  private snapshotDuration = 120;
  private disposed = false;
  private pointerDown: { x: number; y: number; button: number; pointerId: number } | null = null;

  static async create(host: HTMLElement, onPick: (x: number, z: number) => void): Promise<ColonyRenderer> {
    const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    await renderer.init();
    const view = new ColonyRenderer(host, onPick, renderer);
    renderer.setAnimationLoop((time) => view.frame(time));
    return view;
  }

  private constructor(private readonly host: HTMLElement, private readonly onPick: (x: number, z: number) => void, renderer: THREE.WebGPURenderer) {
    this.renderer = renderer;
    // Renderer-owned shared material survives deletion of an individual chunk.
    // Reusing its node graph also avoids compiling a pipeline per tree batch.
    this.staticMaterial.userData.rendererOwned = true;
    this.waterMaterial.userData.rendererOwned = true;
    this.backend = renderer.getContext() instanceof WebGL2RenderingContext ? 'WebGL 2' : 'WebGPU';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.info.autoReset = false;
    renderer.domElement.setAttribute('aria-label', 'Carte 3D de la colonie');
    renderer.domElement.dataset.testid = 'world-canvas';
    if (import.meta.env.DEV) {
      // Read the device configured on THIS canvas, not a separately requested
      // adapter which might select a different GPU. Keep diagnostics local.
      const context = renderer.getContext() as GPUCanvasContext | WebGL2RenderingContext;
      const device = 'getConfiguration' in context ? context.getConfiguration()?.device : undefined;
      const info = device?.adapterInfo;
      console.info('Lisière renderer diagnostics', JSON.stringify({
        backend: this.backend,
        context: context.constructor.name,
        browser: navigator.userAgent,
        adapter: info ? { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description } : null,
        maxVertexBuffers: device?.limits.maxVertexBuffers ?? null,
      }));
    }
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
    renderer.domElement.tabIndex = 0;
    host.appendChild(renderer.domElement);
    this.scene.background = new THREE.Color(0xd4d7c5);
    this.scene.add(new THREE.HemisphereLight(0xfff3d9, 0x748474, 2.1));
    this.sun = new THREE.DirectionalLight(0xffe1b2, 3.2);
    this.sun.position.set(-12, 30, 18);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.normalBias = 0.055;
    this.sun.shadow.bias = -0.0002;
    this.sun.shadow.camera.near = 0.1;
    this.sun.shadow.camera.far = 140;
    this.scene.add(this.sun, this.sun.target);
    this.scene.add(this.terrainGroup, this.resourceGroup, this.structureGroup, this.jobGroup, this.storageGroup, this.pileGroup, this.pawnGroup);
    this.camera.position.set(41, 34, 44);
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.target.set(15.5, 0, 15.5);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.screenSpacePanning = false;
    this.controls.minPolarAngle = 0.2;
    this.controls.maxPolarAngle = Math.PI / 2.6;
    this.controls.minZoom = 0.25;
    this.controls.maxZoom = 4.5;
    this.controls.mouseButtons = { LEFT: null as unknown as THREE.MOUSE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.update();
    const hoverMat = new THREE.MeshBasicNodeMaterial({ color: 0xf9ebae, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
    this.hover = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96), hoverMat);
    this.hover.rotation.x = -Math.PI / 2;
    this.hover.position.y = 0.08;
    this.hover.visible = false;
    this.hover.renderOrder = 5;
    this.selection = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.45, 32), new THREE.MeshBasicNodeMaterial({ color: 0xffe5a0, depthWrite: false, side: THREE.DoubleSide }));
    this.selection.rotation.x = -Math.PI / 2;
    this.selection.position.y = 0.09;
    this.selection.visible = false;
    this.scene.add(this.hover, this.selection);
    renderer.domElement.addEventListener('pointerdown', this.onPointerDown, true);
    renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    renderer.domElement.addEventListener('pointerleave', this.onPointerLeave);
    renderer.domElement.addEventListener('pointercancel', this.onPointerCancel);
    renderer.domElement.addEventListener('lostpointercapture', this.onPointerCancel);
    renderer.domElement.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
  }

  setWorld(world: World, resetPresentation = false): void {
    if (this.disposed) return;
    if (resetPresentation) this.cancelDesignation();
    this.areaIndex = undefined; this.areaSignature = '';
    const now = performance.now();
    const previousWorld = this.world;
    // Worker deltas keep immutable terrain/resources references stable. A changed
    // collection is inspected once; ordinary pawn snapshots do not scan the map.
    const nextTerrainKey = previousWorld?.tiles === world.tiles ? this.terrainKey
      : `${world.seed}:${world.width}:${world.height}:${world.tiles.map((t) => t.terrain[0]).join('')}`;
    const newMap = this.terrainKey !== nextTerrainKey;
    if (newMap) this.cancelDesignation();
    // The worker epoch distinguishes a checkpoint from an ordinary delta even
    // if terrain content and simulation tick match a previous session.
    const resetPoses = resetPresentation || newMap || world.tick < (previousWorld?.tick ?? 0);
    this.world = world;
    if (newMap) {
      this.terrainKey = nextTerrainKey;
      this.buildTerrain(world);
      const centerX = (world.width - 1) / 2, centerZ = (world.height - 1) / 2;
      const extent = Math.min(WORLD_SCALE.cameraSpan, Math.max(world.width, world.height));
      this.controls.target.set(centerX, 0, centerZ);
      // A steep initial view keeps the camp readable beneath 5–7 m canopies.
      // Orbit controls remain free: this is only the new-map framing.
      const cameraOffset = new THREE.Vector3(0.85, 2, 0.9);
      const mapDiagonal = Math.hypot(world.width, world.height);
      cameraOffset.setLength(Math.max(extent * cameraOffset.length(), mapDiagonal + WORLD_SCALE.treeMaxHeight));
      this.camera.position.copy(this.controls.target).add(cameraOffset);
      this.camera.zoom = 1;
      // Full-map overview is presentation only: the initial local framing and
      // every model/cell dimension are independent of the world extent.
      this.controls.minZoom = Math.min(0.25, 24 / Math.max(world.width, world.height));
      this.camera.far = Math.max(300, cameraOffset.length() + mapDiagonal + WORLD_SCALE.treeMaxHeight * 2);
      this.controls.update();
      this.sun.position.set(centerX - 24, 45, centerZ + 25);
      this.sun.target.position.set(centerX, 0, centerZ);
      Object.assign(this.sun.shadow.camera, { left: -extent * 0.65, right: extent * 0.65, top: extent * 0.65, bottom: -extent * 0.65 });
      this.sun.shadow.camera.updateProjectionMatrix();
      this.resize();
    }
    if (previousWorld?.resources !== world.resources || newMap) this.updateResources(world, newMap);
    const structureKey = world.structures.map((s) => `${s.id}:${s.kind}:${s.x}:${s.z}:${s.orientation}:${s.footprint}`).join('|');
    if (structureKey !== this.structureKey || newMap) { this.structureKey = structureKey; this.buildStructures(world); }
    // Quantize presentation of progression to avoid rebuilding static meshes for
    // every work tick. Saved simulation progress remains exact and authoritative.
    const jobKey = world.jobs.map((j) => `${j.id}:${j.kind}:${j.x}:${j.z}:${j.orientation}:${j.footprint}:${j.status}:${j.escrow.wood}:${Math.floor(j.progress / JOB_DURATION[j.kind] * 20)}`).join('|');
    if (jobKey !== this.jobKey || newMap) { this.jobKey = jobKey; this.buildJobs(world); }
    const storageKey = world.stockpiles.map((s) => `${s.id}:${s.x}:${s.z}:${s.priority}:${s.filters.wood}:${s.filters.food}`).join('|');
    if (storageKey !== this.storageKey || newMap) { this.storageKey = storageKey; this.buildStorage(world); }
    this.updatePiles(world, newMap);
    const oldBlend = this.uBlend.value;
    this.snapshotDuration = previousWorld && world.tick >= previousWorld.tick ? Math.min(200, Math.max(70, now - this.snapshotAt)) : 0;
    this.snapshotAt = now;
    this.timeFrom = resetPoses ? world.tick / TICKS_PER_SECOND : this.uTime.value;
    this.timeTo = world.tick / TICKS_PER_SECOND;
    this.uBlend.value = resetPoses ? 1 : 0;
    this.updatePawns(world, resetPoses ? 1 : oldBlend, resetPoses);
    this.updateHover();
  }

  setTool(tool: string): void {
    if (tool !== this.tool) this.cancelDesignation();
    this.tool = tool;
    if (tool === 'bed') this.keys.delete('q');
    const color = tool === 'cancel' ? 0xe6876a : tool === 'select' ? 0xf9ebae : 0x9dd9ca;
    (this.hover.material as THREE.MeshBasicNodeMaterial).color.setHex(color);
    this.renderer.domElement.style.cursor = tool === 'select' ? 'default' : 'crosshair';
    this.updateHover();
  }

  setPlacementRotation(orientation: Orientation): void {
    this.placementRotation = orientation;
    this.updateHover();
  }

  /** A gesture is an uncommitted intention. Losing focus, changing tools/maps or
   * pressing Escape must never submit it later through a stray pointerup.
   */
  cancelDesignation(): boolean {
    const drag = this.areaDrag;
    this.areaDrag = null; this.pointerDown = null; this.areaSignature = ''; this.hoverCell = null;
    this.controls.enabled = true;
    if (drag && this.renderer.domElement.hasPointerCapture(drag.pointerId)) this.renderer.domElement.releasePointerCapture(drag.pointerId);
    if (this.areaMesh) this.areaMesh.visible = false;
    this.hover.visible = false;
    (this.hover.material as THREE.MeshBasicNodeMaterial).opacity = 0.55;
    this.onAreaPreview(null);
    return drag !== null;
  }

  /** Presentation only: hidden wall volume remains blocked in the simulation. */
  setWallCutaway(enabled: boolean): void {
    if (this.wallCutaway === enabled) return;
    this.wallCutaway = enabled;
    if (this.world) { this.buildStructures(this.world); this.buildJobs(this.world); }
  }

  /** Hide canopies for inspection while retaining trunks and all game rules. */
  setFoliageVisible(visible: boolean): void {
    this.foliageVisible = visible;
    this.resourceGroup.traverse(object => { if (object.name === 'tree-canopy') object.visible = visible; });
  }

  focusPawn(id: number): void {
    const pawn = this.world?.pawns.find((item) => item.id === id);
    if (!pawn) return;
    this.selectedPawn = id;
    this.selection.visible = true;
    const offset = this.camera.position.clone().sub(this.controls.target);
    this.controls.target.set(pawn.x, 0, pawn.z);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  resize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.host.clientWidth), height = Math.max(1, this.host.clientHeight);
    const aspect = width / height;
    // A larger world expands the land to explore, not the initial viewing distance.
    const halfHeight = WORLD_SCALE.cameraSpan * 0.53;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    if (this.world) this.controls.minZoom = Math.min(0.25,
      halfHeight * 2 * Math.min(1, aspect) / (Math.hypot(this.world.width, this.world.height) + WORLD_SCALE.treeMaxHeight * 2 + 8));
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  projectCell(x: number, z: number): { x: number; y: number } {
    this.camera.updateMatrixWorld();
    const projected = new THREE.Vector3(x, 0, z).project(this.camera);
    return { x: (projected.x + 1) * this.host.clientWidth / 2, y: (1 - projected.y) * this.host.clientHeight / 2 };
  }

  private buildTerrain(world: World): void {
    clearGroup(this.terrainGroup);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(world.width + 0.15, 0.8, world.height + 0.15), material(0x827858));
    slab.position.set((world.width - 1) / 2, -0.56, (world.height - 1) / 2);
    slab.receiveShadow = true;
    this.terrainGroup.add(slab);
    // Small spatial chunks keep each instance batch independently cullable.
    const chunkSize = WORLD_SCALE.chunkSize;
    for (let cz = 0; cz < world.height; cz += chunkSize) for (let cx = 0; cx < world.width; cx += chunkSize) {
      const tileGroups: Record<Terrain, Placement[]> = { grass: [], soil: [], water: [], rock: [] };
      const grass: Placement[] = [], massifs: Placement[] = [], banks: Placement[] = [];
      for (let z = cz; z < Math.min(cz + chunkSize, world.height); z++) for (let x = cx; x < Math.min(cx + chunkSize, world.width); x++) {
        const terrain = world.tiles[z * world.width + x].terrain;
        const n = noise(x, z, world.seed);
        scratchColor.setHex(TERRAIN_COLORS[terrain]).multiplyScalar(0.94 + n * 0.12);
        const color = scratchColor.getHex(), level = terrain === 'water' ? WORLD_SCALE.waterSurface : 0;
        tileGroups[terrain].push({ x, z, y: level, color });
        // Top quads replace six-sided ground cubes; exposed bank and perimeter
        // faces retain the original water drop and the slab join without holes.
        for (const [dx, dz, rotation] of [[1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2], [0, 1, 0], [0, -1, Math.PI]] as const) {
          const nx = x + dx, nz = z + dz;
          const neighbor = nx < 0 || nz < 0 || nx >= world.width || nz >= world.height ? -0.16
            : world.tiles[nz * world.width + nx].terrain === 'water' ? WORLD_SCALE.waterSurface : 0;
          if (neighbor < level) banks.push({ x: x + dx * 0.5, z: z + dz * 0.5, y: (level + neighbor) / 2, sy: level - neighbor, ry: rotation, color });
        }
        if (terrain === 'rock') {
          // Every impassable rock cell has a solid footprint, unlike loose stone.
          const height = 1.7 + noise(Math.floor(x / 4), Math.floor(z / 4), world.seed) * 2.1 + n * 0.25;
          massifs.push({ x, z, y: height / 2, sy: height, color: scratchColor.getHex() });
        }
        if (terrain === 'grass' && n > 0.83) grass.push({ x: x - 0.26, y: 0.09, z: z + 0.22, sy: 0.7 + n, color: n > 0.96 ? 0xd4c58a : 0x96a575, ry: n * 6.28 });
      }
      mergedInstances(this.terrainGroup, [
        { geometry: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), items: [...tileGroups.grass, ...tileGroups.soil, ...tileGroups.rock] },
        { geometry: new THREE.PlaneGeometry(1, 1), items: banks },
        { geometry: new THREE.ConeGeometry(0.08, 0.15, 3), items: grass },
        { geometry: new THREE.BoxGeometry(1, 1, 1), items: massifs },
      ], this.staticMaterial);
      mergedInstances(this.terrainGroup, [{ geometry: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), items: tileGroups.water }], this.waterMaterial, false);
    }
  }

  private updateResources(world: World, newMap: boolean): void {
    if (newMap) { clearGroup(this.resourceGroup); this.resourceChunks.clear(); }
    const chunks = new Map<string, World['resources']>();
    for (const resource of world.resources) {
      const key = `${Math.floor(resource.x / WORLD_SCALE.chunkSize)}:${Math.floor(resource.z / WORLD_SCALE.chunkSize)}`;
      const chunk = chunks.get(key);
      if (chunk) chunk.push(resource); else chunks.set(key, [resource]);
    }
    for (const [key, previous] of this.resourceChunks) if (!chunks.has(key)) {
      clearGroup(previous.group); this.resourceGroup.remove(previous.group); this.resourceChunks.delete(key);
    }
    for (const [key, chunk] of chunks) {
      const signature = chunk.map(resource => `${resource.id}:${resource.kind}:${resource.x}:${resource.z}`).join('|');
      const previous = this.resourceChunks.get(key);
      if (previous?.signature === signature) continue;
      const group = previous?.group ?? new THREE.Group();
      if (previous) clearGroup(group); else this.resourceGroup.add(group);
      group.name = `Resources ${key}`;
      const trunks: Placement[] = [], crowns: Placement[] = [], upperCrowns: Placement[] = [];
      const rocks: Placement[] = [], bushes: Placement[] = [], berries: Placement[] = [];
      for (const resource of chunk) {
        const { x, z } = resource;
        const n = noise(x, z, 77), turn = n * Math.PI * 2;
        if (resource.kind === 'tree') {
          const height = WORLD_SCALE.treeMinHeight + n * (WORLD_SCALE.treeMaxHeight - WORLD_SCALE.treeMinHeight);
          const radius = 0.8 + n * 0.32;
          trunks.push({ x, y: height * 0.25, z, sx: 1.1, sy: height * 0.5, sz: 1.1, ry: turn });
          crowns.push({ x, y: height * 0.57, z, sx: radius, sy: height * 0.35, sz: radius, ry: turn, color: n > 0.65 ? 0x657d56 : 0x526e50 });
          upperCrowns.push({ x, y: height * 0.83, z, sx: radius * 0.72, sy: height * 0.34, sz: radius * 0.72, ry: turn + 0.3, color: n > 0.65 ? 0x81925b : 0x688557 });
        } else if (resource.kind === 'rock') {
          rocks.push({ x: x - 0.1, y: 0.3, z, sx: 0.46 + n * 0.14, sy: 0.35 + n * 0.15, sz: 0.43, ry: turn, color: 0x92998d });
          rocks.push({ x: x + 0.3, y: 0.15, z: z + 0.2, sx: 0.25, sy: 0.24, sz: 0.25, ry: -turn, color: 0xa8ad9c });
        } else {
          bushes.push({ x, y: 0.3, z, sx: 0.44, sy: 0.39, sz: 0.4, ry: turn, color: 0x697b55 });
          for (let i = 0; i < 5; i++) {
            const angle = i * 2.4 + turn;
            berries.push({ x: x + Math.sin(angle) * 0.25, y: 0.42 + (i % 2) * 0.09, z: z + Math.cos(angle) * 0.25 });
          }
        }
      }
      for (const trunk of trunks) trunk.color = 0x70573e;
      for (const berry of berries) berry.color = 0xb96f63;
      mergedInstances(group, [
        { geometry: new THREE.CylinderGeometry(0.1, 0.16, 1, 5), items: trunks },
        { geometry: new THREE.DodecahedronGeometry(1, 0), items: rocks },
        { geometry: new THREE.IcosahedronGeometry(1, 0), items: bushes },
        { geometry: new THREE.IcosahedronGeometry(0.055, 0), items: berries },
      ], this.staticMaterial);
      const canopy = mergedInstances(group, [{ geometry: new THREE.ConeGeometry(1, 1, 6), items: [...crowns, ...upperCrowns] }], this.staticMaterial);
      if (canopy) { canopy.name = 'tree-canopy'; canopy.visible = this.foliageVisible; }
      this.resourceChunks.set(key, { signature, group });
    }
  }

  private buildStructures(world: World): void {
    clearGroup(this.structureGroup);
    const wallHeight = this.wallCutaway ? WORLD_SCALE.wallCutawayHeight : WORLD_SCALE.wallHeight;
    const walls: Placement[] = [], wallCaps: Placement[] = [], bedFrames: Placement[] = [], bedding: Placement[] = [], pillows: Placement[] = [], headboards: Placement[] = [];
    for (const structure of world.structures) {
      const { x, z } = structure;
      if (structure.kind === 'wall') {
        walls.push({ x, z, y: (wallHeight - 0.09) / 2 }); wallCaps.push({ x, z, y: wallHeight - 0.045 });
      } else {
        const cells = footprintCells(structure), last = cells[cells.length - 1]!;
        const cx = (x + last.x) / 2, cz = (z + last.z) / 2, ry = structure.orientation * Math.PI / 2;
        const length = structure.footprint === 'legacy-single' ? 0.93 : WORLD_SCALE.bedLength;
        bedFrames.push({ x: cx, z: cz, y: WORLD_SCALE.bedFrameHeight / 2 + 0.04, sx: WORLD_SCALE.bedWidth, sy: WORLD_SCALE.bedFrameHeight, sz: length, ry });
        bedding.push({ x: cx, z: cz, y: WORLD_SCALE.bedSurfaceHeight - 0.045, sx: WORLD_SCALE.bedWidth - 0.06, sy: 0.14, sz: length - 0.1, ry });
        pillows.push({ x: cx - Math.sin(ry) * length * 0.33, z: cz - Math.cos(ry) * length * 0.33, y: WORLD_SCALE.bedSurfaceHeight + 0.07, sx: 0.6, sy: 0.12, sz: 0.27, ry });
        headboards.push({ x: cx - Math.sin(ry) * (length / 2 - 0.05), z: cz - Math.cos(ry) * (length / 2 - 0.05), y: 0.35, sx: WORLD_SCALE.bedWidth, sy: 0.63, sz: 0.08, ry });
      }
    }
    instances(this.structureGroup, new THREE.BoxGeometry(0.96, wallHeight - 0.09, 0.96), material(0xa6916e), walls);
    instances(this.structureGroup, new THREE.BoxGeometry(1.01, 0.09, 1.01), material(0xc3af86), wallCaps);
    instances(this.structureGroup, new THREE.BoxGeometry(1, 1, 1), material(0x795d41), bedFrames);
    instances(this.structureGroup, new THREE.BoxGeometry(1, 1, 1), material(0xc7a977), bedding);
    instances(this.structureGroup, new THREE.BoxGeometry(1, 1, 1), material(0xe5d8b7), pillows);
    instances(this.structureGroup, new THREE.BoxGeometry(1, 1, 1), material(0x795d41), headboards);
  }

  private buildJobs(world: World): void {
    clearGroup(this.jobGroup);
    const wallHeight = this.wallCutaway ? WORLD_SCALE.wallCutawayHeight : WORLD_SCALE.wallHeight;
    const orders: Placement[] = [], blueprints: Placement[] = [], frames: Placement[] = [], progress: Placement[] = [];
    for (const job of world.jobs) {
      const cells = footprintCells(job), last = cells[cells.length - 1]!;
      for (const cell of cells) orders.push({ x: cell.x, y: 0.032, z: cell.z, color: job.status === 'active' ? 0xe7c17a : 0x99cfc3 });
      if (job.kind !== 'wall' && job.kind !== 'bed') continue;
      const x = (job.x + last.x) / 2, z = (job.z + last.z) / 2, ry = job.orientation * Math.PI / 2;
      const height = job.kind === 'wall' ? wallHeight : WORLD_SCALE.bedSurfaceHeight;
      const width = job.kind === 'wall' ? 0.92 : WORLD_SCALE.bedWidth;
      const length = job.kind === 'bed' && job.footprint !== 'legacy-single' ? WORLD_SCALE.bedLength : 0.92;
      blueprints.push({ x, z, y: height / 2, sx: width, sy: height, sz: length, ry });
      if (job.escrow.wood > 0) {
        // Four low corner posts distinguish a supplied frame from a bare plan.
        for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
          const lx = dx * (width / 2 - 0.06), lz = dz * (length / 2 - 0.06);
          frames.push({ x: x + lx * Math.cos(ry) + lz * Math.sin(ry), z: z + lz * Math.cos(ry) - lx * Math.sin(ry), y: 0.2, sx: 0.09, sy: 0.4, sz: 0.09 });
        }
      }
      const fraction = Math.floor(job.progress / JOB_DURATION[job.kind] * 20) / 20;
      if (fraction > 0) progress.push({ x, z, y: height * fraction / 2, sx: width - 0.06, sy: height * fraction, sz: length - 0.06, ry });
    }
    instances(this.jobGroup, new THREE.BoxGeometry(0.9, 0.025, 0.9), new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.48, depthWrite: false }), orders, false);
    instances(this.jobGroup, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicNodeMaterial({ color: 0xa7dbc9, wireframe: true, transparent: true, opacity: 0.65, depthWrite: false }), blueprints, false);
    instances(this.jobGroup, new THREE.BoxGeometry(1, 1, 1), material(0x9f7e52), frames);
    instances(this.jobGroup, new THREE.BoxGeometry(1, 1, 1), material(0xa6916e), progress);
  }

  private buildStorage(world: World): void {
    clearGroup(this.storageGroup);
    const cells: Placement[] = [], borders: Placement[] = [];
    for (const storage of world.stockpiles) {
      const color = !storage.filters.wood && !storage.filters.food ? 0x9b8980
        : storage.filters.wood && storage.filters.food ? 0x9ac6aa : storage.filters.wood ? 0xc1a373 : 0xc89080;
      cells.push({ x: storage.x, z: storage.z, y: 0.021, color });
      const shade = scratchColor.setHex(color).multiplyScalar(0.82 + storage.priority * 0.06).getHex();
      for (const dx of [-1, 1]) borders.push({ x: storage.x + dx * 0.465, z: storage.z, y: 0.028, sx: 0.025, sz: 0.95, color: shade });
      for (const dz of [-1, 1]) borders.push({ x: storage.x, z: storage.z + dz * 0.465, y: 0.028, sx: 0.95, sz: 0.025, color: shade });
    }
    instances(this.storageGroup, new THREE.BoxGeometry(0.94, 0.014, 0.94), new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }), cells, false);
    instances(this.storageGroup, new THREE.BoxGeometry(1, 0.015, 1), new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.76, depthWrite: false }), borders, false);
  }

  private updatePiles(world: World, newMap: boolean): void {
    if (newMap) {
      clearGroup(this.pileGroup);
      this.pileChunks.clear();
    }
    const jobById = new Map(world.jobs.map(job => [job.id, job]));
    type Bundle = { x: number; z: number; kind: MaterialKind; quantity: number; supplied: boolean };
    const cells = new Map<string, Bundle>();
    for (const pile of world.piles) {
      if (pile.owner.type === 'pawn') continue;
      const job = pile.owner.type === 'job' ? jobById.get(pile.owner.jobId) : undefined;
      if (pile.owner.type === 'job' && !job) continue;
      const position = pile.owner.type === 'ground' ? pile.owner : job!;
      const key = `${position.x}:${position.z}:${pile.kind}:${job ? 'job' : 'ground'}`;
      const bundle = cells.get(key);
      if (bundle) bundle.quantity += pile.quantity;
      else cells.set(key, { x: position.x, z: position.z, kind: pile.kind, quantity: pile.quantity, supplied: !!job });
    }
    const chunks = new Map<string, Bundle[]>();
    for (const bundle of cells.values()) {
      const key = `${Math.floor(bundle.x / WORLD_SCALE.chunkSize)}:${Math.floor(bundle.z / WORLD_SCALE.chunkSize)}`;
      const chunk = chunks.get(key);
      if (chunk) chunk.push(bundle); else chunks.set(key, [bundle]);
    }
    for (const [key, chunk] of this.pileChunks) if (!chunks.has(key)) {
      clearGroup(chunk.group); this.pileGroup.remove(chunk.group); this.pileChunks.delete(key);
    }
    for (const [key, bundles] of chunks) {
      const signature = bundles.map(bundle => `${bundle.x}:${bundle.z}:${bundle.kind}:${bundle.quantity}:${bundle.supplied}`).join('|');
      const previous = this.pileChunks.get(key);
      if (previous?.signature === signature) continue;
      const group = previous?.group ?? new THREE.Group();
      if (previous) clearGroup(group); else this.pileGroup.add(group);
      group.name = `Material piles ${key}`;
      const logs: Placement[] = [], ends: Placement[] = [], crates: Placement[] = [], food: Placement[] = [];
      for (const bundle of bundles) {
        const x = bundle.x + (bundle.kind === 'wood' ? -0.12 : 0.2), z = bundle.z + (bundle.supplied ? 0.16 : 0);
        const height = 0.12 + Math.min(1, bundle.quantity / MAX_STACK) * (WORLD_SCALE.pileMaxHeight - 0.12);
        if (bundle.kind === 'wood') {
          const rows = Math.max(1, Math.min(3, Math.ceil(bundle.quantity / 25)));
          for (let row = 0; row < rows; row++) for (let col = 0; col < 2; col++) {
            const y = 0.065 + row * 0.13, lz = z + (col - 0.5) * 0.145;
            logs.push({ x, z: lz, y, sx: WORLD_SCALE.pileWidth, sy: 0.12, sz: 0.12, color: row % 2 ? 0x9d794d : 0x896841 });
            ends.push({ x: x + WORLD_SCALE.pileWidth / 2 + 0.003, z: lz, y, sx: 0.012, sy: 0.095, sz: 0.095 });
          }
        } else {
          crates.push({ x, z, y: height / 2, sx: 0.5, sy: height, sz: 0.45 });
          for (const dx of [-0.12, 0.12]) for (const dz of [-0.11, 0.11]) food.push({ x: x + dx, z: z + dz, y: height + 0.025, sx: 0.18, sy: 0.1, sz: 0.16 });
        }
      }
      instances(group, new THREE.BoxGeometry(1, 1, 1), material(0xffffff), logs);
      instances(group, new THREE.BoxGeometry(1, 1, 1), material(0xc9ad77), ends, false);
      instances(group, new THREE.BoxGeometry(1, 1, 1), material(0x987e51), crates);
      instances(group, new THREE.BoxGeometry(1, 1, 1), material(0xba745a), food);
      this.pileChunks.set(key, { signature, group });
    }
  }

  private createPawnMesh(count: number): void {
    clearGroup(this.pawnGroup);
    const geometry = pawnGeometry();
    geometry.setAttribute('aFrom', new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
    geometry.setAttribute('aTo', new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
    geometry.setAttribute('aMotion', new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
    geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('aCargo', new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2));
    for (const name of ['aFrom', 'aTo', 'aMotion', 'aTint', 'aCargo']) (geometry.getAttribute(name) as THREE.InstancedBufferAttribute).setUsage(THREE.DynamicDrawUsage);
    const mat = material(0xffffff);
    mat.positionNode = Fn(() => {
      const bone = attribute('boneId', 'float');
      const pivot = attribute('bindPivot', 'vec3');
      const motion = attribute('aMotion', 'vec4');
      const pose = mix(attribute('aFrom', 'vec4'), attribute('aTo', 'vec4'), this.uBlend);
      const angle = float(0).toVar();
      const sign = float(1).toVar();
      If(bone.equal(3).or(bone.equal(4)), () => { sign.assign(-1); });
      If(bone.greaterThan(1.5), () => {
        angle.assign(sin(this.uTime.mul(9).add(motion.w)).mul(motion.x).mul(sign).mul(0.65));
        If(bone.lessThan(3.5), () => {
          angle.addAssign(sin(this.uTime.mul(12).add(motion.w)).mul(0.35).sub(0.8).mul(motion.y));
          If(attribute('aCargo', 'vec2').x.greaterThan(0.5), () => {
            angle.assign(float(-0.9).add(sin(this.uTime.mul(9).add(motion.w)).mul(motion.x).mul(0.06)));
            If(motion.z.greaterThan(1.5), () => { angle.assign(float(-1.3).add(sin(this.uTime.mul(4).add(motion.w)).mul(0.22))); });
          });
        });
      });
      const local = positionLocal.sub(pivot);
      const c = cos(angle), s = sin(angle);
      const animated = vec3(local.x, local.y.mul(c).sub(local.z.mul(s)), local.y.mul(s).add(local.z.mul(c))).add(pivot).toVar();
      If(motion.z.greaterThan(0.5).and(motion.z.lessThan(1.5)), () => {
        const y = animated.y.toVar();
        animated.y.assign(animated.z.add(0.19));
        animated.z.assign(float(0.65).sub(y));
      });
      const cy = cos(pose.w), sy = sin(pose.w);
      return vec3(animated.x.mul(cy).add(animated.z.mul(sy)), animated.y, animated.z.mul(cy).sub(animated.x.mul(sy))).mul(PAWN_MODEL_SCALE).add(pose.xyz);
    })();
    mat.colorNode = mix(attribute('color', 'vec3'), attribute('aTint', 'vec3'), attribute('dye', 'float'));
    const mesh = new THREE.Mesh(geometry, mat);
    // CPU bounds cannot follow the shader positions. Individual culling/LOD is a later measured optimization.
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'Colonists — procedural six-bone GPU rig';
    this.pawnMesh = mesh;
    this.pawnGroup.add(mesh);
    const cargo = cargoGeometry();
    for (const name of ['aFrom', 'aTo', 'aCargo', 'aMotion']) cargo.setAttribute(name, geometry.getAttribute(name));
    const cargoMat = material(0xffffff);
    cargoMat.colorNode = attribute('color', 'vec3');
    cargoMat.positionNode = Fn(() => {
      const pose = mix(attribute('aFrom', 'vec4'), attribute('aTo', 'vec4'), this.uBlend);
      const load = attribute('aCargo', 'vec2');
      const scale = float(0).toVar();
      If(attribute('cargoKind', 'float').equal(load.x), () => { scale.assign(load.y.mul(0.25).add(0.75)); });
      const height = float(WORLD_SCALE.carriedHeight).toVar();
      If(attribute('aMotion', 'vec4').z.greaterThan(1.5), () => { height.assign(sin(this.uTime.mul(4).add(attribute('aMotion', 'vec4').w)).mul(0.08).add(1.32)); });
      const local = positionLocal.mul(scale).add(vec3(0, height, WORLD_SCALE.carriedForward));
      const cy = cos(pose.w), sy = sin(pose.w);
      return vec3(local.x.mul(cy).add(local.z.mul(sy)), local.y, local.z.mul(cy).sub(local.x.mul(sy))).add(pose.xyz);
    })();
    this.cargoMesh = new THREE.Mesh(cargo, cargoMat);
    this.cargoMesh.name = 'Carried materials — shared GPU pawn poses';
    this.cargoMesh.frustumCulled = false;
    this.cargoMesh.castShadow = true;
    this.cargoMesh.receiveShadow = true;
    this.pawnGroup.add(this.cargoMesh);
  }

  private updatePawns(world: World, oldBlend: number, newMap: boolean): void {
    if (!this.pawnMesh || (this.pawnMesh.geometry.getAttribute('aFrom')?.count ?? 0) !== world.pawns.length) this.createPawnMesh(world.pawns.length);
    const geometry = this.pawnMesh!.geometry as THREE.InstancedBufferGeometry;
    const fromAttribute = geometry.getAttribute('aFrom') as THREE.InstancedBufferAttribute;
    const toAttribute = geometry.getAttribute('aTo') as THREE.InstancedBufferAttribute;
    const motion = geometry.getAttribute('aMotion') as THREE.InstancedBufferAttribute;
    const tint = geometry.getAttribute('aTint') as THREE.InstancedBufferAttribute;
    const cargo = geometry.getAttribute('aCargo') as THREE.InstancedBufferAttribute;
    const carried = new Map<number, World['piles'][number]>();
    for (const pile of world.piles) if (pile.owner.type === 'pawn') carried.set(pile.owner.pawnId, pile);
    const present = new Set<number>();
    world.pawns.forEach((pawn, index) => {
      present.add(pawn.id);
      const previous = newMap ? undefined : this.pawnVisuals.get(pawn.id);
      const from = previous ? previous.from.clone().lerp(previous.to, oldBlend) : new THREE.Vector4(pawn.x, 0, pawn.z, Math.PI * 0.2);
      let yaw = from.w;
      const dx = pawn.x - from.x, dz = pawn.z - from.z;
      if (dx * dx + dz * dz > 0.01) {
        const target = Math.atan2(dx, dz);
        yaw = from.w + Math.atan2(Math.sin(target - from.w), Math.cos(target - from.w));
      }
      const bedId = pawn.need?.kind === 'sleep' ? pawn.need.bedId : null;
      const bed = pawn.state === 'sleeping' && bedId !== null ? world.structures.find(item => item.id === bedId) : undefined;
      let px = pawn.x, pz = pawn.z, py = 0;
      if (bed) {
        const cells = footprintCells(bed), last = cells[cells.length - 1]!;
        px = (bed.x + last.x) / 2; pz = (bed.z + last.z) / 2; py = WORLD_SCALE.bedSurfaceHeight;
        const target = bed.orientation * Math.PI / 2;
        yaw = from.w + Math.atan2(Math.sin(target - from.w), Math.cos(target - from.w));
      }
      const to = new THREE.Vector4(px, py, pz, yaw);
      if (!previous) from.copy(to);
      this.pawnVisuals.set(pawn.id, { from, to });
      fromAttribute.setXYZW(index, from.x, from.y, from.z, from.w);
      toAttribute.setXYZW(index, to.x, to.y, to.z, to.w);
      motion.setXYZW(index, pawn.state === 'moving' ? 1 : 0, pawn.state === 'working' ? 1 : 0, pawn.state === 'sleeping' ? 1 : pawn.state === 'eating' ? 2 : 0, pawn.id * 1.7);
      scratchColor.setHex(PAWN_COLORS[index % PAWN_COLORS.length]);
      tint.setXYZ(index, scratchColor.r, scratchColor.g, scratchColor.b);
      const load = carried.get(pawn.id);
      cargo.setXY(index, load ? load.kind === 'wood' ? 1 : 2 : 0, load ? Math.min(1, load.quantity / CARRY_CAPACITY) : 0);
    });
    for (const id of this.pawnVisuals.keys()) if (!present.has(id)) this.pawnVisuals.delete(id);
    for (const attr of [fromAttribute, toAttribute, motion, tint, cargo]) attr.needsUpdate = true;
    geometry.instanceCount = world.pawns.length;
    (this.cargoMesh!.geometry as THREE.InstancedBufferGeometry).instanceCount = world.pawns.length;
  }

  private frame(now: number): void {
    if (this.disposed) return;
    const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.05) : 0;
    this.lastFrame = now;
    this.uBlend.value = this.snapshotDuration > 0 ? Math.min(1, Math.max(0, (performance.now() - this.snapshotAt) / this.snapshotDuration)) : 1;
    this.uTime.value = THREE.MathUtils.lerp(this.timeFrom, this.timeTo, this.uBlend.value);
    if (!this.areaDrag) { this.moveCamera(dt); this.controls.update(); }
    if (this.world) {
      const x = THREE.MathUtils.clamp(this.controls.target.x, 0, this.world.width - 1);
      const z = THREE.MathUtils.clamp(this.controls.target.z, 0, this.world.height - 1);
      this.camera.position.x += x - this.controls.target.x;
      this.camera.position.z += z - this.controls.target.z;
      this.controls.target.x = x; this.controls.target.z = z;
    }
    // Keep one bounded shadow region around the camera instead of diluting the
    // same shadow texture across an entire 128-cell map.
    this.sun.target.position.set(this.controls.target.x, 0, this.controls.target.z);
    this.sun.position.set(this.controls.target.x - 24, 45, this.controls.target.z + 25);
    if (this.selectedPawn !== null) {
      const visual = this.pawnVisuals.get(this.selectedPawn);
      this.selection.visible = !!visual;
      if (visual) this.selection.position.set(THREE.MathUtils.lerp(visual.from.x, visual.to.x, this.uBlend.value), 0.08, THREE.MathUtils.lerp(visual.from.z, visual.to.z, this.uBlend.value));
    }
    this.renderer.info.reset();
    this.renderer.render(this.scene, this.camera);
    this.stats.drawCalls = this.renderer.info.render.drawCalls;
    this.stats.triangles = this.renderer.info.render.triangles;
    this.frameCount++;
    if (now - this.lastStats >= 750) {
      this.stats.fps = Math.round(this.frameCount * 1000 / Math.max(1, now - this.lastStats));
      this.frameCount = 0; this.lastStats = now;
    }
  }

  private moveCamera(dt: number): void {
    if (document.querySelector('dialog[open]')) { this.keys.clear(); return; }
    let horizontal = 0, vertical = 0;
    if (this.keys.has('arrowleft') || this.keys.has('q') || this.keys.has('a')) horizontal--;
    if (this.keys.has('arrowright') || this.keys.has('d')) horizontal++;
    if (this.keys.has('arrowup') || this.keys.has('z') || this.keys.has('w')) vertical--;
    if (this.keys.has('arrowdown') || this.keys.has('s')) vertical++;
    if (!horizontal && !vertical) return;
    const forward = this.controls.target.clone().sub(this.camera.position).setY(0).normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const offset = right.multiplyScalar(horizontal).addScaledVector(forward, -vertical).normalize().multiplyScalar(dt * 12 / this.camera.zoom);
    this.camera.position.add(offset); this.controls.target.add(offset);
  }

  private pick(event: PointerEvent, clampToMap = false): Cell | null {
    if (!this.world) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.ground, this.hit)) return null;
    let x = Math.floor(this.hit.x + 0.5), z = Math.floor(this.hit.z + 0.5);
    if (clampToMap) { x = THREE.MathUtils.clamp(x, 0, this.world.width - 1); z = THREE.MathUtils.clamp(z, 0, this.world.height - 1); }
    if (x < 0 || z < 0 || x >= this.world.width || z >= this.world.height) return null;
    return { x, z };
  }
  private onPointerDown = (event: PointerEvent): void => {
    if (this.areaDrag) {
      if (event.button === 2) this.cancelDesignation();
      event.stopImmediatePropagation(); event.preventDefault(); return;
    }
    this.pointerDown = { x: event.clientX, y: event.clientY, button: event.button, pointerId: event.pointerId };
    this.renderer.domElement.focus({ preventScroll: true });
    const from = this.pick(event);
    if (event.button === 0 && event.isPrimary && from && isAreaAction(this.tool)) {
      event.stopImmediatePropagation(); event.preventDefault();
      this.areaDrag = { pointerId: event.pointerId, action: this.tool, from };
      this.controls.enabled = false; this.keys.clear();
      this.renderer.domElement.setPointerCapture(event.pointerId);
      this.hoverCell = from; this.areaSignature = ''; this.updateHover();
    }
  };
  private onPointerUp = (event: PointerEvent): void => {
    const drag = this.areaDrag;
    if (drag) {
      if (event.pointerId !== drag.pointerId || event.button !== 0) return;
      const to = this.pointerOnCanvas(event) ? this.pick(event, true) : null;
      this.cancelDesignation();
      if (to) this.onArea(drag.action, drag.from, to);
      return;
    }
    const down = this.pointerDown; this.pointerDown = null;
    if (!down || down.pointerId !== event.pointerId || down.button !== 0 || event.button !== 0 || Math.hypot(down.x - event.clientX, down.y - event.clientY) > 6) return;
    const cell = this.pick(event);
    if (!cell) return;
    if (this.tool === 'select') {
      const pawn = this.world?.pawns.find((p) => p.x === cell.x && p.z === cell.z);
      this.selectedPawn = pawn?.id ?? null;
      this.selection.visible = !!pawn;
    }
    this.onPick(cell.x, cell.z);
  };
  private onPointerMove = (event: PointerEvent): void => {
    if (this.areaDrag && event.pointerId !== this.areaDrag.pointerId) return;
    // A second mouse button changes `buttons` through pointermove, without a new pointerdown.
    if (this.areaDrag && (event.buttons & 2)) { event.preventDefault(); this.cancelDesignation(); return; }
    this.hoverCell = this.pointerOnCanvas(event) ? this.pick(event, !!this.areaDrag) : null;
    this.updateHover();
  };
  private pointerOnCanvas(event: PointerEvent): boolean {
    return document.elementFromPoint(event.clientX, event.clientY) === this.renderer.domElement;
  }
  private updateAreaPreview(): void {
    const drag = this.areaDrag, world = this.world, cell = this.hoverCell;
    if (!drag || !world) return;
    if (!cell) {
      this.hover.visible = false; if (this.areaMesh) this.areaMesh.visible = false;
      this.areaSignature = ''; this.onAreaPreview(null); return;
    }
    const signature = `${drag.action}:${drag.from.x}:${drag.from.z}:${cell.x}:${cell.z}`;
    if (signature === this.areaSignature) return;
    this.areaSignature = signature;
    this.areaIndex ??= buildAreaIndex(world);
    const result = queryArea(world, { type: 'area', action: drag.action, from: drag.from, to: cell }, this.areaIndex);
    if (!result.ok) return;
    const { bounds, cells, skipped } = result;
    const width = bounds.maxX - bounds.minX + 1, height = bounds.maxZ - bounds.minZ + 1;
    const color = drag.action === 'cancel' || drag.action === 'remove-stockpile' ? 0xf49b7c : 0x9de7c9;
    this.hover.visible = true; this.hover.scale.set(width, height, 1);
    this.hover.position.set((bounds.minX + bounds.maxX) / 2, 0.045, (bounds.minZ + bounds.maxZ) / 2);
    const hoverMat = this.hover.material as THREE.MeshBasicNodeMaterial;
    hoverMat.opacity = 0.12; hoverMat.color.setHex(cells.length ? color : 0xe46f58);
    if (cells.length && (!this.areaMesh || this.areaMesh.instanceMatrix.count < cells.length)) {
      this.disposeAreaMesh();
      const capacity = Math.min(world.width * world.height, 2 ** Math.ceil(Math.log2(Math.max(16, cells.length))));
      const mat = new THREE.MeshBasicNodeMaterial({ color, transparent: true, opacity: 0.48, depthWrite: false, side: THREE.DoubleSide });
      this.areaMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.86, 0.86).rotateX(-Math.PI / 2), mat, capacity);
      this.areaMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.areaMesh.renderOrder = 6;
      this.scene.add(this.areaMesh);
    }
    if (this.areaMesh) {
      this.areaMesh.visible = cells.length > 0; this.areaMesh.count = cells.length;
      (this.areaMesh.material as THREE.MeshBasicNodeMaterial).color.setHex(color);
      scratchObject.rotation.set(0, 0, 0); scratchObject.scale.set(1, 1, 1);
      for (let i = 0; i < cells.length; i++) {
        scratchObject.position.set(cells[i]! % world.width, 0.065, Math.floor(cells[i]! / world.width));
        scratchObject.updateMatrix(); this.areaMesh.setMatrixAt(i, scratchObject.matrix);
      }
      this.areaMesh.instanceMatrix.needsUpdate = true; this.areaMesh.computeBoundingSphere();
    }
    this.onAreaPreview({ width, height, eligible: cells.length, skipped });
  }
  private disposeAreaMesh(): void {
    if (!this.areaMesh) return;
    this.scene.remove(this.areaMesh); this.areaMesh.dispose(); this.areaMesh.geometry.dispose();
    (this.areaMesh.material as THREE.Material).dispose(); this.areaMesh = null;
  }
  private updateHover(): void {
    if (this.areaDrag) { this.updateAreaPreview(); return; }
    const cell = this.hoverCell;
    this.hover.visible = !!cell;
    if (!cell || !this.world) return;
    const cells = footprintCells({ ...cell, kind: this.tool === 'bed' ? 'bed' : 'wall', orientation: this.placementRotation });
    const last = cells[cells.length - 1]!;
    this.hover.scale.set(Math.abs(cell.x - last.x) + 1, Math.abs(cell.z - last.z) + 1, 1);
    this.hover.position.set((cell.x + last.x) / 2, this.world.tiles[cell.z * this.world.width + cell.x]?.terrain === 'water' ? WORLD_SCALE.waterSurface + 0.04 : 0.055, (cell.z + last.z) / 2);
    const validity = this.tool === 'wall' || this.tool === 'bed' || this.tool === 'chop' || this.tool === 'harvest'
      ? canDesignate(this.world, { type: 'designate', kind: this.tool, ...cell, orientation: this.placementRotation }) : undefined;
    const color = validity?.ok === false ? 0xe46f58 : this.tool === 'cancel' || this.tool === 'remove-stockpile' ? 0xe6876a : this.tool === 'select' ? 0xf9ebae : 0x9dd9ca;
    (this.hover.material as THREE.MeshBasicNodeMaterial).color.setHex(color);
    this.renderer.domElement.title = validity?.reason ?? '';
  }
  private onPointerLeave = (): void => {
    this.hoverCell = null; this.hover.visible = false;
    if (this.areaDrag) this.updateAreaPreview(); else this.pointerDown = null;
  };
  private onPointerCancel = (event: PointerEvent): void => {
    if (this.areaDrag?.pointerId === event.pointerId) this.cancelDesignation();
    else if (this.pointerDown?.pointerId === event.pointerId) this.pointerDown = null;
  };
  private onContextMenu = (event: Event): void => { event.preventDefault(); };
  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]')) return;
    if (event.target instanceof HTMLElement && (event.target.matches('input, textarea, select') || event.target.isContentEditable)) return;
    const key = event.key.toLowerCase();
    // Q/E rotate a bed in Architecte. Outside placement, Q retains AZERTY pan.
    if (this.tool === 'bed' && (key === 'q' || key === 'e')) return;
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'q', 'a', 'd', 'z', 'w', 's'].includes(key)) {
      this.keys.add(key); if (key.startsWith('arrow')) event.preventDefault();
    }
  };
  private onKeyUp = (event: KeyboardEvent): void => { this.keys.delete(event.key.toLowerCase()); };
  private onBlur = (): void => { this.keys.clear(); this.cancelDesignation(); };

  dispose(): void {
    if (this.disposed) return;
    this.cancelDesignation(); this.disposeAreaMesh();
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown, true);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerleave', this.onPointerLeave);
    canvas.removeEventListener('pointercancel', this.onPointerCancel);
    canvas.removeEventListener('lostpointercapture', this.onPointerCancel);
    canvas.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    for (const group of [this.terrainGroup, this.resourceGroup, this.structureGroup, this.jobGroup, this.storageGroup, this.pileGroup, this.pawnGroup]) clearGroup(group);
    this.pileChunks.clear();
    this.resourceChunks.clear();
    this.staticMaterial.dispose();
    this.waterMaterial.dispose();
    this.hover.geometry.dispose(); (this.hover.material as THREE.Material).dispose();
    this.selection.geometry.dispose(); (this.selection.material as THREE.Material).dispose();
    this.sun.shadow.dispose();
    void this.renderer.dispose();
    canvas.remove();
  }
}
