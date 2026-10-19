import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {BoxBatches} from '../src/render/BoxBatches';
import {BoxMesh} from '../src/render/BoxMesh';
import {MiniTurretLayer} from '../src/render/MiniTurretLayer';
import {TimberCladdingLayer} from '../src/render/TimberCladdingLayer';
import type {OwnedOpaqueProducer435} from '../src/render/OwnedOpaqueRevisionRegistry435';
import {createWorld} from '../src/sim/index';
import type {Structure} from '../src/sim/types';
import {newMiniTurretState} from '../src/sim/mini-turret-state';
import type {Placement} from '../src/render/primitives';

class Receipts implements OwnedOpaqueProducer435 {
 readonly registered=new Map<THREE.Mesh,{materials:readonly THREE.NodeMaterial[];resources:readonly (THREE.Texture|THREE.BufferAttribute)[]}>();
 private readonly revisions=new WeakMap<THREE.Mesh,number>();
 register(mesh:THREE.Mesh,materials:readonly THREE.NodeMaterial[],resources:readonly (THREE.Texture|THREE.BufferAttribute)[]=[]):void{this.registered.set(mesh,{materials,resources});this.revisions.set(mesh,0);}
 dirty(mesh:THREE.Mesh):void{if(this.registered.has(mesh))this.revisions.set(mesh,this.revision(mesh)+1);}
 forget(mesh:THREE.Mesh):void{this.registered.delete(mesh);}
 revision(mesh:THREE.Mesh):number{return this.revisions.get(mesh)??0;}
}
const cube=(x=1,color=0x809060):Placement=>({x,y:1,z:2,sx:1,sy:2,sz:1,color,targetId:7});
function box(group:THREE.Group,name:string):BoxMesh{const mesh=group.getObjectByName(name);if(!(mesh instanceof BoxMesh))throw Error(`Missing Box producer ${name}`);return mesh;}
function bits(array:THREE.TypedArray):number[]{return[...new Uint32Array(array.buffer,array.byteOffset,array.byteLength/4)];}
function emptyWorld(){const world=createWorld(83,20,20);world.structures=[];world.jobs=[];world.resources=[];world.piles=[];return world;}

test('only explicitly owned opaque families register; declarations retain actual materials and fixed resources',()=>{
 const owner=new Receipts(),batches=new BoxBatches(undefined,owner),group=new THREE.Group(),publicBatches=new BoxBatches(),publicGroup=new THREE.Group();try{
  batches.set(group,'solid',[cube()]);batches.set(group,'wire',[cube()],'wire');batches.set(group,'pile:0:0',[{...cube(),shape:'item-log'}]);batches.set(group,'rock',[{...cube(),shape:'rounded-rock',key:73}]);publicBatches.set(publicGroup,'public',[cube()]);
  expect(owner.registered.has(box(group,'solid'))).toBe(true);expect(owner.registered.has(box(group,'wire'))).toBe(false);expect(owner.registered.has(box(publicGroup,'public'))).toBe(false);
  for(const[mesh,entry]of owner.registered){expect(entry.materials).toContain(mesh.material);expect(entry.materials.every(material=>!material.transparent)).toBe(true);expect(entry.resources.length).toBeGreaterThan(0);}
  expect([...owner.registered.values()].some(entry=>entry.resources.some(resource=>resource instanceof THREE.StorageBufferAttribute))).toBe(true);
  const material=box(group,'solid').material,revision=owner.revision(box(group,'solid'));batches.setTexturesEnabled(false);expect(box(group,'solid').material).not.toBe(material);expect(owner.revision(box(group,'solid'))).toBeGreaterThan(revision);
 }finally{publicBatches.dispose();batches.dispose();}expect(owner.registered.size).toBe(0);
});

