import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {createWorld} from '../src/sim/engine';
import {ResourceLayer} from '../src/render/ResourceLayer';
import {ResourceRangeBounds} from '../src/render/resource-range-bounds';

test('range bounds update only the changed range and union conservatively without accumulating padding',()=>{
  const positions=new Float32Array([-4,0,-2,-3,1,-1, 2,0,1,3,1,2]);
  const ranges=[{vertexStart:0,vertexCount:2},{vertexStart:2,vertexCount:2}];
  const retained=ResourceRangeBounds.capture(positions,ranges)!;
  positions[10]=8;
  const changed=new Proxy({length:positions.length} as ArrayLike<number>,{get(_target,key){if(key==='length')return positions.length;const i=Number(key);if(i<6)throw new Error('Unchanged range read');return positions[i];}});
  expect(retained.update(1,changed)).toBe(true);
  const sphere=new THREE.Sphere();retained.writeSphere(sphere,4);const once=sphere.clone();retained.writeSphere(sphere,4);expect(sphere).toEqual(once);
  for(let i=0;i<positions.length;i+=3)expect(new THREE.Vector3(positions[i],positions[i+1],positions[i+2]).distanceTo(sphere.center)).toBeLessThanOrEqual(sphere.radius);
  expect(ResourceRangeBounds.capture(positions,[{vertexStart:1,vertexCount:3}])).toBeUndefined();
});

test('resident resource growth/shrink keeps geometry and bounds without rescanning all mesh vertices',()=>{
  const world=createWorld(429,32,32);world.structures=[];world.jobs=[];
  world.resources=[{id:600001,kind:'tree',species:'oak',x:3,z:4,amount:25,growth:.2,growthTick:world.tick},{id:600002,kind:'tree',species:'pine',x:28,z:27,amount:25,growth:.7,growthTick:world.tick}];
  const group=new THREE.Group(),material=new THREE.MeshStandardNodeMaterial({vertexColors:true});material.userData.rendererOwned=true;
  const layer=new ResourceLayer(group,material),meshes:THREE.Mesh[]=[];
  try{
    layer.update(world,true);group.traverse(object=>{if(object instanceof THREE.Mesh)meshes.push(object);});
    const geometries=meshes.map(m=>m.geometry),normals=geometries.map(g=>g.getAttribute('normal').array.slice()),indices=geometries.map(g=>g.index!.array.slice());
    for(const geometry of geometries)geometry.computeBoundingSphere=()=>{throw new Error('Growth must not scan the complete mesh');};
    for(const growth of [.7,1,.1,.7]){
      world.resources[0]!.growth=growth;layer.update(world,false);
      const current:THREE.Mesh[]=[];group.traverse(object=>{if(object instanceof THREE.Mesh)current.push(object);});
      expect(current).toEqual(meshes);expect(current.map(m=>m.geometry)).toEqual(geometries);
      let worst=0;
      for(let m=0;m<current.length;m++){
        const geometry=current[m]!.geometry,sphere=geometry.boundingSphere!,p=geometry.getAttribute('position');
        expect(Number.isFinite(sphere.radius)).toBe(true);
        for(let i=0;i<p.count;i++)worst=Math.max(worst,Math.hypot(p.getX(i)-sphere.center.x,p.getY(i)-sphere.center.y,p.getZ(i)-sphere.center.z)-sphere.radius);
        expect(geometry.getAttribute('normal').array).toEqual(normals[m]);expect(geometry.index!.array).toEqual(indices[m]);
      }
      expect(worst).toBeLessThanOrEqual(1e-8);
    }
  }finally{layer.dispose();material.dispose();}
});
