import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {StaticSceneCompiler435,setStaticSceneSource435} from '../src/render/StaticSceneCompiler435';

function geometry(count:number,indices:readonly number[],offset=0):THREE.BufferGeometry{
 const g=new THREE.BufferGeometry();
 for(const[name,size]of[['position',3],['normal',3],['color',3],['uv',2],['windRoot',3],['windBasis',4]]as const){
  // Nonzero byte offsets exercise the same ownership as shared Rock views.
  const data=new Float32Array(new ArrayBuffer((count*size+7)*4),7*4,count*size);
  for(let vertex=0;vertex<count;vertex++)for(let c=0;c<size;c++)data[vertex*size+c]=name==='position'?(c===0?vertex*.01+offset:c*.125):(vertex+1)*.03125+c*.125;
  if(name==='color'&&count>4){const words=new Uint32Array(data.buffer,data.byteOffset,data.length);words[0]=0x80000000;words[1]=0x7fc12345;}
  g.setAttribute(name,new THREE.BufferAttribute(data,size));
 }
 g.setIndex([...indices]);g.computeBoundingSphere();return g;
}
function mesh(g:THREE.BufferGeometry,material:THREE.NodeMaterial,key?:string):THREE.Mesh{
 const result=new THREE.Mesh(g,material);result.castShadow=result.receiveShadow=true;result.matrixAutoUpdate=false;if(key)setStaticSceneSource435(result,key,0);return result;
}
function expanded(meshes:readonly THREE.Mesh[]):number[]{
 const out:number[]=[];for(const mesh of meshes){const g=mesh.geometry,index=g.index!,names=Object.keys(g.attributes).sort();for(let i=g.drawRange.start;i<Math.min(index.count,g.drawRange.start+g.drawRange.count);i++){
  const vertex=index.getX(i);for(const name of names){const a=g.getAttribute(name);out.push(...new Uint32Array(a.array.buffer,a.array.byteOffset+vertex*a.itemSize*4,a.itemSize));}
 }}return out;
}
function fixture(){const scene=new THREE.Scene(),root=new THREE.Group(),material=new THREE.MeshLambertNodeMaterial({vertexColors:true}),owner=new StaticSceneCompiler435(scene);scene.add(root);return{scene,root,material,owner};}
function reconcile(f:ReturnType<typeof fixture>){f.scene.updateMatrixWorld(true);f.owner.reconcile([f.root],[f.material]);}
function sources(f:ReturnType<typeof fixture>){return f.root.children.filter((source):source is THREE.Mesh=>source instanceof THREE.Mesh);}
function exact(f:ReturnType<typeof fixture>){expect(expanded(f.owner.meshes())).toEqual(expanded(sources(f)));expect(f.owner.snapshot().compiledActiveTriangles).toBe(f.owner.snapshot().sourceActiveTriangles);}
function dispose(f:ReturnType<typeof fixture>){f.owner.dispose();for(const source of sources(f))source.geometry.dispose();f.material.dispose();}

test('sorted compact vertices preserve every logical indexed corner word, including negative zero and NaN payloads',()=>{
 const f=fixture();try{
  const a=mesh(geometry(12,[8,3,1,8,1,11,3,0,1]),f.material,'a'),b=mesh(geometry(12,[11,2,0,11,0,9]),f.material,'b');f.root.add(a,b);
  const original=expanded([a,b]);reconcile(f);expect(f.owner.meshes()).toHaveLength(1);exact(f);expect(expanded([a,b])).toEqual(original);expect(f.owner.snapshot().bulkSetCalls).toBeGreaterThan(0);
 }finally{dispose(f);}
});

test('partial source runs never acknowledge an earlier unrelated write, and boundary component patches retain complete vertex words',()=>{
 const f=fixture();try{
  const a=mesh(geometry(30,[20,21,22,2,3,4]),f.material,'a'),b=mesh(geometry(9,[0,1,2]),f.material,'b');f.root.add(a,b);reconcile(f);
  const position=a.geometry.getAttribute('position') as THREE.BufferAttribute;
  position.setXYZ(2,1.25,.5,-0);position.addUpdateRange(6,3);position.needsUpdate=true;
  position.setXYZ(21,2.5,-0,.75);position.addUpdateRange(63,3);position.needsUpdate=true;f.owner.patchAttribute(position,64,1);
  expect(expanded(f.owner.meshes())).not.toEqual(expanded([a,b]));reconcile(f);exact(f);
  const before=f.owner.snapshot().copiedBytes;reconcile(f);expect(f.owner.snapshot().copiedBytes).toBe(before);
 }finally{dispose(f);}
});

