import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {CropLayer} from '../src/render/CropLayer';
import {SceneResourceIndex} from '../src/render/scene-resource-index';
import {RESIDENT_CROP_KINDS,type ResidentCropKind} from '../src/render/flora-presentation';
import {createWorld} from '../src/sim/engine';
import type {World} from '../src/sim/types';
import {infectCrop} from '../src/sim/plant-blight';
import {vegetationHarness} from './resident-vegetation-fixtures-v430';

type Batch={kind:ResidentCropKind;mesh:THREE.InstancedMesh;slots:Map<number,number>};
const batches=(layer:CropLayer)=>(layer as unknown as {batches:Batch[]}).batches;
function field():World {
 const world=createWorld(433,32,32);world.tiles=world.tiles.map(()=>({terrain:'soil'}));world.resources=[];world.structures=[];world.growingZones=[];
 for(const [row,kind]of RESIDENT_CROP_KINDS.entries())for(let column=0;column<3;column++)world.resources.push({id:world.nextId++,kind,x:5+column,z:5+row,amount:8,growth:1,growthTick:world.tick});
 return world;
}
function visible(layer:CropLayer){
 return batches(layer).map(({kind,mesh,slots})=>({kind,count:mesh.count,values:[...slots].map(([id,slot])=>({id,slot,
  matrix:Array.from(mesh.instanceMatrix.array).slice(slot*16,slot*16+16),color:Array.from(mesh.instanceColor!.array).slice(slot*3,slot*3+3),
 }))}));
}
function consume(layer:CropLayer):void {for(const {mesh}of batches(layer)){mesh.instanceMatrix.clearUpdateRanges();mesh.instanceColor!.clearUpdateRanges();}}

test('resident crops retain literal current-tick values through growth, disease, support, leaf recovery, membership and reorder',()=>{
 const world=field(),material=new THREE.MeshStandardNodeMaterial(),sparse=new CropLayer(material),literal=new CropLayer(material);
 const check=(reset=false)=>{const before=structuredClone(world);sparse.update(world,reset,true);literal.update(world,reset);expect(visible(sparse)).toEqual(visible(literal));expect(world).toEqual(before);};
 try{
  check(true);world.resources[0]!.growth=.35;check();
  expect(infectCrop(world,world.resources[1]!,433)).toBe(true);check();
  const crop=world.resources[2]!;world.growingZones=[{id:world.nextId++,basinId:world.nextId++,cells:[crop.z*world.width+crop.x],plant:'rice',allowSow:true,allowCut:true}];check();
  crop.plantLife={since:0,age:0,darkTicks:0,leaflessAt:0,nextCheck:200};world.tick=5999;check();world.tick=6000;check();
  world.resources=world.resources.slice().reverse();check();
  world.resources.splice(4,1);check();world.resources.push({id:world.nextId++,kind:'cotton',x:21,z:8,amount:8,growth:.2,growthTick:world.tick});check();
  world.resources[0]!.kind='rice';world.resources[0]!.x++;check();
  sparse.setTexturesEnabled(false);literal.setTexturesEnabled(false);check();
  world.resources=[];check();check(true);
 }finally{sparse.dispose();literal.dispose();material.dispose();}
});

test('one changed crop patches only its matrix/color slot and pending writes survive multiple adoptions before drawing',()=>{
 const world=field(),material=new THREE.MeshStandardNodeMaterial(),layer=new CropLayer(material);
 try{
  layer.update(world,true,true);const rice=batches(layer).find(batch=>batch.kind==='rice')!,mesh=rice.mesh,matrix=mesh.instanceMatrix,color=mesh.instanceColor!;
  consume(layer);const versions=[matrix.version,color.version];
  world.resources[0]!.amount++;layer.update(world,false,true);
  expect([matrix.version,color.version]).toEqual(versions);expect(matrix.updateRanges).toEqual([]);expect(color.updateRanges).toEqual([]);
  world.resources[1]!.growth=.6;layer.update(world,false,true);
  expect(matrix.updateRanges).toEqual([{start:16,count:16}]);expect(color.updateRanges).toEqual([{start:3,count:3}]);
  world.resources[2]!.growth=.3;layer.update(world,false,true);
  expect(matrix.updateRanges).toEqual([{start:16,count:32}]);expect(color.updateRanges).toEqual([{start:3,count:6}]);
  expect(rice.mesh).toBe(mesh);expect(mesh.instanceMatrix).toBe(matrix);expect(mesh.instanceColor).toBe(color);
  const restore=layer.prepareForCompile();world.resources=[];layer.update(world,false,true);restore();expect(mesh.count).toBe(0);
 }finally{layer.dispose();material.dispose();}
});

test('real fixed-lane skipped publications and public mutable fallback retain exact crop buffers and current target tint',()=>{
 const world=field(),h=vegetationHarness(world),index=new SceneResourceIndex(),material=new THREE.MeshStandardNodeMaterial(),layer=new CropLayer(material),literal=new CropLayer(material);
 try{
  const initial=h.send();layer.update(initial,true,true,index.adopt(initial,true));literal.update(initial,true);
  world.resources[1]!.growth=.2;h.send();world.resources[2]!.growth=.4;
  const target=h.send();layer.update(target,false,true,index.adopt(target));literal.update(target,false);expect(visible(layer)).toEqual(visible(literal));
  layer.setTargetPreview(new Set([world.resources[1]!.id]));layer.clearTargetPreview();expect(visible(layer)).toEqual(visible(literal));
  // Same object and same resource array: the unrestricted path must see edits.
  world.resources[1]!.x++;world.resources[1]!.growth=.7;layer.update(world,false);literal.update(world,false);expect(visible(layer)).toEqual(visible(literal));
  layer.update(target,false,true,index.adopt(target));literal.update(target,false);expect(visible(layer)).toEqual(visible(literal));
 }finally{layer.dispose();literal.dispose();material.dispose();}
});