test('geometry growth and constant-length furniture patches retain exact written transforms and issue producer receipts',()=>{
 const owner=new Receipts(),batches=new BoxBatches(undefined,owner),group=new THREE.Group();try{
  batches.set(group,'furniture',[cube(1),cube(3)]);const mesh=box(group,'furniture'),geometry=mesh.geometry,stamp=batches.furnitureStamp()!,matrix=mesh.instanceMatrix,revision=owner.revision(mesh);
  expect(batches.patchFurniture(group,'furniture',1,[cube(8,0xff0000)],2,stamp)).toBe(true);expect(mesh.instanceMatrix.array[16+12]).toBe(8);expect(mesh.instanceMatrix.array[12]).toBe(1);expect(owner.revision(mesh)).toBeGreaterThan(revision);expect(mesh.geometry).toBe(geometry);
  const expected=bits(mesh.instanceMatrix.array),wrongStamp={};expect(batches.patchFurniture(group,'furniture',0,[cube(9)],2,wrongStamp)).toBe(false);expect(bits(mesh.instanceMatrix.array)).toEqual(expected);
  let released=0;geometry.addEventListener('dispose',()=>released++);const before=owner.revision(mesh);batches.set(group,'furniture',Array.from({length:257},(_,i)=>cube(i)));
  expect(mesh.geometry).not.toBe(geometry);expect(mesh.instanceMatrix).not.toBe(matrix);expect(released).toBe(1);expect(mesh.activeCount).toBe(257);expect(mesh.instanceMatrix.array[256*16+12]).toBe(256);expect(owner.revision(mesh)).toBeGreaterThan(before);
 }finally{batches.dispose();}
});

test('target preview and restoration notify actual RGB changes without replacing the resident buffers',()=>{
 const owner=new Receipts(),batches=new BoxBatches(undefined,owner),group=new THREE.Group();try{
  batches.set(group,'furniture',[cube()]);const mesh=box(group,'furniture'),colors=mesh.colorBuffer,original=bits(colors.array),revision=owner.revision(mesh);
  batches.setTargetPreview(group,new Set([7]));expect(bits(colors.array)).not.toEqual(original);expect(owner.revision(mesh)).toBeGreaterThan(revision);const tinted=bits(colors.array);
  batches.setTargetPreview(group,new Set([7]));expect(bits(colors.array)).toEqual(tinted);const beforeClear=owner.revision(mesh);batches.clearTargetPreview(group);expect(bits(colors.array)).toEqual(original);expect(mesh.colorBuffer).toBe(colors);expect(owner.revision(mesh)).toBeGreaterThan(beforeClear);
 }finally{batches.dispose();}
});

test('Box shadow preparation restores exact first-matrix bits and count; a newer producer write wins',()=>{
 const owner=new Receipts(),batches=new BoxBatches(undefined,owner),group=new THREE.Group();try{
  batches.set(group,'empty',[]);const mesh=box(group,'empty'),geometry=mesh.geometry,matrix=mesh.instanceMatrix,first=bits(matrix.array.slice(0,16)),before=owner.revision(mesh),restore=batches.prepareEmptyShadows();
  expect(mesh.activeCount).toBe(1);expect(matrix.array[15]).toBe(1);expect(owner.revision(mesh)).toBeGreaterThan(before);const warmRevision=owner.revision(mesh);restore();
  expect(mesh.activeCount).toBe(0);expect(mesh.geometry).toBe(geometry);expect(mesh.instanceMatrix).toBe(matrix);expect(bits(matrix.array.slice(0,16))).toEqual(first);expect(owner.revision(mesh)).toBeGreaterThan(warmRevision);
  const staleRestore=batches.prepareEmptyShadows();batches.set(group,'empty',[cube(9)]);const written=bits(mesh.instanceMatrix.array),revision=owner.revision(mesh);staleRestore();expect(mesh.activeCount).toBe(1);expect(bits(mesh.instanceMatrix.array)).toEqual(written);expect(mesh.instanceMatrix.array[12]).toBe(9);expect(owner.revision(mesh)).toBe(revision);
 }finally{batches.dispose();}
});

