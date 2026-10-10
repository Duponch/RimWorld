import { plantLeafless } from '../sim/plant-life';
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { plantGrowth } from '../sim/plants';
import { BLIGHT_COLOR, RESIDENT_CROP_KINDS, type ResidentCropKind } from './flora-presentation';
import type { Resource, World } from '../sim/types';
import { CropPresentationPartition } from './crop-presentation-partition';
import { readHydroponicCells } from '../sim/hydroponics';
import { HYDROPONIC_SUPPORT_HEIGHT } from './hydroponics-parts';
import { ResourceTargetTint } from './resource-target-tint';

/** Dedicated resident instancing: sowing never rebuilds forest/rock geometry. */
function cropGeometry(kind:ResidentCropKind):THREE.BufferGeometry {
  let parts:THREE.BufferGeometry[];
  if(kind==='corn') {
    const stalk=new THREE.CylinderGeometry(.045,.065,1.5,5).translate(0,.75,0);
    const leaves=[-.25,.25].map((x,i)=>new THREE.ConeGeometry(.16,.7,3).rotateZ(x<0?-.7:.7).translate(x,.68+i*.34,0));
    const tassel=new THREE.ConeGeometry(.1,.28,4).translate(0,1.64,0);
    parts=[stalk,...leaves,tassel];
  } else if(kind==='potato') {
    parts=[[-.2,.1],[.2,.1],[0,-.2],[0,.25]].map(([x,z],i)=>new THREE.OctahedronGeometry(.25).scale(1,.6,1).translate(x!,.18+(i%2)*.11,z!));
  } else {
    // Keep both existing silhouettes and their triangle counts unchanged.
    parts=[-.22,0,.22].map((x,i)=>kind==='rice'
      ?new THREE.ConeGeometry(.11,.8,3).translate(x,.4,(i%2)*.22-.1)
      :new THREE.OctahedronGeometry(.22).scale(1,1.25,1).translate(x,.36+(i%2)*.15,(i%2)*.26-.13));
  }
  const geometry=mergeGeometries(parts);
  parts.forEach(g=>g.dispose());
  if(!geometry)throw new Error(`Could not assemble crop geometry: ${kind}`);
  return geometry;
}

