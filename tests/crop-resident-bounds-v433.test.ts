import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {cropGeometry} from '../src/render/CropLayer';
import {CropResidentBounds} from '../src/render/crop-resident-bounds';
import {RESIDENT_CROP_KINDS} from '../src/bridge/natural-appearance-values';

test.each(RESIDENT_CROP_KINDS)('all %s Float32-transformed vertices remain inside the complete growth/support envelope',kind=>{
 const geometry=cropGeometry(kind),bounds=new CropResidentBounds(geometry),sphere=new THREE.Sphere(),pose=new THREE.Object3D(),matrix=new THREE.Matrix4(),point=new THREE.Vector3();
 try{for(let yaw=0;yaw<7;yaw++){
  bounds.clear();bounds.set(0,7+yaw,249,0);bounds.writeSphere(sphere);
  for(const growth of [0,.0001,.17,.5,.999999,1])for(const leafless of [false,true])for(const support of [0,.3]){
   const scale=.14+.86*Math.sqrt(growth);pose.position.set(249,.025+support,0);pose.rotation.y=yaw*.9;pose.scale.set(scale,leafless?scale*.4:scale,scale);pose.updateMatrix();matrix.fromArray(new Float32Array(pose.matrix.elements));
   const positions=geometry.getAttribute('position');for(let vertex=0;vertex<positions.count;vertex++){point.fromBufferAttribute(positions,vertex).applyMatrix4(matrix);expect(sphere.containsPoint(point),kind+' '+yaw+' '+growth+' '+support+' vertex'+vertex).toBe(true);}
  }
 }}finally{geometry.dispose();}
});
test('local blocks shrink after retirement and become empty after the final crop',()=>{
 const geometry=cropGeometry('rice'),bounds=new CropResidentBounds(geometry),sphere=new THREE.Sphere();
 try{bounds.set(0,7,5,5);bounds.set(129,14,249,249);bounds.writeSphere(sphere);expect(sphere.radius).toBeGreaterThan(100);bounds.remove(129);bounds.writeSphere(sphere);expect(sphere.center.x).toBeLessThan(6);expect(sphere.radius).toBeLessThan(3);bounds.remove(0);bounds.writeSphere(sphere);expect(sphere.isEmpty()).toBe(true);}finally{geometry.dispose();}
});
