import * as THREE from 'three/webgpu';
import type { World } from '../sim/types';
import { ROCK_INDICES,ROCK_VERTICES,writeRockCell } from './RockSurface';

/** One exact surface overlay for eligible mine cells, empty outside a drag.
 * Resource rocks/chunks are not terrain mining targets. Selection/world events
 * call updateRock; no animation-frame work, World clone or per-cell material. */
export class OrderTargetPreviewLayer {
  readonly material=new THREE.MeshBasicNodeMaterial({color:0x84baff,transparent:true,opacity:.24,
    depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  readonly mesh:THREE.Mesh;
  private capacity=16;
  private revision=0;
  constructor(){
    this.mesh=new THREE.Mesh(this.allocate(this.capacity),this.material);
    this.mesh.name='Compatible mining targets';this.mesh.renderOrder=5;
    this.mesh.matrixAutoUpdate=false;this.mesh.visible=false;
    this.mesh.castShadow=false;this.mesh.receiveShadow=false;
  }
  private allocate(capacity:number):THREE.BufferGeometry {
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(capacity*ROCK_VERTICES*3),3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(capacity*ROCK_INDICES),1));
    geometry.setDrawRange(0,0);geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),0);return geometry;
  }
  updateRock(world:World,cells:readonly number[]):void {
    this.revision++;
    const targets=[...new Set(cells)].filter(i=>Number.isInteger(i)&&i>=0&&i<world.width*world.height&&world.tiles[i]?.terrain==='rock');
    if(!targets.length){this.mesh.visible=false;this.mesh.geometry.setDrawRange(0,0);return;}
    if(targets.length>this.capacity){
      this.capacity=2**Math.ceil(Math.log2(targets.length));this.mesh.geometry.dispose();this.mesh.geometry=this.allocate(this.capacity);
    }
    const geometry=this.mesh.geometry,position=geometry.getAttribute('position') as THREE.BufferAttribute,index=geometry.index!;
    let count=0;
    for(let slot=0;slot<targets.length;slot++){
      const cell=targets[slot]!,faces=writeRockCell(world,cell%world.width,Math.floor(cell/world.width),position.array as Float32Array,slot*ROCK_VERTICES);
      (index.array as Uint32Array).set(faces,count);count+=faces.length;
    }
    position.clearUpdateRanges();position.addUpdateRange(0,targets.length*ROCK_VERTICES*3);position.needsUpdate=true;
    index.clearUpdateRanges();index.addUpdateRange(0,count);index.needsUpdate=true;
    geometry.setDrawRange(0,count);geometry.computeBoundingSphere();this.mesh.visible=count>0;
  }
  hide():void {this.revision++;this.mesh.visible=false;this.mesh.geometry.setDrawRange(0,0);}
  prepareForCompile():()=>void {
    const geometry=this.mesh.geometry,revision=this.revision,count=geometry.drawRange.count,visible=this.mesh.visible,culled=this.mesh.frustumCulled;
    const sphere=geometry.boundingSphere!.clone(),first=(geometry.index!.array as Uint32Array).slice(0,3);
    if(!count){(geometry.index!.array as Uint32Array).set([0,1,2]);geometry.index!.needsUpdate=true;geometry.setDrawRange(0,3);geometry.boundingSphere!.radius=1;}
    this.mesh.visible=true;this.mesh.frustumCulled=false;
    return ()=>{
      this.mesh.frustumCulled=culled;
      if(this.revision!==revision||this.mesh.geometry!==geometry)return;
      if(!count){(geometry.index!.array as Uint32Array).set(first);geometry.index!.needsUpdate=true;}
      geometry.setDrawRange(0,count);geometry.boundingSphere!.copy(sphere);this.mesh.visible=visible;
    };
  }
  dispose():void {this.mesh.removeFromParent();this.mesh.geometry.dispose();this.material.dispose();}
}
