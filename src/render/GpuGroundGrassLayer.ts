import * as THREE from 'three/webgpu';
import {
  Fn, float, hash, instanceIndex, positionLocal, sin,
  texture, time, transformNormalToView, uint, uniform, uv, varyingProperty,
  vec2, vec3,
} from 'three/tsl';
import type { Terrain, World } from '../sim/types';
import { footprintCells } from '../sim/definitions';
import { noise } from './StaticGeometry';
import { ARID_GRASS_COLOR, TERRAIN_COLORS } from './TerrainLayer';

/** AntSystem-inspired GPU blades, indexed by stable world cell and slot.
 * This is scenery: no Resource, job, save or simulation RNG. Four vertices/two
 * triangles are shared by a bounded visible field. */
export const GROUND_GRASS_MAX_BLADES = 120_000;
const SOIL_TERRAINS = new Set<Terrain>(['grass', 'soil', 'rich-soil']);
const scratchColor = new THREE.Color();

type GroundWorld = Pick<World, 'width' | 'height' | 'tiles' | 'structures' | 'resources' | 'piles' | 'packed' | 'seed' | 'site'>;

function coverMask(world: GroundWorld): Uint8Array<ArrayBuffer> {
  const blocked = new Uint8Array(world.width * world.height);
  const mark = (x: number, z: number): void => {
    if (x >= 0 && z >= 0 && x < world.width && z < world.height) blocked[z * world.width + x] = 1;
  };
  for (let i = 0; i < world.tiles.length; i++) {
    const tile = world.tiles[i]!;
    if (!SOIL_TERRAINS.has(tile.terrain) || tile.floor) blocked[i] = 1;
  }
  // All constructed footprints cover their soil. Sparse piles and minified
  // furniture mask only when physically on the ground, not when carried.
  for (const structure of world.structures) {
    for (const { x, z } of footprintCells(structure)) mark(x, z);
  }
  for (const resource of world.resources) if (resource.kind === 'rock') mark(resource.x, resource.z);
  for (const pile of world.piles) if (pile.owner.type === 'ground') mark(pile.owner.x, pile.owner.z);
  for (const packed of world.packed) if (packed.owner.type === 'ground') mark(packed.owner.x, packed.owner.z);
  return blocked;
}

function writeGroundCell(data: Uint8Array, world: GroundWorld, i: number, blocked: Uint8Array): boolean {
  const tile = world.tiles[i]!;
  const p = i * 4;
  let hex = 0, alpha = 0;
  if (!blocked[i]) {
    // The same palette and per-cell noise as TerrainLayer, encoded in sRGB for
    // DataTexture sampling. A root in a tile thus follows its actual colour.
    const x = i % world.width, z = Math.floor(i / world.width);
    hex = scratchColor.setHex(tile.terrain === 'grass' && world.site?.biome === 'arid-shrubland'
      ? ARID_GRASS_COLOR : TERRAIN_COLORS[tile.terrain]).multiplyScalar(0.94 + noise(x, z, world.seed) * 0.12).getHex();
    alpha = 255;
  }
  const r = hex >>> 16, g = hex >>> 8 & 255, b = hex & 255;
  if (data[p] === r && data[p + 1] === g && data[p + 2] === b && data[p + 3] === alpha) return false;
  data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = alpha;
  return true;
}

export function groundGrassPixels(world: GroundWorld): Uint8Array<ArrayBuffer> {
  const data = new Uint8Array(world.width * world.height * 4);
  const blocked = coverMask(world);
  for (let i = 0; i < world.width * world.height; i++) {
    writeGroundCell(data, world, i, blocked);
  }
  return data;
}

function bladeGeometry(): THREE.InstancedBufferGeometry {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -.022, 0, 0, .022, 0, 0, -.0025, 1, .029, .0025, 1, .029,
  ], 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
  ], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
  geometry.setIndex([0, 2, 1, 1, 2, 3]);
  geometry.instanceCount = 0;
  return geometry;
}

/** Rotation-invariant upper bound for the camera's one-cell-margined ground
 * rectangle. Orthographic corner edges rotate rigidly about the target; a
 * perspective quadrilateral uses its longest pairwise diagonal instead. */
