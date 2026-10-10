import type {SceneTextureLoader} from './scene-render-ports';
import * as THREE from 'three/webgpu';
import { attribute, cameraPosition, cameraViewMatrix, texture, uniform, uv, vec2, vec4 } from 'three/tsl';
import type { AreaAction, Job, World } from '../sim/types';
import { floraSize, floraTreeHeight } from './flora-presentation';
import { noise } from './StaticGeometry';
import { perspectiveDetailRange, screenSpriteScale } from './map-overlay-detail';
import { WORLD_SCALE } from '../world/scale';

export const DESIGNATION_MIN_CELL_PIXELS = 32;
export const DESIGNATION_ICON_PIXELS = 30;
const CHOP_ICON_HEIGHT_FRACTION = .72;
export const DESIGNATION_ICON_KINDS = ['mine', 'chop', 'harvest', 'cut'] as const;
export type DesignationIconKind = typeof DESIGNATION_ICON_KINDS[number];
const ICON_INDEX: Readonly<Record<DesignationIconKind, number>> = { mine: 0, chop: 1, harvest: 2, cut: 3 };

export const isIconDesignationKind = (kind: unknown): kind is DesignationIconKind =>
  typeof kind === 'string' && (DESIGNATION_ICON_KINDS as readonly string[]).includes(kind);

export interface DesignationIconInstance { x: number; y: number; z: number; icon: number }
function instancesForTargets(world: World, targets: readonly Pick<Job, 'kind' | 'x' | 'z'>[]): DesignationIconInstance[] {
  const trees=targets.some(j=>j.kind==='chop')?new Map(world.resources.filter(r=>r.kind==='tree').map(r=>[r.z*world.width+r.x,r])):undefined;
  return targets.map(job => {
    const tree=trees?.get(job.z*world.width+job.x);
    const treeHeight=tree?.species?floraTreeHeight(tree)*floraSize(world,tree)
      :tree?WORLD_SCALE.treeMinHeight+noise(tree.x,tree.z,77)*(WORLD_SCALE.treeMaxHeight-WORLD_SCALE.treeMinHeight)
      :(WORLD_SCALE.treeMinHeight+WORLD_SCALE.treeMaxHeight)/2;
    const y=job.kind==='chop'?treeHeight*CHOP_ICON_HEIGHT_FRACTION:job.kind==='mine'?3.2:1.08;
    return { x: job.x, y, z: job.z, icon: ICON_INDEX[job.kind as DesignationIconKind] };
  });
}

export function designationIconInstances(world: World): DesignationIconInstance[] {
  return instancesForTargets(world, world.jobs.filter(job => isIconDesignationKind(job.kind)));
}

/** Cells are the compatible, row-major result of queryArea for this World.
 * This presentation helper does not repeat or replace simulation eligibility.
 * Bounds and duplicates are rejected before converting linear cell indices. */
function previewTargets(world: World, action: AreaAction, cells: readonly number[]): Pick<Job, 'kind' | 'x' | 'z'>[] {
  if (!isIconDesignationKind(action)) return [];
  const occupied = new Set(world.jobs.filter(job => isIconDesignationKind(job.kind)).map(job => job.z * world.width + job.x));
  const targets: Pick<Job, 'kind' | 'x' | 'z'>[] = [];
  for (const cell of cells) {
    if (!Number.isSafeInteger(cell) || cell < 0 || cell >= world.width * world.height || occupied.has(cell)) continue;
    occupied.add(cell);
    targets.push({ kind: action, x: cell % world.width, z: Math.floor(cell / world.width) });
  }
  return targets;
}

export function designationPreviewIconInstances(world: World, action: AreaAction, cells: readonly number[]): DesignationIconInstance[] {
  return instancesForTargets(world, previewTargets(world, action, cells));
}

