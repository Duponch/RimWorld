import * as THREE from 'three/webgpu';

export type StaticArenaField435={name:string;itemSize:number};
export type StaticArenaAllocation435={offset:number;capacity:number};
export function staticArenaReserve435(count:number):number{return 2**Math.ceil(Math.log2(Math.max(1,count)));}
export function staticArenaBlockReserve435(count:number):number{return count<=256?staticArenaReserve435(count):Math.ceil(count*1.125/256)*256;}

/** Resident vertex allocation only. Offsets remain stable until this block
 * outgrows its own reserve; a page buffer grows only when no free range fits.
 * No scene, source geometry, material, camera or shader responsibility lives
 * here. Index compaction copies already-remapped Uint32 source sequences. */
export class StaticGeometryArena435 {
 private current:THREE.BufferGeometry;
 private tail=0;
 private free:StaticArenaAllocation435[]=[];
 private vertices:number;
 private indices:number;
 readonly stats={vertexGrowths:0,indexGrowths:0,growthCopiedBytes:0,allocations:0,reuses:0};
 constructor(private readonly fields:readonly StaticArenaField435[],vertices:number,indices:number){
  this.vertices=staticArenaReserve435(vertices);this.indices=staticArenaReserve435(indices);
  this.current=this.create(this.vertices,this.indices);
 }
 get geometry():THREE.BufferGeometry{return this.current;}
 get vertexCapacity():number{return this.vertices;}
 get indexCapacity():number{return this.indices;}
 private create(vertices:number,indices:number):THREE.BufferGeometry{
  const geometry=new THREE.BufferGeometry();
  for(const field of this.fields)geometry.setAttribute(field.name,new THREE.BufferAttribute(new Float32Array(vertices*field.itemSize),field.itemSize));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices),1));geometry.setDrawRange(0,0);return geometry;
 }
 private grow(vertices:number,indices:number):void{
  const old=this.current,next=this.create(vertices,indices);
  for(const field of this.fields){const from=old.getAttribute(field.name),to=next.getAttribute(field.name);new Uint32Array(to.array.buffer,to.array.byteOffset,to.array.length).set(new Uint32Array(from.array.buffer,from.array.byteOffset,from.array.length));this.stats.growthCopiedBytes+=from.array.byteLength;}
  (next.index!.array as Uint32Array).set(old.index!.array);this.stats.growthCopiedBytes+=old.index!.array.byteLength;
  next.setDrawRange(old.drawRange.start,old.drawRange.count);next.boundingSphere=old.boundingSphere?.clone()??null;next.boundingBox=old.boundingBox?.clone()??null;
  this.current=next;this.vertices=vertices;this.indices=indices;old.dispose();
 }
 allocate(count:number,prior?:StaticArenaAllocation435):StaticArenaAllocation435{
  if(prior&&count<=prior.capacity){this.stats.reuses++;return prior;}
  const capacity=Math.max(staticArenaBlockReserve435(count),prior?prior.capacity*2:0);
  if(prior)this.release(prior);
  const fit=this.free.findIndex(range=>range.capacity>=capacity);
  if(fit>=0){const range=this.free[fit]!,allocation={offset:range.offset,capacity};range.offset+=capacity;range.capacity-=capacity;if(!range.capacity)this.free.splice(fit,1);this.stats.allocations++;return allocation;}
  if(this.tail+capacity>this.vertices){this.grow(staticArenaReserve435(this.tail+capacity),this.indices);this.stats.vertexGrowths++;}
  const allocation={offset:this.tail,capacity};this.tail+=capacity;this.stats.allocations++;return allocation;
 }
 release(allocation:StaticArenaAllocation435):void{
  this.free.push({...allocation});this.free.sort((a,b)=>a.offset-b.offset);
  for(let i=1;i<this.free.length;){const previous=this.free[i-1]!,next=this.free[i]!;if(previous.offset+previous.capacity===next.offset){previous.capacity+=next.capacity;this.free.splice(i,1);}else i++;}
  while(this.free.length){const last=this.free[this.free.length-1]!;if(last.offset+last.capacity!==this.tail)break;this.tail=last.offset;this.free.pop();}
 }
 ensureIndices(count:number):void{if(count>this.indices){this.grow(this.vertices,staticArenaReserve435(count));this.stats.indexGrowths++;}}
 dispose():void{this.current.dispose();this.free=[];this.tail=0;}
}
