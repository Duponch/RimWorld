import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { AreaPreviewLayer } from '../src/render/AreaPreviewLayer';

test('growing a preview retains its material and transform nodes, with exact centered cell matrices',()=>{
  const layer=new AreaPreviewLayer(),mesh=layer.mesh,material=layer.material,node=material.positionNode;
  const cells=Object.freeze([12,13,14]);layer.update(10,100,cells,0x9de7c9);
  const oldGeometry=mesh.geometry;let disposed=0;oldGeometry.addEventListener('dispose',()=>disposed++);
  const matrix=new THREE.Matrix4();mesh.getMatrixAt(0,matrix);
  expect(matrix.elements[12]).toBe(2);expect(matrix.elements[14]).toBe(1);
  expect(matrix.elements[13]).toBeCloseTo(.065);
  layer.update(10,100,Object.freeze(Array.from({length:65},(_,i)=>i)),0xf49b7c);
  expect(layer.mesh).toBe(mesh);expect(mesh.geometry).not.toBe(oldGeometry);expect(disposed).toBe(1);
  expect(layer.material).toBe(material);expect(material.positionNode).toBe(node);expect(material.colorNode).toBeNull();
  expect(mesh.geometry.instanceCount).toBe(65);expect(mesh.instanceMatrix.count).toBe(100);
  expect(material.map).toBeNull();expect(mesh.castShadow).toBe(false);expect(mesh.receiveShadow).toBe(false);
  expect(cells).toEqual([12,13,14]);layer.dispose();
});

test('empty compile preparation restores all draw state and keeps later preview ownership',()=>{
  const layer=new AreaPreviewLayer(),mesh=layer.mesh;
  const geometry=mesh.geometry,before=Array.from(mesh.instanceMatrix.array),sphere=mesh.boundingSphere.clone();
  const restore=layer.prepareForCompile();expect(mesh.visible).toBe(true);expect(geometry.instanceCount).toBe(1);expect(mesh.frustumCulled).toBe(false);
  restore();expect(mesh.geometry).toBe(geometry);expect(geometry.instanceCount).toBe(0);expect(mesh.visible).toBe(false);expect(mesh.frustumCulled).toBe(true);
  expect(Array.from(mesh.instanceMatrix.array)).toEqual(before);expect(mesh.boundingSphere).toEqual(sphere);
  const obsolete=layer.prepareForCompile();layer.update(16,256,[17,18],0xffffff);obsolete();
  expect(mesh.geometry.instanceCount).toBe(2);expect(mesh.visible).toBe(true);
  const replaced=layer.prepareForCompile();layer.update(16,256,Array.from({length:90},(_,i)=>i),0xffffff);replaced();
  expect(mesh.geometry.instanceCount).toBe(90);expect(mesh.visible).toBe(true);expect(mesh.frustumCulled).toBe(true);
  layer.hide();expect(mesh.geometry.instanceCount).toBe(0);expect(mesh.visible).toBe(false);layer.dispose();
});
