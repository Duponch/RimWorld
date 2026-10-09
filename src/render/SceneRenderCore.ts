import { DeepResourceLayer } from './DeepResourceLayer';
import { AreaPreviewLayer } from './AreaPreviewLayer';
import { ConstructionPreviewLayer } from './ConstructionPreviewLayer';
import type { ConstructionPreviewSpec } from './construction-preview-parts';
import { HygieneLayer } from './HygieneLayer';

import { pawnBodyLocation } from '../sim/human-corpses';
import type { BuildableFloorKind } from '../sim/flooring';
import type { ConstructionMaterial } from '../sim/construction-materials';
import { WindLayer } from './WindLayer';
import { pileParts,type PileBundle } from './pile-parts';
import { corpseStage } from '../sim/corpses';
import { corpseVisualMask } from './corpse-presentation';
import { WildlifeLayer } from './WildlifeLayer';
import { MechanoidLayer } from './MechanoidLayer';
import { RopeLayer } from './RopeLayer';
import { NaturalResourcePresentation } from './NaturalResourcePresentation';
import { SceneResourceIndex, readSceneResourceFrame, type SceneResourceFrame } from './scene-resource-index';
import { ProjectileLayer } from './ProjectileLayer';
import { EnvironmentLighting } from './EnvironmentLighting';
import { PresentationQueue } from './PresentationQueue';
import { MOTION_HISTORY_TICKS } from '../bridge/motion-tracks';
import { RoofLayer } from './RoofLayer';
import { terrainSurfaceChanges,terrainTileChanges } from './terrain-state';
import { doorOrientations } from '../sim/door-rules';
import { DoorLayer } from './DoorLayer';
import { TimberCladdingLayer } from './TimberCladdingLayer';
import { prepareShadowPipelines } from './shadow-preparation';
import { PausedShadowCache } from './PausedShadowCache';
import { installCommand } from '../sim/furniture-commands';
import type { Structure } from '../sim/types';
import { buildJobMarkers } from './JobLayer';
import { jobDuration } from '../sim/farming';
import { travelHeight } from './furniture-motion';
import { pileSurfaces } from './pile-surfaces';
import { CropLayer } from './CropLayer';
import type { ScreenPawn, SelectionGesture } from './PawnSelectionInput';
import { FireLayer } from './FireLayer';
import { GrowingZoneLayer } from './GrowingZoneLayer';
import { buildTerrain, copyTerrainPaintRect, createTerrainPaintTexture, patchTerrainPaintTexture, singleTerrainPaintPatchRect, syncTerrainPaintUvs, TERRAIN_PAINT_PIXELS_PER_CELL, type TerrainPaintPatchRect } from './TerrainLayer';
import { PaintedWater } from './PaintedWater';
import { WeatherCloudLayer } from './WeatherCloudLayer';
import { OrbitalDeliveryLayer } from './OrbitalDeliveryLayer';
import { PodRescueLayer } from './PodRescueLayer';
import { WeatherPrecipitationLayer } from './WeatherPrecipitationLayer';
import { weatherRainRate, weatherSnowRate } from '../sim/weather';
import { visualWindDirection } from './visual-weather';
import { RockLayer } from './RockLayer';
import { MotionTimeline } from './MotionTimeline';
import type { PawnTrack } from '../bridge/motion-tracks';
import { OverviewLayer } from './OverviewLayer';
import * as THREE from 'three/webgpu';
import { FurniturePresentation } from './FurnitureLayer';
import { PawnLayer } from './PawnLayer';
import { FrameMetrics } from './FrameMetrics';
import { BoxBatches } from './BoxBatches';
import { ResourceLayer } from './ResourceLayer';
import { clearGroup, material } from './primitives';
import type { Placement } from './primitives';

import type { World, Orientation, AreaAction, Cell, JobKind } from '../sim/types';
import { TICKS_PER_SECOND } from '../sim/types';
import { windIntensity } from '../sim/wind-rules';
import { calendarTick } from '../sim/calendar';
import { footprintCells,STRUCTURE_DEFINITIONS } from '../sim/definitions';
import { buildConstructionCellIndex, canDesignate, type ConstructionCellIndex } from '../sim/engine';
import { buildAreaIndex, isAreaAction, queryArea } from '../sim/designation';
import { constructionLineCells, isLineBuildKind, type LineBuildKind } from '../sim/construction-line';
import type { AreaIndex } from '../sim/designation';
import { WORLD_SCALE } from '../world/scale';
import type { CameraMode } from './CameraRig';
import { cameraClipNear } from './camera-clip';
import { DayNightLayer } from './DayNightLayer';
import { RecreationHints } from './RecreationHints';
import { PlantClusterLayer } from './PlantClusterLayer';
import { isClusterPlantSpecies,isResidentCrop } from './flora-presentation';
import { DesignationIconLayer } from './DesignationIconLayer';
import { LandscapeBatch } from './LandscapeBatch';
import { ActionFeedbackLayer } from './ActionFeedbackLayer';
import { ActionVfxLayer } from './ActionVfxLayer';
import { BrawlCloudLayer } from './BrawlCloudLayer';
import { StructureVfxLayer } from './StructureVfxLayer';
import { MiniTurretLayer } from './MiniTurretLayer';
import { miniTurretRadiusCells, MINI_TURRET_DISPLAY_RANGE, MINI_TURRET_DISPLAY_BOMB_RADIUS } from '../sim/mini-turret-presentation';

import { createStylizedSurfaceTexture } from './stylized-surfaces';
import { GpuGroundGrassLayer } from './GpuGroundGrassLayer';
import { storageZonePlacements } from './storage-zone-presentation';
import { HomePresentationSignature, StoragePresentationSignature, StructurePresentationSignature } from './presentation-signatures';
import { mapObjectCells,mapObjectsAt,sameMapObject,type MapObjectSelection } from '../ui/map-object-selection';

import type {SceneRenderHostPort,SceneCameraPort,RendererLifetime} from './scene-render-ports';
type VisualChunk = { signature: string; group: THREE.Group };

export interface AudioFrameView {
  tick: number;
  paused: boolean;
  camera: { x: number; y: number; z: number; targetX: number; targetZ: number; span: number; mode: CameraMode };
}


function isNaturalSceneWorld(value:World|{changed:boolean}):value is World {
  return Object.hasOwn(value,'resources');
}

export class SceneRenderCore {
  readonly stats = { fps: 0, frameMs: 0, frameP95: 0, drawCalls: 0, triangles: 0 };
  protected readonly frames = new FrameMetrics();
  protected viewportWidth=1;
  protected viewportHeight=1;
  protected readonly environmentLighting = new EnvironmentLighting();
  protected readonly overview = new OverviewLayer(this.environmentLighting.configure);
  protected readonly timeline = new MotionTimeline();
  protected readonly presentation = new PresentationQueue();
  protected received:{world:World;speed:number;tracks?:PawnTrack[];immutableSnapshot:boolean}|undefined;
  protected immutableSnapshot=false;
  protected readonly immutableWorlds=new WeakSet<World>();
  protected hasTracks = false;
  protected readonly deepResources = new DeepResourceLayer();
  protected readonly hygiene = new HygieneLayer(this.environmentLighting.configure);
  protected selectedFloor:BuildableFloorKind|undefined;
  protected constructionMaterial:ConstructionMaterial|undefined;
  protected readonly fires = new FireLayer();
  protected readonly wind = new WindLayer(this.environmentLighting.configure);
  protected readonly projectiles = new ProjectileLayer();
  protected readonly wildlife = new WildlifeLayer(this.environmentLighting.configure);
  protected readonly mechanoids = new MechanoidLayer(this.environmentLighting.configure);
  protected readonly ropes = new RopeLayer();
  protected readonly pawns = new PawnLayer(this.environmentLighting.configure);
  protected readonly actionFeedback = new ActionFeedbackLayer(this.pawns);
  protected readonly actionVfx = new ActionVfxLayer(this.pawns);
  protected readonly brawlCloud = new BrawlCloudLayer(this.pawns);
  protected readonly structureVfx = new StructureVfxLayer();
  protected readonly turretTops=new MiniTurretLayer();
  protected turretPreviewSignature='';
  protected turretPreviewVisible=false;
  protected readonly orbitalDelivery = new OrbitalDeliveryLayer(this.environmentLighting.configure);
  protected readonly podRescue = new PodRescueLayer(this.environmentLighting.configure);

  readonly backend: string;
  protected readonly renderer: THREE.WebGPURenderer;
  protected readonly scene = new THREE.Scene();
  protected readonly landscape = new LandscapeBatch();
  protected grass: GpuGroundGrassLayer | null = null;
  protected readonly rig: SceneCameraPort;
  protected get camera(): THREE.OrthographicCamera | THREE.PerspectiveCamera { return this.rig.camera; }
  protected get controls(): SceneCameraPort['controls'] { return this.rig.controls; }
  protected readonly terrainGroup = new THREE.Group();
  protected readonly resourceGroup = new THREE.Group();
  protected readonly roofs=new RoofLayer(this.environmentLighting.configure);
  protected readonly doors=new DoorLayer(this.environmentLighting.configure);
  protected readonly timber=new TimberCladdingLayer(this.environmentLighting.configure);
  protected readonly structureGroup = new THREE.Group();
  protected readonly jobGroup = new THREE.Group();
  protected readonly pileGroup = new THREE.Group();
  protected readonly storageGroup = new THREE.Group();
  protected readonly hover: THREE.Mesh;
  protected readonly objectSelection: THREE.Mesh;
  protected selectedObject:MapObjectSelection|undefined;
  protected objectSelectionSignature='';

