import * as THREE from 'three/webgpu';
import { material } from './primitives';
import type { Placement } from './primitives';

const object = new THREE.Object3D(), color = new THREE.Color();
type Style = 'solid' | 'overlay' | 'wire' | 'storage' | 'border';

/** Shared pipelines and geometry; changing quantity never creates a material.
 * Each logical batch retains its GPU allocation, including when emptied.
 * Capacity grows geometrically only when content exceeds its high-water mark.
 */
export class BoxBatches {
  private readonly geometry = new THREE.BoxGeometry(1, 1, 1);
  private readonly materials: Record<Style, THREE.Material> = {
    solid: material(0xffffff),
    storage: new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }),
    border: new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.76, depthWrite: false }),
    overlay: new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.48, depthWrite: false }),
    wire: new THREE.MeshBasicNodeMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.65, depthWrite: false }),
  };
  private readonly batches = new Map<string, THREE.InstancedMesh>();

  constructor() {
    this.geometry.userData.rendererOwned = true;
    for (const mat of Object.values(this.materials)) mat.userData.rendererOwned = true;
  }

  set(group: THREE.Group, key: string, items: Placement[], style: Style = 'solid', shadows = true): void {
    let mesh = this.batches.get(key);
    if (!mesh) {
      mesh = new THREE.InstancedMesh(this.geometry, this.materials[style], Math.max(256, 2 ** Math.ceil(Math.log2(items.length || 1))));
      mesh.name = key; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(mesh.instanceMatrix.count * 3), 3).setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = style === 'solid' && shadows; mesh.receiveShadow = true;
      group.add(mesh); this.batches.set(key, mesh);
    } else if (items.length > mesh.instanceMatrix.count) {
      // Release the old per-instance buffers before replacing their capacity.
      mesh.dispose();
      const capacity = 2 ** Math.ceil(Math.log2(items.length));
      mesh.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 16), 16).setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
    }
    mesh.count = items.length;
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      object.position.set(item.x, item.y, item.z); object.rotation.set(0, item.ry ?? 0, 0);
      object.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1); object.updateMatrix();
      mesh.setMatrixAt(i, object.matrix); mesh.setColorAt(i, color.setHex(item.color ?? 0xffffff));
    }
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor!.needsUpdate = true;
    mesh.computeBoundingSphere();
  }

  clear(): void {
    for (const mesh of this.batches.values()) { mesh.removeFromParent(); mesh.dispose(); }
    this.batches.clear();
  }

  dispose(): void { this.clear(); this.geometry.dispose(); for (const mat of Object.values(this.materials)) mat.dispose(); }
}
