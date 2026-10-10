import type {SceneTextureLoader} from './scene-render-ports';
import * as THREE from 'three/webgpu';
import { attribute, cameraPosition, cameraViewMatrix, texture, uniform, uv, vec2, vec4 } from 'three/tsl';
import type { AreaAction, World } from '../sim/types';
import { footprintCells } from '../sim/definitions';
import { ARCHITECT_ICON_ATLASES, ARCHITECT_ICON_MAPPING } from '../ui/architect-icons';
import { floraSize, floraTreeHeight } from './flora-presentation';
import { noise } from './StaticGeometry';
import { perspectiveDetailRange, screenSpriteScale } from './map-overlay-detail';
import { WORLD_SCALE } from '../world/scale';
import {UI_ATLAS_URL} from '../ui/pictograms';

export const DESIGNATION_MIN_CELL_PIXELS = 32;
export const DESIGNATION_ICON_PIXELS = 30;
const CHOP_ICON_HEIGHT_FRACTION = .72;
export const DESIGNATION_ICON_KINDS = ['mine', 'chop', 'harvest', 'cut'] as const;
export type DesignationIconKind = typeof DESIGNATION_ICON_KINDS[number];
const ICON_INDEX: Readonly<Record<DesignationIconKind, number>> = { mine: 0, chop: 1, harvest: 2, cut: 3 };
const EXTRA_ICON_KINDS = ['haul-chunks', 'deconstruct', 'uninstall', 'remove-floor', 'build-roof', 'remove-roof'] as const;
type MarkerKind = DesignationIconKind | typeof EXTRA_ICON_KINDS[number];
type MarkerTarget = { kind: MarkerKind; x: number; z: number };
// Keep the historical predicate below: JobLayer uses it to choose between
// plant/mining sprites and its existing construction/removal geometry.
const isMarkerKind = (kind: string): kind is MarkerKind => isIconDesignationKind(kind)
  || (EXTRA_ICON_KINDS as readonly string[]).includes(kind);
function iconIndex(kind: MarkerKind): number {
  if (isIconDesignationKind(kind)) return ICON_INDEX[kind];
  const cell = ARCHITECT_ICON_MAPPING[kind]!;
  return 20 + cell.atlas * 30 + cell.row * 6 + cell.column;
}

export const isIconDesignationKind = (kind: unknown): kind is DesignationIconKind =>
  typeof kind === 'string' && (DESIGNATION_ICON_KINDS as readonly string[]).includes(kind);

export interface DesignationIconInstance { x: number; y: number; z: number; icon: number }
function instancesForTargets(world: World, targets: readonly MarkerTarget[]): DesignationIconInstance[] {
  const trees=targets.some(j=>j.kind==='chop')?new Map(world.resources.filter(r=>r.kind==='tree').map(r=>[r.z*world.width+r.x,r])):undefined;
  return targets.map(job => {
    const tree=trees?.get(job.z*world.width+job.x);
    const treeHeight=tree?.species?floraTreeHeight(tree)*floraSize(world,tree)
      :tree?WORLD_SCALE.treeMinHeight+noise(tree.x,tree.z,77)*(WORLD_SCALE.treeMaxHeight-WORLD_SCALE.treeMinHeight)
      :(WORLD_SCALE.treeMinHeight+WORLD_SCALE.treeMaxHeight)/2;
    const y=job.kind==='chop'?treeHeight*CHOP_ICON_HEIGHT_FRACTION:job.kind==='mine'?3.2
      :job.kind==='build-roof'||job.kind==='remove-roof'?WORLD_SCALE.wallHeight+.12:1.08;
    return { x: job.x, y, z: job.z, icon: iconIndex(job.kind) };
  });
}

