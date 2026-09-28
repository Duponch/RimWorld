import { expect,test } from 'vitest';
import { DirectionalLight,PerspectiveCamera } from 'three/webgpu';
import { PausedShadowCache } from '../src/render/PausedShadowCache.ts';

test('paused shadow cache requires a completed pass and every render input to stay fixed',()=>{
  const cache=new PausedShadowCache(),camera=new PerspectiveCamera(50,1.5,.1,100),light=new DirectionalLight();
  camera.position.set(4,7,9);camera.updateMatrixWorld();
  light.position.set(8,12,3);light.target.position.set(2,0,2);
  light.shadow.camera.updateMatrixWorld();
  const reuse=(paused=true,tick=100,blend=1,distant=false,width=1200,height=800)=>
    cache.canReuse(paused,camera,light,tick,blend,distant,width,height);
  const capture=(completed=true)=>cache.capture(completed,camera,light,100,1,false,1200,800);
  expect(reuse()).toBe(false);
  capture(false);expect(reuse()).toBe(false);
  capture();expect(reuse()).toBe(true);
  expect(reuse(false)).toBe(false);
  expect(reuse(true,101)).toBe(false);
  expect(reuse(true,100,.8)).toBe(false);
  expect(reuse(true,100,1,true)).toBe(false);
  expect(reuse(true,100,1,false,1201)).toBe(false);
  expect(reuse(true,100,1,false,1200,801)).toBe(false);
  light.shadow.needsUpdate=true;expect(reuse()).toBe(false);light.shadow.needsUpdate=false;
  camera.position.x++;camera.updateMatrixWorld();expect(reuse()).toBe(false);capture();
  camera.fov=55;camera.updateProjectionMatrix();expect(reuse()).toBe(false);capture();
  light.position.x++;expect(reuse()).toBe(false);capture();
  light.target.position.z++;expect(reuse()).toBe(false);capture();
  light.shadow.camera.position.z++;light.shadow.camera.updateMatrixWorld();expect(reuse()).toBe(false);capture();
  light.shadow.camera.near=2;light.shadow.camera.updateProjectionMatrix();expect(reuse()).toBe(false);capture();
  light.shadow.mapSize.set(1024,1024);expect(reuse()).toBe(false);capture();
  light.shadow.bias=.001;expect(reuse()).toBe(false);capture();
  light.intensity=2;expect(reuse()).toBe(false);capture();
  cache.invalidate();expect(reuse()).toBe(false);
  light.shadow.dispose();
});
