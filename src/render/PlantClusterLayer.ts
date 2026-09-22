import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Resource, World } from '../sim/types';
import { floraColor, floraSize, isClusterPlantSpecies } from './flora-presentation';
import { noise } from './StaticGeometry';

const BASE_STEMS = [
  { x: 0, z: 0, height: 1, leanX: .04, leanZ: -.025 },
  { x: -.13, z: .05, height: .78, leanX: -.10, leanZ: .035 },
  { x: .12, z: -.04, height: .86, leanX: .09, leanZ: -.04 },
  { x: -.05, z: -.13, height: .68, leanX: -.035, leanZ: -.10 },
  { x: .06, z: .14, height: .73, leanX: .045, leanZ: .11 },
  { x: -.17, z: -.10, height: .58, leanX: -.12, leanZ: -.07 },
  { x: .17, z: .09, height: .63, leanX: .13, leanZ: .065 },
] as const;

/** One low-poly 3D tuft shared by every physical grass plant. Stems are narrow,
 * upright tapered prisms; variation belongs to instance transforms and colors. */
export function createPlantClusterGeometry(): THREE.BufferGeometry {
  const parts = BASE_STEMS.map(({ x, z, height, leanX, leanZ }, index) => {
    // An open triangular prism gives the stem real volume for three side
    // triangles only. Seven stems therefore remain cheaper than one small
    // conventional cylinder per plant.
    const stem = new THREE.ConeGeometry(.024 + index % 3 * .003, height, 3, 1, true);
    stem.rotateX(leanZ);
    stem.rotateZ(-leanX);
    stem.translate(x, height * .5, z);
    return stem;
  });
  const geometry = mergeGeometries(parts, false);
  parts.forEach(part => part.dispose());
  if (!geometry) throw new Error('Could not assemble plant cluster geometry');
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3).fill(1), 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export interface PlantClusterPresentation {
  rotation: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  color: number;
}

/** Position/species alone determine the silhouette, so a reload cannot reshuffle
 * the field and presentation never consumes the simulation PRNG. */
export function plantClusterPresentation(world: World, resource: Resource): PlantClusterPresentation {
  const turn = noise(resource.x, resource.z, resource.id + 311);
  const width = .78 + noise(resource.x, resource.z, resource.id + 503) * .34;
  const height = resource.species === 'tall-grass' ? .78 : .46;
  const size = floraSize(world, resource);
  const base = new THREE.Color(floraColor(resource));
  base.offsetHSL((turn - .5) * .025, (noise(resource.x, resource.z, resource.id + 701) - .5) * .12, (turn - .5) * .10);
  return {
    rotation: turn * Math.PI * 2,
    scaleX: width * size,
    scaleY: height * (.88 + noise(resource.x, resource.z, resource.id + 887) * .24) * size,
    scaleZ: (1.12 - width * .12) * size,
    color: base.getHex(),
  };
}

/** A single resident instanced draw covers short and tall physical grasses.
 * Slots survive ordinary snapshots; only changed collections/growth stages upload. */
export class PlantClusterLayer {
  readonly group = new THREE.Group();
  private readonly geometry = createPlantClusterGeometry();
  private mesh: THREE.InstancedMesh;
  private readonly slots = new Map<number, number>();
  private readonly free: number[] = [];
  private readonly transform = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private used = 0;

  constructor(private readonly material: THREE.Material) {
    this.mesh = this.createMesh(128);
    this.group.name = 'plant-cluster-layer';
    this.group.add(this.mesh);
  }

  private createMesh(capacity: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    mesh.name = 'upright-plant-clusters';
    mesh.instanceMatrix = new THREE.StorageInstancedBufferAttribute(capacity, 16);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.count = 0;
    mesh.setColorAt(0, this.color.setHex(0x819356));
    mesh.instanceColor!.setUsage(THREE.StaticDrawUsage);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return mesh;
  }

  private ensureCapacity(required: number): void {
    if (required <= this.mesh.instanceMatrix.count) return;
    const previous = this.mesh;
    const next = this.createMesh(2 ** Math.ceil(Math.log2(required)));
    next.instanceMatrix.array.set(previous.instanceMatrix.array);
    next.instanceColor!.array.set(previous.instanceColor!.array);
    next.count = previous.count;
    this.group.remove(previous);
    previous.dispose();
    this.mesh = next;
    this.group.add(next);
  }

  prepareForCompile(): () => void {
    const count = this.mesh.count;
    this.mesh.count = Math.max(1, count);
    return () => { this.mesh.count = count; };
  }

  update(world: World, reset: boolean): void {
    if (reset) {
      this.slots.clear();
      this.free.length = 0;
      this.used = 0;
      this.mesh.count = 0;
    }
    const plants = world.resources.filter(resource => isClusterPlantSpecies(resource.species));
    const alive = new Set(plants.map(resource => resource.id));
    for (const [id, slot] of this.slots) if (!alive.has(id)) {
      this.transform.scale.setScalar(0);
      this.transform.updateMatrix();
      this.mesh.setMatrixAt(slot, this.transform.matrix);
      this.slots.delete(id);
      this.free.push(slot);
    }
    this.ensureCapacity(Math.max(1, plants.length - this.free.length + this.used));
    let visibleCount = 0;
    for (const plant of plants) {
      let slot = this.slots.get(plant.id);
      if (slot === undefined) {
        slot = this.free.pop() ?? this.used++;
        this.slots.set(plant.id, slot);
      }
      visibleCount = Math.max(visibleCount, slot + 1);
      const presentation = plantClusterPresentation(world, plant);
      this.transform.position.set(plant.x, .018, plant.z);
      this.transform.rotation.set(0, presentation.rotation, 0);
      this.transform.scale.set(presentation.scaleX, presentation.scaleY, presentation.scaleZ);
      this.transform.updateMatrix();
      this.mesh.setMatrixAt(slot, this.transform.matrix);
      this.mesh.setColorAt(slot, this.color.setHex(presentation.color));
    }
    this.mesh.count = visibleCount;
    if (visibleCount) {
      this.mesh.instanceMatrix.clearUpdateRanges();
      this.mesh.instanceMatrix.addUpdateRange(0, visibleCount * 16);
      this.mesh.instanceColor!.clearUpdateRanges();
      this.mesh.instanceColor!.addUpdateRange(0, visibleCount * 3);
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.instanceColor!.needsUpdate = true;
      this.mesh.computeBoundingSphere();
    }
  }

  instanceCount(): number { return this.mesh.count; }

  dispose(): void {
    this.mesh.dispose();
    this.geometry.dispose();
  }
}
