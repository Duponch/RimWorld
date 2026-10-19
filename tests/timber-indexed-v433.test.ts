import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {createTimberGeometry,TimberCladdingLayer} from '../src/render/TimberCladdingLayer';
import {indexTimberGeometry} from '../src/render/index-timber-geometry';
import {createWorld} from '../src/sim/engine';
import {createUnindexedTimberGeometry} from './fixtures/timber-geometry-unindexed-v433';

const CHANNELS=['position','normal','color','uv'] as const;
function words(attribute:THREE.BufferAttribute):Uint32Array {
 const data=attribute.array as Float32Array;return new Uint32Array(data.buffer,data.byteOffset,data.length);
}
function reconstructed(geometry:THREE.BufferGeometry,name:typeof CHANNELS[number]):Uint32Array {
 const source=geometry.getAttribute(name) as THREE.BufferAttribute,index=geometry.index!;
 const bits=words(source),result=new Uint32Array(index.count*source.itemSize);
 for(let corner=0;corner<index.count;corner++)for(let component=0;component<source.itemSize;component++)
  result[corner*source.itemSize+component]=bits[index.getX(corner)*source.itemSize+component]!;
 return result;
}

test.each([false,true])('indexed Timber roof=%s reconstructs every triangle attribute bit-for-bit in its original order',roof=>{
 const before=createUnindexedTimberGeometry(roof),indexed=createTimberGeometry(roof);
 try{
  expect(before.index).toBeNull();expect(Object.keys(indexed.attributes).sort()).toEqual([...CHANNELS].sort());
  expect(indexed.index).not.toBeNull();expect(indexed.index!.array).toBeInstanceOf(Uint16Array);
  expect(before.getAttribute('position').count).toBe(roof?66:318);
  expect(indexed.index!.count).toBe(before.getAttribute('position').count);
  expect(indexed.index!.count/3).toBe(roof?22:106);
  expect(indexed.getAttribute('position').count).toBeLessThanOrEqual(roof?44:212);
  expect(new Set(indexed.index!.array).size).toBe(indexed.getAttribute('position').count);
  for(const name of CHANNELS){
   const original=before.getAttribute(name) as THREE.BufferAttribute,current=indexed.getAttribute(name) as THREE.BufferAttribute;
   expect(reconstructed(indexed,name),`${name}: triangle, corner and component order`).toEqual(words(original));
   expect({size:current.itemSize,normalized:current.normalized,usage:current.usage,gpuType:current.gpuType,name:current.name})
    .toEqual({size:original.itemSize,normalized:original.normalized,usage:original.usage,gpuType:original.gpuType,name:original.name});
  }
  expect(indexed.boundingBox).toEqual(before.boundingBox);expect(indexed.boundingSphere).toEqual(before.boundingSphere);
  expect(indexed.groups).toEqual(before.groups);expect(indexed.drawRange).toEqual(before.drawRange);
 }finally{before.dispose();indexed.dispose();}
});

function seams():THREE.BufferGeometry {
 const geometry=new THREE.BufferGeometry();
 for(const [name,size] of [['position',3],['normal',3],['color',3],['uv',2]] as const){
  const data=new Float32Array(12*size),attribute=new THREE.BufferAttribute(data,size);attribute.name=`authored-${name}`;
  geometry.setAttribute(name,attribute);
 }
 //0/1 are identical; each next corner differs in exactly one channel. The
 // ninth corner repeats a negative zero; the final two have distinct NaN
 // payloads. Those exceptional words exercise exactness without GPU drawing.
 (geometry.getAttribute('normal') as THREE.BufferAttribute).setX(2,1);
 (geometry.getAttribute('color') as THREE.BufferAttribute).setY(3,.5);
 (geometry.getAttribute('uv') as THREE.BufferAttribute).setX(4,.5);
 (geometry.getAttribute('position') as THREE.BufferAttribute).setX(5,-0);
 (geometry.getAttribute('normal') as THREE.BufferAttribute).setX(6,-0);
 (geometry.getAttribute('uv') as THREE.BufferAttribute).setX(7,-0);
 (geometry.getAttribute('color') as THREE.BufferAttribute).setX(8,-0);
 (geometry.getAttribute('position') as THREE.BufferAttribute).setX(9,-0);
 const uv=words(geometry.getAttribute('uv') as THREE.BufferAttribute);uv[20]=0x7fc00001;uv[22]=0x7fc00002;
 return geometry;
}
test('all channels and exact Float32 words participate: hard normals, paint, UV seams, signed zero and payloads never merge',()=>{
 const geometry=seams(),before=Object.fromEntries(CHANNELS.map(name=>[name,words(geometry.getAttribute(name) as THREE.BufferAttribute).slice()]));
 geometry.addGroup(0,6,2);geometry.addGroup(6,30,3);geometry.setDrawRange(3,27);
 try{
  indexTimberGeometry(geometry);
  expect([...geometry.index!.array]).toEqual([0,0,1,2,3,4,5,6,7,4,8,9]);
  for(const name of CHANNELS)expect(reconstructed(geometry,name)).toEqual(before[name]);
  expect(geometry.groups).toEqual([{start:0,count:6,materialIndex:2},{start:6,count:30,materialIndex:3}]);
  expect(geometry.drawRange).toEqual({start:3,count:27});
 }finally{geometry.dispose();}
});