function committedTargets(world: World): MarkerTarget[] {
  const targets: MarkerTarget[] = [];
  const roofCells = new Set<string>();
  for (const job of world.jobs) {
    if (!isMarkerKind(job.kind)) continue;
    targets.push({ kind: job.kind, x: job.x, z: job.z });
    if (job.kind === 'build-roof' || job.kind === 'remove-roof') roofCells.add(`${job.kind}:${job.z * world.width + job.x}`);
  }
  // Hauling designations belong to ground piles, not to generated Jobs. One
  // cell can hold several designated chunks; its presentation needs one icon.
  const chunks = new Set<number>();
  for (const pile of world.piles) if (pile.kind === 'chunk' && pile.haulRequested === true && pile.owner.type === 'ground') {
    const cell = pile.owner.z * world.width + pile.owner.x;
    if (chunks.has(cell)) continue;
    chunks.add(cell);
    targets.push({ kind: 'haul-chunks', x: pile.owner.x, z: pile.owner.z });
  }
  // Roof intentions exist before the bounded scheduler generates jobs. Retain
  // unfinished intentions, including unsupported cells, without work queries.
  if (world.roofing) {
    const constructed = new Set(world.roofing.constructed);
    for (const kind of ['build-roof', 'remove-roof'] as const) {
      for (const cell of world.roofing[kind === 'build-roof' ? 'build' : 'remove']) {
        const key = `${kind}:${cell}`;
        if (constructed.has(cell) === (kind === 'build-roof') || roofCells.has(key)) continue;
        roofCells.add(key);
        targets.push({ kind, x: cell % world.width, z: Math.floor(cell / world.width) });
      }
    }
  }
  return targets;
}

export function designationIconInstances(world: World): DesignationIconInstance[] {
  return instancesForTargets(world, committedTargets(world));
}

/** Cells are the compatible, row-major result of queryArea for this World.
 * This presentation helper does not repeat or replace simulation eligibility.
 * Bounds and duplicates are rejected before converting linear cell indices. */
function previewTargets(world: World, action: AreaAction, cells: readonly number[], committed?: readonly MarkerTarget[]): MarkerTarget[] {
  if (!isMarkerKind(action)) return [];
  // Roof and ground intentions may coexist. Deduplicate only the same action;
  // legacy plant/mining targets still exclude each other's occupied cells.
  const occupied = new Set((committed ?? committedTargets(world)).filter(target => target.kind === action
    || isIconDesignationKind(action) && isIconDesignationKind(target.kind)).map(target => target.z * world.width + target.x));
  const targets: MarkerTarget[] = [];
  if (action === 'deconstruct') {
    const selected = new Set(cells.filter(cell => Number.isSafeInteger(cell) && cell >= 0 && cell < world.width * world.height));
    // Area deconstruction targets each whole building once, even when only a
    // non-anchor footprint cell intersects the rectangle. Work spots disappear
    // immediately on release and never create a deconstruction Job.
    for (const structure of world.structures) if (structure.kind !== 'crafting-spot' && structure.kind !== 'butcher-spot'
      && !occupied.has(structure.z * world.width + structure.x)
      && footprintCells(structure).some(cell => selected.has(cell.z * world.width + cell.x))) {
      targets.push({ kind: action, x: structure.x, z: structure.z });
    }
    return targets;
  }
  const constructed = action === 'build-roof' || action === 'remove-roof' ? new Set(world.roofing?.constructed) : undefined;
  for (const cell of cells) {
    if (!Number.isSafeInteger(cell) || cell < 0 || cell >= world.width * world.height || occupied.has(cell)) continue;
    if (constructed && constructed.has(cell) === (action === 'build-roof')) continue;
    occupied.add(cell);
    targets.push({ kind: action, x: cell % world.width, z: Math.floor(cell / world.width) });
  }
  return targets;
}

export function designationPreviewIconInstances(world: World, action: AreaAction, cells: readonly number[]): DesignationIconInstance[] {
  return instancesForTargets(world, previewTargets(world, action, cells));
}