test('new low source indices append after resident slots and partial intersections use source order rather than slot order',()=>{
 const f=fixture();try{
  const a=mesh(geometry(1000,[200,201,202,203,204,205]),f.material),shared=a.geometry.attributes,bGeometry=new THREE.BufferGeometry();for(const[name,attribute]of Object.entries(shared))bGeometry.setAttribute(name,attribute);bGeometry.setIndex([900,901,902]);bGeometry.computeBoundingSphere();const b=mesh(bGeometry,f.material);f.root.add(a,b);reconcile(f);
  const page=f.owner.meshes()[0]!,g=page.geometry,position=g.getAttribute('position'),oldSlots=Array.from(new Uint32Array(position.array.buffer,position.array.byteOffset,9*3)),block=f.owner.snapshot().pages[0]!.blocks[0]!;
  a.geometry.setIndex([200,201,202,203,204,205,0,1,2,3,4,5]);reconcile(f);expect(page.geometry).toBe(g);expect(f.owner.snapshot().pages[0]!.blocks[0]!.offset).toBe(block.offset);expect(Array.from(new Uint32Array(position.array.buffer,position.array.byteOffset,9*3))).toEqual(oldSlots);exact(f);
  const source=a.geometry.getAttribute('position') as THREE.BufferAttribute;source.setXYZ(1,-0,.875,.125);source.addUpdateRange(3,3);source.needsUpdate=true;f.owner.patchAttribute(source,3,3);exact(f);reconcile(f);exact(f);
 }finally{dispose(f);}
});

test('a broad sparse Rock patch copies only referenced words and visits runs rather than every absent source vertex',()=>{
 const f=fixture();try{
  const a=mesh(geometry(20000,[19990,19991,19992,20,21,22]),f.material),bGeometry=new THREE.BufferGeometry();for(const[name,attribute]of Object.entries(a.geometry.attributes))bGeometry.setAttribute(name,attribute);bGeometry.setIndex([4000,4001,4002]);bGeometry.computeBoundingSphere();const b=mesh(bGeometry,f.material);f.root.add(a,b);reconcile(f);
  const color=a.geometry.getAttribute('color') as THREE.BufferAttribute;for(const vertex of[20,21,22,4000,4001,4002,19990,19991,19992])color.setXYZ(vertex,.125,-0,.875);color.addUpdateRange(0,color.array.length);color.needsUpdate=true;
  const before=f.owner.snapshot();f.owner.patchAttribute(color,0,color.array.length);exact(f);const after=f.owner.snapshot();expect(after.copiedBytes-before.copiedBytes).toBe(9*3*4);expect(after.copyRunVisits-before.copyRunVisits).toBeLessThan(10);
  reconcile(f);exact(f);
 }finally{dispose(f);}
});

test('stable producer chunk replacement changes only its block and keeps the page and unaffected words resident',()=>{
 const f=fixture();try{
  const a=mesh(geometry(24,[6,7,8,0,1,2,18,19,20]),f.material,'chunk:0:body'),b=mesh(geometry(24,[0,1,2,9,10,11],5),f.material,'chunk:1:body');f.root.add(a,b);reconcile(f);
  const page=f.owner.meshes()[0]!,g=page.geometry,before=f.owner.snapshot(),other=before.pages[0]!.blocks.find(block=>block.key==='owned:chunk:1:body')!,position=g.getAttribute('position'),otherWords=Array.from(new Uint32Array(position.array.buffer,position.array.byteOffset+other.offset*3*4,6*3));
  const old=a.geometry;a.geometry=geometry(24,[15,16,17,3,4,5,9,10,11],2);old.dispose();reconcile(f);exact(f);
  expect(page.geometry).toBe(g);expect(f.owner.snapshot().blockReplacements-before.blockReplacements).toBe(1);expect(Array.from(new Uint32Array(position.array.buffer,position.array.byteOffset+other.offset*3*4,6*3))).toEqual(otherWords);
 }finally{dispose(f);}
});

test('run-backed blocks survive real arena growth, index masks and source retirement with exact expanded streams',()=>{
 const f=fixture();try{
  const a=mesh(geometry(12,[0,1,2,6,7,8]),f.material,'a'),b=mesh(geometry(12,[2,1,0,8,7,6],2),f.material,'b'),c=mesh(geometry(12,[0,1,2],4),f.material,'c');f.root.add(a,b,c);reconcile(f);const page=f.owner.meshes()[0]!,old=page.geometry;let releases=0;old.addEventListener('dispose',()=>releases++);
  const source=a.geometry;a.geometry=geometry(96,Array.from({length:96},(_,i)=>95-i));source.dispose();reconcile(f);expect(page.geometry).not.toBe(old);expect(releases).toBe(1);exact(f);
  a.geometry.setDrawRange(3,9);reconcile(f);exact(f);a.geometry.setDrawRange(0,Infinity);reconcile(f);exact(f);f.root.remove(b);reconcile(f);exact(f);expect(b.layers.mask).toBe(1);b.geometry.dispose();
 }finally{dispose(f);}
});