test('the scoped conversion refuses incomplete or already indexed inputs without partially replacing attributes',()=>{
 for(const invalid of ['indexed','extra','wrong-size','wrong-count','wrong-storage','morph'] as const){
  const geometry=seams();
  if(invalid==='indexed')geometry.setIndex([0,1,2]);
  if(invalid==='extra')geometry.setAttribute('other',new THREE.Float32BufferAttribute(new Float32Array(12),1));
  if(invalid==='wrong-size')geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(36),3));
  if(invalid==='wrong-count')geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(6),2));
  if(invalid==='wrong-storage')geometry.setAttribute('uv',new THREE.Uint16BufferAttribute(new Uint16Array(24),2));
  if(invalid==='morph')geometry.morphAttributes.position=[geometry.getAttribute('position').clone()];
  const attributes={...geometry.attributes},index=geometry.index;
  try{
   expect(()=>indexTimberGeometry(geometry)).toThrow();
   expect(geometry.index).toBe(index);for(const [name,attribute] of Object.entries(attributes))expect(geometry.getAttribute(name)).toBe(attribute);
  }finally{geometry.dispose();}
 }
});

test('resident Timber retains indexed base attributes and layout through growth, cutaway, textures and target tint changes',()=>{
 const layer=new TimberCladdingLayer(),world=createWorld(433,32,32);
 const bases=[layer.wallGeometry,layer.eaveGeometry],indices=bases.map(g=>g.index),attributes=bases.map(g=>({...g.attributes}));
 const materials=[layer.material,layer.plainMaterial];
 try{
  world.structures=Array.from({length:257},(_,i)=>({id:i+1,kind:'wall' as const,material:'wood' as const,x:i%32,z:Math.floor(i/32),orientation:0 as const,footprint:'standard' as const}));
  layer.update(world,false);expect(layer.wallMesh.instanceMatrix.count).toBeGreaterThanOrEqual(257);expect(layer.wallMesh.activeCount).toBe(257);
  layer.setTexturesEnabled(false);layer.setTargetPreview(new Set([1,32]));layer.update(world,true);layer.clearTargetPreview();layer.setTexturesEnabled(true);
  expect([layer.material,layer.plainMaterial]).toEqual(materials);
  for(const [i,mesh] of [layer.wallMesh,layer.eaveMesh].entries()){
   const base=bases[i]!;
   expect(mesh.geometry).not.toBe(base);expect(mesh.geometry.index).not.toBe(base.index);
   expect(mesh.geometry.index!.array).toEqual(base.index!.array);
   for(const name of CHANNELS){
    expect(mesh.geometry.getAttribute(name)).not.toBe(base.getAttribute(name));
    expect(words(mesh.geometry.getAttribute(name) as THREE.BufferAttribute)).toEqual(words(base.getAttribute(name) as THREE.BufferAttribute));
   }
   expect(Object.keys(mesh.geometry.attributes).sort()).toEqual([...CHANNELS,'timberOrdinal','overviewMatrix0','overviewMatrix1','overviewMatrix2','overviewMatrix3','overviewColor'].sort());
   expect(mesh.geometry.getAttribute('timberOrdinal').count).toBe(mesh.instanceMatrix.count);
  }
  for(const [i,geometry] of bases.entries()){
   expect(geometry.index).toBe(indices[i]);for(const [name,attribute] of Object.entries(attributes[i]!))expect(geometry.getAttribute(name)).toBe(attribute);
   expect(Object.keys(geometry.attributes).sort()).toEqual([...CHANNELS].sort());
  }
  for(const mesh of [layer.wallMesh,layer.eaveMesh]){expect(mesh.castShadow).toBe(true);expect(mesh.receiveShadow).toBe(true);}
 }finally{layer.dispose();}
});
