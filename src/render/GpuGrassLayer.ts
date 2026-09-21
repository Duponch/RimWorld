import * as THREE from 'three/webgpu';
import {
  Fn, float, floor, hash, instanceIndex, length, max, mix, positionLocal,
  select, sin, cos, smoothstep, step, texture, transformNormalToView, uniform, uint,
  uv, varyingProperty, vec2, vec3,
} from 'three/tsl';
import { footprintCells } from '../sim/definitions';
import type { Resource, World } from '../sim/types';
import { weatherWindFactor } from '../sim/weather';

const FIELD_RADIUS = 34;
const BLADES_PER_SQUARE = 24;
const MAX_BLADES = 120_000;

export const isGpuGrassResource = (resource: Pick<Resource, 'species'>): boolean =>
  resource.species === 'grass' || resource.species === 'tall-grass';

/** RGBA mask: ordinary grass terrain, short grass plant, tall grass plant, usable.
 * It is an upload-time view only; gameplay resources remain authoritative. */
export function buildGrassMask(world: World): Uint8Array {
  const data = new Uint8Array(world.width * world.height * 4);
  for (let index = 0; index < world.tiles.length; index++) {
    if (world.tiles[index]!.terrain !== 'grass' || !!world.tiles[index]!.floor) continue;
    data[index * 4] = 255;
    data[index * 4 + 3] = 255;
  }
  for (const resource of world.resources) {
    const index = resource.z * world.width + resource.x;
    if (index < 0 || index >= world.tiles.length) continue;
    const offset = index * 4;
    data[offset] = data[offset + 1] = data[offset + 2] = data[offset + 3] = 0;
    if (world.tiles[index]!.floor) continue;
    if (resource.species === 'grass') data[offset + 1] = data[offset + 3] = 255;
    else if (resource.species === 'tall-grass') data[offset + 2] = data[offset + 3] = 255;
  }
  for (const structure of world.structures) for (const cell of footprintCells(structure)) {
    if (cell.x < 0 || cell.z < 0 || cell.x >= world.width || cell.z >= world.height) continue;
    data.fill(0, (cell.z * world.width + cell.x) * 4, (cell.z * world.width + cell.x) * 4 + 4);
  }
  return data;
}

export function grassBladeCount(cameraHeight: number, distant: boolean): number {
  const near = THREE.MathUtils.clamp(1 - (Math.max(0, cameraHeight) - 8) / 70, 0, 1);
  const ratio = distant ? 0.12 : 0.12 + near * near * 0.88;
  return Math.min(MAX_BLADES, Math.round(BLADES_PER_SQUARE * 4 * FIELD_RADIUS * FIELD_RADIUS * ratio));
}

/** Camera-following GPU grass adapted from AntSystem's grass.js. Stable roots,
 * orientation, shape and wind are all derived in the shader from instanceIndex.
 * CPU work is limited to scalar uniforms and mask uploads on world changes. */
export class GpuGrassLayer {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.MeshStandardNodeMaterial>;
  private readonly mask = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  private readonly mapSize = uniform(new THREE.Vector2(1, 1));
  private readonly centre = uniform(new THREE.Vector2());
  private readonly radius = uniform(FIELD_RADIUS);
  private readonly tick = uniform(0);
  private readonly windDirection = uniform(new THREE.Vector2(1, 0));
  private readonly windStrength = uniform(1);
  private readonly forward = new THREE.Vector3();
  private appliedMapKey = '';
  private appliedTileKey = '';
  private appliedResourceKey = '';
  private appliedStructureKey = '';
  private tileSource: World['tiles'] | undefined;
  private resourceSource: World['resources'] | undefined;
  private structureSource: World['structures'] | undefined;
  private tileKey = '';
  private resourceKey = '';
  private structureKey = '';

  constructor(configure?: (material: THREE.MeshStandardNodeMaterial) => void) {
    this.mask.minFilter = this.mask.magFilter = THREE.NearestFilter;
    this.mask.generateMipmaps = false;
    this.mask.needsUpdate = true;
    const maskNode = texture(this.mask);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      -.038, 0, 0, .038, 0, 0, -.003, 1, .035, .003, 1, .035,
    ], 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    geometry.setIndex([0, 2, 1, 1, 2, 3]);
    geometry.instanceCount = grassBladeCount(0, false);