class CropBatch {
  private mesh: THREE.InstancedMesh;
  private readonly geometry: THREE.BufferGeometry;
  private readonly slots = new Map<number, number>();
  private readonly free: number[] = [];
  private used = 0;
  private version = 0;
  private readonly transform = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly green = new THREE.Color(0x80a24a);
  private readonly ripe = new THREE.Color(0xcfb665);
  private readonly targetTint=new ResourceTargetTint();
  private targetPreviewIds=new Set<number>();
  constructor(private readonly group:THREE.Group,private readonly kind:ResidentCropKind,private material: THREE.Material) {
    if(kind==='cotton')this.ripe.setHex(0xf0ead7);
    if(kind==='potato')this.ripe.setHex(0x83964a);
    this.geometry = cropGeometry(kind);
    this.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.geometry.getAttribute('position').count * 3).fill(1), 3));
    this.mesh = this.createMesh(128); this.group.add(this.mesh);
  }
  setMaterial(material:THREE.Material):void {this.material=material;this.mesh.material=material;}
  setTargetPreview(ids:ReadonlySet<number>):void {
    if(ids.size===this.targetPreviewIds.size&&[...ids].every(id=>this.targetPreviewIds.has(id)))return;
    this.targetTint.restore();this.targetPreviewIds=new Set(ids);this.tintTargets();
  }
  clearTargetPreview():void {this.targetTint.restore();this.targetPreviewIds.clear();}
  private tintTargets():void {
    if(!this.targetPreviewIds.size)return;
    const slots:number[]=[];
    for(const id of this.targetPreviewIds){const slot=this.slots.get(id);if(slot!==undefined)slots.push(slot);}
    this.targetTint.applySlots(this.mesh.instanceColor!,slots);
  }
  private createMesh(capacity: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    // A runtime-sized storage array keeps the same shader when capacity grows.
    // Three's small uniform-matrix path otherwise specializes it to each size.
    mesh.instanceMatrix = new THREE.StorageInstancedBufferAttribute(capacity, 16);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage); mesh.count = 0;
    // Allocate colors before pipeline warmup, including maps with no crops yet.
    mesh.setColorAt(0, this.green); mesh.instanceColor!.setUsage(THREE.StaticDrawUsage); mesh.receiveShadow = true;
    return mesh;
  }
  prepareForCompile(): () => void {
    const mesh=this.mesh,count=mesh.count,version=this.version;mesh.count=Math.max(1,count);
    return () => { if(this.mesh===mesh&&this.version===version)mesh.count=count; };
  }
  update(world: World, reset: boolean, crops: readonly Resource[],hydroponicCells:ReadonlyMap<number,number>): void {
    if(reset)this.clearTargetPreview();else this.targetTint.restore();
    this.version++;
    if (reset) { this.slots.clear(); this.free.length = 0; this.used = 0; this.mesh.count = 0; }
    const alive = new Set(crops.map(r => r.id));
    for (const [id, slot] of this.slots) if (!alive.has(id)) {
      this.transform.scale.setScalar(0); this.transform.updateMatrix(); this.mesh.setMatrixAt(slot, this.transform.matrix);
      this.slots.delete(id); this.free.push(slot);
    }
    // One plant per map cell is a proven upper bound. Reserve it during map
    // loading, so ordinary sowing never creates a mesh, binding or pipeline.
    const required = Math.max(crops.length, reset ? world.width * world.height : 0);
    if (required > this.mesh.instanceMatrix.count) {
      const old = this.mesh, mesh = this.createMesh(2 ** Math.ceil(Math.log2(required)));
      mesh.instanceMatrix.array.set(old.instanceMatrix.array); mesh.instanceColor!.array.set(old.instanceColor!.array);
      this.group.remove(old); old.dispose(); this.mesh = mesh; this.group.add(mesh);
    }
    let visibleCount = 0;
    for (const crop of crops) {
      let slot = this.slots.get(crop.id);
      if (slot === undefined) { slot = this.free.pop() ?? this.used++; this.slots.set(crop.id, slot); }
      visibleCount = Math.max(visibleCount, slot + 1);
      const growth = plantGrowth(world, crop), scale = .14 + .86 * Math.sqrt(growth);
      this.transform.position.set(crop.x, .025+(hydroponicCells.has(crop.z*world.width+crop.x)?HYDROPONIC_SUPPORT_HEIGHT:0), crop.z);
      this.transform.rotation.y = (crop.id % 7) * .9;
      this.transform.scale.set(scale, plantLeafless(world,crop)?scale*.4:scale, scale); this.transform.updateMatrix();
      this.mesh.setMatrixAt(slot, this.transform.matrix);
      this.color.copy(this.green).lerp(this.ripe, Math.max(0, (growth - .65) / .35)); if(plantLeafless(world,crop))this.color.setHex(0x8f7b58);if(crop.blight)this.color.setHex(BLIGHT_COLOR);this.mesh.setColorAt(slot, this.color);
    }
    this.mesh.count = visibleCount;
    if (visibleCount) {
      this.mesh.instanceMatrix.clearUpdateRanges(); this.mesh.instanceMatrix.addUpdateRange(0, visibleCount * 16);
      this.mesh.instanceColor!.clearUpdateRanges(); this.mesh.instanceColor!.addUpdateRange(0, visibleCount * 3);
      this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor!.needsUpdate = true;
    }
    this.mesh.computeBoundingSphere();
    this.tintTargets();
  }
  dispose(): void { this.clearTargetPreview();this.mesh.dispose(); this.geometry.dispose(); }
}

/** One resident batch per shape, prewarmed even empty. CPU work only on snapshots;
 * separate meshes preserve the rice geometry and its existing triangle count. */
export class CropLayer {
  readonly group=new THREE.Group();
  private readonly batches:CropBatch[];
  private readonly partition=new CropPresentationPartition();
  constructor(private readonly plainMaterial:THREE.Material,private readonly texturedMaterial:THREE.Material=plainMaterial){this.batches=RESIDENT_CROP_KINDS.map(kind=>new CropBatch(this.group,kind,texturedMaterial));}
  setTexturesEnabled(enabled:boolean):void {for(const batch of this.batches)batch.setMaterial(enabled?this.texturedMaterial:this.plainMaterial);}
  setTargetPreview(ids:ReadonlySet<number>):void {for(const batch of this.batches)batch.setTargetPreview(ids);}
  clearTargetPreview():void {for(const batch of this.batches)batch.clearTargetPreview();}
  prepareForCompile():()=>void {const restore=this.batches.map(b=>b.prepareForCompile());return()=>restore.forEach(f=>f());}
  update(world:World,reset:boolean,immutableSnapshot=false):void {
    const crops=this.partition.read(world,reset,immutableSnapshot);
    const hydroponicCells=readHydroponicCells(world);
    for(let index=0;index<this.batches.length;index++)this.batches[index]!.update(world,reset,crops[RESIDENT_CROP_KINDS[index]!],hydroponicCells);
  }
  dispose():void {for(const batch of this.batches)batch.dispose();}
}