function fallbackAtlas(atlas?: 0 | 1): THREE.DataTexture {
  const width = atlas === undefined ? 64 : 96, height = 80, data = new Uint8Array(width * height * 4);
  const pixel = (icon: number, x: number, y: number): void => {
    if (x < 1 || y < 1 || x > 14 || y > 14) return;
    const column = atlas === undefined ? icon : icon % 6;
    const row = atlas === undefined ? 4 : 4 - Math.floor(icon / 6);
    const offset = ((row * 16 + y) * width + column * 16 + x) * 4;
    data[offset] = data[offset + 1] = data[offset + 2] = data[offset + 3] = 255;
  };
  const line = (icon: number, x0: number, y0: number, x1: number, y1: number, thickness = 1): void => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + (x1 - x0) * i / steps), y = Math.round(y0 + (y1 - y0) * i / steps);
      for (let dx = -thickness + 1; dx < thickness; dx++) for (let dy = -thickness + 1; dy < thickness; dy++) pixel(icon, x + dx, y + dy);
    }
  };
  if (atlas === undefined) {
    line(0, 4, 2, 10, 13, 2); line(0, 2, 11, 8, 14, 2);
    line(1, 4, 2, 10, 13, 2); line(1, 8, 10, 13, 13, 2);
    line(2, 5, 2, 9, 12, 2); line(2, 8, 12, 13, 9, 2); line(2, 13, 9, 12, 6);
    line(3, 4, 3, 12, 12); line(3, 12, 3, 4, 12); line(3, 3, 2, 5, 4, 2); line(3, 11, 2, 13, 4, 2);
  } else for (const kind of EXTRA_ICON_KINDS) {
    const cell = ARCHITECT_ICON_MAPPING[kind]!;
    if (cell.atlas !== atlas) continue;
    const icon = cell.row * 6 + cell.column;
    if (kind === 'haul-chunks') {
      line(icon, 2, 4, 8, 4); line(icon, 8, 4, 8, 10); line(icon, 8, 10, 2, 10); line(icon, 2, 10, 2, 4);
      line(icon, 9, 7, 14, 7, 2); line(icon, 11, 4, 14, 7); line(icon, 11, 10, 14, 7);
    } else if (kind === 'build-roof' || kind === 'remove-roof') {
      line(icon, 2, 9, 8, 3, 2); line(icon, 8, 3, 14, 9, 2); line(icon, 4, 9, 4, 13); line(icon, 12, 9, 12, 13);
      line(icon, 6, 11, 10, 11); if (kind === 'build-roof') line(icon, 8, 9, 8, 13);
    } else if (kind === 'uninstall') {
      line(icon, 3, 3, 11, 3); line(icon, 11, 3, 11, 11); line(icon, 11, 11, 3, 11); line(icon, 3, 11, 3, 3);
      line(icon, 6, 8, 13, 13, 2); line(icon, 13, 13, 13, 9); line(icon, 13, 13, 9, 13);
    } else {
      line(icon, 3, 3, 13, 13, 2); line(icon, 13, 3, 3, 13, 2);
      if (kind === 'remove-floor') line(icon, 2, 14, 14, 14);
    }
  }
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
  private readonly architectFallbacks = [fallbackAtlas(0), fallbackAtlas(1)] as const;
  private readonly architectNodes = [texture(this.architectFallbacks[0]), texture(this.architectFallbacks[1])] as const;
  private readonly screenScale = uniform(1);
  private readonly detailDistance = uniform(0);
  private readonly distanceLimited = uniform(1);
  private readonly perspectiveScale = uniform(0);
  private readonly loaded: THREE.Texture[] = [];
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
    const icon = attribute('designationIcon', 'float');
    const architectUv = (offset: number) => {
      const cell = icon.sub(offset);
      return vec2(uv().x.add(cell.mod(6)).div(6), uv().y.add(cell.div(6).floor().negate().add(4)).div(5));
    };
    material.colorNode = icon.lessThan(20).select(this.atlasNode.sample(atlasUv),
      icon.lessThan(50).select(this.architectNodes[0].sample(architectUv(20)), this.architectNodes[1].sample(architectUv(50))));
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'designation-icon-billboards';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    const loadAtlas = (url: string, node: typeof this.atlasNode): void => { loadTexture(url, loaded => {
      if (this.disposed) { loaded.dispose(); return; }
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.minFilter = loaded.magFilter = THREE.LinearFilter;
      loaded.needsUpdate = true;
      this.loaded.push(loaded);
      node.value = loaded;
      this.mesh.material.needsUpdate = true;
    }, undefined, () => { /* Procedural icons remain usable if an atlas fails. */ }); };
    loadAtlas(UI_ATLAS_URL, this.atlasNode);
    ARCHITECT_ICON_ATLASES.forEach((url, index) => loadAtlas(url, this.architectNodes[index]!));
  }

  update(world: World): void {
    this.committed = designationIconInstances(world);
    // Compatibility belongs to the snapshot used by queryArea. A new update
    // must be followed by a fresh query while a drag remains active.
    this.preview = [];
    this.publish();
  }

  updatePreview(world: World, action: AreaAction, cells: readonly number[]): void {
    const targets = committedTargets(world);
    const instances = instancesForTargets(world, [...targets, ...previewTargets(world, action, cells, targets)]);
    this.committed = instances.slice(0, targets.length);
    this.preview = instances.slice(targets.length);
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
    for (const fallback of this.architectFallbacks) fallback.dispose();
    for (const loaded of this.loaded) loaded.dispose();
  }
}