function fallbackAtlas(): THREE.DataTexture {
  const width = 64, height = 80, data = new Uint8Array(width * height * 4);
  const pixel = (icon: number, x: number, y: number): void => {
    if (x < 1 || y < 1 || x > 14 || y > 14) return;
    const offset = ((64 + y) * width + icon * 16 + x) * 4;
    data[offset] = data[offset + 1] = data[offset + 2] = data[offset + 3] = 255;
  };
  const line = (icon: number, x0: number, y0: number, x1: number, y1: number, thickness = 1): void => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + (x1 - x0) * i / steps), y = Math.round(y0 + (y1 - y0) * i / steps);
      for (let dx = -thickness + 1; dx < thickness; dx++) for (let dy = -thickness + 1; dy < thickness; dy++) pixel(icon, x + dx, y + dy);
    }
  };
  line(0, 4, 2, 10, 13, 2); line(0, 2, 11, 8, 14, 2);
  line(1, 4, 2, 10, 13, 2); line(1, 8, 10, 13, 13, 2);
  line(2, 5, 2, 9, 12, 2); line(2, 8, 12, 13, 9, 2); line(2, 13, 9, 12, 6);
  line(3, 4, 3, 12, 12); line(3, 12, 3, 4, 12); line(3, 3, 2, 5, 4, 2); line(3, 11, 2, 13, 4, 2);
  const map = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
  map.minFilter = map.magFilter = THREE.LinearFilter;
  map.generateMipmaps = false;
  map.needsUpdate = true;
  return map;
}

/** One resident instanced sprite draw. Camera-facing orientation, fixed screen
 * size and per-target distance rejection stay in the vertex shader; camera
 * movement never uploads designation buffers. */
export class DesignationIconLayer {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.SpriteNodeMaterial>;
  private readonly fallback = fallbackAtlas();
  private readonly atlasNode = texture(this.fallback);
  private readonly screenScale = uniform(1);
  private readonly detailDistance = uniform(0);
  private readonly distanceLimited = uniform(1);
  private readonly perspectiveScale = uniform(0);
  private loaded: THREE.Texture | undefined;
  private capacity = 16;
  private key = '';
  private disposed = false;
  private minCellPixels = DESIGNATION_MIN_CELL_PIXELS;
  private committed: DesignationIconInstance[] = [];
  private preview: DesignationIconInstance[] = [];
  private instanceCount = 0;
  private revision = 0;

