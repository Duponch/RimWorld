import { stoneColor } from './stone-palette';
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { World, ResourceKind } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';
import { noise } from './StaticGeometry';
import { clearGroup } from './primitives';

/** Resident distant representation. Switching zoom never rebuilds geometry.
 * Terrain keeps its exact heights/colors. Tiny fruit/branches yield to silhouettes. */
export class OverviewLayer {
  readonly group=new THREE.Group();
  private readonly terrain=new THREE.Group();
  private readonly vegetation=new THREE.Group();
  private readonly batches=new Map<ResourceKind,THREE.InstancedMesh>();
  private readonly slots=new Map<number,{kind:ResourceKind;slot:number;signature:string}>();
  private readonly transform=new THREE.Object3D();
  private readonly tint=new THREE.Color();
  private readonly surface=new THREE.MeshStandardNodeMaterial({roughness:0.95,vertexColors:true});
  private foliage=true;
  constructor(){this.group.add(this.terrain,this.vegetation);this.group.visible=false;this.surface.userData.rendererOwned=true;}
  rebuildTerrain(source:THREE.Group):void {
    clearGroup(this.terrain);source.updateMatrixWorld(true);
    const grouped=new Map<THREE.Material,THREE.BufferGeometry[]>();
    for(const child of source.children) if(child instanceof THREE.Mesh && !Array.isArray(child.material)) {
      const parts=grouped.get(child.material)??[];
      parts.push(child.geometry.clone().applyMatrix4(child.matrixWorld));grouped.set(child.material,parts);
    }
    for(const [material,parts] of grouped) {
      // The slab uses a different layout; material groups keep layouts compatible.
      const geometry=mergeGeometries(parts,false);for(const part of parts)part.dispose();
      if(geometry) {const mesh=new THREE.Mesh(geometry,material.userData.rendererOwned?material:material.clone());mesh.receiveShadow=false;this.terrain.add(mesh);}
    }
  }
  setFoliageVisible(visible:boolean):void {this.foliage=visible;const trees=this.batches.get('tree');if(trees)trees.geometry.setDrawRange(0,visible?Infinity:trees.geometry.userData.trunkIndices);}
  update(world:World,reset:boolean):void {
    if(reset) {
      clearGroup(this.vegetation);this.slots.clear();this.batches.clear();
      for(const kind of ['tree','berries','rock'] as const) {
        const count=world.resources.filter(r=>r.kind===kind).length;
        const paint=(g:THREE.BufferGeometry,color:number)=>{const c=new THREE.Color(color),data=new Float32Array(g.getAttribute('position').count*3);for(let i=0;i<data.length;i+=3)data.set([c.r,c.g,c.b],i);g.setAttribute('color',new THREE.BufferAttribute(data,3));return g;};
        const trunk=kind==='tree'?paint(new THREE.CylinderGeometry(.1,.16,.5,4).translate(0,-.25,0),0x70573e):null;
        const crown=kind==='tree'?paint(new THREE.ConeGeometry(1,.8,4).translate(0,.1,0),0x5f7c52):null;
        const geometry=trunk&&crown?mergeGeometries([trunk,crown],false)!:paint(new THREE.OctahedronGeometry(1),0xffffff);
        if(trunk){geometry.userData.trunkIndices=trunk.index!.count;trunk.dispose();crown!.dispose();}
        const mesh=new THREE.InstancedMesh(geometry,this.surface,Math.max(1,count));mesh.count=count;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.batches.set(kind,mesh);this.vegetation.add(mesh);
      }
    }
    // Unknown additions need resized resident batches. Ordinary deletion changes one matrix.
    if(!reset && world.resources.some(r=>r.kind!=='rice' && (!this.slots.has(r.id)||this.slots.get(r.id)!.kind!==r.kind))) {this.update(world,true);return;}
    let boundsChanged=reset; const dirty=new Set<ResourceKind>();
    const counts={tree:0,berries:0,rock:0},alive=new Set<number>();
    for(const r of world.resources) {
      if(r.kind==='rice')continue;
      alive.add(r.id);const signature=`${r.kind}:${r.x}:${r.z}:${r.stone ?? ""}`,previous=this.slots.get(r.id);
      const slot=reset?counts[r.kind]++:previous!.slot;
      if(!reset&&previous?.signature===signature)continue;
      boundsChanged=true;dirty.add(r.kind);
      const mesh=this.batches.get(r.kind)!,n=noise(r.x,r.z,77);
      const height=r.kind==='tree'?WORLD_SCALE.treeMinHeight+n*(WORLD_SCALE.treeMaxHeight-WORLD_SCALE.treeMinHeight):r.kind==='rock'?0.7:0.75;
      const width=r.kind==='tree'?0.8+n*0.32:0.45;
      this.transform.position.set(r.x,height/2,r.z);this.transform.rotation.set(0,n*Math.PI*2,0);this.transform.scale.set(width,height,width);this.transform.updateMatrix();
      mesh.setMatrixAt(slot,this.transform.matrix);this.tint.setHex(r.kind==='tree'?0xffffff:r.kind==='rock'?(r.stone?stoneColor(r.stone):0x92998d):0x697b55);mesh.setColorAt(slot,this.tint);
      this.slots.set(r.id,{kind:r.kind,slot,signature});
    }
    this.transform.scale.set(0,0,0);this.transform.updateMatrix();
    for(const [id,slot] of this.slots) if(!alive.has(id)&&slot.signature!=='removed') {this.batches.get(slot.kind)!.setMatrixAt(slot.slot,this.transform.matrix);slot.signature='removed';dirty.add(slot.kind);}
    for(const kind of dirty) {const mesh=this.batches.get(kind)!;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;if(boundsChanged)mesh.computeBoundingSphere();}
    this.setFoliageVisible(this.foliage);
  }
  dispose():void {clearGroup(this.terrain);clearGroup(this.vegetation);this.surface.dispose();}
}