    const material = new THREE.MeshStandardNodeMaterial({ roughness: .95, metalness: 0, side: THREE.DoubleSide });
    material.positionNode = Fn(() => {
      const period = this.radius.mul(2);
      const localX = hash(instanceIndex).mul(period);
      const localZ = hash(instanceIndex.add(uint(11))).mul(period);
      const rootX = localX.add(floor(this.centre.x.sub(localX).div(period).add(.5)).mul(period)).toVar();
      const rootZ = localZ.add(floor(this.centre.y.sub(localZ).div(period).add(.5)).mul(period)).toVar();
      const root = vec2(rootX, rootZ);
      varyingProperty('vec2', 'vLisiereGrassRoot').assign(root);
      const inBounds = rootX.greaterThanEqual(-.45).and(rootZ.greaterThanEqual(-.45))
        .and(rootX.lessThan(this.mapSize.x.sub(.55))).and(rootZ.lessThan(this.mapSize.y.sub(.55)));
      const cell = maskNode.sample(root.add(.5).div(this.mapSize)).level(float(0));
      const present = max(cell.r, max(cell.g, cell.b));
      const density = mix(.27, .92, max(cell.g, cell.b));
      const rootMask = select(inBounds, present.mul(step(hash(instanceIndex.add(uint(101))), density)), 0);
      const edge = float(1).sub(smoothstep(this.radius.mul(.86), this.radius, length(root.sub(this.centre))));
      const visible = rootMask.mul(edge);
      const tall = cell.b;
      const plant = max(cell.g, tall);
      const bladeT = uv().y;
      const yaw = hash(instanceIndex.add(uint(29))).mul(Math.PI * 2);
      const c = cos(yaw), s = sin(yaw);
      const height = mix(.18, .34, hash(instanceIndex.add(uint(43))))
        .mul(mix(1, mix(1.15, 2.15, tall), plant)).mul(visible);
      const width = mix(.72, 1.27, hash(instanceIndex.add(uint(59)))).mul(visible);
      const local = positionLocal.mul(vec3(width, height, width));
      const swayPhase = this.tick.mul(.0225).add(yaw).add(rootX.mul(.17)).add(rootZ.mul(.11));
      const sway = sin(swayPhase).mul(this.windStrength).mul(bladeT.mul(bladeT)).mul(.075);
      const leanAngle = hash(instanceIndex.add(uint(83))).mul(Math.PI * 2);
      const lean = hash(instanceIndex.add(uint(57))).mul(bladeT.mul(bladeT)).mul(height).mul(.12);
      return vec3(
        rootX.add(local.x.mul(c)).add(local.z.mul(s)).add(this.windDirection.x.mul(sway)).add(cos(leanAngle).mul(lean)),
        local.y.add(.018),
        rootZ.add(local.z.mul(c)).sub(local.x.mul(s)).add(this.windDirection.y.mul(sway)).add(sin(leanAngle).mul(lean)),
      );
    })();
    const root = varyingProperty('vec2', 'vLisiereGrassRoot');
    const sampled = maskNode.sample(root.add(.5).div(this.mapSize)).level(float(0));
    material.colorNode = Fn(() => {
      const randomTint = mix(.84, 1.12, hash(instanceIndex.add(uint(71))));
      const base = vec3(.45, .55, .33);
      const shortPlant = vec3(.57, .58, .34);
      const tallPlant = vec3(.49, .54, .31);
      return mix(mix(base, shortPlant, sampled.g), tallPlant, sampled.b).mul(randomTint);
    })();
    material.normalNode = transformNormalToView(vec3(0, 1, 0));
    configure?.(material);
    material.userData.rendererOwned = true;
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'gpu-grass-blades';
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
  }

  update(world: World): void {
    if (this.tileSource !== world.tiles) {
      this.tileSource = world.tiles;
      this.tileKey = world.tiles.map(tile => `${tile.terrain}:${tile.floor ?? ''}`).join(',');
    }
    if (this.resourceSource !== world.resources) {
      this.resourceSource = world.resources;
      this.resourceKey = world.resources.map(resource => `${resource.id}:${resource.kind}:${resource.species ?? ''}:${resource.x}:${resource.z}`).join('|');
    }
    if (this.structureSource !== world.structures) {
      this.structureSource = world.structures;
      this.structureKey = world.structures.map(structure => `${structure.id}:${structure.kind}:${structure.x}:${structure.z}:${structure.orientation}:${structure.footprint}`).join('|');
    }
    const mapKey = `${world.seed}:${world.width}:${world.height}`;
    if (mapKey !== this.appliedMapKey || this.tileKey !== this.appliedTileKey || this.resourceKey !== this.appliedResourceKey || this.structureKey !== this.appliedStructureKey) {
      this.appliedMapKey = mapKey;
      this.appliedTileKey = this.tileKey;
      this.appliedResourceKey = this.resourceKey;
      this.appliedStructureKey = this.structureKey;
      if (this.mask.image.width !== world.width || this.mask.image.height !== world.height) this.mask.dispose();
      this.mask.image = { data: buildGrassMask(world), width: world.width, height: world.height };
      this.mapSize.value.set(world.width, world.height);
      this.mask.needsUpdate = true;
    }
    const angle = ((world.wind?.seed ?? world.seed) % 6283) / 1000;
    this.windDirection.value.set(Math.cos(angle), Math.sin(angle));
    this.windStrength.value = .65 + .3 * weatherWindFactor(world);
  }

  present(camera: THREE.Camera, confirmedTick: number, distant: boolean): void {
    camera.getWorldDirection(this.forward);
    const ahead = Math.max(0, camera.position.y) / Math.max(.05, -this.forward.y);
    this.centre.value.set(camera.position.x + this.forward.x * ahead, camera.position.z + this.forward.z * ahead);
    this.tick.value = confirmedTick;
    this.mesh.geometry.instanceCount = grassBladeCount(camera.position.y, distant);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mask.dispose();
  }
}