  protected selectedPawns:ReadonlySet<number>=new Set();
  onSelection: (gesture:SelectionGesture)=>void=()=>{};
  onHover: (cell:Cell|null)=>void=()=>{};
  onContext: (cell:Cell,x:number,y:number,queue:boolean,targetId?:number)=>void=()=>{};
  onInteractionCancel: ()=>void=()=>{};
  onAudioFrame?: (view: AudioFrameView) => void;
  onFatalError: (message: string) => void = () => {};
  onCompatibilityWarning: (message: string) => void = () => {};
  fatalError?: string;
  compatibilityWarning?: string;
  protected textureDimensionLimit = Infinity;
  protected readonly areaPreview=new AreaPreviewLayer();
  protected readonly constructionPreview=new ConstructionPreviewLayer();
  protected areaIndex: AreaIndex | undefined;
  protected constructionIndex: ConstructionCellIndex | undefined;
  protected areaSignature = '';
  protected areaDrag: ({ pointerId: number; action: AreaAction; from: Cell }
    | { pointerId: number; kind: LineBuildKind; from: Cell; material?: ConstructionMaterial }) | null = null;
  onArea: (action: AreaAction, from: Cell, to: Cell) => void = () => {};
  onBuildLine: (kind: LineBuildKind, from: Cell, to: Cell, material?: ConstructionMaterial) => void = () => {};
  onAreaPreview: (info: { width: number; height: number; eligible: number; skipped: number; line?: boolean } | null) => void = () => {};
  protected readonly raycaster = new THREE.Raycaster();
  protected readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  protected readonly pointer = new THREE.Vector2();
  protected readonly hit = new THREE.Vector3();

  protected readonly keys = new Set<string>();
  protected readonly pileChunks = new Map<string, VisualChunk>();
  protected readonly staticMaterial = material(0xffffff, { vertexColors: true });
  protected readonly terrainPlainMaterial = material(0xffffff,{vertexColors:true});
  // Keep texture identity stable: terrain and water can share one GPU image and
  // one shader graph even when a new map or the texture option replaces pixels.
  protected readonly terrainPaintTexture=new THREE.DataTexture(new Uint8Array([255,255,255,0]),1,1);
  protected readonly terrainPaintStaging=new THREE.DataTexture(
    new Uint8Array((3*TERRAIN_PAINT_PIXELS_PER_CELL)**2*4),3*TERRAIN_PAINT_PIXELS_PER_CELL,3*TERRAIN_PAINT_PIXELS_PER_CELL);
  protected readonly terrainPaintPatchSource=new THREE.Box2(new THREE.Vector2(),new THREE.Vector2());
  protected readonly terrainPaintPatchDestination=new THREE.Vector2();
  protected terrainPaintResident=false;
  protected readonly terrainPaintMaterial = material(0xffffff,{vertexColors:false,map:this.terrainPaintTexture});
  protected readonly staticPaint=createStylizedSurfaceTexture('vegetation');
  protected readonly texturedStaticMaterial=material(0xffffff,{vertexColors:true,map:this.staticPaint});
  protected readonly waterMaterial = material(0xffffff, { vertexColors: true, roughness: 0.45, metalness: 0.08 });
  protected readonly paintedWater=new PaintedWater(this.terrainPaintTexture,this.environmentLighting.configure);
  protected readonly clouds=new WeatherCloudLayer();
  protected readonly precipitation=new WeatherPrecipitationLayer();
  protected readonly boxes = new BoxBatches(this.environmentLighting.configure);
  protected readonly recreationHints = new RecreationHints(this.boxes);
  protected readonly resources = new ResourceLayer(this.resourceGroup, this.staticMaterial,this.texturedStaticMaterial);
  protected readonly naturalPresentation = new NaturalResourcePresentation();
  protected readonly sceneResources = new SceneResourceIndex();
  protected readonly crops = new CropLayer(this.staticMaterial,this.texturedStaticMaterial);
  protected readonly growing = new GrowingZoneLayer(this.boxes);
  protected readonly rocks = new RockLayer(this.staticMaterial,this.environmentLighting.configure);
  protected readonly plants = new PlantClusterLayer(this.staticMaterial,this.texturedStaticMaterial);
  protected readonly designations:DesignationIconLayer;
  protected readonly daylight: DayNightLayer;
  protected readonly pausedShadow = new PausedShadowCache();
  protected world: World | null = null;
  protected structureKey = '';
  protected jobKey = '';
  protected storageKey = '';
  protected readonly furniturePresentation = new FurniturePresentation();
  protected readonly structureSignature = new StructurePresentationSignature();
  protected readonly storageSignature = new StoragePresentationSignature();
  protected readonly homeSignature = new HomePresentationSignature();
  protected tool = 'select';
  protected furniturePlacement:Structure|undefined;
  setFurniturePlacement(object:Structure|undefined):void {this.furniturePlacement=object;this.updateDeepResources();this.updateHover();}
  protected placementRotation: Orientation = 0;
  protected hoverCell: { x: number; z: number } | null = null;
  protected wallCutaway = false;
  protected grassVisible = true;
  protected texturesEnabled=true;
  protected terrainPaintDirty=true;
  protected terrainGeometryDirty=false;
  protected lastFrame = 0;
  protected snapshotAt = 0;
  protected timeFrom = 0;
  protected timeTo = 0;
  protected snapshotDuration = 120;
  protected disposed = false;
  protected preparing = false;
  protected pointerDown: { x: number; y: number; button: number; pointerId: number } | null = null;

