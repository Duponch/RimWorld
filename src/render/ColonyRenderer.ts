import { buildTerrain } from './TerrainLayer';
import { RockLayer } from './RockLayer';
import { MotionTimeline } from './MotionTimeline';
import type { PawnTrack } from '../bridge/motion-tracks';
import { OverviewLayer } from './OverviewLayer';
import { ITEM_DEFINITIONS, type ItemId } from '../sim/items';
import * as THREE from 'three/webgpu';
import { buildFurniture } from './FurnitureLayer';
import { PawnLayer } from './PawnLayer';
import { FrameMetrics } from './FrameMetrics';
import { BoxBatches } from './BoxBatches';
import { ResourceLayer } from './ResourceLayer';
import { clearGroup, material } from './primitives';
import type { Placement } from './primitives';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { World, MaterialKind, Orientation, AreaAction, Cell } from '../sim/types';
import { TICKS_PER_SECOND } from '../sim/types';
import { JOB_DURATION, footprintCells } from '../sim/definitions';
import { canDesignate } from '../sim/engine';
import { buildAreaIndex, isAreaAction, queryArea } from '../sim/designation';
import type { AreaIndex } from '../sim/designation';
import { WORLD_SCALE } from '../world/scale';

type VisualChunk = { signature: string; group: THREE.Group };

const scratchObject = new THREE.Object3D();
const scratchColor = new THREE.Color();