test('the real turret RAF writer publishes changed matrices while preserving colors, geometry and World',()=>{
 const owner=new Receipts(),batches=new BoxBatches(undefined,owner),group=new THREE.Group(),layer=new MiniTurretLayer(),world=emptyWorld(),target=world.pawns[0]!;world.pawns=[target];target.x=10;target.z=15;
 const turret:Structure={id:world.nextId++,kind:'mini-turret',x:10,z:10,orientation:0,footprint:'standard',power:{on:true,parentId:null},turret:newMiniTurretState()};turret.turret!.targetKey=`pawn:${target.id}`;world.structures=[turret];
 try{
  layer.update(world,group,batches,true);const mesh=box(group,'turret-top'),geometry=mesh.geometry,colors=bits(mesh.colorBuffer.array);target.x=15;target.z=10;const before=JSON.stringify(world);layer.update(world,group,batches);const revision=owner.revision(mesh),old=bits(mesh.instanceMatrix.array);
  expect(layer.present(1/240)).toBe(true);expect(bits(mesh.instanceMatrix.array)).not.toEqual(old);expect(owner.revision(mesh)).toBeGreaterThan(revision);expect(layer.present(0,true)).toBe(true);
  const angle=Math.atan2(-mesh.instanceMatrix.array[2]!,mesh.instanceMatrix.array[0]!);expect(angle).toBeCloseTo(Math.PI/2);expect(mesh.geometry).toBe(geometry);expect(bits(mesh.colorBuffer.array)).toEqual(colors);expect(JSON.stringify(world)).toBe(before);
 }finally{batches.dispose();}
});

test('Timber updates, ordinal growth, tint and material changes keep their real data and notify the same two registered meshes',()=>{
 const owner=new Receipts(),layer=new TimberCladdingLayer(undefined,owner),world=emptyWorld();world.structures=[{id:10001,kind:'wall',material:'wood',x:1,z:1,orientation:0,footprint:'standard'}];try{
  const beforeWorld=JSON.stringify(world);layer.update(world,false);const mesh=layer.wallMesh,geometry=mesh.geometry,colors=bits(mesh.colorBuffer.array),revision=owner.revision(mesh);expect(owner.registered.size).toBe(2);expect(mesh.activeCount).toBe(1);expect(mesh.instanceMatrix.array[12]).toBe(1);
  layer.setTargetPreview(new Set([10001]));expect(bits(mesh.colorBuffer.array)).not.toEqual(colors);expect(owner.revision(mesh)).toBeGreaterThan(revision);const tintedRevision=owner.revision(mesh);layer.clearTargetPreview();expect(bits(mesh.colorBuffer.array)).toEqual(colors);expect(owner.revision(mesh)).toBeGreaterThan(tintedRevision);
  const material=mesh.material;layer.setTexturesEnabled(false);expect(mesh.material).not.toBe(material);expect(owner.registered.get(mesh)!.materials).toContain(mesh.material);expect(owner.registered.get(mesh)!.resources).toContain(layer.grain);expect(JSON.stringify(world)).toBe(beforeWorld);
  const next=structuredClone(world);next.structures=Array.from({length:257},(_,i)=>({id:11000+i,kind:'wall' as const,material:'wood' as const,x:i%20,z:Math.floor(i/20),orientation:0 as const,footprint:'standard' as const}));layer.update(next,false);
  expect(layer.wallMesh).toBe(mesh);expect(mesh.geometry).not.toBe(geometry);expect(mesh.activeCount).toBe(257);expect(mesh.geometry.getAttribute('timberOrdinal').getX(256)).toBe(256);expect(mesh.instanceMatrix.array[256*16+12]).toBe(16);expect(owner.registered.size).toBe(2);
 }finally{layer.dispose();}expect(owner.registered.size).toBe(0);
});

test('Timber compile count changes restore without touching matrix versions; newer adoption invalidates restoration',()=>{
 const owner=new Receipts(),layer=new TimberCladdingLayer(undefined,owner),world=emptyWorld();try{
  layer.update(world,false);const mesh=layer.wallMesh,matrix=mesh.instanceMatrix,version=matrix.version,original=bits(matrix.array),before=owner.revision(mesh),restore=layer.prepareForCompile();expect(mesh.activeCount).toBe(1);expect(owner.revision(mesh)).toBeGreaterThan(before);restore();
  expect(mesh.activeCount).toBe(0);expect(mesh.instanceMatrix).toBe(matrix);expect(matrix.version).toBe(version);expect(bits(matrix.array)).toEqual(original);
  const staleRestore=layer.prepareForCompile();world.structures=[{id:10001,kind:'wall',material:'wood',x:3,z:4,orientation:0,footprint:'standard'}];layer.update(world,false);const written=bits(mesh.instanceMatrix.array),revision=owner.revision(mesh);staleRestore();expect(mesh.activeCount).toBe(1);expect(bits(mesh.instanceMatrix.array)).toEqual(written);expect(mesh.instanceMatrix.array[12]).toBe(3);expect(owner.revision(mesh)).toBe(revision);
 }finally{layer.dispose();}
});