  constructor(loadTexture:SceneTextureLoader=(url,onLoad,onProgress,onError)=>new THREE.TextureLoader().load(url,onLoad,onProgress,onError)) {
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-.5, -.5, 0, .5, -.5, 0, -.5, .5, 0, .5, .5, 0], 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    geometry.setIndex([0, 1, 2, 2, 1, 3]);
    geometry.instanceCount = 0;
    geometry.setAttribute('designationPosition', new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * 3), 3).setUsage(THREE.StaticDrawUsage));
    geometry.setAttribute('designationIcon', new THREE.InstancedBufferAttribute(new Float32Array(this.capacity), 1).setUsage(THREE.StaticDrawUsage));
    const material = new THREE.SpriteNodeMaterial({ transparent: true, depthTest: false, depthWrite: false, alphaTest: .12 });
    const anchor = attribute('designationPosition', 'vec3');
    material.positionNode = anchor;
    const depth = cameraViewMatrix.mul(vec4(anchor, 1)).z.negate();
    const inRange = this.distanceLimited.lessThan(.5)
      .or(cameraPosition.sub(anchor).length().lessThan(this.detailDistance)).and(depth.greaterThan(0));
    // Use the target's projected depth explicitly. Three's sizeAttenuation
    // camera branch can reuse the ortho prewarm variant after a mode switch.
    material.scaleNode = vec2(this.screenScale)
      .mul(this.perspectiveScale.greaterThan(.5).select(depth, 1))
      .mul(inRange.select(1, 0));
    const atlasUv = vec2(uv().x.add(attribute('designationIcon', 'float')).div(4), uv().y.div(5).add(.8));
    material.colorNode = this.atlasNode.sample(atlasUv);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'designation-icon-billboards';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    loadTexture('/assets/ui/lisiere/icons.png', loaded => {
      if (this.disposed) { loaded.dispose(); return; }
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.minFilter = loaded.magFilter = THREE.LinearFilter;
      loaded.needsUpdate = true;
      this.loaded = loaded;
      this.atlasNode.value = loaded;
      this.mesh.material.needsUpdate = true;
    }, undefined, () => { /* The procedural first row remains usable. */ });
  }

  update(world: World): void {
    this.committed = designationIconInstances(world);
    // Compatibility belongs to the snapshot used by queryArea. A new update
    // must be followed by a fresh query while a drag remains active.
    this.preview = [];
    this.publish();
  }

  updatePreview(world: World, action: AreaAction, cells: readonly number[]): void {
    const jobs = world.jobs.filter(job => isIconDesignationKind(job.kind));
    const instances = instancesForTargets(world, [...jobs, ...previewTargets(world, action, cells)]);
    this.committed = instances.slice(0, jobs.length);
    this.preview = instances.slice(jobs.length);
    this.publish();
  }

  clearPreview(): void {
    if (this.preview.length === 0) return;
    this.preview = [];
    this.publish();
  }

  setMinCellPixels(value: number): void {
    this.minCellPixels = Number.isFinite(value) && value >= 0 ? value : DESIGNATION_MIN_CELL_PIXELS;
    this.distanceLimited.value = this.minCellPixels === 0 ? 0 : 1;
    this.revision++;
  }

  private publish(): void {
    this.revision++;
    const instances = this.preview.length ? [...this.committed, ...this.preview] : this.committed;
    this.instanceCount = instances.length;
    this.mesh.geometry.instanceCount = this.instanceCount;
    if (this.instanceCount === 0) this.mesh.visible = false;
    const key = instances.map(item => `${item.x}:${item.y}:${item.z}:${item.icon}`).join('|');
    if (key === this.key) return;
    this.key = key;
    if (instances.length > this.capacity) this.allocate(2 ** Math.ceil(Math.log2(instances.length)));
    const positions = this.mesh.geometry.getAttribute('designationPosition');
    const icons = this.mesh.geometry.getAttribute('designationIcon');
    for (let index = 0; index < instances.length; index++) {
      const item = instances[index]!;
      positions.setXYZ(index, item.x, item.y, item.z);
      icons.setX(index, item.icon);
    }
    positions.needsUpdate = icons.needsUpdate = true;
  }

  present(camera: THREE.OrthographicCamera | THREE.PerspectiveCamera, viewportHeight: number, cellPixels: number): void {
    this.revision++;
    this.mesh.visible = this.instanceCount > 0 && viewportHeight > 0 && (this.minCellPixels === 0 || cellPixels >= this.minCellPixels);
    if (!this.mesh.visible) return;
    this.screenScale.value = screenSpriteScale(camera, viewportHeight, DESIGNATION_ICON_PIXELS);
    const perspective = camera instanceof THREE.PerspectiveCamera;
    this.perspectiveScale.value = perspective ? 1 : 0;
    this.detailDistance.value = perspective && this.minCellPixels > 0
      ? Math.min(1e30, perspectiveDetailRange(camera, viewportHeight, this.minCellPixels)) : 1e8;
  }

  private allocate(capacity: number): void {
    this.capacity = capacity;
    this.mesh.geometry.setAttribute('designationPosition', new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.StaticDrawUsage));
    this.mesh.geometry.setAttribute('designationIcon', new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.StaticDrawUsage));
  }

  prepareForCompile(): () => void {
    const wasVisible = this.mesh.visible;
    const revision = this.revision;
    this.mesh.visible = true;
    if (this.instanceCount === 0) this.mesh.geometry.instanceCount = 1;
    return () => {
      if (this.disposed) return;
      this.mesh.geometry.instanceCount = this.instanceCount;
      // A preview/presentation received while compilation awaited owns its
      // current count and visibility; only restore an otherwise untouched layer.
      if (this.revision === revision) this.mesh.visible = wasVisible;
    };
  }

  dispose(): void {
    this.disposed = true;
    this.committed = []; this.preview = [];
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.fallback.dispose();
    this.loaded?.dispose();
  }
}