export class ColonyRenderer {
  readonly stats = { fps: 0, frameMs: 0, frameP95: 0, drawCalls: 0, triangles: 0 };
  private readonly frames = new FrameMetrics();
  private readonly overview = new OverviewLayer();
  private readonly timeline = new MotionTimeline();
  private hasTracks = false;
  private readonly pawns = new PawnLayer();
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
  private readonly pileChunks = new Map<string, VisualChunk>();
  private readonly staticMaterial = material(0xffffff, { vertexColors: true });
  private readonly waterMaterial = material(0xffffff, { vertexColors: true, roughness: 0.45, metalness: 0.08 });
  private readonly boxes = new BoxBatches();
  private readonly resources = new ResourceLayer(this.resourceGroup, this.staticMaterial);
  private readonly rocks = new RockLayer(this.staticMaterial);
  private readonly sun: THREE.DirectionalLight;
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
  private lastFrame = 0;
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
    this.scene.add(this.overview.group, this.terrainGroup, this.resourceGroup, this.structureGroup, this.jobGroup, this.storageGroup, this.pileGroup, this.pawns.group);
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
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
  }

  setWorld(world: World, resetPresentation = false, speed = 1, tracks?: PawnTrack[]): void {
    if (this.disposed) return;
    if (resetPresentation) this.cancelDesignation();
    this.areaIndex = undefined; this.areaSignature = '';
    const now = performance.now();
    const previousWorld = this.world;
    // Worker deltas keep immutable terrain/resources references stable. A changed
    // collection is inspected once; ordinary pawn snapshots do not scan the map.
    const nextTerrainKey = previousWorld?.tiles === world.tiles ? this.terrainKey
      : `${world.seed}:${world.width}:${world.height}:${world.tiles.map(t=>t.terrain==='rock'?'s':t.terrain[0]).join('')}`;
    const newMap = !previousWorld||previousWorld.seed!==world.seed||previousWorld.width!==world.width||previousWorld.height!==world.height;
    const groundChanged = newMap || this.terrainKey !== nextTerrainKey;
    if (newMap) this.cancelDesignation();
    // The worker epoch distinguishes a checkpoint from an ordinary delta even
    // if terrain content and simulation tick match a previous session.
    const resetPoses = resetPresentation || newMap || world.tick < (previousWorld?.tick ?? 0);
    this.world = world;
    if(tracks) {this.timeline.adopt(world.tick,speed,tracks,now,resetPoses || !this.hasTracks);this.hasTracks=true;}
    if(groundChanged) {
      this.terrainKey = nextTerrainKey;
      buildTerrain(world,this.terrainGroup,this.staticMaterial,this.waterMaterial);
      this.overview.rebuildTerrain(this.terrainGroup);
    }
    this.rocks.update(world,newMap);
    if(!this.rocks.group.parent)this.scene.add(this.rocks.group);
    if (newMap) {
      this.boxes.clear();
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
    else if (Math.floor(previousWorld.tick / 25) !== Math.floor(world.tick / 25)) this.resources.updateGrowth(world);
    const structureKey = world.structures.map((s) => `${s.id}:${s.kind}:${s.x}:${s.z}:${s.orientation}:${s.footprint}`).join('|');
    if (structureKey !== this.structureKey || newMap) { this.structureKey = structureKey; this.buildStructures(world); }
    // Quantize presentation of progression to avoid rebuilding static meshes for
    // every work tick. Saved simulation progress remains exact and authoritative.
    const jobKey = world.jobs.map((j) => `${j.id}:${j.kind}:${j.x}:${j.z}:${j.orientation}:${j.footprint}:${j.status}:${j.escrow.wood}:${j.kind === 'chop' || j.kind === 'harvest' || j.kind === 'cut' ? 0 : Math.floor(j.progress / JOB_DURATION[j.kind] * 20)}`).join('|');
    if (jobKey !== this.jobKey || newMap) { this.jobKey = jobKey; this.buildJobs(world); }
    const storageKey = world.stockpiles.map((s) => `${s.id}:${s.x}:${s.z}:${s.priority}:${s.filters.wood}:${s.filters.food}`).join('|');
    if (storageKey !== this.storageKey || newMap) { this.storageKey = storageKey; this.buildStorage(world); }
    this.updatePiles(world, newMap);
    const oldBlend = this.pawns.blend.value;
    this.snapshotDuration = previousWorld && world.tick >= previousWorld.tick ? Math.min(200, Math.max(70, now - this.snapshotAt)) : 0;
    this.snapshotAt = now;
    this.timeFrom = resetPoses ? world.tick / TICKS_PER_SECOND : this.pawns.time.value;
    this.timeTo = world.tick / TICKS_PER_SECOND;
    this.pawns.blend.value = resetPoses ? 1 : 0;
    this.pawns.update(world, resetPoses ? 1 : oldBlend, resetPoses);
    this.updateHover();
  }

  setTool(tool: string): void {
    if (tool !== this.tool) this.cancelDesignation();
    this.tool = tool;
    if (tool === 'bed' || tool === 'table') this.keys.delete('q');
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
    this.resources.setFoliageVisible(visible);
    this.overview.setFoliageVisible(visible);
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

  private updateResources(world: World, newMap: boolean): void { this.resources.update(world, newMap); this.overview.update(world,newMap); }

  private buildStructures(world: World): void { buildFurniture(world, this.structureGroup, this.wallCutaway, this.boxes); }

  private buildJobs(world: World): void {
    const wallHeight = this.wallCutaway ? WORLD_SCALE.wallCutawayHeight : WORLD_SCALE.wallHeight;
    const orders: Placement[] = [], blueprints: Placement[] = [], frames: Placement[] = [], progress: Placement[] = [];
    for (const job of world.jobs) {
      const cells = footprintCells(job), last = cells[cells.length - 1]!;
      for (const cell of cells) orders.push({ x: cell.x, y: 0.032, z: cell.z, color: job.status === 'active' ? 0xe7c17a : 0x99cfc3 });
      if (job.kind === 'chop' || job.kind === 'harvest' || job.kind === 'cut') continue;
      const x = (job.x + last.x) / 2, z = (job.z + last.z) / 2, ry = job.orientation * Math.PI / 2;
      const height = job.kind === 'wall' ? wallHeight : job.kind === 'table' ? WORLD_SCALE.tableHeight : job.kind === 'stool' ? WORLD_SCALE.stoolHeight : WORLD_SCALE.bedSurfaceHeight;
      const width = job.kind === 'wall' ? 0.92 : job.kind === 'table' ? WORLD_SCALE.tableWidth : job.kind === 'stool' ? WORLD_SCALE.stoolWidth : WORLD_SCALE.bedWidth;
      const length = job.kind === 'table' ? WORLD_SCALE.tableLength : job.kind === 'stool' ? WORLD_SCALE.stoolWidth : job.kind === 'bed' && job.footprint !== 'legacy-single' ? WORLD_SCALE.bedLength : 0.92;
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
    this.boxes.set(this.jobGroup, 'job-orders', orders.map(p => ({ ...p, sx: 0.9, sy: 0.025, sz: 0.9 })), 'overlay', false);
    this.boxes.set(this.jobGroup, 'job-plans', blueprints.map(p => ({ ...p, color: 0xa7dbc9 })), 'wire', false);
    this.boxes.set(this.jobGroup, 'job-solids', [...frames.map(p => ({ ...p, color: 0x9f7e52 })), ...progress.map(p => ({ ...p, color: 0xa6916e }))]);
  }

  private buildStorage(world: World): void {
    const cells: Placement[] = [], borders: Placement[] = [];
    for (const storage of world.stockpiles) {
      const color = !storage.filters.wood && !storage.filters.food ? 0x9b8980
        : storage.filters.wood && storage.filters.food ? 0x9ac6aa : storage.filters.wood ? 0xc1a373 : 0xc89080;
      cells.push({ x: storage.x, z: storage.z, y: 0.021, color });
      const shade = scratchColor.setHex(color).multiplyScalar(0.82 + storage.priority * 0.06).getHex();
      for (const dx of [-1, 1]) borders.push({ x: storage.x + dx * 0.465, z: storage.z, y: 0.028, sx: 0.025, sz: 0.95, color: shade });
      for (const dz of [-1, 1]) borders.push({ x: storage.x, z: storage.z + dz * 0.465, y: 0.028, sx: 0.95, sz: 0.025, color: shade });
    }
    this.boxes.set(this.storageGroup, 'storage-cells', cells.map(p => ({ ...p, sx: 0.94, sy: 0.014, sz: 0.94 })), 'storage', false);
    this.boxes.set(this.storageGroup, 'storage-borders', borders.map(p => ({ ...p, sy: 0.015 })), 'border', false);
  }

  private updatePiles(world: World, newMap: boolean): void {
    if (newMap) {
      clearGroup(this.pileGroup);
      this.pileChunks.clear();
    }
    const jobById = new Map(world.jobs.map(job => [job.id, job]));
    type Bundle = { x: number; z: number; kind: MaterialKind; item: ItemId; quantity: number; supplied: boolean };
    const cells = new Map<string, Bundle>();
    for (const pile of world.piles) {
      if (pile.owner.type === 'pawn') continue;
      const job = pile.owner.type === 'job' ? jobById.get(pile.owner.jobId) : undefined;
      if (pile.owner.type === 'job' && !job) continue;
      const position = pile.owner.type === 'ground' ? pile.owner : job!;
      const key = `${position.x}:${position.z}:${pile.item}:${job ? 'job' : 'ground'}`;
      const bundle = cells.get(key);
      if (bundle) bundle.quantity += pile.quantity;
      else cells.set(key, { x: position.x, z: position.z, kind: pile.kind, item: pile.item, quantity: pile.quantity, supplied: !!job });
    }
    const chunks = new Map<string, Bundle[]>();
    for (const bundle of cells.values()) {
      const key = `${Math.floor(bundle.x / WORLD_SCALE.chunkSize)}:${Math.floor(bundle.z / WORLD_SCALE.chunkSize)}`;
      const chunk = chunks.get(key);
      if (chunk) chunk.push(bundle); else chunks.set(key, [bundle]);
    }
    for (const [key, chunk] of this.pileChunks) if (!chunks.has(key)) {
      this.boxes.set(chunk.group, `pile:${key}`, []); chunk.signature = '';
    }
    for (const [key, bundles] of chunks) {
      const signature = bundles.map(bundle => `${bundle.x}:${bundle.z}:${bundle.item}:${bundle.quantity}:${bundle.supplied}`).join('|');
      const previous = this.pileChunks.get(key);
      if (previous?.signature === signature) continue;
      const group = previous?.group ?? new THREE.Group();
      if (!previous) this.pileGroup.add(group);
      group.name = `Material piles ${key}`;
      const logs: Placement[] = [], ends: Placement[] = [], crates: Placement[] = [], food: Placement[] = [];
      for (const bundle of bundles) {
        const x = bundle.x + (bundle.kind === 'wood' ? -0.12 : 0.2), z = bundle.z + (bundle.supplied ? 0.16 : bundle.item === 'berries' ? -0.24 : bundle.item === 'survival-meal' ? 0.24 : 0);
        const height = 0.12 + Math.min(1, bundle.quantity / ITEM_DEFINITIONS[bundle.item].stackLimit) * (WORLD_SCALE.pileMaxHeight - 0.12);
        if (bundle.kind === 'wood') {
          const rows = Math.max(1, Math.min(3, Math.ceil(bundle.quantity / 25)));
          for (let row = 0; row < rows; row++) for (let col = 0; col < 2; col++) {
            const y = 0.065 + row * 0.13, lz = z + (col - 0.5) * 0.145;
            logs.push({ x, z: lz, y, sx: WORLD_SCALE.pileWidth, sy: 0.12, sz: 0.12, color: row % 2 ? 0x9d794d : 0x896841 });
            ends.push({ x: x + WORLD_SCALE.pileWidth / 2 + 0.003, z: lz, y, sx: 0.012, sy: 0.095, sz: 0.095 });
          }
        } else {
          crates.push({ x, z, y: height / 2, sx: 0.5, sy: height, sz: 0.45 });
          for (const dx of [-0.12, 0.12]) for (const dz of [-0.11, 0.11]) food.push({ x: x + dx, z: z + dz, y: height + 0.025, sx: 0.18, sy: 0.1, sz: 0.16, color: ITEM_DEFINITIONS[bundle.item].color });
        }
      }
      this.boxes.set(group, `pile:${key}`, [...logs, ...ends.map(p => ({ ...p, color: 0xc9ad77 })), ...crates.map(p => ({ ...p, color: 0x987e51 })), ...food]);
      this.pileChunks.set(key, { signature, group });
    }
  }

  private readonly onVisibility = (): void => { this.frames.reset(); this.lastFrame = 0; };

  private frame(now: number): void {
    if (this.disposed) return;
    const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.05) : 0;
    this.lastFrame = now;
    this.pawns.blend.value = this.snapshotDuration > 0 ? Math.min(1, Math.max(0, (performance.now() - this.snapshotAt) / this.snapshotDuration)) : 1;
    this.pawns.time.value = THREE.MathUtils.lerp(this.timeFrom, this.timeTo, this.pawns.blend.value);
    if(this.hasTracks && this.world) {this.timeline.advance(now);this.pawns.time.value=(this.timeline.tick/TICKS_PER_SECOND)%(2*Math.PI);this.pawns.updateTravel(this.world,this.timeline);}
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
      const visual = this.pawns.visuals.get(this.selectedPawn);
      this.selection.visible = !!visual;
      if (visual) {const segment=this.hasTracks?this.timeline.segment(this.selectedPawn):undefined;const blend=segment?THREE.MathUtils.clamp((this.timeline.tick-segment.start)/(segment.end-segment.start),0,1):this.pawns.blend.value;this.selection.position.set(THREE.MathUtils.lerp(visual.from.x,visual.to.x,blend),0.08,THREE.MathUtils.lerp(visual.from.z,visual.to.z,blend));}
    }
    const cellPixels=this.host.clientHeight*this.camera.zoom/(this.camera.top-this.camera.bottom);
    const distant=this.overview.group.visible ? cellPixels<9 : cellPixels<7;
    this.overview.group.visible=distant;this.terrainGroup.visible=!distant;this.resourceGroup.visible=!distant;
    this.rocks.setDistant(distant);
    this.renderer.info.reset();
    this.renderer.render(this.scene, this.camera);
    this.stats.drawCalls = this.renderer.info.render.drawCalls;
    this.stats.triangles = this.renderer.info.render.triangles;
    this.frames.record(now, document.hidden);
    this.stats.fps = this.frames.fps;
    this.stats.frameMs = this.frames.meanMs;
    this.stats.frameP95 = this.frames.p95Ms;
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
    const cells = footprintCells({ ...cell, kind: this.tool === 'bed' || this.tool === 'table' || this.tool === 'stool' ? this.tool : 'wall', orientation: this.placementRotation });
    const last = cells[cells.length - 1]!;
    this.hover.scale.set(Math.abs(cell.x - last.x) + 1, Math.abs(cell.z - last.z) + 1, 1);
    this.hover.position.set((cell.x + last.x) / 2, this.world.tiles[cell.z * this.world.width + cell.x]?.terrain === 'water' ? WORLD_SCALE.waterSurface + 0.04 : 0.055, (cell.z + last.z) / 2);
    const validity = this.tool === 'wall' || this.tool === 'bed' || this.tool === 'table' || this.tool === 'stool' || this.tool === 'chop' || this.tool === 'harvest' || this.tool === 'cut'
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
    if ((this.tool === 'bed' || this.tool === 'table') && (key === 'q' || key === 'e')) return;
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
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.boxes.dispose();
    this.overview.dispose();
    this.rocks.dispose();
    this.resources.clear();
    for (const group of [this.terrainGroup, this.resourceGroup, this.structureGroup, this.jobGroup, this.storageGroup, this.pileGroup, this.pawns.group]) clearGroup(group);
    this.pileChunks.clear();
    this.staticMaterial.dispose();
    this.waterMaterial.dispose();
    this.hover.geometry.dispose(); (this.hover.material as THREE.Material).dispose();
    this.selection.geometry.dispose(); (this.selection.material as THREE.Material).dispose();
    this.sun.shadow.dispose();
    void this.renderer.dispose();
    canvas.remove();
  }
}