function worldCellBudget(corners: Float64Array, orthographic: boolean): number {
  if (orthographic) {
    const horizontal = Math.hypot(corners[4]! - corners[0]!, corners[5]! - corners[1]!);
    const vertical = Math.hypot(corners[2]! - corners[0]!, corners[3]! - corners[1]!);
    const sum = horizontal + vertical;
    return Math.ceil(.5 * sum * sum + 4 * Math.SQRT2 * sum + 16);
  }
  let diameter = 0;
  for (let a = 0; a < 8; a += 2) for (let b = a + 2; b < 8; b += 2)
    diameter = Math.max(diameter, Math.hypot(corners[a]! - corners[b]!, corners[a + 1]! - corners[b + 1]!));
  return Math.ceil((diameter + 4) ** 2);
}

/** One resident draw. The GPU creates/recycles roots, shapes, wind and colour;
 * the CPU uploads only a 4-byte/cell surface map when soil or cover changes. */
export class GpuGroundGrassLayer {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.MeshStandardNodeMaterial>;
  readonly map = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat);
  private readonly gridOrigin = uniform(new THREE.Vector2());
  private readonly gridWidth = uniform(1);
  private readonly slotsPerCell = uniform(1);
  private readonly zoomVisibility = uniform(1);
  private readonly dimensions = uniform(new THREE.Vector2(1, 1));
  private previousTiles: World['tiles'] | undefined;
  private previousStructures: World['structures'] | undefined;
  private previousResources: World['resources'] | undefined;
  private previousPiles: World['piles'] | undefined;
  private previousPacked: World['packed'] | undefined;
  private previousSeed = Number.NaN;
  private previousBiome: NonNullable<World['site']>['biome'] | undefined;
  private previousPixels = new Uint8Array(0);
  private previousBlocked = new Uint8Array(0);
  private revision = 0;
  private readonly corner = new THREE.Vector3();
  private readonly ray = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly footprint = new Float64Array(8);

  constructor(configure?: (material: THREE.MeshStandardNodeMaterial) => void) {
    this.map.colorSpace = THREE.SRGBColorSpace;
    this.map.magFilter = this.map.minFilter = THREE.NearestFilter;
    this.map.generateMipmaps = false;
    this.map.needsUpdate = true;
    const material = new THREE.MeshStandardNodeMaterial({
      color: 0xffffff, roughness: .93, metalness: 0, flatShading: true, side: THREE.DoubleSide,
    });
    const groundColour = varyingProperty('vec3', 'groundGrassColour');
    material.positionNode = Fn(() => {
      // instanceIndex maps to an integer world cell and a stable local slot.
      // Camera movement changes only the integer window origin; resizing that
      // window or its density never changes roots of the slots it retains.
      const index = float(instanceIndex);
      const cellIndex = index.div(this.slotsPerCell).floor();
      const slot = index.mod(this.slotsPerCell);
      const cellX = this.gridOrigin.x.add(cellIndex.mod(this.gridWidth));
      const cellZ = this.gridOrigin.y.add(cellIndex.div(this.gridWidth).floor());
      const key = uint(cellX).mul(uint(73856093))
        .bitXor(uint(cellZ).mul(uint(19349663)))
        .bitXor(uint(slot).mul(uint(83492791)));
      const bx = cellX.add(hash(key).mul(.96).sub(.48));
      const bz = cellZ.add(hash(key.add(uint(11))).mul(.96).sub(.48));
      const root = vec2(bx, bz);
      const sampled = texture(this.map, root.add(.5).div(this.dimensions)).level(float(0));
      groundColour.assign(sampled.rgb);
      const coverage = sampled.a.mul(this.zoomVisibility);
      const yaw = hash(key.add(uint(29))).mul(Math.PI * 2);
      const c = yaw.cos(), s = yaw.sin();
      const height = hash(key.add(uint(43))).mul(.17).add(.21).mul(coverage);
      const width = hash(key.add(uint(59))).mul(.45).add(.76).mul(coverage);
      const bladeT = uv().y;
      const sway = sin(time.mul(1.7).add(bx.mul(.31)).add(bz.mul(.23)).add(yaw))
        .mul(.026).mul(bladeT.mul(bladeT));
      const side = positionLocal.x.mul(width), lean = positionLocal.z.mul(width);
      return vec3(
        bx.add(side.mul(c)).add(lean.mul(s)).add(sway),
        positionLocal.y.mul(height).add(.021),
        bz.add(lean.mul(c)).sub(side.mul(s)).add(sway.mul(.35)),
      );
    })();
    // Match TerrainLayer's albedo and vertical normal exactly. As in
    // AntSystem, the three-dimensional silhouette makes the grass visible.
    material.colorNode = groundColour;
    material.normalNode = transformNormalToView(vec3(0, 1, 0));
    configure?.(material);
    this.mesh = new THREE.Mesh(bladeGeometry(), material);
    this.mesh.name = 'GPU decorative soil grass';
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.visible = false;
  }

  /** Cheap on ordinary snapshots. A changed tiles/structures collection is
   * checked against the previous pixels; health/damage-only edits do not upload. */
  update(world: World, force = false): void {
    const widthChanged = this.map.image.width !== world.width || this.map.image.height !== world.height ||
      this.previousPixels.length !== world.width * world.height * 4;
    const biome = world.site?.biome;
    if (!force && !widthChanged && this.previousTiles === world.tiles &&
      this.previousStructures === world.structures && this.previousSeed === world.seed &&
      this.previousResources === world.resources &&
      this.previousPiles === world.piles && this.previousPacked === world.packed &&
      this.previousBiome === biome) return;
    const oldTiles = this.previousTiles, oldBlocked = this.previousBlocked;
    const seedChanged = this.previousSeed !== world.seed || this.previousBiome !== biome;
    let surfaceChanged = widthChanged;
    if (!surfaceChanged && oldTiles !== world.tiles) {
      for (let i = 0; i < world.tiles.length; i++) {
        if (oldTiles?.[i]?.terrain !== world.tiles[i]!.terrain ||
          oldTiles[i]?.floor !== world.tiles[i]!.floor) { surfaceChanged = true; break; }
      }
    }
    const coverSourcesChanged = surfaceChanged || this.previousStructures !== world.structures ||
      this.previousResources !== world.resources || this.previousPiles !== world.piles ||
      this.previousPacked !== world.packed || force;
    let blocked = coverSourcesChanged ? coverMask(world) : oldBlocked;
    let blockerChanged = widthChanged;
    if (coverSourcesChanged && !widthChanged) {
      for (let i = 0; i < blocked.length; i++) {
        if (blocked[i] !== oldBlocked[i]) { blockerChanged = true; break; }
      }
      if (!blockerChanged) blocked = oldBlocked;
    }
    this.previousTiles = world.tiles; this.previousStructures = world.structures;
    this.previousResources = world.resources;
    this.previousPiles = world.piles; this.previousPacked = world.packed;
    this.previousSeed = world.seed; this.previousBiome = biome;
    this.previousBlocked = blocked;
    if (widthChanged) {
      this.previousPixels = new Uint8Array(world.width * world.height * 4);
      for (let i = 0; i < world.tiles.length; i++)
        writeGroundCell(this.previousPixels, world, i, blocked);
      this.map.dispose();
      this.map.image = { data: this.previousPixels, width: world.width, height: world.height };
      this.dimensions.value.set(world.width, world.height);
      this.map.needsUpdate = true; this.revision++;
      return;
    }
    if (!force && !seedChanged && oldTiles === world.tiles && !blockerChanged) return;
    // Most engine snapshots share immutable tile objects. Mining damage or
    // door activity can replace collections without changing grass coverage.
    let changed = false;
    for (let i = 0; i < world.tiles.length; i++) {
      const before = oldTiles?.[i], after = world.tiles[i]!;
      if (!force && !seedChanged && before && before.terrain === after.terrain &&
        before.floor === after.floor && oldBlocked[i] === blocked[i]) continue;
      changed = writeGroundCell(this.previousPixels, world, i, blocked) || changed;
    }
    if (changed) { this.map.needsUpdate = true; this.revision++; }
  }

  /** Constant CPU work per image; no map walk, position buffer or simulation
   * mutation. A one-cell margin covers projected blade tips near the screen;
   * fixed world cells keep the roots stable under camera rotation and zoom. */
  present(camera: THREE.Camera, _target: THREE.Vector3, _span: number, pixelsPerCell: number): void {
    // Thin subpixel blades become aliasing and vertex work, not useful detail.
    // Fade their size and density between 20 and 30 pixels/cell, then submit
    // nothing in the overview. The near field retains its original detail.
    if (pixelsPerCell <= 20 || this.map.image.width <= 1) {
      this.mesh.geometry.instanceCount = 0; this.mesh.visible = false; return;
    }
    const zoomT = Math.min(1, (pixelsPerCell - 20) / 10);
    const zoomVisibility = zoomT * zoomT * (3 - 2 * zoomT);
    camera.updateMatrixWorld();
    camera.getWorldDirection(this.forward);
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    let valid = true;
    let cornerIndex = 0;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      // An orthographic ray starts on the near plane; a midpoint of a long
      // depth range may already lie below the ground and miss backwards.
      this.corner.set(sx, sy, camera instanceof THREE.OrthographicCamera ? -1 : .5).unproject(camera);
      if (camera instanceof THREE.OrthographicCamera) {
        this.ray.copy(this.forward);
      } else {
        this.ray.copy(this.corner).sub(camera.position).normalize();
        this.corner.copy(camera.position);
      }
      if (this.ray.y >= -.025) { valid = false; break; }
      const distance = -this.corner.y / this.ray.y;
      if (distance < 0) { valid = false; break; }
      const x = this.corner.x + distance * this.ray.x, z = this.corner.z + distance * this.ray.z;
      this.footprint[cornerIndex++] = x;
      this.footprint[cornerIndex++] = z;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
    let budgetCells = valid ? worldCellBudget(this.footprint, camera instanceof THREE.OrthographicCamera) : 0;
    if (!valid) {
      // A near-horizon ray can hit ground beyond any fixed target radius.
      // The finite map itself is the conservative fallback; the GPU frustum
      // clips its fragments and the global vertex budget still applies.
      minX = -.5; maxX = this.map.image.width - .5;
      minZ = -.5; maxZ = this.map.image.height - .5;
      budgetCells = this.map.image.width * this.map.image.height;
    }
    minX = Math.max(-.5, minX); maxX = Math.min(this.map.image.width - .5, maxX);
    minZ = Math.max(-.5, minZ); maxZ = Math.min(this.map.image.height - .5, maxZ);
    if (minX >= maxX || minZ >= maxZ) {
      this.mesh.geometry.instanceCount = 0; this.mesh.visible = false; return;
    }
    const firstX = Math.max(0, Math.floor(minX + .5) - 1);
    const lastX = Math.min(this.map.image.width - 1, Math.floor(maxX + .5) + 1);
    const firstZ = Math.max(0, Math.floor(minZ + .5) - 1);
    const lastZ = Math.min(this.map.image.height - 1, Math.floor(maxZ + .5) + 1);
    const columns = lastX - firstX + 1, rows = lastZ - firstZ + 1;
    const cells = columns * rows;
    if (cells <= 0) {
      this.mesh.geometry.instanceCount = 0; this.mesh.visible = false; return;
    }
    // The footprint shrinks as the player zooms in: invest saved vertex budget
    // in more fixed slots per cell, never in a larger total submission.
    const closeBoost = Math.max(0, Math.min(1, (pixelsPerCell - 75) / 30));
    const desiredSlots = Math.min(224,
      Math.floor((20 + Math.max(0, pixelsPerCell - 30) * .7 + 110 * closeBoost) * zoomVisibility));
    // A rotation changes the axis-aligned rectangle, but not the edge lengths
    // of its ground parallelogram. Reserve against its yaw-invariant maximum
    // AABB so slots per cell do not pulse as the player rotates the camera.
    budgetCells = Math.min(this.map.image.width * this.map.image.height, Math.max(cells, budgetCells));
    const slots = Math.min(desiredSlots, Math.floor(GROUND_GRASS_MAX_BLADES / budgetCells));
    if (slots < 1) {
      this.mesh.geometry.instanceCount = 0; this.mesh.visible = false; return;
    }
    this.gridOrigin.value.set(firstX, firstZ);
    this.gridWidth.value = columns;
    this.slotsPerCell.value = slots;
    this.zoomVisibility.value = zoomVisibility;
    this.mesh.geometry.instanceCount = cells * slots;
    this.mesh.visible = true;
  }

  prepareForCompile(): () => void {
    const revision = this.revision, visible = this.mesh.visible, count = this.mesh.geometry.instanceCount;
    this.mesh.visible = true; this.mesh.geometry.instanceCount = Math.max(1, count);
    return () => { if (revision === this.revision) {
      this.mesh.geometry.instanceCount = count; this.mesh.visible = visible;
    } };
  }

  dispose(): void { this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.map.dispose(); }
}
