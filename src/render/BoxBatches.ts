import * as THREE from 'three/webgpu';
import { attribute, texture } from 'three/tsl';
import { material } from './primitives';
import type { Placement } from './primitives';
import { BoxMesh, configureBoxMaterial } from './BoxMesh';
import { createStylizedSurfaceTexture } from './stylized-surfaces';
import { instancedPatternUv } from './texture-variation';

const object = new THREE.Object3D(), color = new THREE.Color();
type Style = 'solid' | 'overlay' | 'wire' | 'storage' | 'border';

/** Shared pipelines and authored shape; changing quantity never creates a material.
 * Each logical batch retains its GPU allocation, including when emptied.
 * Capacity grows geometrically only when content exceeds its high-water mark.
 */
export class BoxBatches {
  private readonly geometry = new THREE.BoxGeometry(1, 1, 1);
  private readonly surfaceTexture = createStylizedSurfaceTexture();
  private readonly texturedSolid = material(0xffffff);
  private readonly materials: Record<Style, THREE.NodeMaterial> = {
    solid: material(0xffffff),
    storage: new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }),
    border: new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.76, depthWrite: false }),
    overlay: new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.48, depthWrite: false }),
    wire: new THREE.MeshBasicNodeMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.65, depthWrite: false }),
  };
  private readonly batches = new Map<string, BoxMesh>();
  private texturesEnabled = true;

  constructor(configure?: (material: THREE.MeshStandardNodeMaterial) => void) {
    configure?.(this.materials.solid as THREE.MeshStandardNodeMaterial);
    configure?.(this.texturedSolid);
    this.geometry.userData.rendererOwned = true;
    for (const mat of Object.values(this.materials)) { mat.userData.rendererOwned = true; configureBoxMaterial(mat); }
    this.texturedSolid.userData.rendererOwned = true;
    configureBoxMaterial(this.texturedSolid);
    this.texturedSolid.colorNode = attribute('boxColor', 'vec3').mul(texture(this.surfaceTexture, instancedPatternUv()).rgb);
  }

  /** Select a resident pipeline. The plain one has no texture node or map, so
   * disabled surfaces do no texture sampling and need no per-frame work. */
  setTexturesEnabled(enabled: boolean): void {
    if (enabled === this.texturesEnabled) return;
    this.texturesEnabled = enabled;
    const chosen = enabled ? this.texturedSolid : this.materials.solid;
    for (const mesh of this.batches.values()) {
      if (mesh.material === this.texturedSolid || mesh.material === this.materials.solid) mesh.material = chosen;
    }
  }

  set(group: THREE.Group, key: string, items: Placement[], style: Style = 'solid', shadows = true): void {
    let mesh = this.batches.get(key);
    const chosen = style === 'solid' && this.texturesEnabled ? this.texturedSolid : this.materials[style];
    if (!mesh) {
      mesh = new BoxMesh(this.geometry, chosen, Math.max(256, 2 ** Math.ceil(Math.log2(items.length || 1))));
      mesh.name = key;
      mesh.castShadow = style === 'solid' && shadows; mesh.receiveShadow = true;
      group.add(mesh); this.batches.set(key, mesh);
    } else if (items.length > mesh.instanceMatrix.count) {
      // Release the old per-instance buffers before replacing their capacity.
      const capacity = 2 ** Math.ceil(Math.log2(items.length));
      mesh.allocate(this.geometry, capacity);
    }
    if (mesh.material !== chosen) mesh.material = chosen;
    mesh.activeCount = items.length;
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      object.position.set(item.x, item.y, item.z); object.rotation.set(0, item.ry ?? 0, 0);
      object.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1); object.updateMatrix();
      mesh.setMatrixAt(i, object.matrix); mesh.setColorAt(i, color.setHex(item.color ?? 0xffffff));
    }
    mesh.instanceMatrix.needsUpdate = true; mesh.colorBuffer.needsUpdate = true;
    mesh.computeBoundingSphere();
  }

  clear(): void {
    for (const mesh of this.batches.values()) { mesh.removeFromParent(); mesh.dispose(); }
    this.batches.clear();
  }

  /** Empty batches otherwise miss the real shadow pass. Expose one degenerate
   * instance only during loading, restoring the exact resident data afterwards. */
  prepareEmptyShadows(): () => void {
    const empty=[...this.batches.values()].filter(mesh=>mesh.activeCount===0);
    const saved=empty.map(mesh=>({attribute:mesh.instanceMatrix,first:mesh.instanceMatrix.array.slice(0,16),version:mesh.instanceMatrix.version+1}));
    for(const mesh of empty) {
      mesh.instanceMatrix.array.fill(0,0,16);mesh.instanceMatrix.array[15]=1;
      mesh.instanceMatrix.needsUpdate=true;mesh.activeCount=1;
    }
    return ()=>{empty.forEach((mesh,i)=>{
      const state=saved[i]!;
      // Snapshot adoption may run while the GPU queue is draining. Never
      // overwrite a newer logical batch, even when its count is also one.
      if(mesh.instanceMatrix!==state.attribute||mesh.instanceMatrix.version!==state.version)return;
      mesh.activeCount=0;mesh.instanceMatrix.array.set(state.first,0);mesh.instanceMatrix.needsUpdate=true;
    });};
  }

  dispose(): void {
    this.clear(); this.geometry.dispose();
    for (const mat of Object.values(this.materials)) mat.dispose();
    this.texturedSolid.dispose(); this.surfaceTexture.dispose();
  }
}
