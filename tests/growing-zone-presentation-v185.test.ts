import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { BoxBatches } from '../src/render/BoxBatches';
import { BoxMesh } from '../src/render/BoxMesh';
import { GrowingZoneLayer } from '../src/render/GrowingZoneLayer';
import { createWorld } from '../src/sim/engine';

test('fields retain their cells and faint resident tint without selected or management contours', () => {
  const world=createWorld(185,32,32),boxes=new BoxBatches(),layer=new GrowingZoneLayer(boxes);
  world.growingZones=[{id:901,cells:[12*32+12,12*32+13,13*32+12],plant:'rice',allowSow:true,allowCut:true}];
  const before=structuredClone(world);
  try{
    layer.update(world,true);
    const mesh=layer.group.getObjectByName('growing-borders') as BoxMesh;
    const geometry=mesh.geometry,material=mesh.material,matrix=mesh.instanceMatrix;
    expect(mesh.activeCount).toBe(3);
    expect((material as THREE.MeshBasicNodeMaterial).opacity).toBe(.055);
    expect((material as THREE.MeshBasicNodeMaterial).depthWrite).toBe(false);
    expect(mesh.castShadow).toBe(false);
    const initial=Array.from(matrix.array.slice(0,3*16)),pose=new THREE.Matrix4();
    for(let i=0;i<3;i++){
      mesh.getMatrixAt(i,pose);
      expect(pose.elements[0]).toBe(1);expect(pose.elements[10]).toBe(1);
      expect(pose.elements[5]).toBeCloseTo(.014);
      expect(pose.elements[13]).toBeCloseTo(.021);
      expect(pose.elements[12]).toBe(world.growingZones[0]!.cells[i]!%32);
      expect(pose.elements[14]).toBe(Math.floor(world.growingZones[0]!.cells[i]!/32));
    }
    for(const [showAll,selectedId] of [[true,undefined],[false,901],[true,901]] as const){
      layer.update(world,false,showAll,selectedId);
      expect(layer.group.children).toHaveLength(1);
      expect(mesh.geometry).toBe(geometry);expect(mesh.material).toBe(material);expect(mesh.instanceMatrix).toBe(matrix);
      expect(mesh.activeCount).toBe(3);expect(Array.from(matrix.array.slice(0,3*16))).toEqual(initial);
    }
    expect(world).toEqual(before);
    expect(layer.update(world,false,true,901)).toBe(false);
    world.growingZones=[];layer.update(world,false);expect(mesh.activeCount).toBe(0);
  }finally{boxes.dispose();}
});
