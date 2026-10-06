import * as THREE from 'three/webgpu';
import { attribute, texture } from 'three/tsl';
import { material } from './primitives';
import type { Placement } from './primitives';
import { BoxMesh, configureBoxMaterial } from './BoxMesh';
import { createStylizedSurfaceTexture } from './stylized-surfaces';
import { instancedBoxPatternUv } from './texture-variation';
import { chunkContour, configureChunkMaterial, createChunkGeometry, isSmallChunk } from './chunk-shape';
import { chunkPaintUv, createChunkSurfacePaint } from './chunk-surface-paint';

const object = new THREE.Object3D(), color = new THREE.Color();
type Style = 'solid' | 'overlay' | 'wire' | 'storage' | 'storage-home' | 'border';

/** Shared pipelines and authored shape; changing quantity never creates a material.
 * Each logical batch retains its GPU allocation, including when emptied.
 * Capacity grows geometrically only when content exceeds its high-water mark.
 */
export class BoxBatches {
  private readonly geometry = new THREE.BoxGeometry(1, 1, 1);
  private readonly roundedRockGeometry = createChunkGeometry();
  private readonly smallRockGeometry = createChunkGeometry(true);
  private readonly surfaceTexture = createStylizedSurfaceTexture();
  private readonly rockTexture = createChunkSurfacePaint();
  private readonly texturedSolid = material(0xffffff);
  private readonly plainRock = material(0xffffff);
  private readonly texturedRock = material(0xffffff);
  private readonly materials: Record<Style, THREE.NodeMaterial> = {
    solid: material(0xffffff),
    // A more discreet local presentation than Core's 0.09 ground-zone alpha.
    // The edit-only home area keeps its stronger tint on a resident batch.
    storage: new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.055, depthWrite: false }),
    'storage-home': new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }),
    border: new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }),
    overlay: new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.48, depthWrite: false }),
    wire: new THREE.MeshBasicNodeMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.65, depthWrite: false }),
  };
  private readonly batches = new Map<string, BoxMesh>();
  private furnitureRevision: object | undefined;
  furnitureStamp(): object | undefined { return this.furnitureRevision; }
  private texturesEnabled = true;
  private roundedRockWarm = false;

  constructor(configure?: (material: THREE.MeshStandardNodeMaterial) => void) {
    configure?.(this.materials.solid as THREE.MeshStandardNodeMaterial);
    configure?.(this.texturedSolid);
    configure?.(this.plainRock);
    configure?.(this.texturedRock);
    this.geometry.userData.rendererOwned = true;
    this.roundedRockGeometry.userData.rendererOwned = true;
    this.smallRockGeometry.userData.rendererOwned = true;
    for (const mat of Object.values(this.materials)) { mat.userData.rendererOwned = true; configureBoxMaterial(mat); }
    this.texturedSolid.userData.rendererOwned = true;
    configureBoxMaterial(this.texturedSolid);
    this.texturedSolid.colorNode = attribute('boxColor', 'vec3').mul(texture(this.surfaceTexture, instancedBoxPatternUv()).rgb);
    for (const mat of [this.plainRock, this.texturedRock]) {
      mat.userData.rendererOwned = true;
      configureChunkMaterial(mat);
    }
    this.texturedRock.colorNode = attribute('boxColor', 'vec3').mul(texture(this.rockTexture, chunkPaintUv()).rgb);
  }

  /** Select a resident pipeline. The plain one has no texture node or map, so
   * disabled surfaces do no texture sampling and need no per-frame work. */
  setTexturesEnabled(enabled: boolean): void {
    if (enabled === this.texturesEnabled) return;
    this.texturesEnabled = enabled;
    const chosen = enabled ? this.texturedSolid : this.materials.solid;
    for (const mesh of this.batches.values()) {
      if (mesh.material === this.texturedSolid || mesh.material === this.materials.solid) mesh.material = chosen;
      else if (mesh.material === this.texturedRock || mesh.material === this.plainRock) mesh.material = enabled ? this.texturedRock : this.plainRock;
    }
  }

  set(group: THREE.Group, key: string, items: Placement[], style: Style = 'solid', shadows = true): void {
    if (style === 'solid' && key.startsWith('pile:') && !this.roundedRockWarm) {
      // Two resident, empty sentinels warm both rock geometries even on a map
      // without fragments. They are shared across the spatial map chunks.
      for(const [suffix,geometry] of [['rounded-rock',this.roundedRockGeometry],['small-rock',this.smallRockGeometry]] as const){
        const warm = new BoxMesh(geometry, this.texturesEnabled ? this.texturedRock : this.plainRock, 1);
        this.allocateRockContour(warm);
        warm.name = `pile-${suffix}-warm`;
        warm.castShadow = shadows; warm.receiveShadow = true; warm.activeCount = 0;
        group.add(warm); this.batches.set(warm.name, warm);
      }
      this.roundedRockWarm = true;
    }
    if (style === 'solid' && (items.some(item=>item.shape==='rounded-rock') || this.batches.has(`${key}:rounded-rock`))) {
      this.setGeometry(group,key,items.filter(item=>item.shape!=='rounded-rock'),this.geometry,style,shadows);
      const rocks=items.filter(item=>item.shape==='rounded-rock');
      this.setGeometry(group,`${key}:rounded-rock`,rocks.filter(item=>!isSmallChunk(item.key,item.sx)),this.roundedRockGeometry,style,shadows);
      this.setGeometry(group,`${key}:small-rock`,rocks.filter(item=>isSmallChunk(item.key,item.sx)),this.smallRockGeometry,style,shadows);
      return;
    }
    this.setGeometry(group,key,items,this.geometry,style,shadows);
  }

  /** Replace an already-owned, constant-length furniture contribution in the
   * existing batch. Full uploads and the historical ordered sphere fold are
   * retained; only unchanged instance transforms avoid recomputation. */
  patchFurniture(group: THREE.Group, key: string, start: number, items: Placement[], totalCount: number, stamp: object): boolean {
    return this.patchFurnitureBatch(group,key,[{start,items}],totalCount,stamp);
  }

  patchFurnitureBatch(group: THREE.Group, key: string, patches: readonly {start:number;items:Placement[]}[], totalCount: number, stamp: object): boolean {
    const mesh=this.batches.get(key);
    if(key!=='furniture'||stamp!==this.furnitureRevision||!mesh||mesh.parent!==group||mesh.activeCount!==totalCount
      ||patches.length===0||mesh.geometry.hasAttribute('chunkContour'))return false;
    let last=0;
    for(const patch of patches){
      if(!Number.isSafeInteger(patch.start)||patch.start<last||patch.start+patch.items.length>totalCount)return false;
      last=patch.start+patch.items.length;
    }
    for(const patch of patches)for(let offset=0;offset<patch.items.length;offset++){
      const item=patch.items[offset]!,i=patch.start+offset;
      object.position.set(item.x,item.y,item.z);object.rotation.set(0,item.ry??0,0);
      object.scale.set(item.sx??1,item.sy??1,item.sz??1);object.updateMatrix();
      mesh.setMatrixAt(i,object.matrix);mesh.setColorAt(i,color.setHex(item.color??0xffffff));
    }
    mesh.instanceMatrix.needsUpdate=true;mesh.colorBuffer.needsUpdate=true;
    mesh.computeBoundingSphere();
    return true;
  }

  private setGeometry(group: THREE.Group, key: string, items: Placement[], geometry: THREE.BufferGeometry, style: Style, shadows: boolean): void {
    if(key==='furniture')this.furnitureRevision={};
    let mesh = this.batches.get(key);
    const rock=geometry===this.roundedRockGeometry||geometry===this.smallRockGeometry;
    const chosen = style === 'solid' && rock
      ? (this.texturesEnabled ? this.texturedRock : this.plainRock)
      : style === 'solid' && this.texturesEnabled ? this.texturedSolid : this.materials[style];
    if (!mesh) {
      mesh = new BoxMesh(geometry, chosen, Math.max(256, 2 ** Math.ceil(Math.log2(items.length || 1))));
      if(rock)this.allocateRockContour(mesh);
      mesh.name = key;
      mesh.castShadow = style === 'solid' && shadows; mesh.receiveShadow = true;
      group.add(mesh); this.batches.set(key, mesh);
    } else if (items.length > mesh.instanceMatrix.count) {
      // Release the old per-instance buffers before replacing their capacity.
      const capacity = 2 ** Math.ceil(Math.log2(items.length));
      mesh.allocate(geometry, capacity);
      if(rock)this.allocateRockContour(mesh);
    }
    if (mesh.material !== chosen) mesh.material = chosen;
    mesh.activeCount = items.length;
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      object.position.set(item.x, item.y, item.z); object.rotation.set(0, item.ry ?? 0, 0);
      object.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1); object.updateMatrix();
      mesh.setMatrixAt(i, object.matrix); mesh.setColorAt(i, color.setHex(item.color ?? 0xffffff));
      if(rock)(mesh.geometry.getAttribute('chunkContour') as THREE.InstancedBufferAttribute).setXYZW(i,...chunkContour(item.key));
    }
    mesh.instanceMatrix.needsUpdate = true; mesh.colorBuffer.needsUpdate = true;
    if(rock)mesh.geometry.getAttribute('chunkContour').needsUpdate=true;
    mesh.computeBoundingSphere();
  }

  private allocateRockContour(mesh: BoxMesh): void {
    mesh.geometry.setAttribute('chunkContour',new THREE.InstancedBufferAttribute(new Float32Array(mesh.instanceMatrix.count*4),4).setUsage(THREE.StaticDrawUsage));
  }

  clear(): void {
    for (const mesh of this.batches.values()) { mesh.removeFromParent(); mesh.dispose(); }
    this.batches.clear();
    this.furnitureRevision=undefined;
    this.roundedRockWarm = false;
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
    this.clear(); this.geometry.dispose(); this.roundedRockGeometry.dispose();this.smallRockGeometry.dispose();
    for (const mat of Object.values(this.materials)) mat.dispose();
    this.texturedSolid.dispose(); this.plainRock.dispose(); this.texturedRock.dispose(); this.surfaceTexture.dispose();this.rockTexture.dispose();
  }
}
