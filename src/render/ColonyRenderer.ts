import { pileParts,type PileBundle } from './pile-parts';
import { corpseStage } from '../sim/corpses';
import { WildlifeLayer } from './WildlifeLayer';
import { NaturalResourcePresentation } from './NaturalResourcePresentation';
import { ProjectileLayer } from './ProjectileLayer';
import { EnvironmentLighting } from './EnvironmentLighting';
import { PresentationQueue } from './PresentationQueue';
import { MOTION_HISTORY_TICKS } from '../bridge/motion-tracks';
import { RoofLayer } from './RoofLayer';
import { sameTerrainSurface } from './terrain-state';
import { doorOrientations } from '../sim/door-rules';
import { DoorLayer } from './DoorLayer';
import { prepareShadowPipelines } from './shadow-preparation';
import { installCommand } from '../sim/furniture-commands';
import type { Structure } from '../sim/types';
import { buildJobMarkers } from './JobLayer';
import { jobDuration } from '../sim/farming';
import { travelHeight } from './furniture-motion';
import { pileSurfaces } from './pile-surfaces';
import { CropLayer } from './CropLayer';
import { PawnSelectionInput, type ScreenPawn, type SelectionGesture } from './PawnSelectionInput';
import { GrowingZoneLayer } from './GrowingZoneLayer';
import { buildTerrain } from './TerrainLayer';
import { RockLayer } from './RockLayer';
import { MotionTimeline } from './MotionTimeline';
import type { PawnTrack } from '../bridge/motion-tracks';
import { OverviewLayer } from './OverviewLayer';
import * as THREE from 'three/webgpu';
import { buildFurniture } from './FurnitureLayer';
import { PawnLayer } from './PawnLayer';
import { FrameMetrics } from './FrameMetrics';
import { BoxBatches } from './BoxBatches';
import { ResourceLayer } from './ResourceLayer';
import { clearGroup, material } from './primitives';
import type { Placement } from './primitives';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { World, Orientation, AreaAction, Cell } from '../sim/types';
import { TICKS_PER_SECOND } from '../sim/types';
import { calendarTick } from '../sim/calendar';
import { footprintCells } from '../sim/definitions';
import { canDesignate } from '../sim/engine';
import { buildAreaIndex, isAreaAction, queryArea } from '../sim/designation';
import type { AreaIndex } from '../sim/designation';
import { WORLD_SCALE } from '../world/scale';
import { CameraRig, type CameraMode } from './CameraRig';
import { DayNightLayer } from './DayNightLayer';
import { RecreationHints } from './RecreationHints';

type VisualChunk = { signature: string; group: THREE.Group };

const scratchObject = new THREE.Object3D();
const scratchColor = new THREE.Color();

