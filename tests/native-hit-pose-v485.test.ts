import {describe,it,expect} from 'vitest';
import * as THREE from 'three/webgpu';
import {NativeHitPose} from '../src/ui3d/NativeHitPose';

describe('native card pointer acquisition V485',()=>{
  it('retains the acquired surface while the visible card moves away, without changing its live transform',()=>{
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial());
    mesh.updateMatrixWorld();const pose=new NativeHitPose([mesh]);
    mesh.position.x=2;mesh.rotation.y=.3;mesh.updateMatrixWorld();const live=mesh.matrixWorld,bytes=live.toArray();
    const ray=new THREE.Raycaster(new THREE.Vector3(.48,0,3),new THREE.Vector3(0,0,-1));
    expect(ray.intersectObject(mesh,false)).toHaveLength(0);expect(pose.intersects(ray)).toBe(true);
    expect(mesh.matrixWorld).toBe(live);expect(mesh.matrixWorld.toArray()).toEqual(bytes);
    ray.ray.origin.x=.8;expect(pose.intersects(ray)).toBe(false);
    mesh.geometry.dispose();mesh.material.dispose();
  });
  it('restores the live matrix even when the existing mesh raycast throws',()=>{
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial());mesh.updateMatrixWorld();
    const pose=new NativeHitPose([mesh]),live=mesh.matrixWorld;mesh.raycast=()=>{throw Error('ray failure');};
    expect(()=>pose.intersects(new THREE.Raycaster())).toThrow('ray failure');expect(mesh.matrixWorld).toBe(live);
    mesh.geometry.dispose();mesh.material.dispose();
  });
});
