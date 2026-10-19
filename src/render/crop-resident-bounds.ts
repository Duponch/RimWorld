import * as THREE from 'three/webgpu';
import {HYDROPONIC_SUPPORT_HEIGHT} from './hydroponics-parts';

const BLOCK=128;
/** Every crop scale is in [0,1], with a possible additional Y contraction.
 * Expand local model AABB to include its scale origin, rotate by the authored
 * ID yaw, then cover both literal support heights. This contains all current
 * vertices without evaluating growth. Blocks shrink after removals; an old
 * distant crop cannot permanently grow the whole batch's culling envelope. */
export class CropResidentBounds {
 private readonly models:THREE.Box3[];
 private readonly slots=new Map<number,THREE.Box3>();
 private readonly blocks=new Map<number,THREE.Box3>();
 private readonly dirty=new Set<number>();
 private readonly union=new THREE.Box3();
 constructor(geometry:THREE.BufferGeometry){
  geometry.computeBoundingBox();const local=geometry.boundingBox!.clone().expandByPoint(new THREE.Vector3());
  this.models=Array.from({length:7},(_,yaw)=>local.clone().applyMatrix4(new THREE.Matrix4().makeRotationY(yaw*.9)));
 }
 clear():void {this.slots.clear();this.blocks.clear();this.dirty.clear();this.union.makeEmpty();}
 set(slot:number,id:number,x:number,z:number):void {
  const box=this.models[id%7]!.clone();box.min.add(new THREE.Vector3(x,.025,z));box.max.add(new THREE.Vector3(x,.025+HYDROPONIC_SUPPORT_HEIGHT,z));
  // Float32 instance-matrix/position arithmetic: this explicit roundoff bound
  // dominates a few multiplication ULPs; it is not an appearance tolerance.
  const roundoff=2**-20*Math.max(1,Math.abs(x),Math.abs(z),box.getSize(new THREE.Vector3()).length());box.expandByScalar(roundoff);
  this.slots.set(slot,box);this.dirty.add(Math.floor(slot/BLOCK));
 }
 remove(slot:number):void {if(this.slots.delete(slot))this.dirty.add(Math.floor(slot/BLOCK));}
 writeSphere(target:THREE.Sphere):void {
  for(const key of this.dirty){const box=new THREE.Box3();for(let slot=key*BLOCK;slot<(key+1)*BLOCK;slot++){const value=this.slots.get(slot);if(value)box.union(value);}if(box.isEmpty())this.blocks.delete(key);else this.blocks.set(key,box);}
  this.dirty.clear();this.union.makeEmpty();for(const box of this.blocks.values())this.union.union(box);this.union.getBoundingSphere(target);
 }
}
