import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {createWorld} from '../src/sim/engine';
import {ResourceLayer} from '../src/render/ResourceLayer';
import {StaticSceneCompiler435} from '../src/render/StaticSceneCompiler435';

function fixture(){
 const world=createWorld(474,80,80);world.structures=[];world.jobs=[];
 world.resources=[{id:600001,kind:'tree',species:'oak',x:3,z:4,amount:25,growth:.2,growthTick:world.tick},
  {id:600002,kind:'tree',species:'pine',x:70,z:70,amount:25,growth:.3,growthTick:world.tick}];
 const scene=new THREE.Scene(),group=new THREE.Group(),material=new THREE.MeshLambertNodeMaterial({vertexColors:true});
 material.userData.rendererOwned=true;scene.add(group);const layer=new ResourceLayer(group,material),compiler=new StaticSceneCompiler435(scene);
 const meshes=()=>{const out:THREE.Mesh[]=[];group.traverse(o=>{if(o instanceof THREE.Mesh)out.push(o);});return out;};
 const compile=()=>{scene.updateMatrixWorld(true);compiler.reconcile([group],layer.compiledMaterials435());};
 const dispose=()=>{compiler.dispose();layer.dispose();material.dispose();};
 return {world,layer,compiler,meshes,compile,dispose};
}
function corners(mesh:THREE.Mesh){
 const g=mesh.geometry,p=g.getAttribute('position'),index=g.index!,out:string[]=[];
 for(let i=g.drawRange.start;i<Math.min(index.count,g.drawRange.start+g.drawRange.count);i++){
  const at=index.getX(i);out.push(`${p.getX(at)},${p.getY(at)},${p.getZ(at)}`);
 }return out;
}

test('growth changes exact positions and compiled bounds without rewriting unchanged triangle indices',()=>{
 const f=fixture();try{
  f.layer.update(f.world,true);f.compile();const meshes=f.meshes(),versions=meshes.map(m=>m.geometry.index!.version),
   indices=meshes.map(m=>m.geometry.index!.array.slice()),before=f.compiler.snapshot();
  let positions=meshes.map(corners);
  expect(before.pageObjects).toBeGreaterThan(0);
  for(const growth of [.4,.7,.1]){
   f.world.resources[0]!.growth=growth;f.layer.update(f.world,false);f.compile();
   expect(f.meshes()).toEqual(meshes);expect(meshes.map(m=>m.geometry.index!.version)).toEqual(versions);
   expect(meshes.map(m=>m.geometry.index!.array)).toEqual(indices);expect(meshes.map(corners)).not.toEqual(positions);
   positions=meshes.map(corners);
   expect(f.compiler.snapshot().indexSourceRemaps).toBe(before.indexSourceRemaps);
   expect(f.compiler.snapshot().indexPatches).toBe(before.indexPatches);
   expect(f.compiler.meshes().flatMap(corners).sort()).toEqual(meshes.flatMap(corners).sort());
   for(const mesh of f.compiler.meshes()){
    const p=mesh.geometry.getAttribute('position'),sphere=mesh.geometry.boundingSphere!,index=mesh.geometry.index!;
    for(let i=0;i<mesh.geometry.drawRange.count;i++){const n=index.getX(i);expect(new THREE.Vector3(p.getX(n),p.getY(n),p.getZ(n)).distanceTo(sphere.center)).toBeLessThanOrEqual(sphere.radius+1e-6);}
   }
  }
 }finally{f.dispose();}
});

test('real leaf loss, recovery, empty chunks and same-ID restoration still rewrite the selected triangles',()=>{
 const f=fixture();try{
  f.layer.update(f.world,true);f.compile();const initial=f.meshes().flatMap(corners).sort(),versions=f.meshes().map(m=>m.geometry.index!.version);
  const tree=f.world.resources[0]!;tree.plantLife={since:f.world.tick,age:0,darkTicks:0,leaflessAt:f.world.tick,nextCheck:f.world.tick+100};
  f.layer.update(f.world,false);f.compile();expect(f.meshes().map(m=>m.geometry.index!.version)).not.toEqual(versions);
  expect(f.meshes().flatMap(corners).length).toBeLessThan(initial.length);
  expect(f.compiler.meshes().flatMap(corners).sort()).toEqual(f.meshes().flatMap(corners).sort());
  delete tree.plantLife;f.layer.update(f.world,false);f.compile();expect(f.meshes().flatMap(corners).sort()).toEqual(initial);
  f.world.resources=[];f.layer.update(f.world,false);f.compile();expect(f.meshes().flatMap(corners)).toEqual([]);
  f.world.resources=[tree];f.layer.update(f.world,false);f.compile();expect(f.meshes().flatMap(corners).length).toBeGreaterThan(0);
  expect(f.compiler.meshes().flatMap(corners).sort()).toEqual(f.meshes().flatMap(corners).sort());
  // A replacement rebuild resets the membership witness as well as geometry.
  f.layer.update(f.world,true);f.compile();const rebuilt=f.meshes().flatMap(corners).sort();
  f.layer.update(f.world,false);f.compile();expect(f.meshes().flatMap(corners).sort()).toEqual(rebuilt);
 }finally{f.dispose();}
});
