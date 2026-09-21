import * as THREE from 'three/webgpu';
import { attribute, texture, uv, vec2 } from 'three/tsl';
import type { Job, World } from '../sim/types';
import { floraSize, floraTreeHeight } from './flora-presentation';
import { WORLD_SCALE } from '../world/scale';

export const DESIGNATION_ICON_KINDS = ['mine', 'chop', 'harvest', 'cut'] as const;
export type DesignationIconKind = typeof DESIGNATION_ICON_KINDS[number];
const ICON_INDEX: Readonly<Record<DesignationIconKind, number>> = { mine: 0, chop: 1, harvest: 2, cut: 3 };

export const isIconDesignationKind = (kind: Job['kind']): kind is DesignationIconKind =>
  (DESIGNATION_ICON_KINDS as readonly string[]).includes(kind);

export interface DesignationIconInstance { x: number; y: number; z: number; icon: number }
export function designationIconInstances(world: World): DesignationIconInstance[] {
  const jobs=world.jobs.filter(job => isIconDesignationKind(job.kind));
  const trees=jobs.some(j=>j.kind==='chop')?new Map(world.resources.filter(r=>r.kind==='tree').map(r=>[r.z*world.width+r.x,r])):undefined;
  return jobs.map(job => {
    const tree=trees?.get(job.z*world.width+job.x);
    const y=job.kind==='chop'?(tree?.species?floraTreeHeight(tree)*floraSize(world,tree)*1.05:WORLD_SCALE.treeMaxHeight)+.55:job.kind==='mine'?3.2:1.08;
    return { x: job.x, y, z: job.z, icon: ICON_INDEX[job.kind as DesignationIconKind] };
  });
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

/** One resident instanced sprite draw. SpriteNodeMaterial performs camera-facing
 * orientation in the vertex shader; snapshots upload only positions/icon cells. */
export class DesignationIconLayer {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.SpriteNodeMaterial>;
  private readonly fallback = fallbackAtlas();
  private readonly atlasNode = texture(this.fallback);
  private loaded: THREE.Texture | undefined;
  private capacity = 16;
  private key = '';
  private disposed = false;

  constructor() {
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-.5, -.5, 0, .5, -.5, 0, -.5, .5, 0, .5, .5, 0], 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    geometry.setIndex([0, 1, 2, 2, 1, 3]);
    geometry.instanceCount = 0;
    geometry.setAttribute('designationPosition', new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('designationIcon', new THREE.InstancedBufferAttribute(new Float32Array(this.capacity), 1).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.SpriteNodeMaterial({ transparent: true, depthTest: false, depthWrite: false, alphaTest: .12 });
    material.positionNode = attribute('designationPosition', 'vec3');
    material.scaleNode = vec2(.78);
    const atlasUv = vec2(uv().x.add(attribute('designationIcon', 'float')).div(4), uv().y.div(5).add(.8));
    material.colorNode = this.atlasNode.sample(atlasUv);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'designation-icon-billboards';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    new THREE.TextureLoader().load('/assets/ui/lisiere/icons.png', loaded => {
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
    const instances = designationIconInstances(world);
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
    this.mesh.geometry.instanceCount = instances.length;
    positions.needsUpdate = icons.needsUpdate = true;
  }

  private allocate(capacity: number): void {
    this.capacity = capacity;
    this.mesh.geometry.setAttribute('designationPosition', new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.mesh.geometry.setAttribute('designationIcon', new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage));
  }

  prepareForCompile(): () => void {
    if (this.mesh.geometry.instanceCount) return () => {};
    this.mesh.geometry.instanceCount = 1;
    return () => { if (!this.key) this.mesh.geometry.instanceCount = 0; };
  }

  dispose(): void {
    this.disposed = true;
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.fallback.dispose();
    this.loaded?.dispose();
  }
}