export class ColonyRenderer {
  readonly stats = { fps: 0, frameMs: 0, frameP95: 0, drawCalls: 0, triangles: 0 };
  private readonly frames = new FrameMetrics();
  private readonly environmentLighting = new EnvironmentLighting();
  private readonly overview = new OverviewLayer(this.environmentLighting.configure);
  private readonly timeline = new MotionTimeline();
  private readonly presentation = new PresentationQueue();
  private received:{world:World;speed:number;tracks?:PawnTrack[]}|undefined;
  private hasTracks = false;
  private readonly projectiles = new ProjectileLayer();
  private readonly wildlife = new WildlifeLayer(this.environmentLighting.configure);
  private readonly pawns = new PawnLayer(this.environmentLighting.configure);
  readonly backend: string;
  private readonly renderer: THREE.WebGPURenderer;
  private readonly scene = new THREE.Scene();
  private readonly rig: CameraRig;
  private get camera(): THREE.OrthographicCamera | THREE.PerspectiveCamera { return this.rig.camera; }
  private get controls(): OrbitControls { return this.rig.controls; }
  private readonly terrainGroup = new THREE.Group();
  private readonly resourceGroup = new THREE.Group();
  private readonly roofs=new RoofLayer();
  private readonly doors=new DoorLayer(this.environmentLighting.configure);
  private readonly structureGroup = new THREE.Group();
  private readonly jobGroup = new THREE.Group();
  private readonly pileGroup = new THREE.Group();
  private readonly storageGroup = new THREE.Group();
  private readonly hover: THREE.Mesh;
  private readonly selectionInput: PawnSelectionInput;
  private selectedPawns:ReadonlySet<number>=new Set();
  onSelection: (gesture:SelectionGesture)=>void=()=>{};
  onContext: (cell:Cell,x:number,y:number,queue:boolean)=>void=()=>{};
  onInteractionCancel: ()=>void=()=>{};
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
  private readonly boxes = new BoxBatches(this.environmentLighting.configure);
  private readonly recreationHints = new RecreationHints(this.boxes);
  private readonly resources = new ResourceLayer(this.resourceGroup, this.staticMaterial);
  private readonly naturalPresentation = new NaturalResourcePresentation();
  private readonly crops = new CropLayer(this.staticMaterial);
  private readonly growing = new GrowingZoneLayer(this.boxes);
  private readonly rocks = new RockLayer(this.staticMaterial);
  private readonly daylight: DayNightLayer;
  private world: World | null = null;
  private structureKey = '';
  private jobKey = '';
  private storageKey = '';
  private tool = 'select';
  private furniturePlacement:Structure|undefined;
  setFurniturePlacement(object:Structure|undefined):void {this.furniturePlacement=object;}
  private placementRotation: Orientation = 0;
  private hoverCell: { x: number; z: number } | null = null;
  private wallCutaway = false;
  private lastFrame = 0;
  private snapshotAt = 0;
  private timeFrom = 0;
  private timeTo = 0;
  private snapshotDuration = 120;
  private disposed = false;
  private preparing = false;
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
    this.environmentLighting.configure(this.staticMaterial);
    this.environmentLighting.configure(this.waterMaterial);
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
    this.daylight = new DayNightLayer(this.scene);
    this.scene.add(this.wildlife.mesh,this.projectiles.mesh,this.roofs.surface,this.roofs.areas,this.doors.group,this.crops.group, this.growing.group, this.overview.group, this.terrainGroup, this.resourceGroup, this.structureGroup, this.jobGroup, this.storageGroup, this.pileGroup, this.pawns.group);
    this.rig = new CameraRig(renderer.domElement);
    const hoverMat = new THREE.MeshBasicNodeMaterial({ color: 0xf9ebae, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, forceSinglePass:true });
    // A zero-thickness cursor has no front/back transparency ordering.
    this.hover = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96), hoverMat);
    this.hover.rotation.x = -Math.PI / 2;
    this.hover.position.y = 0.08;
    this.hover.visible = false;
    this.hover.renderOrder = 5;
    this.scene.add(this.hover, this.recreationHints.group);
    this.selectionInput=new PawnSelectionInput(renderer.domElement,{
      enabled:()=>this.tool==='select'&&!document.querySelector('dialog[open]'),
      pawns:()=>this.screenPawns(),select:gesture=>this.onSelection(gesture),
      selected:()=>this.selectedPawns,
      canInspect:event=>{
        const c=this.pick(event),w=this.world;if(!c||!w)return false;
        const same=(p:Cell)=>p.x===c.x&&p.z===c.z;
        return w.packed.some(p=>p.owner.type==='ground'&&same(p.owner))||w.piles.some(p=>p.owner.type==='ground'&&same(p.owner))
          ||w.stockpiles.some(same)||w.resources.some(same)||w.structures.some(s=>footprintCells(s).some(same))||w.jobs.some(j=>footprintCells(j).some(same));
      },
      inspect:event=>{const cell=this.pick(event);if(cell)this.onPick(cell.x,cell.z);else this.onSelection({ids:[],additive:false,toggle:false});},
      lock:locked=>{this.controls.enabled=!locked;this.keys.clear();},
    });
    renderer.domElement.addEventListener('pointerdown', this.onPointerDown, true);
    renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    renderer.domElement.addEventListener('pointerleave', this.onPointerLeave);
    renderer.domElement.addEventListener('pointercancel', this.onPointerCancel);
    renderer.domElement.addEventListener('lostpointercapture', this.onPointerCancel);
    renderer.domElement.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKeyDown);
    // Menus stop bubbling keyboard events; release keys held before opening one.
    window.addEventListener('keyup', this.onKeyUp, true);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
  }

  setWorld(world: World, resetPresentation = false, speed = 1, tracks?: PawnTrack[]): void {
    if(this.disposed)return;
    const previous=this.received?.world;
    const reset=resetPresentation||!previous||world.tick<previous.tick||world.seed!==previous.seed||world.width!==previous.width||world.height!==previous.height;
    this.received={world,speed,tracks};
    this.projectiles.adopt(world,reset);
    if(document.hidden)return;
    if(tracks){this.timeline.adopt(world.tick,speed,tracks,performance.now(),reset||!this.hasTracks);this.hasTracks=true;}
    if(reset||!tracks){this.presentation.clear();this.applyWorld(world,reset);return;}
    this.presentation.push(world);
    // A background/stalled page must not retain an unlimited snapshot history.
    // Recovery replaces the whole presentation, never only one actor's path.
    if(this.presentation.size>64||world.tick-this.timeline.tick>MOTION_HISTORY_TICKS){this.presentation.clear();this.timeline.adopt(world.tick,speed,tracks,performance.now(),true);this.applyWorld(world,true);return;}
    const due=this.presentation.take(this.timeline.tick,performance.now());if(due)this.applyWorld(due);
  }

  private applyWorld(world: World, resetPresentation = false): void {
    if (this.disposed) return;
    if (resetPresentation) this.cancelDesignation();
    this.areaIndex = undefined; this.areaSignature = '';
    const now = performance.now();
    const previousWorld = this.world;
    // Worker deltas keep immutable terrain/resources references stable. A changed
    // collection is inspected once; ordinary pawn snapshots do not scan the map.
    const newMap = !previousWorld||previousWorld.seed!==world.seed||previousWorld.width!==world.width||previousWorld.height!==world.height||previousWorld.scenario?.id!==world.scenario?.id||previousWorld.scenario?.revision!==world.scenario?.revision||
      previousWorld.site?.hilliness!==world.site?.hilliness||previousWorld.site?.revision!==world.site?.revision;
    const groundChanged = !sameTerrainSurface(previousWorld,world);
    if (newMap) this.cancelDesignation();
    // The worker epoch distinguishes a checkpoint from an ordinary delta even
    // if terrain content and simulation tick match a previous session.
    const resetPoses = resetPresentation || newMap || world.tick < (previousWorld?.tick ?? 0);
    this.world = world;
    this.environmentLighting.update(world);
    if(groundChanged) {
      buildTerrain(world,this.terrainGroup,this.staticMaterial,this.waterMaterial);
      this.overview.rebuildTerrain(this.terrainGroup);
    }
    this.rocks.update(world,newMap);
    if(!this.rocks.group.parent)this.scene.add(this.rocks.group);
    if (newMap) {
      this.boxes.clear();
      const extent = Math.min(WORLD_SCALE.cameraSpan, Math.max(world.width, world.height));
      this.rig.configureMap(world.width, world.height, world.scenario?.landing);
      this.daylight.configureShadow(extent);
      this.resize();
    }
    if (previousWorld?.resources !== world.resources || newMap || Math.floor(previousWorld.tick / 25) !== Math.floor(world.tick / 25)) this.updateResources(world, newMap);
    const packageKey=(world.packed??[]).filter(p=>p.owner.type==='ground').map(p=>`${p.building.id}:${p.building.material}:${p.owner.type==='ground'?`${p.owner.x}:${p.owner.z}`:''}`).join('|');
    this.roofs.update(world,this.boxes,newMap);
    this.doors.update(world,this.wallCutaway,resetPoses);
    const doorAxes=doorOrientations(world);
    const structureKey = [...doorAxes].join(':') + packageKey + world.structures.map((s) => `${s.id}:${s.kind}:${s.material}:${s.x}:${s.z}:${s.orientation}:${s.footprint}:${s.medical}:${s.power?.on}:${s.fuel?s.fuel.ticks>0:''}`).join('|');
    if (structureKey !== this.structureKey || newMap) { this.structureKey = structureKey; this.buildStructures(world); }
    // Quantize presentation of progression to avoid rebuilding static meshes for
    // every work tick. Saved simulation progress remains exact and authoritative.
    const jobKey = world.jobs.map((j) => `${j.id}:${j.kind}:${j.material}:${j.x}:${j.z}:${j.orientation}:${j.footprint}:${j.status}:${j.construction}:${j.escrow.wood}:${j.kind === 'mine' || j.kind === 'chop' || j.kind === 'harvest' || j.kind === 'cut' || j.kind === 'sow' || j.kind === 'deconstruct' || j.kind==='repair' ? 0 : Math.floor(j.progress / jobDuration(world,j) * 20)}`).join('|');
    if (jobKey !== this.jobKey || newMap) { this.jobKey = jobKey; this.buildJobs(world); }
    const storageKey = `${world.home?.join(',')??''};`+world.stockpiles.map((s) => `${s.id}:${s.x}:${s.z}:${s.priority}:${s.filters.wood}:${s.filters.food}`).join('|');
    if (storageKey !== this.storageKey || newMap) { this.storageKey = storageKey; this.buildStorage(world); }
    if (newMap || previousWorld?.resources !== world.resources || Math.floor((previousWorld?.tick ?? -1) / 25) !== Math.floor(world.tick / 25)) this.crops.update(world, newMap);
    this.growing.update(world, newMap);
    this.updatePiles(world, newMap);
    const oldBlend = this.pawns.blend.value;
    this.snapshotDuration = previousWorld && world.tick >= previousWorld.tick ? Math.min(200, Math.max(70, now - this.snapshotAt)) : 0;
    this.snapshotAt = now;
    this.timeFrom = resetPoses ? world.tick / TICKS_PER_SECOND : this.pawns.time.value;
    this.timeTo = world.tick / TICKS_PER_SECOND;
    this.pawns.blend.value = resetPoses ? 1 : 0;
    this.pawns.update(world, resetPoses ? 1 : oldBlend, resetPoses);
    this.wildlife.update(world,this.hasTracks?this.timeline:undefined);
    this.updateHover();
  }

  setTool(tool: string): void {
    if (tool !== this.tool) this.cancelDesignation();
    const homeBefore=this.tool==='home'||this.tool==='remove-home';
    this.tool = tool;
    if(this.world&&(homeBefore||tool==='home'||tool==='remove-home'))this.buildStorage(this.world);
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
    const selecting=this.selectionInput.cancel();this.onInteractionCancel();
    const drag = this.areaDrag;
    this.areaDrag = null; this.pointerDown = null; this.areaSignature = ''; this.hoverCell = null;
    this.controls.enabled = true;
    if (drag && this.renderer.domElement.hasPointerCapture(drag.pointerId)) this.renderer.domElement.releasePointerCapture(drag.pointerId);
    if (this.areaMesh) this.areaMesh.visible = false;
    this.hover.visible = false;
    (this.hover.material as THREE.MeshBasicNodeMaterial).opacity = 0.55;
    this.onAreaPreview(null);
    return drag !== null || selecting;
  }

  /** Presentation only: hidden wall volume remains blocked in the simulation. */
  setRoofsVisible(visible:boolean):void {this.roofs.surface.visible=visible;}
  setRoofAreasVisible(visible:boolean):void {this.roofs.areas.visible=visible;}
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

  get cameraMode(): CameraMode { return this.rig.mode; }

  /** Warm both projections and resident LOD variants under the loading screen.
   * Do not defer the first overview pipeline to the player's first wheel zoom. */
  async preparePresentation(): Promise<void> {
    this.preparing = true;
    const culling = new Map<THREE.Object3D, boolean>();
    const distant = this.overview.group.visible;
    const restoreWildlife=this.wildlife.prepare();
    const restoreRoofs=this.roofs.prepare();
    const restoreDoors=this.doors.prepareForCompile();
    const restoreCrops = this.crops.prepareForCompile();
    try {
      // The double-sided cursor otherwise compiles both face variants on the
      // first map interaction. Include it behind the loading overlay.
      this.hover.visible = true;
      this.overview.group.visible = this.terrainGroup.visible = this.resourceGroup.visible = true;
      this.rocks.setDistant(false); this.rocks.mesh.visible = true;
      this.scene.traverse(object => { culling.set(object, object.frustumCulled); object.frustumCulled = false; });
      this.daylight.update(this.world ? calendarTick(this.world) : 0, this.controls.target);
      await this.renderer.compileAsync(this.scene, this.rig.orthographic);
      await this.renderer.compileAsync(this.scene, this.rig.perspective);
      await prepareShadowPipelines(this.renderer,this.scene,this.rig.orthographic,this.boxes);
    } finally {
      restoreWildlife();restoreRoofs();restoreDoors();restoreCrops();
      for (const [object, value] of culling) object.frustumCulled = value;
      this.overview.group.visible = distant; this.terrainGroup.visible = this.resourceGroup.visible = !distant;
      this.rocks.setDistant(distant); this.preparing = false;
      this.updateHover();
      this.frames.reset(); this.lastFrame = 0;
    }
  }

  toggleCameraMode(): CameraMode {
    this.cancelDesignation();
    this.rig.setMode(this.rig.mode === 'orthographic' ? 'perspective' : 'orthographic');
    return this.rig.mode;
  }

  focusPawn(id: number): void {
    const pawn = this.world?.pawns.find((item) => item.id === id)??this.world?.wildlife?.animals.find(a=>a.id===id);
    if (!pawn) return;
    const offset = this.camera.position.clone().sub(this.controls.target);
    this.controls.target.set(pawn.x, 0, pawn.z);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  setSelectedPawns(ids:ReadonlySet<number>):void {this.selectedPawns=new Set(ids);this.pawns.setSelected(ids);}

  /** Project lightweight actor proxies only for pointer gestures, using the
   * same confirmed edge as the GPU. Canopies don't prevent selecting a colon. */
  screenPawns():ScreenPawn[] {
    const rect=this.renderer.domElement.getBoundingClientRect(),result:ScreenPawn[]=[];
    for(const [id,visual] of this.pawns.visuals) {
      const segment=this.hasTracks?this.timeline.segment(id):undefined;
      const alpha=segment?THREE.MathUtils.clamp((this.timeline.tick-segment.start)/(segment.end-segment.start),0,1):this.pawns.blend.value;
      const position=new THREE.Vector3().lerpVectors(visual.from,visual.to,alpha);
      const distance=segment?THREE.MathUtils.lerp(segment.fromFraction??0,segment.toFraction??1,alpha):alpha;
      position.y=travelHeight(visual.from.y,visual.to.y,distance);
      const center=position.clone().add(new THREE.Vector3(0,.75,0)).project(this.camera);
      if(center.z < -1||center.z>1||Math.abs(center.x)>1||Math.abs(center.y)>1)continue;
      const head=position.clone().add(new THREE.Vector3(0,1.75,0)).project(this.camera);
      result.push({id,x:rect.left+(center.x+1)*rect.width/2,y:rect.top+(1-center.y)*rect.height/2,
        radius:Math.max(5,Math.min(38,Math.abs(head.y-center.y)*rect.height/2)),depth:center.z});
    }
    return result;
  }

  resize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.host.clientWidth), height = Math.max(1, this.host.clientHeight);
    this.rig.resize(width, height);
    this.renderer.setSize(width, height, false);
  }

  projectCell(x: number, z: number): { x: number; y: number } {
    this.camera.updateMatrixWorld();
    const projected = new THREE.Vector3(x, 0, z).project(this.camera);
    return { x: (projected.x + 1) * this.host.clientWidth / 2, y: (1 - projected.y) * this.host.clientHeight / 2 };
  }

  private updateResources(world: World, newMap: boolean): void {
    const view=this.naturalPresentation.read(world,newMap);if(!view)return;
    this.resources.update(view, newMap); this.overview.update(view,newMap);
  }

  private buildStructures(world: World): void { this.doors.update(world,this.wallCutaway);buildFurniture(world, this.structureGroup, this.wallCutaway, this.boxes); }

  private buildJobs(world: World): void { buildJobMarkers(world,this.jobGroup,this.wallCutaway,this.boxes); }

  private buildStorage(world: World): void {
    const cells: Placement[] = [], borders: Placement[] = [];
    if(this.tool==='home'||this.tool==='remove-home')for(const i of world.home??[])cells.push({x:i%world.width,z:Math.floor(i/world.width),y:.04,color:0x779ee6});
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
      // Reserve one empty batch per spatial chunk while the map is loading.
      // First material drops then reuse compiled objects and resident buffers.
      for(let z=0;z<world.height;z+=WORLD_SCALE.chunkSize)for(let x=0;x<world.width;x+=WORLD_SCALE.chunkSize) {
        const key=`${x/WORLD_SCALE.chunkSize}:${z/WORLD_SCALE.chunkSize}`,group=new THREE.Group();
        group.name=`Material piles ${key}`;this.pileGroup.add(group);
        this.boxes.set(group,`pile:${key}`,[]);this.pileChunks.set(key,{signature:'',group});
      }
    }
    const surfaces=pileSurfaces(world);
    const jobById = new Map(world.jobs.map(job => [job.id, job]));
    const cells = new Map<string, PileBundle>();
    for (const pile of world.piles) {
      if (pile.owner.type === 'pawn'||pile.owner.type==='equipment'||pile.owner.type==='apparel') continue;
      const job = pile.owner.type === 'job' ? jobById.get(pile.owner.jobId) : undefined;
      if (pile.owner.type === 'job' && !job) continue;
      const position = pile.owner.type === 'ground' ? pile.owner : job!;
      const key = `${position.x}:${position.z}:${pile.item}:${job ? 'job' : 'ground'}`;
      const bundle = cells.get(key);
      if (bundle) bundle.quantity += pile.quantity;
      else cells.set(key, { x: position.x, z: position.z, kind: pile.kind, item: pile.item, quantity: pile.quantity, supplied: !!job, surface:job?undefined:surfaces.get(position.z*world.width+position.x),...(pile.kind==='corpse'?{corpseStage:corpseStage(pile,world.tick),facing:pile.corpse?.facing??0}:{}) });
    }
    const chunks = new Map<string, PileBundle[]>();
    for (const bundle of cells.values()) {
      const key = `${Math.floor(bundle.x / WORLD_SCALE.chunkSize)}:${Math.floor(bundle.z / WORLD_SCALE.chunkSize)}`;
      const chunk = chunks.get(key);
      if (chunk) chunk.push(bundle); else chunks.set(key, [bundle]);
    }
    for (const [key, chunk] of this.pileChunks) if (!chunks.has(key)&&chunk.signature!=='') {
      this.boxes.set(chunk.group, `pile:${key}`, []); chunk.signature = '';
    }
    for (const [key, bundles] of chunks) {
      const signature = bundles.map(bundle => `${bundle.x}:${bundle.z}:${bundle.item}:${bundle.quantity}:${bundle.supplied}:${bundle.corpseStage??''}:${bundle.facing??0}:${bundle.surface?Object.values(bundle.surface).join(','):'ground'}`).join('|');
      const previous = this.pileChunks.get(key);
      if (previous?.signature === signature) continue;
      const group = previous?.group ?? new THREE.Group();
      if (!previous) this.pileGroup.add(group);
      group.name = `Material piles ${key}`;
      this.boxes.set(group, `pile:${key}`, pileParts(bundles));
      this.pileChunks.set(key, { signature, group });
    }
  }

  private readonly onVisibility = (): void => {
    this.frames.reset();this.lastFrame=0;
    if(!document.hidden&&this.received){const r=this.received;this.setWorld(r.world,true,r.speed,r.tracks);}
  };

  private frame(now: number): void {
    if (this.disposed || this.preparing) return;
    if(this.hasTracks){this.timeline.advance(now);const due=this.presentation.take(this.timeline.tick,now);if(due)this.applyWorld(due);}
    const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.05) : 0;
    this.lastFrame = now;
    this.pawns.blend.value = this.snapshotDuration > 0 ? Math.min(1, Math.max(0, (performance.now() - this.snapshotAt) / this.snapshotDuration)) : 1;
    this.pawns.time.value = THREE.MathUtils.lerp(this.timeFrom, this.timeTo, this.pawns.blend.value);
    if(this.hasTracks && this.world) {this.pawns.time.value=(this.timeline.tick/TICKS_PER_SECOND)%(2*Math.PI);this.pawns.updateTravel(this.world,this.timeline);}
    if(this.world)this.wildlife.update(this.world,this.hasTracks?this.timeline:undefined);
    if (!this.areaDrag && !this.selectionInput.active) { this.moveCamera(dt); this.controls.update(); }
    if (this.world) {
      const x = THREE.MathUtils.clamp(this.controls.target.x, 0, this.world.width - 1);
      const z = THREE.MathUtils.clamp(this.controls.target.z, 0, this.world.height - 1);
      this.camera.position.x += x - this.controls.target.x;
      this.camera.position.z += z - this.controls.target.z;
      this.controls.target.x = x; this.controls.target.z = z;
    }
    // Share the confirmed presentation clock with pawn motion. Loading a save
    // restores the sky; pausing cannot continue an independent wall-clock sun.
    const skyTick = this.hasTracks ? this.timeline.tick : THREE.MathUtils.lerp(this.timeFrom, this.timeTo, this.pawns.blend.value) * TICKS_PER_SECOND;
    this.doors.tick.value=skyTick;this.projectiles.present(skyTick);
    this.daylight.update(this.world?calendarTick(this.world,skyTick):skyTick, this.controls.target);
    const cellPixels=this.rig.pixelsPerCell(this.host.clientHeight);
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
    // The hidden management tables can contain hundreds of people. Avoid a
    // document-wide modal query every frame when there is no keyboard motion.
    if (!this.keys.size) return;
    if (this.host.closest('[inert]') || document.querySelector('dialog[open]')) { this.keys.clear(); return; }
    let horizontal = 0, vertical = 0;
    if (this.keys.has('arrowleft') || this.keys.has('q') || this.keys.has('a')) horizontal--;
    if (this.keys.has('arrowright') || this.keys.has('d')) horizontal++;
    if (this.keys.has('arrowup') || this.keys.has('z') || this.keys.has('w')) vertical--;
    if (this.keys.has('arrowdown') || this.keys.has('s')) vertical++;
    if (!horizontal && !vertical) return;
    const forward = this.controls.target.clone().sub(this.camera.position).setY(0).normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const offset = right.multiplyScalar(horizontal).addScaledVector(forward, -vertical).normalize().multiplyScalar(dt * 12 * this.rig.span / (WORLD_SCALE.cameraSpan * 1.06));
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
    this.onInteractionCancel();
    this.renderer.domElement.focus({preventScroll:true});
    if(this.selectionInput.down(event))return;
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
    if(this.selectionInput.up(event))return;
    const drag = this.areaDrag;
    if (drag) {
      if (event.pointerId !== drag.pointerId || event.button !== 0) return;
      const to = this.pointerOnCanvas(event) ? this.pick(event, true) : null;
      this.cancelDesignation();
      if (to) this.onArea(drag.action, drag.from, to);
      return;
    }
    const down = this.pointerDown; this.pointerDown = null;
    if(down&&down.button===2&&event.button===2&&down.pointerId===event.pointerId&&this.tool==='select'&&Math.hypot(down.x-event.clientX,down.y-event.clientY)<=6) {
      const cell=this.pick(event);if(cell)this.onContext(cell,event.clientX,event.clientY,event.shiftKey);return;
    }
    if (!down || down.pointerId !== event.pointerId || down.button !== 0 || event.button !== 0 || Math.hypot(down.x - event.clientX, down.y - event.clientY) > 6) return;
    const cell = this.pick(event);
    if (!cell) return;
    this.onPick(cell.x, cell.z);
  };
  private onPointerMove = (event: PointerEvent): void => {
    if(this.selectionInput.move(event))return;
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
      const mat = new THREE.MeshBasicNodeMaterial({ color, transparent: true, opacity: 0.48, depthWrite: false, side: THREE.DoubleSide, forceSinglePass:true });
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
    this.recreationHints.update(this.world, cell && (this.tool==='horseshoes'||this.tool==='select'&&this.world?.structures.some(s=>s.kind==='horseshoes'&&s.x===cell.x&&s.z===cell.z)) ? cell : undefined);
    const cooler=this.tool==='select'?this.world?.structures.find(s=>s.kind==='cooler'&&s.x===cell?.x&&s.z===cell?.z):undefined;
    if(cell&&(this.tool==='cooler'||cooler))this.recreationHints.cooler(cell,cooler?.orientation??this.placementRotation);
    this.hover.visible = !!cell;
    if (!cell || !this.world) return;
    const cells = footprintCells({ ...cell, kind: this.tool==='install'&&this.furniturePlacement?this.furniturePlacement.kind:this.tool === 'wood-generator' || this.tool === 'research-bench' || this.tool === 'tailor-bench' || this.tool === 'fueled-stove' || this.tool === 'electric-stove' || this.tool === 'butcher-table' || this.tool === 'stonecutter' || this.tool === 'bed' || this.tool === 'table' || this.tool === 'stool' ? this.tool : 'wall', orientation: this.placementRotation });
    const minX=Math.min(...cells.map(c=>c.x)),maxX=Math.max(...cells.map(c=>c.x)),minZ=Math.min(...cells.map(c=>c.z)),maxZ=Math.max(...cells.map(c=>c.z));
    this.hover.scale.set(maxX-minX+1, maxZ-minZ+1, 1);
    this.hover.position.set((minX+maxX)/2, this.world.tiles[cell.z * this.world.width + cell.x]?.terrain === 'water' ? WORLD_SCALE.waterSurface + 0.04 : 0.055, (minZ+maxZ)/2);
    const validity = this.tool==='install'&&this.furniturePlacement?installCommand(this.world,{type:'install',structureId:this.furniturePlacement.id,...cell,orientation:this.furniturePlacement.kind==='standing-lamp'?0:this.placementRotation},true):this.tool === 'cooler' || this.tool === 'research-bench' || this.tool === 'tailor-bench' || this.tool === 'fueled-stove' || this.tool === 'electric-stove' || this.tool === 'butcher-table' || this.tool === 'butcher-spot' || this.tool === 'crafting-spot'||this.tool === 'wood-generator'||this.tool === 'standing-lamp'||this.tool === 'passive-cooler'||this.tool === 'door' || this.tool === 'stonecutter'||this.tool === 'mine'||this.tool === 'uninstall'||this.tool === 'wall' || this.tool === 'bed' || this.tool === 'table' || this.tool === 'stool' || this.tool === 'campfire' || this.tool === 'horseshoes' || this.tool === 'chop' || this.tool === 'harvest' || this.tool === 'cut'
      ? canDesignate(this.world, { type: 'designate', kind: this.tool, ...cell, ...(this.tool==='cooler'||this.tool==='fueled-stove'||this.tool==='electric-stove'||this.tool==='wood-generator'||this.tool==='standing-lamp'?{material:'steel' as const}:this.tool==='passive-cooler'||this.tool==='butcher-table'?{material:'wood' as const}:{}), orientation: this.tool==='wood-generator'||this.tool==='standing-lamp'||this.tool==='door'||this.tool==='passive-cooler'?0:this.placementRotation }) : undefined;
    const color = validity?.ok === false ? 0xe46f58 : this.tool === 'cancel' || this.tool === 'remove-stockpile' ? 0xe6876a : this.tool === 'select' ? 0xf9ebae : 0x9dd9ca;
    (this.hover.material as THREE.MeshBasicNodeMaterial).color.setHex(color);
    this.renderer.domElement.title = validity?.reason ?? '';
  }
  private onPointerLeave = (): void => {
    this.recreationHints.group.visible=false;
    this.hoverCell = null; this.hover.visible = false;
    if (this.areaDrag) this.updateAreaPreview(); else this.pointerDown = null;
  };
  private onPointerCancel = (event: PointerEvent): void => {
    if(this.selectionInput.active){this.selectionInput.cancel();return;}
    if (this.areaDrag?.pointerId === event.pointerId) this.cancelDesignation();
    else if (this.pointerDown?.pointerId === event.pointerId) this.pointerDown = null;
  };
  private onContextMenu = (event: Event): void => { event.preventDefault(); };
  private onKeyDown = (event: KeyboardEvent): void => {
    if (this.host.closest('[inert]')) { this.keys.clear(); return; }
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]')) return;
    if (event.target instanceof HTMLElement && (event.target.matches('input, textarea, select') || event.target.isContentEditable)) return;
    const key = event.key.toLowerCase();
    // Q/E rotate a bed in Architecte. Outside placement, Q retains AZERTY pan.
    if ((this.tool === 'cooler' || this.tool === 'install' || this.tool === 'bed' || this.tool === 'table' || this.tool === 'campfire' || this.tool === 'research-bench' || this.tool === 'tailor-bench' || this.tool === 'fueled-stove' || this.tool === 'electric-stove' || this.tool === 'butcher-table' || this.tool === 'stonecutter' || this.tool === 'butcher-spot' || this.tool === 'crafting-spot') && (key === 'q' || key === 'e')) return;
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'q', 'a', 'd', 'z', 'w', 's'].includes(key)) {
      this.keys.add(key); if (key.startsWith('arrow')) event.preventDefault();
    }
  };
  private onKeyUp = (event: KeyboardEvent): void => { this.keys.delete(event.key.toLowerCase()); };
  private onBlur = (): void => { this.keys.clear(); this.cancelDesignation(); };

  dispose(): void {
    this.selectionInput.dispose();
    if (this.disposed) return;
    this.cancelDesignation(); this.disposeAreaMesh();
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.rig.dispose();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown, true);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerleave', this.onPointerLeave);
    canvas.removeEventListener('pointercancel', this.onPointerCancel);
    canvas.removeEventListener('lostpointercapture', this.onPointerCancel);
    canvas.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp, true);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.boxes.dispose();
    this.overview.dispose();
    this.rocks.dispose();
    this.crops.dispose();
    this.resources.clear();
    this.doors.dispose();this.projectiles.dispose();
    this.wildlife.mesh.geometry.dispose();(this.wildlife.mesh.material as THREE.Material).dispose();
    for (const group of [this.terrainGroup, this.resourceGroup, this.structureGroup, this.jobGroup, this.storageGroup, this.pileGroup, this.pawns.group]) clearGroup(group);
    this.pileChunks.clear();
    this.staticMaterial.dispose();
    this.waterMaterial.dispose();
    this.hover.geometry.dispose(); (this.hover.material as THREE.Material).dispose();
    this.daylight.dispose();
    this.environmentLighting.dispose();
    void this.renderer.dispose();
    canvas.remove();
  }
}
