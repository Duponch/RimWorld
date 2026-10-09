import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/index';
import { ConstructionPreviewLayer } from '../src/render/ConstructionPreviewLayer';

test('resident ghost models rotate, distinguish invalid placements and never alter the world',()=>{
  const world=createWorld(42,32,32),before=structuredClone(world),layer=new ConstructionPreviewLayer();
  try {
    const first={kind:'dining-chair' as const,x:16,z:16,orientation:0 as const,material:'wood' as const};
    layer.update(world,[first],[],false);
    const mesh=layer.group.children[0] as THREE.Mesh<THREE.InstancedBufferGeometry>;
    const material=mesh.material,geometry=mesh.geometry;
    expect(geometry.instanceCount).toBe(6);
    const matrix=geometry.getAttribute('boxMatrix3');
    expect(matrix.getZ(5)).toBeCloseTo(15.75);
    layer.update(world,[{...first,orientation:1}],[],false);
    expect(mesh.material).toBe(material);expect(mesh.geometry).toBe(geometry);
    expect(matrix.getX(5)).toBeCloseTo(15.75);expect(matrix.getZ(5)).toBeCloseTo(16);
    const goodColor=Array.from(geometry.getAttribute('boxColor').array).slice(0,3);
    layer.update(world,[],[first],false);
    expect(Array.from(geometry.getAttribute('boxColor').array).slice(0,3)).not.toEqual(goodColor);
    expect(layer.material.depthWrite).toBe(false);expect(layer.material.depthTest).toBe(false);
    expect(mesh.castShadow).toBe(false);expect(world).toEqual(before);
    layer.hide();expect(geometry.instanceCount).toBe(0);expect(mesh.visible).toBe(false);
  } finally {layer.dispose();}
});

test('compile restoration preserves newer placement and growing buffers',()=>{
  const world=createWorld(42,32,32),layer=new ConstructionPreviewLayer();
  try {
    const restore=layer.prepareForCompile();expect(layer.group.children.every(mesh=>mesh.visible)).toBe(true);
    restore();expect(layer.group.children.every(mesh=>!mesh.visible)).toBe(true);
    const obsolete=layer.prepareForCompile();
    layer.update(world,Array.from({length:20},(_,i)=>({kind:'dining-chair' as const,x:2+i,z:10,material:'wood' as const})),[],false);
    obsolete();
    const mesh=layer.group.children[0] as THREE.Mesh<THREE.InstancedBufferGeometry>;
    expect(mesh.geometry.instanceCount).toBe(120);expect(mesh.visible).toBe(true);expect(mesh.frustumCulled).toBe(true);
  }finally{layer.dispose();}
});