  constructor(renderer: THREE.WebGPURenderer, groundGrassEnabled: boolean, protected readonly rendererLifetime: RendererLifetime, protected readonly hostPort:SceneRenderHostPort) {
    this.renderer = renderer; this.designations=new DesignationIconLayer(hostPort.loadTexture);
    try {
    const lost = renderer.onDeviceLost.bind(renderer);
    renderer.onDeviceLost = info => { lost(info); this.reportFailure(`Périphérique graphique perdu : ${info.message}`); };
    renderer.onError = (info: unknown) => {
      const detail = typeof info === 'object' && info !== null && 'message' in info ? String(info.message) : String(info);
      this.reportFailure(`Erreur du périphérique graphique : ${detail}`);
    };
    this.scene.matrixAutoUpdate = false;
    this.environmentLighting.configure(this.staticMaterial);
    this.environmentLighting.configure(this.terrainPlainMaterial);
    this.environmentLighting.configure(this.terrainPaintMaterial);
    this.environmentLighting.configure(this.texturedStaticMaterial);
    this.environmentLighting.configure(this.waterMaterial);
    this.terrainPaintTexture.colorSpace=THREE.SRGBColorSpace;
    this.terrainPaintTexture.magFilter=THREE.LinearFilter;
    this.terrainPaintTexture.minFilter=THREE.LinearMipmapLinearFilter;
    this.terrainPaintTexture.generateMipmaps=true;
    this.terrainPaintTexture.wrapS=this.terrainPaintTexture.wrapT=THREE.ClampToEdgeWrapping;
    this.terrainPaintTexture.onUpdate=()=>{this.terrainPaintResident=true;};
    this.terrainPaintTexture.needsUpdate=true;
    this.terrainPaintStaging.colorSpace=THREE.SRGBColorSpace;
    this.terrainPaintStaging.magFilter=THREE.LinearFilter;
    this.terrainPaintStaging.minFilter=THREE.LinearFilter;
    this.terrainPaintStaging.generateMipmaps=false;
    this.terrainPaintStaging.wrapS=this.terrainPaintStaging.wrapT=THREE.ClampToEdgeWrapping;
    // Renderer-owned shared material survives deletion of an individual chunk.
    // Reusing its node graph also avoids compiling a pipeline per tree batch.
    this.staticMaterial.userData.rendererOwned = true;
    this.terrainPlainMaterial.userData.rendererOwned = true;
    this.terrainPaintMaterial.userData.rendererOwned = true;
    this.texturedStaticMaterial.userData.rendererOwned = true;
    this.waterMaterial.userData.rendererOwned = true;
    this.backend = hostPort.backend();
    const context = renderer.getContext() as GPUCanvasContext | WebGL2RenderingContext;
    if ('getConfiguration' in context) {
      const device = context.getConfiguration()?.device;
      // Three deliberately ignores reason=destroyed. Watch our configured
      // device too, so an explicit diagnostic destroy follows the real loss
      // notification path; normal disposal is already guarded by disposed.
      void device?.lost.then(info => this.reportFailure(`Périphérique graphique perdu : ${info.message || info.reason}`));
    }
    this.textureDimensionLimit = 'getConfiguration' in context
      ? context.getConfiguration()?.device.limits.maxTextureDimension2D ?? 1
      : Number(context.getParameter(context.MAX_TEXTURE_SIZE));
    if (!Number.isSafeInteger(this.textureDimensionLimit) || this.textureDimensionLimit < 1) this.textureDimensionLimit = 1;
    renderer.setPixelRatio(Math.min(hostPort.pixelRatio(), 1.8));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.info.autoReset = false;
    hostPort.attachSurface(this.backend);
    this.daylight = new DayNightLayer(this.scene);
    this.invalidatePausedShadow();
    this.landscape.add(this.plants.group,this.overview.group,this.terrainGroup,this.resourceGroup,this.rocks.group);
    this.scene.add(this.mechanoids.group);
    this.scene.add(this.deepResources.mesh,this.areaPreview.mesh,this.landscape,this.pileGroup,this.hygiene.group,this.wind.group,this.wildlife.mesh,this.wildlife.flames,this.ropes.mesh,this.fires.mesh,this.projectiles.mesh,this.roofs.surface,this.roofs.areas,this.doors.group,this.timber.group,this.crops.group, this.growing.group, this.structureGroup, this.jobGroup, this.designations.mesh, this.storageGroup, this.pawns.group,this.clouds.mesh,this.precipitation.mesh);
    if (groundGrassEnabled) {
      this.grass = this.createGrass();
      this.grass.setTerrainPaint(this.terrainPaintTexture);
      this.scene.add(this.grass.mesh);
    }
    this.rig = hostPort.createCamera();
    const hoverMat = new THREE.MeshBasicNodeMaterial({ color: 0xf9ebae, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, forceSinglePass:true });
    // A zero-thickness cursor has no front/back transparency ordering.
    this.hover = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96), hoverMat);
    this.hover.rotation.x = -Math.PI / 2;
    this.hover.position.y = 0.08;
    this.hover.visible = false;
    this.hover.renderOrder = 5;
    const selectionGeometry=new THREE.BufferGeometry();
    // A degenerate resident triangle warms the same position-only selection
    // pipeline under loading, before the first object inspection.
    selectionGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(9),3));
    this.objectSelection = new THREE.Mesh(selectionGeometry,new THREE.MeshBasicMaterial({color:0xfff5d6,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));
    this.objectSelection.visible=false;this.objectSelection.frustumCulled=false;this.objectSelection.renderOrder=20;
    this.scene.add(this.hover,this.constructionPreview.group,this.objectSelection,this.recreationHints.group,this.actionFeedback.group,this.actionVfx.group,this.brawlCloud.group,this.structureVfx.group,this.podRescue.group,this.orbitalDelivery.group);
    } catch (error) {
      try { this.dispose(); } catch { /* Static create also closes the device. */ }
      throw error;
    }
  }

  /** Idempotent failure entry point, also used by controlled native diagnostics.
   * The main lifecycle pauses the authoritative worker and offers reconstruction. */
  reportFailure(message: string): void {
    if (this.disposed || this.fatalError) return;
    this.fatalError = message;
    this.renderer.setAnimationLoop(null);
    this.keys.clear();
    if (this.hostPort.selectionReady() && this.rig && this.hover) this.cancelDesignation();
    this.onFatalError(message);
  }

  /** Only callable in development diagnostics. Targets this canvas's actual
   * device/context; never requests or destroys a separate/shared adapter. */
  requestDeviceLossForDiagnostics(): boolean {
    if (!import.meta.env.DEV || this.disposed || this.fatalError) return false;
    const context = this.renderer.getContext() as GPUCanvasContext | WebGL2RenderingContext;
    if ('getConfiguration' in context) {
      const device = context.getConfiguration()?.device;
      if (!device) return false;
      device.destroy(); return true;
    }
    const extension = context.getExtension('WEBGL_lose_context');
    if (!extension) return false;
    extension.loseContext(); return true;
  }

  protected createGrass(): GpuGroundGrassLayer {
    return new GpuGroundGrassLayer(this.environmentLighting.configure, this.textureDimensionLimit, message => {
      this.compatibilityWarning = message;
      this.onCompatibilityWarning(message);
    });
  }

  setWorld(world: World, resetPresentation = false, speed = 1, tracks?: PawnTrack[], immutableSnapshot = false): void {
    if(this.disposed || this.fatalError)return;
    try {
    this.invalidatePausedShadow();
    const previous=this.received?.world;
    const reset=resetPresentation||!previous||world.tick<previous.tick||world.seed!==previous.seed||world.width!==previous.width||world.height!==previous.height;
    this.received={world,speed,tracks,immutableSnapshot};
    this.immutableSnapshot=immutableSnapshot;
    if(immutableSnapshot)this.immutableWorlds.add(world);else this.immutableWorlds.delete(world);
    this.projectiles.adopt(world,reset);
    if(this.hostPort.hidden())return;
    if(tracks){this.timeline.adopt(world.tick,speed,tracks,this.hostPort.now(),reset||!this.hasTracks);this.hasTracks=true;}
    if(reset||!tracks){this.presentation.clear();this.applyWorld(world,reset);return;}
    this.presentation.push(world);
    // A background/stalled page must not retain an unlimited snapshot history.
    // Recovery replaces the whole presentation, never only one actor's path.
    if(this.presentation.size>64||world.tick-this.timeline.tick>MOTION_HISTORY_TICKS){this.presentation.clear();this.timeline.adopt(world.tick,speed,tracks,this.hostPort.now(),true);this.applyWorld(world,true);return;}
    const due=this.presentation.take(this.timeline.tick,this.hostPort.now());if(due)this.applyWorld(due);
    } catch (error) {
      this.reportFailure(`Adoption de l’affichage interrompue : ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  protected applyWorld(world: World, resetPresentation = false): void {
    if (this.disposed) return;
    this.invalidatePausedShadow();
    if (resetPresentation) this.cancelDesignation();
    this.areaIndex = undefined; this.constructionIndex = undefined; this.areaSignature = '';
    const now = this.hostPort.now();
    const previousWorld = this.world;
    // Worker deltas keep immutable terrain/resources references stable. A changed
    // collection is inspected once; ordinary pawn snapshots do not scan the map.
    const newMap = !previousWorld||previousWorld.seed!==world.seed||previousWorld.width!==world.width||previousWorld.height!==world.height||previousWorld.scenario?.id!==world.scenario?.id||previousWorld.scenario?.revision!==world.scenario?.revision||
      previousWorld.site?.hilliness!==world.site?.hilliness||previousWorld.site?.revision!==world.site?.revision||previousWorld.site?.biome!==world.site?.biome;
    const changedTiles=terrainTileChanges(previousWorld,world,!!previousWorld&&this.immutableWorlds.has(previousWorld)&&this.immutableWorlds.has(world));
    if(newMap)this.mechanoids.reset();
    const terrainChanges=terrainSurfaceChanges(previousWorld,world,changedTiles);
    // External setWorld callers may mutate tile collections in place. Only
    // decoder snapshots promise identity-stable unchanged tiles.
    const immutableTileChanges=this.immutableSnapshot?changedTiles??undefined:undefined;
    const groundChanged=terrainChanges===null||terrainChanges.length>0;
    if (newMap) this.cancelDesignation();
    // The worker epoch distinguishes a checkpoint from an ordinary delta even
    // if terrain content and simulation tick match a previous session.
    const resetPoses = resetPresentation || newMap || world.tick < (previousWorld?.tick ?? 0);
    // Advance memberships only for the World actually applied to the scene.
    // The journal/full capture establishes the context; a public flag alone
    // cannot certify a sparse traversal or cross a missing publication.
    const resourceFrame = this.immutableWorlds.has(world) ? this.sceneResources.adopt(world,resetPoses) : undefined;
    if(!resourceFrame)this.sceneResources.clear();
    this.world = world;
    this.updateDeepResources();
    this.grass?.update(world,newMap,immutableTileChanges,resourceFrame);
    this.fires.adopt(world,newMap);this.wind.adopt(world,newMap);
    this.environmentLighting.update(world);
    if(groundChanged) {
      if(terrainChanges===null||this.terrainPaintDirty)this.terrainPaintDirty=true;
      else if(this.texturesEnabled){
        const rect=this.terrainPaintResident?singleTerrainPaintPatchRect(world,terrainChanges):null;
        patchTerrainPaintTexture(this.terrainPaintTexture,world,terrainChanges,rect!==null);
        if(rect)this.uploadTerrainPaintPatch(rect);
        else this.terrainPaintResident=false;
      }
      else this.terrainPaintDirty=true;
      if(this.texturesEnabled)this.refreshTerrainPaint(world);
      const waterTopologyChanged=terrainChanges===null||terrainChanges.some(i=>(previousWorld!.tiles[i]!.terrain==='water')!==(world.tiles[i]!.terrain==='water'));
      if(this.texturesEnabled&&!waterTopologyChanged){
        // Painted terrain reads its colour from the map. A soil/grass/stone
        // change does not alter its quad or bank geometry. Keep the plain
        // vertex colours marked dirty for a later texture-off switch.
        this.terrainGeometryDirty=true;
      }else{
        buildTerrain(world,this.terrainGroup,this.texturesEnabled?this.terrainPaintMaterial:this.terrainPlainMaterial,this.texturesEnabled?this.paintedWater.material:this.waterMaterial,this.texturesEnabled);
        this.overview.rebuildTerrain(this.terrainGroup);
        this.terrainGeometryDirty=false;
      }
    }
    this.rocks.update(world,newMap,immutableTileChanges);
    if(!this.rocks.group.parent)this.scene.add(this.rocks.group);
    if (newMap) {
      this.boxes.clear();
      this.clouds.configureMap(world.width, world.height);
      this.precipitation.configureMap(world.width, world.height);
      this.paintedWater.reset();
      this.rig.configureMap(world.width, world.height, world.scenario?.landing);
      this.daylight.configureShadow(world.width, world.height);
      this.resize();
    }
    this.hygiene.update(world,this.boxes,newMap);
    if (previousWorld?.resources !== world.resources || newMap || Math.floor(previousWorld.tick / 25) !== Math.floor(world.tick / 25)) this.updateResources(world, newMap,resourceFrame);
    const packageKey=(world.packed??[]).filter(p=>p.owner.type==='ground').map(p=>`${p.building.id}:${p.building.material}:${p.owner.type==='ground'?`${p.owner.x}:${p.owner.z}`:''}`).join('|');
    this.roofs.update(world,this.boxes,this.wallCutaway,newMap);
    this.doors.update(world,this.wallCutaway,resetPoses);
    const doorAxes=doorOrientations(world);
    const structureKey = this.structureSignature.read(world.structures,[...doorAxes].join(':'),packageKey,resetPoses);
    if (structureKey !== this.structureKey || newMap) { this.structureKey = structureKey; this.buildStructures(world); }
    this.turretTops.update(world,this.structureGroup,this.boxes,newMap);
    // Quantize presentation of progression to avoid rebuilding static meshes for
    // every work tick. Saved simulation progress remains exact and authoritative.
    const jobKey = world.jobs.filter(j=>j.kind!=='fix-breakdown').map((j) => `${j.id}:${j.kind}:${j.floor}:${j.material}:${j.x}:${j.z}:${j.orientation}:${j.footprint}:${j.status}:${j.construction}:${j.escrow.wood}:${j.kind === 'mine' || j.kind === 'chop' || j.kind === 'harvest' || j.kind === 'cut' || j.kind === 'sow' || j.kind === 'deconstruct' || j.kind==='repair' ? 0 : Math.floor(j.progress / jobDuration(world,j) * 20)}`).join('|');
    if (jobKey !== this.jobKey || newMap) { this.jobKey = jobKey; this.buildJobs(world); }
    if(resetPoses)this.homeSignature.clear();
    const storageKey = `${this.homeSignature.read(world.home)};`+this.storageSignature.read(world.stockpiles,resetPoses);
    if (storageKey !== this.storageKey || newMap) { this.storageKey = storageKey; this.buildStorage(world); }
    if (newMap || previousWorld?.resources !== world.resources || Math.floor((previousWorld?.tick ?? -1) / 25) !== Math.floor(world.tick / 25)) this.crops.update(world, newMap, this.immutableWorlds.has(world));
    const zoneChanged=this.updateGrowingZones(newMap);
    this.pawns.adoptCargo(previousWorld??undefined,world,this.hasTracks?this.timeline.tick:world.tick,
      !resetPoses&&this.hasTracks&&(this.received?.speed??0)>0);
    this.updatePiles(world, newMap);
    const oldBlend = this.pawns.blend.value;
    this.snapshotDuration = previousWorld && world.tick >= previousWorld.tick ? Math.min(200, Math.max(70, now - this.snapshotAt)) : 0;
    this.snapshotAt = now;
    this.timeFrom = resetPoses ? world.tick / TICKS_PER_SECOND : this.pawns.time.value;
    this.timeTo = world.tick / TICKS_PER_SECOND;
    this.pawns.blend.value = resetPoses ? 1 : 0;
    this.pawns.update(world, resetPoses ? 1 : oldBlend, resetPoses);
    this.actionVfx.update(world,this.pawns.feedbackSource!);
    this.brawlCloud.update(world,this.pawns.feedbackSource!);
    this.structureVfx.adopt(world,newMap);
    this.podRescue.adopt(world);this.orbitalDelivery.adopt(world);
    this.resources.adoptChopWork(previousWorld??undefined,world,resetPoses,resourceFrame);
    this.actionFeedback.update(world,this.selectedPawns,this.pawns.feedbackSource!);
    this.wildlife.update(world,this.hasTracks?this.timeline:undefined,resetPoses,this.pawns);
    this.mechanoids.update(world,this.hasTracks?this.timeline:undefined,resetPoses,this.pawns);
    this.ropes.adopt(world,resetPoses);
    this.landscape.refresh(this.backend==='WebGPU'&&this.overview.group.visible);
    if(this.selectedObject?.kind!=='growing'||zoneChanged)this.updateSelectedObject();
    this.updateHover();
  }

  setFloorSelection(floor:BuildableFloorKind|undefined):void {
    if(floor!==this.selectedFloor)this.cancelDesignation();this.selectedFloor=floor;this.updateHover();
  }
  setConstructionMaterial(value:ConstructionMaterial|undefined):void {
    if (this.constructionMaterial!==value && this.areaDrag) this.cancelDesignation();
    this.constructionMaterial=value;this.updateHover();
  }

  setTool(tool: string): void {
    if (tool !== this.tool) this.cancelDesignation();
    const homeBefore=this.tool==='home'||this.tool==='remove-home';
    this.tool = tool;
    this.updateDeepResources();
    this.updateGrowingZones(false);
    if(this.world&&(homeBefore||tool==='home'||tool==='remove-home'))this.buildStorage(this.world);
    if (tool in STRUCTURE_DEFINITIONS) this.keys.delete('q');
    const color = tool === 'cancel' ? 0xe6876a : tool === 'select' ? 0xf9ebae : 0x9dd9ca;
    (this.hover.material as THREE.MeshBasicNodeMaterial).color.setHex(color);
    this.hostPort.cursor(tool === 'select' ? 'default' : 'crosshair');
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
    const selecting=this.hostPort.cancelSelection();this.onInteractionCancel();
    const drag = this.areaDrag;
    this.areaDrag = null; this.pointerDown = null; this.areaSignature = ''; this.hoverCell = null;
    this.constructionIndex = undefined;
    this.onHover(null);
    this.controls.enabled = true;
    if (drag) this.hostPort.releasePointer(drag.pointerId);
    this.areaPreview.hide();
    this.constructionPreview.hide();
      this.turretPreviewVisible=false;this.turretPreviewSignature='';
    this.hover.visible = false;
    (this.hover.material as THREE.MeshBasicNodeMaterial).opacity = 0.55;
    this.onAreaPreview(null);
    return drag !== null || selecting;
  }

  protected invalidatePausedShadow():void {
    this.pausedShadow.invalidate();
    const shadow=this.daylight.light.shadow;
    shadow.autoUpdate=true;
    shadow.needsUpdate=true;
  }

  /** Presentation only: hidden wall volume remains blocked in the simulation. */
  setRoofsVisible(visible:boolean):void {if(this.roofs.surface.visible!==visible)this.invalidatePausedShadow();this.roofs.surface.visible=visible;}
  /** Switch resident material graphs. The plain variants contain no texture
   * sampling node; no image or per-frame CPU work is involved while disabled. */
  setTexturesEnabled(enabled:boolean):void {
    if(this.texturesEnabled===enabled)return;
    this.invalidatePausedShadow();
    this.texturesEnabled=enabled;
    if(enabled&&this.world)this.refreshTerrainPaint(this.world);
    if(!enabled)this.releaseTerrainPaint();
    if(!enabled&&this.world&&this.terrainGeometryDirty){
      buildTerrain(this.world,this.terrainGroup,this.terrainPlainMaterial,this.waterMaterial);
      this.overview.rebuildTerrain(this.terrainGroup);
      this.terrainGeometryDirty=false;
    }
    const oldTerrain=enabled?this.terrainPlainMaterial:this.terrainPaintMaterial;
    const nextTerrain=enabled?this.terrainPaintMaterial:this.terrainPlainMaterial;
    const oldWater=enabled?this.waterMaterial:this.paintedWater.material;
    const nextWater=enabled?this.paintedWater.material:this.waterMaterial;
    for(const child of this.terrainGroup.children)if(child instanceof THREE.Mesh&&child.material===oldTerrain)child.material=nextTerrain;
    for(const child of this.terrainGroup.children)if(child instanceof THREE.Mesh&&child.material===oldWater)child.material=nextWater;
    if(this.world){
      syncTerrainPaintUvs(this.world,this.terrainGroup,nextTerrain,enabled,nextWater);
      this.overview.setTerrainMaterial(oldTerrain,nextTerrain,this.world,enabled);
      this.overview.setTerrainMaterial(oldWater,nextWater,this.world,enabled);
    }
    this.boxes.setTexturesEnabled(enabled);
    this.timber.setTexturesEnabled(enabled);
    this.doors.setTexturesEnabled(enabled);
    this.roofs.setTexturesEnabled(enabled);
    this.resources.setTexturesEnabled(enabled);
    this.crops.setTexturesEnabled(enabled);
    this.plants.setTexturesEnabled(enabled);
    this.rocks.setTexturesEnabled(enabled);
    this.overview.setTexturesEnabled(enabled);
    this.pawns.setTexturesEnabled(enabled);
    this.wildlife.setTexturesEnabled(enabled);
    this.fires.setTexturesEnabled(enabled);
    this.clouds.setTexturesEnabled(enabled);
    this.grass?.setTexturesEnabled(enabled);
    this.podRescue.setTexturesEnabled(enabled);this.orbitalDelivery.setTexturesEnabled(enabled);
    this.landscape.needsUpdate=true;
  }
  protected refreshTerrainPaint(world:World):void {
    if(!this.terrainPaintDirty)return;
    const baked=createTerrainPaintTexture(world);
    if(this.terrainPaintTexture.image.width!==baked.image.width||this.terrainPaintTexture.image.height!==baked.image.height)this.terrainPaintTexture.dispose();
    this.terrainPaintTexture.image=baked.image;
    this.terrainPaintTexture.userData.terrainPalette=baked.userData.terrainPalette;
    this.terrainPaintResident=false;
    this.terrainPaintTexture.needsUpdate=true;
    this.terrainPaintDirty=false;
    this.grass?.setTerrainPaint(this.terrainPaintTexture);
  }
  protected uploadTerrainPaintPatch(rect:TerrainPaintPatchRect):void {
    const atlas=this.terrainPaintTexture.image;
    const staging=this.terrainPaintStaging.image;
    copyTerrainPaintRect(atlas.data as Uint8Array,atlas.width,rect,staging.width,staging.data as Uint8Array);
    this.terrainPaintStaging.needsUpdate=true;
    this.terrainPaintPatchSource.min.set(0,0);
    this.terrainPaintPatchSource.max.set(rect.width,rect.height);
    this.terrainPaintPatchDestination.set(rect.x,rect.y);
    // Three 0.186 ignores DataTexture updateRanges in WebGPU and its WebGL
    // fallback. The public copy API transfers only this staging image and
    // regenerates the atlas mipmaps; the resident atlas version stays intact.
    this.renderer.copyTextureToTexture(this.terrainPaintStaging,this.terrainPaintTexture,this.terrainPaintPatchSource,this.terrainPaintPatchDestination);
  }
  protected releaseTerrainPaint():void {
    this.grass?.setTerrainPaint(null);
    this.terrainPaintResident=false;
    this.terrainPaintTexture.dispose();
    this.terrainPaintTexture.image={data:new Uint8Array([255,255,255,0]),width:1,height:1};
    delete this.terrainPaintTexture.userData.terrainPalette;
    this.terrainPaintTexture.needsUpdate=true;
    this.terrainPaintDirty=true;
  }
  /** A disabled decorative grass layer owns no mesh, texture, shader or map
   * update path. Re-enable lazily from the current immutable world snapshot. */
  setGroundGrassEnabled(enabled: boolean): void {
    if (this.disposed || enabled === Boolean(this.grass)) return;
    this.invalidatePausedShadow();
    if (!enabled) {
      this.grass!.mesh.removeFromParent();
      this.grass!.dispose();
      this.grass = null;
      return;
    }
    this.grass = this.createGrass();
    this.grass.setTexturesEnabled(this.texturesEnabled);
    this.grass.setTerrainPaint(this.texturesEnabled?this.terrainPaintTexture:null);
    this.scene.add(this.grass.mesh);
    if (this.world) this.grass.update(this.world, true);
  }
  setRoofAreasVisible(visible:boolean):void {if(this.roofs.areas.visible!==visible)this.invalidatePausedShadow();this.roofs.areas.visible=visible;}
  setWallCutaway(enabled: boolean): void {
    if (this.wallCutaway === enabled) return;
    this.invalidatePausedShadow();
    this.wallCutaway = enabled;
    if (this.world) { this.roofs.update(this.world,this.boxes,this.wallCutaway);this.buildStructures(this.world); this.buildJobs(this.world); }
    this.areaSignature='';this.updateHover();
  }

  /** Hide canopies for inspection while retaining trunks and all game rules. */
  setFoliageVisible(visible: boolean): void {
    if(this.grassVisible!==visible)this.invalidatePausedShadow();
    this.grassVisible=visible;
    if(!visible&&this.grass){this.grass.mesh.visible=false;this.grass.mesh.geometry.instanceCount=0;}
    this.resources.setFoliageVisible(visible);
    this.overview.setFoliageVisible(visible);
    this.landscape.needsUpdate = true;
  }

  get cameraMode(): CameraMode { return this.rig.mode; }
  get audioFocus(): { x: number; z: number } { return { x: this.controls.target.x, z: this.controls.target.z }; }

  /** Warm both projections and resident LOD variants under the loading screen.
   * Do not defer the first overview pipeline to the player's first wheel zoom. */
  async preparePresentation(): Promise<void> {
    if (this.fatalError) throw new Error(this.fatalError);
    try { await this.preparePresentationResources(); }
    catch (error) {
      // Restoration inside the preparation completes before teardown.
      try { this.dispose(); } catch { /* Preserve the original preparation error. */ }
      throw error;
    }
  }

  protected async preparePresentationResources(): Promise<void> {
    this.preparing = true;
    this.invalidatePausedShadow();
    const culling = new Map<THREE.Object3D, boolean>();
    const distant = this.overview.group.visible;
    const restorePawnFires=this.pawns.prepareFiresForCompile();
    const restoreWildlife=this.wildlife.prepare();
    const restoreMechanoids=this.mechanoids.prepare();
    const restoreRopes=this.ropes.prepareForCompile();
    const restoreFeedback=this.actionFeedback.prepareForCompile();
    const restoreActionVfx=this.actionVfx.prepareForCompile();
    const restoreBrawlCloud=this.brawlCloud.prepareForCompile();
    const restoreStructureVfx=this.structureVfx.prepareForCompile();
    const restoreWind=this.wind.prepareForCompile();
    const restoreRoofs=this.roofs.prepare();
    const restoreDoors=this.doors.prepareForCompile();
    const restoreTimber=this.timber.prepareForCompile();
    const restoreCrops = this.crops.prepareForCompile();
    const restoreOverview = this.overview.prepareForCompile();
    const restorePlants = this.plants.prepareForCompile();
    const restoreGrass = this.grass?.prepareForCompile() ?? (() => {});
    const restoreDesignations=this.designations.prepareForCompile();
    const restoreFilth=this.hygiene.filth.prepareForCompile();
    const restoreClouds=this.clouds.prepareForCompile();
    const restorePodRescue=this.podRescue.prepareForCompile();
    const restoreOrbitalDelivery=this.orbitalDelivery.prepareForCompile();
    const restorePrecipitation=this.precipitation.prepareForCompile();
    const restoreBoxes=this.boxes.prepareEmptyShadows();
    const restoreArea=this.areaPreview.prepareForCompile();
    const restoreConstruction=this.constructionPreview.prepareForCompile();
    const restoreDeep=this.deepResources.prepareForCompile();
    try {
      // The double-sided cursor otherwise compiles both face variants on the
      // first map interaction. Include it behind the loading overlay.
      this.hover.visible = true;
      this.objectSelection.visible = true;
      this.overview.group.visible = this.terrainGroup.visible = this.resourceGroup.visible = this.plants.group.visible = true;
      this.rocks.setDistant(false); this.rocks.mesh.visible = true;
      this.scene.traverse(object => { culling.set(object, object.frustumCulled); object.frustumCulled = false; });
      this.daylight.update(this.world ? calendarTick(this.world) : 0, this.controls.target,this.world??undefined);
      this.daylight.fitShadow(this.camera);
      await this.renderer.compileAsync(this.scene, this.rig.orthographic);
      await this.renderer.compileAsync(this.scene, this.rig.perspective);
      this.landscape.needsUpdate=true;
      await prepareShadowPipelines(this.renderer,this.scene,this.rig.orthographic,this.boxes);
      if (this.fatalError) throw new Error(this.fatalError);
    } finally {
      // Restore the broad compile override first. Layers prepared above had
      // already disabled culling when that override was captured; their own
      // restorers must therefore run last to recover their real runtime flag.
      for (const [object, value] of culling) object.frustumCulled = value;
      restoreMechanoids();
      restoreWind();restorePawnFires();restoreWildlife();restoreRopes();restoreFeedback();restoreActionVfx();restoreBrawlCloud();restoreStructureVfx();restoreRoofs();restoreDoors();restoreTimber();restoreCrops();restorePlants();restoreGrass();restoreDesignations();restoreFilth();restoreClouds();restorePrecipitation();
      restoreBoxes();restoreArea();restoreConstruction();restoreDeep();
      restoreOverview();
      restorePodRescue();restoreOrbitalDelivery();
      this.overview.group.visible = distant; this.terrainGroup.visible = this.resourceGroup.visible = this.plants.group.visible = !distant;
      this.rocks.setDistant(distant); this.landscape.refresh(this.backend==='WebGPU'&&distant); this.preparing = false;
      this.invalidatePausedShadow();
      this.updateSelectedObject();
      this.updateHover();
      this.frames.reset(); this.lastFrame = 0;
    }
  }

  toggleCameraMode(): CameraMode {
    this.cancelDesignation();
    this.invalidatePausedShadow();
    this.rig.setMode(this.rig.mode === 'orthographic' ? 'perspective' : 'orthographic');
    return this.rig.mode;
  }

  focusCell(cell:Cell):void {
    this.invalidatePausedShadow();
    const offset=this.camera.position.clone().sub(this.controls.target);this.controls.target.set(cell.x,0,cell.z);this.camera.position.copy(this.controls.target).add(offset);this.controls.update();
  }
  focusPawn(id: number): void {
    const pawn = this.world?.pawns.find((item) => item.id === id)??this.world?.wildlife?.animals.find(a=>a.id===id)??this.world?.mechanoids?.find(m=>m.id===id);
    if (!pawn) return;
    this.invalidatePausedShadow();
    const offset = this.camera.position.clone().sub(this.controls.target);
    const physical='body' in pawn&&this.world?pawnBodyLocation(this.world,pawn):pawn;if(!physical)return;
    this.controls.target.set(physical.x, 0, physical.z);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  setSelectedPawns(ids:ReadonlySet<number>):void {this.selectedPawns=new Set(ids);this.pawns.setSelected(ids);this.wildlife.setSelected(ids);this.mechanoids.setSelected(ids);if(this.world&&this.pawns.feedbackSource)this.actionFeedback.update(this.world,this.selectedPawns,this.pawns.feedbackSource);}
  setSelectedObject(selected:MapObjectSelection|undefined):void {this.selectedObject=selected;this.updateSelectedObject();this.updateGrowingZones(false);this.updateTurretPreview();this.updateDeepResources();}
  protected updateDeepResources():void {
    if(this.world&&this.deepResources.update(this.world,{selectedId:this.tool==='select'&&this.selectedObject?.kind==='structure'?this.selectedObject.id:undefined,placement:this.tool==='install'?this.furniturePlacement?.kind:this.tool}))this.invalidatePausedShadow();
  }
  protected updateTurretPreview():void {
    const world=this.world,selected=this.selectedObject;
    const structure=this.tool==='select'&&selected?.kind==='structure'?world?.structures.find(s=>s.id===selected.id&&s.kind==='mini-turret'):undefined;
    if(this.areaDrag||!world||!structure){if(this.turretPreviewVisible&&!this.areaDrag)this.areaPreview.hide();this.turretPreviewVisible=false;this.turretPreviewSignature='';return;}
    const danger=!!structure.turret?.wick,radius=danger?MINI_TURRET_DISPLAY_BOMB_RADIUS:MINI_TURRET_DISPLAY_RANGE;
    const signature=`${structure.id}:${structure.x}:${structure.z}:${world.width}:${world.height}:${danger}`;
    if(signature===this.turretPreviewSignature)return;
    this.turretPreviewSignature=signature;this.turretPreviewVisible=true;
    this.areaPreview.update(world.width,world.width*world.height,miniTurretRadiusCells(world,structure,radius),danger?0xe79c7c:0x9bbeb0);
  }
  protected updateGrowingZones(reset:boolean):boolean {
    return this.world?this.growing.update(this.world,reset,this.tool==='growing'||this.tool==='remove-growing',this.selectedObject?.kind==='growing'?this.selectedObject.id:undefined):false;
  }
  protected updateSelectedObject():void {
    if(this.preparing)return;
    if(this.selectedObject?.kind==='growing'||this.selectedObject?.kind==='stockpile'){
      this.objectSelection.visible=false;this.objectSelectionSignature='';return;
    }
    const cells=this.world&&this.selectedObject?mapObjectCells(this.world,this.selectedObject):[];
    if(!cells.length){this.objectSelection.visible=false;this.objectSelectionSignature='';return;}
    let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,shape=2166136261;
    for(const cell of cells){minX=Math.min(minX,cell.x);maxX=Math.max(maxX,cell.x);minZ=Math.min(minZ,cell.z);maxZ=Math.max(maxZ,cell.z);shape=Math.imul(shape^((cell.z*this.world!.width+cell.x)>>>0),16777619);}
    minX-=.44;maxX+=.44;minZ-=.44;maxZ+=.44;
    const signature=`${this.selectedObject!.kind}:${this.selectedObject!.id}:${cells.length}:${shape}:${minX}:${maxX}:${minZ}:${maxZ}`;
    this.objectSelection.visible=true;
    if(signature===this.objectSelectionSignature)return;
    this.objectSelectionSignature=signature;
    const length=Math.min(.23,(maxX-minX)/3,(maxZ-minZ)/3),y=.14;
    const vertices:number[]=[];
    // GPU line width is fixed to one pixel on common WebGPU backends. Flat
    // strokes give object corners a stable thickness comparable to pawn rings.
    const stroke=(ax:number,az:number,bx:number,bz:number)=>{
      const dx=bx-ax,dz=bz-az,scale=.024/Math.hypot(dx,dz),nx=-dz*scale,nz=dx*scale;
      vertices.push(ax+nx,y,az+nz,bx+nx,y,bz+nz,bx-nx,y,bz-nz,
        ax+nx,y,az+nz,bx-nx,y,bz-nz,ax-nx,y,az-nz);
    };
    for(const x of [minX,maxX])for(const z of [minZ,maxZ]){
      const dx=x===minX?1:-1,dz=z===minZ?1:-1;
      stroke(x,z,x+dx*length,z);stroke(x,z,x,z+dz*length);
    }
    const old=this.objectSelection.geometry;
    this.objectSelection.geometry=new THREE.BufferGeometry();
    this.objectSelection.geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));old.dispose();
  }

  /** Project lightweight actor proxies only for pointer gestures, using the
   * same confirmed edge as the GPU. Canopies don't prevent selecting a colon. */
  screenPawns():ScreenPawn[] {
    const rect=this.hostPort.surfaceRect(),result:ScreenPawn[]=[];
    // The carried body uses the carrier's GPU pose and edge times. Its own
    // final walking segment is historical and must not drive its hit proxy.
    const bodyCarriers=new Map((this.world?.piles??[]).flatMap(p=>p.humanCorpse&&p.owner.type==='pawn'?[[p.humanCorpse.pawnId,p.owner.pawnId] as const]:[]));
    const actors=new Map(this.world?.pawns.map(p=>[p.id,p]));
    for(const [id,visual] of this.pawns.visuals) {
      if(visual.to.y< -100)continue;
      const segment=this.hasTracks?this.timeline.segment(bodyCarriers.get(id)??id):undefined;
      const alpha=segment?THREE.MathUtils.clamp((this.timeline.tick-segment.start)/(segment.end-segment.start),0,1):this.pawns.blend.value;
      const position=new THREE.Vector3().lerpVectors(visual.from,visual.to,alpha);
      const distance=segment?THREE.MathUtils.lerp(segment.fromFraction??0,segment.toFraction??1,alpha):alpha;
      position.y=travelHeight(visual.from.y,visual.to.y,distance);
      const center=position.clone().add(new THREE.Vector3(0,.75,0)).project(this.camera);
      if(center.z < cameraClipNear(this.camera)||center.z>1||Math.abs(center.x)>1||Math.abs(center.y)>1)continue;
      const head=position.clone().add(new THREE.Vector3(0,1.75,0)).project(this.camera);
      result.push({id,x:rect.left+(center.x+1)*rect.width/2,y:rect.top+(1-center.y)*rect.height/2,
        radius:Math.max(5,Math.abs(head.y-center.y)*rect.height/2),depth:center.z,group:actors.get(id)?.state==='dead'?'corpse:human':`human:${actors.get(id)?.faction??'colony'}:${!!actors.get(id)?.prisoner}`,category:actors.get(id)?.state==='dead'?3:(actors.get(id)?.faction??'colony')==='colony'?0:1});
    }
    const center=new THREE.Vector3(),edge=new THREE.Vector3(),side=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0);
    this.wildlife.forEachPose((id,species,x,y,z,height,radius)=>{
      center.set(x,y+height*.5,z).project(this.camera);
      if(center.z< cameraClipNear(this.camera)||center.z>1||Math.abs(center.x)>1||Math.abs(center.y)>1)return;
      edge.set(x,y+height*.5,z).addScaledVector(side,Math.max(height*.5,radius)).project(this.camera);
      result.push({id,x:rect.left+(center.x+1)*rect.width/2,y:rect.top+(1-center.y)*rect.height/2,radius:Math.max(6,Math.abs(edge.x-center.x)*rect.width/2),depth:center.z,group:`animal:${species}`,category:2});
    });
    this.mechanoids.forEachPose((id,x,y,z,height,radius,dead,kind)=>{
      center.set(x,y+height*.5,z).project(this.camera);
      if(center.z<cameraClipNear(this.camera)||center.z>1||Math.abs(center.x)>1||Math.abs(center.y)>1)return;
      edge.set(x,y+height*.5,z).addScaledVector(side,Math.max(height*.5,radius)).project(this.camera);
      result.push({id,x:rect.left+(center.x+1)*rect.width/2,y:rect.top+(1-center.y)*rect.height/2,radius:Math.max(6,Math.abs(edge.x-center.x)*rect.width/2),depth:center.z,group:dead?'corpse:mech':`mech:${kind}`,category:dead?3:1});
    });
    return result;
  }

  resize(): void {
    if (this.disposed) return;
    this.invalidatePausedShadow();
    const viewport=this.hostPort.viewport(); const width = Math.max(1, viewport.width), height = Math.max(1, viewport.height);
    this.viewportWidth=width;this.viewportHeight=height;
    this.rig.resize(width, height);
    this.renderer.setSize(width, height, false);
  }

  projectCell(x: number, z: number): { x: number; y: number } {
    this.camera.updateMatrixWorld();
    const projected = new THREE.Vector3(x, 0, z).project(this.camera);
    return { x: (projected.x + 1) * this.viewportWidth / 2, y: (1 - projected.y) * this.viewportHeight / 2 };
  }

  protected updateResources(world: World, newMap: boolean,frame?:SceneResourceFrame): void {
    const immutable=this.immutableWorlds.has(world);
    const scene=immutable&&readSceneResourceFrame(frame,world)
      ?this.naturalPresentation.readScene(world,newMap,true)
      :this.naturalPresentation.read(world,newMap,immutable);
    if(!scene)return;
    const compact=!isNaturalSceneWorld(scene);
    if(compact&&!scene.changed)return;
    const view=compact?world:scene;
    this.plants.update(view,newMap,this.naturalPresentation.changes);
    if(readSceneResourceFrame(frame,world)){
      this.resources.update(world,newMap,this.naturalPresentation.changes,frame);
      // Overview owns the same crop/cluster exclusion already; it can receive
      // the complete current World without a second global filtered array.
      this.overview.update(world,newMap,this.naturalPresentation.changes);return;
    }
    const visible=compact
      ?{...world,resources:world.resources.filter(resource=>!isResidentCrop(resource)&&!isClusterPlantSpecies(resource.species))}
      :{...view,resources:view.resources.filter(resource=>!isClusterPlantSpecies(resource.species))};
    this.resources.update(visible, newMap,this.naturalPresentation.changes); this.overview.update(visible,newMap,this.naturalPresentation.changes);
  }

  protected buildStructures(world: World): void { this.doors.update(world,this.wallCutaway);this.timber.update(world,this.wallCutaway);this.furniturePresentation.update(world,this.structureGroup,this.wallCutaway,this.boxes,this.structureSignature.flowerChanges(),this.immutableWorlds.has(world));this.structureSignature.ackFurnitureBuild(); }

  protected buildJobs(world: World): void { buildJobMarkers(world,this.jobGroup,this.wallCutaway,this.boxes);this.designations.update(world); }

  protected buildStorage(world: World): void {
    const { cells } = storageZonePlacements(world.width, world.stockpiles);
    const home: Placement[] = [];
    if(this.tool==='home'||this.tool==='remove-home')for(const i of world.home??[])home.push({x:i%world.width,z:Math.floor(i/world.width),y:.04,sx:.94,sy:.014,sz:.94,color:0x779ee6});
    this.boxes.set(this.storageGroup, 'storage-cells', cells, 'storage', false);
    this.boxes.set(this.storageGroup, 'storage-borders', [], 'border', false);
    this.boxes.set(this.storageGroup, 'storage-home', home, 'storage-home', false);
  }

  protected updatePiles(world: World, newMap: boolean): void {
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
    const hidden=this.pawns.hiddenPileQuantities();
    const jobById = new Map(world.jobs.map(job => [job.id, job]));
    const cells = new Map<string, PileBundle>();
    for (const pile of world.piles) {
      if(pile.humanCorpse||pile.mechCorpse||pile.owner.type==='grave')continue;
      if (pile.owner.type !== 'ground'&&pile.owner.type!=='job') continue;
      const quantity=pile.quantity-(hidden.get(pile.id)??0);
      if(quantity<=0)continue;
      const job = pile.owner.type === 'job' ? jobById.get(pile.owner.jobId) : undefined;
      if (pile.owner.type === 'job' && !job) continue;
      const position = pile.owner.type === 'ground' ? pile.owner : job!;
      const key = `${position.x}:${position.z}:${pile.item}:${job ? 'job' : 'ground'}${pile.corpse?`:${pile.id}`:''}`;
      const bundle = cells.get(key);
      if (bundle) bundle.quantity += quantity;
      else cells.set(key, { x: position.x, z: position.z, kind: pile.kind, item: pile.item, quantity, supplied: !!job, surface:job?undefined:surfaces.get(position.z*world.width+position.x),...(pile.kind==='corpse'?{corpseStage:corpseStage(pile,world.tick),facing:pile.corpse?.facing??0,corpse:pile.corpse}:{}) });
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
      const signature = bundles.map(bundle => `${bundle.x}:${bundle.z}:${bundle.item}:${bundle.quantity}:${bundle.supplied}:${bundle.corpseStage??''}:${bundle.facing??0}:${bundle.corpse?corpseVisualMask(bundle.corpse):0}:${bundle.surface?Object.values(bundle.surface).join(','):'ground'}`).join('|');
      const previous = this.pileChunks.get(key);
      if (previous?.signature === signature) continue;
      const group = previous?.group ?? new THREE.Group();
      if (!previous) this.pileGroup.add(group);
      group.name = `Material piles ${key}`;
      this.boxes.set(group, `pile:${key}`, pileParts(bundles));
      this.pileChunks.set(key, { signature, group });
    }
  }

  visibilityChanged():void {
    this.frames.reset();this.lastFrame=0;
    if(!this.hostPort.hidden()&&this.received){const r=this.received;this.setWorld(r.world,true,r.speed,r.tracks,r.immutableSnapshot);}
  }

  protected frame(now: number): void {
    if (this.disposed || this.fatalError || this.preparing) return;
    if(this.hasTracks){this.timeline.advance(now);const due=this.presentation.take(this.timeline.tick,now);if(due)this.applyWorld(due);}
    const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.05) : 0;
    this.lastFrame = now;
    this.pawns.blend.value = this.snapshotDuration > 0 ? Math.min(1, Math.max(0, (this.hostPort.now() - this.snapshotAt) / this.snapshotDuration)) : 1;
    this.pawns.time.value = THREE.MathUtils.lerp(this.timeFrom, this.timeTo, this.pawns.blend.value);
    if(this.hasTracks && this.world) {this.pawns.time.value=(this.timeline.tick/TICKS_PER_SECOND)%(2*Math.PI);this.pawns.updateTravel(this.world,this.timeline);}
    if(this.world&&this.pawns.presentCargo(this.hasTracks?this.timeline.tick:THREE.MathUtils.lerp(this.timeFrom,this.timeTo,this.pawns.blend.value)*TICKS_PER_SECOND,this.world)){
      this.invalidatePausedShadow();this.updatePiles(this.world,false);
    }
    if(this.pawns.feedbackSource)this.actionFeedback.syncTravel(this.pawns.feedbackSource);
    if(this.world)this.wildlife.update(this.world,this.hasTracks?this.timeline:undefined,false,this.pawns);
    if(this.world)this.mechanoids.update(this.world,this.hasTracks?this.timeline:undefined,false,this.pawns);
    this.ropes.present(this.hasTracks?this.timeline:undefined);
    if (!this.areaDrag && !this.hostPort.selectionActive()) { this.moveCamera(dt); this.controls.update(); }
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
    if (this.onAudioFrame) this.onAudioFrame({
      tick: skyTick,
      paused: this.received?.speed === 0,
      camera: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z,
        targetX: this.controls.target.x, targetZ: this.controls.target.z, span: this.rig.span, mode: this.rig.mode },
    });
    const visualWind=this.world?visualWindDirection(this.world.wind?.seed??this.world.seed,skyTick):{x:1,z:0};
    const visualWindStrength=this.world?windIntensity(this.world):0;
    if(this.world){
      this.resources.setWind(visualWindStrength,visualWind.x,visualWind.z);
      this.plants.setWind(visualWindStrength,visualWind.x,visualWind.z);
      this.grass?.setWind(visualWindStrength,visualWind.x,visualWind.z);
      this.structureVfx.setWind(visualWindStrength,visualWind.x,visualWind.z);
      this.paintedWater.setWind(visualWindStrength,visualWind.x,visualWind.z);
      this.resources.presentWind(skyTick);
      this.plants.presentWind(skyTick);
      this.grass?.presentWind(skyTick);
    }
    this.resources.presentChop(skyTick/TICKS_PER_SECOND);
    this.doors.tick.value=skyTick;this.projectiles.present(skyTick);this.fires.present(skyTick);this.wind.present(skyTick);
    this.actionVfx.present(skyTick);this.brawlCloud.present(skyTick);this.structureVfx.present(skyTick);this.podRescue.present(skyTick);this.orbitalDelivery.present(skyTick);
    if(this.texturesEnabled)this.paintedWater.present(skyTick/TICKS_PER_SECOND);
    this.daylight.update(this.world?calendarTick(this.world,skyTick):skyTick, this.controls.target,this.world??undefined);
    if(this.world)this.clouds.present({seed:this.world.seed,tick:skyTick,weather:this.world.weather,camera:this.camera,
      target:this.controls.target,strength:visualWindStrength,directionX:visualWind.x,directionZ:visualWind.z,
      daylight:this.daylight.sample.daylight});
    if(this.world)this.precipitation.present({seed:this.world.seed,tick:skyTick,rainRate:weatherRainRate(this.world),
      snowRate:weatherSnowRate(this.world),camera:this.camera,target:this.controls.target,
      strength:visualWindStrength,directionX:visualWind.x,directionZ:visualWind.z,daylight:this.daylight.sample.daylight});
    this.daylight.fitShadow(this.camera);
    const cellPixels=this.rig.pixelsPerCell(this.viewportHeight);
    this.actionFeedback.setBarsDetailVisible(cellPixels>=18);
    this.actionVfx.setDetailVisible(cellPixels>=18);
    this.brawlCloud.setDetailVisible(cellPixels>=18);
    this.ropes.setDetailVisible(cellPixels>=18);
    this.designations.present(this.camera,this.viewportHeight,cellPixels);
    const distant=this.overview.group.visible ? cellPixels<9 : cellPixels<7;
    if(distant!==this.overview.group.visible){this.landscape.needsUpdate=true;this.invalidatePausedShadow();}
    this.overview.group.visible=distant;this.terrainGroup.visible=!distant;this.resourceGroup.visible=!distant;this.plants.group.visible=!distant;
    this.structureVfx.setDistant(distant);
    if(!distant)this.structureVfx.setView(this.camera,this.controls.target);
    this.rocks.setDistant(distant);
    if(this.grass){
      if(this.grassVisible&&!distant)this.grass.present(this.camera,this.controls.target,this.rig.span,cellPixels);
      else{this.grass.mesh.visible=false;this.grass.mesh.geometry.instanceCount=0;}
    }
    this.landscape.setRetained(this.backend==='WebGPU'&&distant);
    const shadow=this.daylight.light.shadow,received=this.received;
    const cacheEligible=this.backend==='WebGPU'&&!!this.world;
    const paused=received?.speed===0&&(!this.hasTracks||this.timeline.tick>=received.world.tick)&&!this.hostPort.hidden();
    const reuseShadow=cacheEligible&&this.pausedShadow.canReuse(paused,this.camera,this.daylight.light,skyTick,this.pawns.blend.value,distant,this.viewportWidth,this.viewportHeight);
    if(cacheEligible){shadow.autoUpdate=!reuseShadow;if(!reuseShadow)shadow.needsUpdate=true;}
    else shadow.autoUpdate=true;
    this.renderer.info.reset();
    this.renderer.render(this.scene, this.camera);
    if(cacheEligible&&!reuseShadow)this.pausedShadow.capture(!shadow.needsUpdate,this.camera,this.daylight.light,skyTick,this.pawns.blend.value,distant,this.viewportWidth,this.viewportHeight);
    this.hostPort.drawLabels(this.world, this.camera, cellPixels, this.viewportWidth, this.viewportHeight);
    this.stats.drawCalls = this.renderer.info.render.drawCalls;
    this.stats.triangles = this.renderer.info.render.triangles;
    this.frames.record(now, this.hostPort.hidden());
    this.stats.fps = this.frames.fps;
    this.stats.frameMs = this.frames.meanMs;
    this.stats.frameP95 = this.frames.p95Ms;
  }

  protected moveCamera(dt: number): void {
    // The hidden management tables can contain hundreds of people. Avoid a
    // host-wide modal query every frame when there is no keyboard motion.
    if (!this.keys.size) return;
    if (!this.hostPort.canMoveCamera()) { this.keys.clear(); return; }
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

  protected pickAt(clientX:number,clientY:number, clampToMap = false): Cell | null {
    if (!this.world) return null;
    const rect = this.hostPort.surfaceRect();
    this.pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.ground, this.hit)) return null;
    let x = Math.floor(this.hit.x + 0.5), z = Math.floor(this.hit.z + 0.5);
    if (clampToMap) { x = THREE.MathUtils.clamp(x, 0, this.world.width - 1); z = THREE.MathUtils.clamp(z, 0, this.world.height - 1); }
    if (x < 0 || z < 0 || x >= this.world.width || z >= this.world.height) return null;
    return { x, z };
  }
  protected updateAreaPreview(): void {
    const drag = this.areaDrag, world = this.world, cell = this.hoverCell;
    if (!drag || !world) return;
    if (!cell) {
      this.hover.visible = false; this.areaPreview.hide();this.constructionPreview.hide();
      this.areaSignature = ''; this.onAreaPreview(null); return;
    }
    const action = 'action' in drag ? drag.action : drag.kind;
    const signature = `${action}:${drag.from.x}:${drag.from.z}:${cell.x}:${cell.z}`;
    if (signature === this.areaSignature) return;
    this.areaSignature = signature;
    let bounds: { minX:number; maxX:number; minZ:number; maxZ:number }, cells: number[], skipped: number;
    if ('action' in drag) {
      this.areaIndex ??= buildAreaIndex(world);
      const result = queryArea(world, { type: 'area', action: drag.action, from: drag.from, to: cell, ...(drag.action==='lay-floor'?{floor:this.selectedFloor}:{}) }, this.areaIndex);
      if (!result.ok) {this.hover.visible=false;this.areaPreview.hide();this.constructionPreview.hide();this.onAreaPreview(null);return;}
      ({ bounds, cells, skipped } = result);
    } else {
      const line = constructionLineCells(drag.from, cell);
      const end = line[line.length-1]!;
      bounds = { minX:Math.min(drag.from.x,end.x), maxX:Math.max(drag.from.x,end.x), minZ:Math.min(drag.from.z,end.z), maxZ:Math.max(drag.from.z,end.z) };
      if (this.constructionIndex?.kind !== drag.kind) this.constructionIndex=buildConstructionCellIndex(world,drag.kind);
      const index=this.constructionIndex;
      cells = line.filter(position => canDesignate(world,{type:'designate',kind:drag.kind,...position,orientation:0,...(drag.material?{material:drag.material}:{})},false,index).ok)
        .map(position => position.z*world.width+position.x);
      skipped = line.length-cells.length;
    }
    const width = bounds.maxX - bounds.minX + 1, height = bounds.maxZ - bounds.minZ + 1;
    if ('kind' in drag || action === 'lay-floor' || action === 'build-roof') {
      const validCells = new Set(cells), valid: ConstructionPreviewSpec[] = [], invalid: ConstructionPreviewSpec[] = [];
      const positions = 'kind' in drag ? constructionLineCells(drag.from, cell)
        : Array.from({length:width*height},(_,i)=>({x:bounds.minX+i%width,z:bounds.minZ+Math.floor(i/width)}));
      for (const position of positions) {
        const spec:ConstructionPreviewSpec = { ...position, kind:action as ConstructionPreviewSpec['kind'], orientation:0,
          ...('kind' in drag && drag.material ? {material:drag.material} : {}),
          ...(action==='lay-floor'?{floor:this.selectedFloor??'wood-planks'}:{}) };
        (validCells.has(position.z*world.width+position.x)?valid:invalid).push(spec);
      }
      this.hover.visible=false;this.areaPreview.hide();
      this.constructionPreview.update(world,valid,invalid,this.wallCutaway);
      this.onAreaPreview({width,height,eligible:cells.length,skipped,line:'kind' in drag});return;
    }
    this.constructionPreview.hide();
    const color = action === 'cancel' || action === 'remove-stockpile' ? 0xf49b7c : 0x9de7c9;
    this.hover.visible = true; this.hover.scale.set(width, height, 1);
    this.hover.position.set((bounds.minX + bounds.maxX) / 2, 0.045, (bounds.minZ + bounds.maxZ) / 2);
    const hoverMat = this.hover.material as THREE.MeshBasicNodeMaterial;
    hoverMat.opacity = 0.12; hoverMat.color.setHex(cells.length ? color : 0xe46f58);
    this.areaPreview.update(world.width,world.width*world.height,cells,color);
    this.onAreaPreview({ width, height, eligible: cells.length, skipped, line:'kind' in drag });
  }
  protected updateHover(): void {
    if(this.preparing)return;
    if (this.areaDrag) { this.updateAreaPreview(); return; }
    this.updateTurretPreview();
    const cell = this.hoverCell;
    this.recreationHints.update(this.world, cell && (this.tool==='horseshoes'||this.tool==='select'&&this.world?.structures.some(s=>s.kind==='horseshoes'&&s.x===cell.x&&s.z===cell.z)) ? cell : undefined);
    const television=this.tool==='select'?this.world?.structures.find(s=>s.kind==='tube-television'&&s.x===cell?.x&&s.z===cell?.z):undefined;
    if(this.world&&cell&&(this.tool==='tube-television'||television||this.tool==='install'&&this.furniturePlacement?.kind==='tube-television'))this.recreationHints.television(this.world,{...cell,orientation:television?.orientation??this.placementRotation});
    const turbine=this.tool==='wind-turbine'&&cell?{...cell,orientation:this.placementRotation}:this.tool==='select'?this.world?.structures.find(s=>s.kind==='wind-turbine'&&cell&&footprintCells(s).some(c=>c.x===cell.x&&c.z===cell.z)):undefined;
    if(this.world&&turbine)this.recreationHints.wind(this.world,turbine);
    const cooler=this.tool==='select'?this.world?.structures.find(s=>s.kind==='cooler'&&s.x===cell?.x&&s.z===cell?.z):undefined;
    if(cell&&(this.tool==='cooler'||cooler))this.recreationHints.cooler(cell,cooler?.orientation??this.placementRotation);
    const sunLamp=this.tool==='select'?this.world?.structures.find(s=>s.kind==='sun-lamp'&&s.x===cell?.x&&s.z===cell?.z):undefined;
    if(this.world&&cell&&(this.tool==='sun-lamp'||sunLamp||this.tool==='install'&&this.furniturePlacement?.kind==='sun-lamp'))this.recreationHints.sunLamp(this.world,cell);
    this.hover.visible = !!cell&&this.tool!=='select';
    if(this.tool==='select'){this.constructionPreview.hide();this.hostPort.title('');return;}
    if (!cell || !this.world) {this.constructionPreview.hide();return;}
    const kind=this.tool==='install'&&this.furniturePlacement?this.furniturePlacement.kind:this.tool in STRUCTURE_DEFINITIONS?this.tool as JobKind:'wall';
    const cells = footprintCells({ ...cell, kind, orientation: this.placementRotation });
    const minX=Math.min(...cells.map(c=>c.x)),maxX=Math.max(...cells.map(c=>c.x)),minZ=Math.min(...cells.map(c=>c.z)),maxZ=Math.max(...cells.map(c=>c.z));
    this.hover.scale.set(maxX-minX+1, maxZ-minZ+1, 1);
    this.hover.position.set((minX+maxX)/2, this.world.tiles[cell.z * this.world.width + cell.x]?.terrain === 'water' ? WORLD_SCALE.waterSurface + 0.04 : 0.055, (minZ+maxZ)/2);
    const placeable=this.tool in STRUCTURE_DEFINITIONS||['mine','uninstall','deconstruct','chop','harvest','cut'].includes(this.tool);
    const validity = this.tool==='build-roof'?queryArea(this.world,{type:'area',action:'build-roof',from:cell,to:cell}):this.tool==='lay-floor'||this.tool==='remove-floor'?canDesignate(this.world,{type:'designate',kind:this.tool,...cell,...this.tool==='lay-floor'?{floor:this.selectedFloor}:{}}):this.tool==='install'&&this.furniturePlacement?installCommand(this.world,{type:'install',structureId:this.furniturePlacement.id,...cell,orientation:['sun-lamp','standing-lamp','small-sculpture','large-sculpture'].includes(this.furniturePlacement.kind)?0:this.placementRotation},true):placeable
      ? canDesignate(this.world, { type:'designate',kind:this.tool as JobKind,...cell,...(this.constructionMaterial?{material:this.constructionMaterial}:{}),orientation:this.tool==='mini-turret'||this.tool==='sandbags'||this.tool==='solar-generator'||this.tool==='power-conduit'||this.tool==='power-switch'||this.tool==='wood-generator'||this.tool==='chemfuel-generator'||this.tool==='sun-lamp'||this.tool==='standing-lamp'||this.tool==='door'||this.tool==='autodoor'||this.tool==='passive-cooler'?0:this.placementRotation }) : undefined;
    const invalidPlacement=validity?.ok===false||this.tool==='build-roof'&&validity!==undefined&&'cells' in validity&&validity.cells.length===0;
    const color = invalidPlacement ? 0xe46f58 : this.tool === 'cancel' || this.tool === 'remove-stockpile' ? 0xe6876a : this.tool === 'select' ? 0xf9ebae : 0x9dd9ca;
    (this.hover.material as THREE.MeshBasicNodeMaterial).color.setHex(color);
    if (this.tool in STRUCTURE_DEFINITIONS || this.tool==='lay-floor'||this.tool==='build-roof'||this.tool==='install'&&this.furniturePlacement) {
      const orientation:Orientation = this.tool==='install'
        ? ['sun-lamp','standing-lamp','small-sculpture','large-sculpture'].includes(kind)?0:this.placementRotation
        : ['mini-turret','sandbags','solar-generator','power-conduit','power-switch','wood-generator','chemfuel-generator','sun-lamp','standing-lamp','door','autodoor','passive-cooler'].includes(this.tool)?0:this.placementRotation;
      const spec:ConstructionPreviewSpec={...cell,kind:(this.tool==='install'?kind:this.tool) as ConstructionPreviewSpec['kind'],orientation,
        ...(this.constructionMaterial?{material:this.constructionMaterial}:{}),
        ...(this.tool==='lay-floor'?{floor:this.selectedFloor??'wood-planks'}:{}),
        ...(this.tool==='install'?{furniture:this.furniturePlacement}:{})};
      this.hover.visible=false;
      this.constructionPreview.update(this.world,invalidPlacement?[]:[spec],invalidPlacement?[spec]:[],this.wallCutaway);
    } else this.constructionPreview.hide();
    this.hostPort.title(validity&&'reason' in validity?validity.reason??'':'');
  }
  dispose(): void {
    if (this.disposed) return;
    this.hostPort.disposeSelection();
    if (this.hostPort.selectionReady() && this.rig && this.hover) this.cancelDesignation();
    this.areaPreview.dispose();
    this.constructionPreview.dispose();
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.hostPort.disconnectResize();
    this.rig?.dispose();
    this.hostPort.removeInputListeners();
    this.boxes.dispose();
    this.roofs.dispose();
    this.timber.dispose();
    this.hygiene.dispose();
    this.actionFeedback.dispose();
    this.actionVfx.dispose();
    this.brawlCloud.dispose();
    this.structureVfx.dispose();
    this.podRescue.dispose();this.orbitalDelivery.dispose();
    this.hostPort.disposeLabels();
    this.overview.dispose();
    this.deepResources.dispose();
    this.rocks.dispose();
    this.crops.dispose();
    this.plants.dispose();
    if(this.grass){this.grass.mesh.removeFromParent();this.grass.dispose();this.grass=null;}
    this.resources.dispose();
    this.sceneResources.clear();
    this.furniturePresentation.clear();this.structureSignature.clear();this.storageSignature.clear();this.homeSignature.clear();
    this.pawns.dispose();
    this.doors.dispose();this.projectiles.dispose();this.fires.dispose();this.wind.dispose();this.wildlife.dispose();this.mechanoids.dispose();this.ropes.dispose();this.designations.dispose();

    for (const group of [this.terrainGroup, this.resourceGroup, this.structureGroup, this.jobGroup, this.storageGroup, this.pileGroup]) clearGroup(group);
    this.pileChunks.clear();
    this.staticMaterial.dispose();
    this.terrainPlainMaterial.dispose();
    this.terrainPaintMaterial.dispose();this.terrainPaintTexture.dispose();this.terrainPaintStaging.dispose();
    this.texturedStaticMaterial.dispose();this.staticPaint.dispose();
    this.waterMaterial.dispose();
    this.paintedWater.dispose();
    this.clouds.dispose();
    this.precipitation.dispose();
    this.hover?.geometry.dispose(); (this.hover?.material as THREE.Material | undefined)?.dispose();
    this.objectSelection?.geometry.dispose();(this.objectSelection?.material as THREE.Material | undefined)?.dispose();
    this.daylight?.dispose();
    this.environmentLighting.dispose();
    this.renderer.onDeviceLost = () => {};
    this.renderer.onError = () => {};
    if (!this.rendererLifetime.closed) { this.rendererLifetime.closed = true; void this.renderer.dispose(); }
    this.hostPort.removeSurface();
  }
}
