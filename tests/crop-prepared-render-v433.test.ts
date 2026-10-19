import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {CropLayer} from '../src/render/CropLayer';
import {SceneResourceIndex} from '../src/render/scene-resource-index';
import {createWorld} from '../src/sim/engine';
import {infectCrop} from '../src/sim/plant-blight';
import {RESIDENT_CROP_KINDS,type ResidentCropKind} from '../src/bridge/natural-appearance-values';
import {cropHarness} from './crop-worker-fixtures-v433';
import type {World} from '../src/sim/types';

function field():World {
 const world=createWorld(433,32,32);world.tiles=world.tiles.map(()=>({terrain:'soil'}));world.resources=[];world.structures=[];world.growingZones=[];
 for(const [row,kind]of RESIDENT_CROP_KINDS.entries())for(let column=0;column<3;column++)world.resources.push({id:world.nextId++,kind,x:5+column,z:5+row,amount:8,growth:1,growthTick:world.tick});
 return world;
}
type Batch={kind:ResidentCropKind;used:number;mesh:THREE.InstancedMesh;slots:Map<number,number>};
const batches=(layer:CropLayer)=>(layer as unknown as {batches:Batch[]}).batches;
function capture(layer:CropLayer){return batches(layer).map(({kind,used,mesh,slots})=>({kind,used,count:mesh.count,slots:[...slots],
 matrix:new Uint32Array(mesh.instanceMatrix.array.buffer,mesh.instanceMatrix.array.byteOffset,used*16).slice(),
 color:new Uint32Array(mesh.instanceColor!.array.buffer,mesh.instanceColor!.array.byteOffset,used*3).slice()}));}
function consume(layer:CropLayer){for(const {mesh}of batches(layer)){mesh.instanceMatrix.clearUpdateRanges();mesh.instanceColor!.clearUpdateRanges();}}

test('prepared crop buffers and allocation order match the literal path through sparse edits, births, simultaneous retirements, conversions and reorder',()=>{
 const h=cropHarness(field()),index=new SceneResourceIndex(),material=new THREE.MeshStandardNodeMaterial(),prepared=new CropLayer(material),literal=new CropLayer(material);
 const check=(reset=false)=>{const world=h.send(),frame=index.adopt(world,reset);prepared.update(world,reset,true,frame);literal.update(world,reset);expect(capture(prepared)).toEqual(capture(literal));return world;};
 try{
  check(true);h.world.resources[1]!.growth=.21;check();h.world.resources[2]!.x++;check();expect(infectCrop(h.world,h.world.resources[5]!,433)).toBe(true);check();
  // Admission skips an intermediate visual state; only the endpoint is played.
  h.world.resources[1]!.growth=.34;h.send();h.world.resources[1]!.growth=.41;check();
  h.world.resources.splice(0,2);h.world.resources.push({id:h.world.nextId++,kind:'rice',x:21,z:21,amount:8,growth:.3,growthTick:h.world.tick});check();
  h.world.resources[0]!.kind='cotton';check();h.world.resources[0]!.kind='healroot';check();h.world.resources[0]!.kind='corn';check();
  h.world.resources.reverse();check();
  const target=check();prepared.setTargetPreview(new Set([h.world.resources[2]!.id]));prepared.clearTargetPreview();expect(capture(prepared)).toEqual(capture(literal));
  // Same-object mutable RAW fallback sees in-place edits and does not stamp or
  // rewrite the immutable admitted target. Returning to target rebuilds numbers.
  h.world.resources[0]!.growth=.17;h.world.resources[0]!.z++;prepared.update(h.world,false);literal.update(h.world,false);expect(capture(prepared)).toEqual(capture(literal));
  const frame=index.adopt(target);prepared.update(target,false,true,frame);literal.update(target,false);expect(capture(prepared)).toEqual(capture(literal));
  prepared.setTexturesEnabled(false);literal.setTexturesEnabled(false);check();h.world.resources=[];check();check(true);
 }finally{prepared.dispose();literal.dispose();material.dispose();index.clear();}
});

test('silent publications do not upload and pending ranges survive two prepared adoptions before drawing',()=>{
 const h=cropHarness(field()),index=new SceneResourceIndex(),material=new THREE.MeshStandardNodeMaterial(),layer=new CropLayer(material);
 const update=(reset=false)=>{const world=h.send();layer.update(world,reset,true,index.adopt(world,reset));};
 try{
  update(true);consume(layer);const rice=batches(layer).find(b=>b.kind==='rice')!,matrix=rice.mesh.instanceMatrix,color=rice.mesh.instanceColor!,versions=[matrix.version,color.version];
  h.world.resources[0]!.amount++;update();expect([matrix.version,color.version]).toEqual(versions);expect(matrix.updateRanges).toEqual([]);expect(color.updateRanges).toEqual([]);
  h.world.resources[1]!.growth=.6;update();expect(matrix.updateRanges).toEqual([{start:16,count:16}]);expect(color.updateRanges).toEqual([{start:3,count:3}]);
  h.world.resources[2]!.growth=.3;update();expect(matrix.updateRanges).toEqual([{start:16,count:32}]);expect(color.updateRanges).toEqual([{start:3,count:6}]);
  expect(rice.mesh.instanceMatrix).toBe(matrix);expect(rice.mesh.instanceColor).toBe(color);
  const restore=layer.prepareForCompile();h.world.resources=[];update();restore();expect(rice.mesh.count).toBe(0);
 }finally{layer.dispose();material.dispose();index.clear();}
});

test('public RAW to prepared same-map retirement and later return cannot retain a phantom slot',()=>{
 const world=field(),h=cropHarness(world),index=new SceneResourceIndex(),material=new THREE.MeshStandardNodeMaterial(),layer=new CropLayer(material),literal=new CropLayer(material);
 try{
  layer.update(world,true);literal.update(world,true);const retired=world.resources.shift()!;
  const absent=h.send();layer.update(absent,false,true,index.adopt(absent));literal.update(absent,false);
  expect(capture(layer)).toEqual(capture(literal));expect(batches(layer).find(b=>b.kind==='rice')!.slots.has(retired.id)).toBe(false);
  world.resources.push(retired);const back=h.send();layer.update(back,false,true,index.adopt(back));literal.update(back,false);expect(capture(layer)).toEqual(capture(literal));
 }finally{layer.dispose();literal.dispose();material.dispose();index.clear();}
});
