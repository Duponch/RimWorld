import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {AnimationDetail} from '../src/render/AnimationDetail';
import {NaturalAnimationCache} from '../src/render/natural-animation-cache';
import {ResourceLayer} from '../src/render/ResourceLayer';
import {PlantClusterLayer} from '../src/render/PlantClusterLayer';
import {GpuGroundGrassLayer} from '../src/render/GpuGroundGrassLayer';
import {WeatherCloudLayer} from '../src/render/WeatherCloudLayer';
const view=(pixels=16)=>{const c=new THREE.OrthographicCamera(-50,50,50,-50,.1,1000);c.position.set(125,100,225);c.lookAt(125,0,125);c.zoom=pixels/10;c.updateProjectionMatrix();return c;};
const values=(c:NaturalAnimationCache)=>[...c.wind.value.toArray(),...c.phaseA.value.toArray(),...c.phaseB.value.toArray()];

test('shared natural phases follow confirmed fine time before a middle deadline and hold in pause',()=>{
 const detail=new AnimationDetail(),cache=new NaturalAnimationCache(),camera=view();detail.beginFrame(0,camera,1000,100);expect(detail.classify(0,0,0)).toBe(1);expect(cache.capture(detail,1,0,.5,1,2)).toBe(true);const first=values(cache),middle=detail.middleTick;
 detail.beginFrame(20,camera,1000,100.72);expect(detail.middleTick).toBe(middle);expect(cache.capture(detail,0,1,1,3,4)).toBe(true);expect(values(cache)).not.toEqual(first);expect(cache.phaseA.value.x).toBeCloseTo(Math.sin(3));expect(cache.phaseB.value.y).toBeCloseTo(Math.cos(4));
 const held=values(cache),clock=[detail.frameTick,detail.middleTick,detail.now];expect(cache.capture(detail,-1,0,2,5,6)).toBe(false);expect(values(cache)).toEqual(held);expect([detail.frameTick,detail.middleTick,detail.now]).toEqual(clock);detail.beginFrame(200,camera,1000,100.72);expect(cache.capture(detail,-1,0,2,5,6)).toBe(false);expect(values(cache)).toEqual(held);
 detail.reset();detail.beginFrame(201,camera,1000,100.72);expect(cache.capture(detail,-1,0,2,5,6)).toBe(true);detail.beginFrame(190,camera,1000,90);expect(cache.capture(detail,0,-1,.5,7,8)).toBe(true);detail.beginFrame(220,view(4),1000,91);expect(detail.classify(0,0,0)).toBe(2);
});

test('all three wind producers pass their real wrapped clock rather than retained middleTick',()=>{
 const detail=new AnimationDetail(),camera=view(),material=new THREE.MeshStandardNodeMaterial();material.userData.rendererOwned=true;const resources=new ResourceLayer(new THREE.Group(),material,material,detail),plants=new PlantClusterLayer(material,material,detail),grass=new GpuGroundGrassLayer(undefined,Infinity,undefined,undefined,undefined,detail);const layers=[resources,plants,grass];
 try{for(const layer of layers)layer.setWind(.5,1,0);detail.beginFrame(0,camera,1000,120);for(const layer of layers)layer.presentWind(120);const middle=detail.middleTick;detail.beginFrame(20,camera,1000,120.72);expect(detail.middleTick).toBe(middle);for(const [i,layer]of layers.entries()){layer.presentWind(120.72);const cache=(layer as unknown as {middleWind:NaturalAnimationCache}).middleWind,period=i===0?48:18,wrapped=((120.72%7200)+7200)%7200;expect(cache.phaseA.value.x).toBeCloseTo(Math.sin(wrapped*2*Math.PI/period));expect(cache.phaseA.value.y).toBeCloseTo(Math.cos(wrapped*2*Math.PI/period));}}finally{resources.dispose();plants.dispose();grass.dispose();material.dispose();}
});

test('middle cloud matrices follow the existing near quantization before83ms; pause and far stay held',()=>{
 const detail=new AnimationDetail(),camera=view(),target=new THREE.Vector3(125,0,125),middle=new WeatherCloudLayer(detail),near=new WeatherCloudLayer();middle.configureMap(250,250);near.configureMap(250,250);const original=Object.freeze({seed:42,tick:100,camera,target,strength:2,directionX:1,directionZ:0});
 try{detail.beginFrame(0,camera,1000,100);middle.present(original);near.present(original);const first=Array.from(middle.mesh.instanceMatrix.array);detail.beginFrame(40,camera,1000,101.44);const current={...original,tick:101.44};middle.present(current);near.present(current);expect(Array.from(middle.mesh.instanceMatrix.array)).toEqual(Array.from(near.mesh.instanceMatrix.array));expect(Array.from(middle.mesh.instanceMatrix.array)).not.toEqual(first);const paused=Array.from(middle.mesh.instanceMatrix.array),version=middle.mesh.instanceMatrix.version;detail.beginFrame(60,camera,1000,101.44);middle.present(current);expect(Array.from(middle.mesh.instanceMatrix.array)).toEqual(paused);expect(middle.mesh.instanceMatrix.version).toBe(version);
  const far=view(4);detail.beginFrame(70,far,1000,102);middle.present({...original,camera:far,tick:102});const held=Array.from(middle.mesh.instanceMatrix.array);detail.beginFrame(100,far,1000,104);middle.present({...original,camera:far,tick:104});expect(Array.from(middle.mesh.instanceMatrix.array)).toEqual(held);expect(original.tick).toBe(100);expect(original.seed).toBe(42);expect(target.toArray()).toEqual([125,0,125]);
 }finally{middle.dispose();near.dispose();}
});
