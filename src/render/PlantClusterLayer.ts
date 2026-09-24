import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Resource, World } from '../sim/types';
import { floraColor, floraSize, isClusterPlantSpecies } from './flora-presentation';
import { noise } from './StaticGeometry';
import type { NaturalPresentationChange } from './NaturalResourcePresentation';

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
export function plantClusterPresentation(world: World, resource: Resource, size = floraSize(world, resource)): PlantClusterPresentation {
  const turn = noise(resource.x, resource.z, resource.id + 311);
  const width = .78 + noise(resource.x, resource.z, resource.id + 503) * .34;
  const height = resource.species === 'tall-grass' ? .78 : .46;
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
  private readonly slots = new Map<number, { index: number; signature: string }>();
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

  update(world: World, reset: boolean, changes?: ReadonlyMap<number, NaturalPresentationChange>): void {
    if (reset) {
      this.slots.clear();
      this.free.length = 0;
      this.used = 0;
      this.mesh.count = 0;
    }
    const plants = !reset&&changes
      ? [...changes.values()].flatMap(({resource})=>resource&&isClusterPlantSpecies(resource.species)?[resource]:[])
      : world.resources.filter(resource => isClusterPlantSpecies(resource.species));
    const alive = !reset&&changes ? undefined : new Set(plants.map(resource => resource.id));
    if(changes&&!reset&&!plants.length&&![...changes.keys()].some(id=>this.slots.has(id)))return;
    let firstMatrix = Infinity, lastMatrix = -1;
    let firstColor = Infinity, lastColor = -1;
    const removed = alive
      ? [...this.slots].filter(([id])=>!alive.has(id))
      : [...changes!].filter(([id,{resource}])=>this.slots.has(id)&&(!resource||!isClusterPlantSpecies(resource.species)))
        .map(([id])=>[id,this.slots.get(id)!] as const);
    for (const [id, slot] of removed) {
      this.transform.scale.setScalar(0);
      this.transform.updateMatrix();
      this.mesh.setMatrixAt(slot.index, this.transform.matrix);
      firstMatrix = Math.min(firstMatrix, slot.index);
      lastMatrix = Math.max(lastMatrix, slot.index);
      this.slots.delete(id);
      this.free.push(slot.index);
    }
    const additions=plants.reduce((count,plant)=>count+(this.slots.has(plant.id)?0:1),0);
    this.ensureCapacity(Math.max(1,this.used+Math.max(0,additions-this.free.length)));
    let visibleCount = removed.length ? 0 : this.mesh.count;
    for (const plant of plants) {
      let slot = this.slots.get(plant.id);
      if (slot === undefined) {
        slot = { index: this.free.pop() ?? this.used++, signature: '' };
        this.slots.set(plant.id, slot);
      }
      visibleCount = Math.max(visibleCount, slot.index + 1);
      // Only the four visible growth stages, species and position affect this
      // deterministic tuft. Other resource edits must not rewrite its buffers.
      const size=changes?.get(plant.id)?.size??floraSize(world,plant);
      const signature = `${plant.species}:${plant.x}:${plant.z}:${size}`;
      if (slot.signature === signature) continue;
      slot.signature = signature;
      const presentation = plantClusterPresentation(world, plant, size);
      this.transform.position.set(plant.x, .018, plant.z);
      this.transform.rotation.set(0, presentation.rotation, 0);
      this.transform.scale.set(presentation.scaleX, presentation.scaleY, presentation.scaleZ);
      this.transform.updateMatrix();
      this.mesh.setMatrixAt(slot.index, this.transform.matrix);
      this.mesh.setColorAt(slot.index, this.color.setHex(presentation.color));
      firstMatrix = Math.min(firstMatrix, slot.index);
      lastMatrix = Math.max(lastMatrix, slot.index);
      firstColor = Math.min(firstColor, slot.index);
      lastColor = Math.max(lastColor, slot.index);
    }
    if(removed.length)for(const slot of this.slots.values())visibleCount=Math.max(visibleCount,slot.index+1);
    this.mesh.count = visibleCount;
    if (lastMatrix >= 0 && visibleCount) {
      this.mesh.instanceMatrix.clearUpdateRanges();
      this.mesh.instanceMatrix.addUpdateRange(firstMatrix * 16, (lastMatrix - firstMatrix + 1) * 16);
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.computeBoundingSphere();
    }
    if (lastColor >= 0 && visibleCount) {
      this.mesh.instanceColor!.clearUpdateRanges();
      this.mesh.instanceColor!.addUpdateRange(firstColor * 3, (lastColor - firstColor + 1) * 3);
      this.mesh.instanceColor!.needsUpdate = true;
    }
  }

  instanceCount(): number { return this.mesh.count; }

  dispose(): void {
    this.mesh.dispose();
    this.geometry.dispose();
  }
}
